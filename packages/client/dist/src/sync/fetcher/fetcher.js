"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Fetcher = void 0;
const debug_1 = require("debug");
const stream_1 = require("stream");
const types_1 = require("../../types");
const Heap = require('qheap');
const { debug: createDebugLogger } = debug_1.default;
/**
 * Base class for fetchers that retrieve various data from peers. Subclasses must
 * request(), process() and store() methods. Tasks can be arbitrary objects whose structure
 * is defined by subclasses. A priority queue is used to ensure tasks are fetched
 * in order. Three types need to be provided: the JobTask, which describes a task the job should perform,
 * a JobResult, which is the direct result when a Peer replies to a Task, and a StorageItem, which
 * represents the to-be-stored items.
 * @memberof module:sync/fetcher
 */
class Fetcher extends stream_1.Readable {
    /**
     * Create new fetcher
     */
    constructor(options) {
        super({ ...options, objectMode: true });
        this.fetchPromise = null;
        this.writer = null;
        this.config = options.config;
        this.debug = createDebugLogger('client:fetcher');
        this.pool = options.pool;
        this.timeout = options.timeout ?? 8000;
        this.interval = options.interval ?? 1000;
        this.banTime = options.banTime ?? 60000;
        this.maxQueue = options.maxQueue ?? 4;
        this.debug(`Fetcher initialized timeout=${this.timeout} interval=${this.interval} banTime=${this.banTime} maxQueue=${this.maxQueue}`);
        this.in = new Heap({
            comparBefore: (a, b) => a.index < b.index,
        });
        this.out = new Heap({
            comparBefore: (a, b) => a.index < b.index,
        });
        this.total = 0;
        this.processed = 0;
        this.finished = 0;
        this.running = false;
        this.reading = false;
        this.destroyWhenDone = options.destroyWhenDone ?? true;
    }
    /**
     * Generate list of tasks to fetch
     */
    tasks() {
        return [];
    }
    nextTasks() { }
    /**
     * Enqueue job
     * @param job
     */
    enqueue(job, dequeued) {
        if (this.running) {
            // If the job was already dequeued, for example coming from writer pipe, processed
            // needs to be decreased
            if (dequeued === true)
                this.processed--;
            this.in.insert({
                ...job,
                time: Date.now(),
                state: 'idle',
            });
        }
    }
    /**
     * Dequeue all done tasks that completed in order
     */
    dequeue() {
        for (let f = this.out.peek(); f && f.index <= this.processed;) {
            this.processed++;
            const job = this.out.remove();
            // Push the job to the Readable stream
            const success = this.push(job);
            if (!success) {
                return;
            }
            f = this.out.peek();
        }
    }
    /**
     * Enqueues a task. If autoRestart is true, and Fetcher is not running, then restart the fetcher.
     * @param task
     * @param autoRestart
     */
    enqueueTask(task, autoRestart = false) {
        if (this.syncErrored || (!this.running && !autoRestart)) {
            return;
        }
        const job = {
            task,
            time: Date.now(),
            index: this.total++,
            state: 'idle',
            peer: null,
        };
        this.debug(`enqueueTask ${this.jobStr(job)}`);
        this.in.insert(job);
        if (!this.running && autoRestart) {
            void this.fetch();
        }
    }
    /**
     * Implements Readable._read() by pushing completed tasks to the read queue
     */
    _read() {
        this.dequeue();
    }
    /**
     * handle successful job completion
     * @param job successful job
     * @param result job result
     */
    success(job, result) {
        let jobStr = this.jobStr(job, true);
        if (job.state !== 'active')
            return;
        let reenqueue = false;
        let resultSet = '';
        if (result === undefined) {
            resultSet = 'undefined';
            reenqueue = true;
        }
        if (result !== undefined) {
            if ('length' in result) {
                if (result.length === 0) {
                    resultSet = 'empty';
                    reenqueue = true;
                }
            }
            else {
                // Hot-Fix for lightsync, 2023-12-29
                // (delete (only the if clause) in case lightsync code
                // has been removed at some point)
                if (!('reqId' in result)) {
                    resultSet = 'unknown';
                    reenqueue = true;
                }
            }
        }
        if (reenqueue) {
            this.debug(`Re-enqueuing job ${jobStr} from peer id=${job.peer?.id?.substr(0, 8)} (${resultSet} result set returned).`);
            this.enqueue(job);
            void this.wait().then(() => {
                job.peer.idle = true;
            });
        }
        else {
            job.peer.idle = true;
            job.result = this.process(job, result);
            jobStr = this.jobStr(job, true);
            if (job.result !== undefined) {
                this.debug(`Successful job completion job ${jobStr}, writing to out and dequeue`);
                this.out.insert(job);
                this.dequeue();
            }
            else {
                this.debug(`Re-enqueuing job ${jobStr} from peer id=${job.peer?.id?.substr(0, 8)} (reply contains unexpected data).`);
                this.enqueue(job);
            }
        }
        this.next();
    }
    /**
     * Handle failed job completion
     * @param job failed job
     * @param error error
     */
    failure(job, error, irrecoverable, dequeued, banPeer) {
        const jobItems = job instanceof Array ? job : [job];
        if (irrecoverable === true || banPeer === true) {
            this.pool.ban(jobItems[0].peer, this.banTime);
        }
        if (!(irrecoverable === true)) {
            void this.wait().then(() => {
                jobItems[0].peer.idle = true;
            });
            for (const jobItem of jobItems) {
                if (jobItem.state !== 'active')
                    continue;
                const jobStr = this.jobStr(jobItem, true);
                this.debug(`Failure - Re-enqueuing job ${jobStr} from peer id=${jobItem.peer?.id?.substr(0, 8)} (error: ${error}).`);
                // If the job has been dequeued, then the processed count needs to be decreased
                this.enqueue(jobItem, dequeued);
            }
            this.next();
        }
        if (error) {
            this.error(error, jobItems[0], irrecoverable);
        }
    }
    /**
     * Process next task
     */
    next() {
        this.nextTasks();
        const job = this.in.peek();
        if (job === undefined) {
            if (this.finished !== this.total) {
                // There are still jobs waiting to be processed out in the writer pipe
                this.debug(`No job found as next task, skip next job execution processed=${this.processed} finished=${this.finished} total=${this.total}`);
            }
            else {
                // There are no more jobs in the fetcher, so its better to resolve
                // the sync and exit
                this.debug(`Fetcher seems to have processed all jobs, stopping…`);
                this.running = false;
            }
            return false;
        }
        const jobStr = this.jobStr(job);
        if (this._readableState === undefined || this._readableState.length > this.maxQueue) {
            this.debug(`Readable state length=${this._readableState.length} exceeds max queue size=${this.maxQueue}, skip job ${jobStr} execution.`);
            return false;
        }
        if (job.index > this.finished + this.maxQueue) {
            this.debug(`Job index greater than finished + max queue size, skip job ${jobStr} execution.`);
            return false;
        }
        if (this.processed === this.total) {
            this.debug(`Total number of tasks reached, skip job ${jobStr} execution.`);
            return false;
        }
        const peer = this.peer();
        if (peer) {
            peer.idle = false;
            this.in.remove();
            job.peer = peer;
            job.state = 'active';
            const timeout = setTimeout(() => {
                this.expire(job);
            }, this.timeout);
            this.debug(`All requirements met for job ${jobStr}, start requesting.`);
            this.request(job, peer)
                .then((result) => {
                this.success(job, result);
            })
                .catch((error) => {
                const { banPeer } = this.processStoreError(error, job.task);
                this.failure(job, error, false, false, banPeer);
            })
                .finally(() => clearTimeout(timeout));
            return job;
        }
        else {
            this.debug(`No idle peer available, skip execution for job ${jobStr}.`);
            return false;
        }
    }
    /**
     * Clears all outstanding tasks from the fetcher
     * TODO: figure out a way to reject the jobs which are under async processing post
     * `this.request`
     */
    clear() {
        this.total -= this.in.length;
        while (this.in.length > 0) {
            this.in.remove();
        }
        this.debug(`Cleared out fetcher total=${this.total} processed=${this.processed} finished=${this.finished}`);
    }
    /**
     * Handle error
     * @param error error object
     * @param job task
     */
    error(error, job, irrecoverable) {
        if (this.running) {
            this.config.events.emit(types_1.Event.SYNC_FETCHER_ERROR, error, job?.task, job?.peer);
        }
        if (irrecoverable === true) {
            this.running = false;
            this.syncErrored = error;
            this.clear();
        }
    }
    /**
     * Setup writer pipe and start writing fetch results. A pipe is used in order
     * to support backpressure from storing results.
     */
    write() {
        // writer is already setup, just return
        if (this.writer !== null) {
            return false;
        }
        const _write = async (job, encoding, cb) => {
            const jobItems = job instanceof Array ? job : [job];
            this.debug(`Starting write for ${jobItems.length} jobs...`);
            try {
                for (const jobItem of jobItems) {
                    await this.store(jobItem.result);
                }
                this.finished += jobItems.length;
                cb();
            }
            catch (error) {
                this.config.logger.warn(`Error storing received block or header result: ${error}`);
                const { destroyFetcher, banPeer, stepBack } = this.processStoreError(error, jobItems[0].task);
                if (!destroyFetcher) {
                    // Non-fatal error: ban peer and re-enqueue job.
                    // Modify the first job so that it is enqueued from safeReorgDistance as most likely
                    // this is because of a reorg.
                    if (this.isBlockFetcherJobTask(jobItems[0].task)) {
                        this.debug(`Possible reorg, stepping back ${stepBack} blocks and requeuing jobs.`);
                        jobItems[0].task.first -= stepBack;
                        jobItems[0].task.count += Number(stepBack);
                        // This will requeue the jobs as we are marking this failure as non-fatal.
                    }
                    this.failure(jobItems, error, false, true, banPeer);
                    cb();
                    return;
                }
                cb(error);
            }
        };
        const writer = new stream_1.Writable({
            objectMode: true,
            autoDestroy: false,
            write: _write,
            writev: (many, cb) => {
                const items = [].concat(...many.map((x) => x.chunk));
                return _write(items, null, cb);
            },
        });
        this.on('close', () => {
            this.running = false;
            writer.destroy();
        })
            .pipe(writer)
            .on('finish', () => {
            this.running = false;
        })
            .on('error', (error) => {
            this.error(error, undefined, true);
            writer.destroy();
        });
        this.writer = writer;
        this.debug(`Setup writer pipe.`);
        return true;
    }
    /**
     * Run the fetcher. Returns a promise that resolves once all tasks are completed.
     */
    async _fetch() {
        try {
            this.write();
            this.running = true;
            this.nextTasks();
            while (this.running) {
                if (this.next() === false) {
                    if (this.finished === this.total && this.destroyWhenDone) {
                        this.push(null);
                    }
                    await this.wait();
                }
            }
            this.running = false;
            if (this.destroyWhenDone) {
                this.destroy();
                this.writer = null;
            }
            if (this.syncErrored)
                throw this.syncErrored;
            return true;
        }
        finally {
            this.fetchPromise = null;
        }
    }
    /**
     * Wraps the internal fetcher to track its promise
     */
    async fetch() {
        if (this.running) {
            return false;
        }
        if (this.fetchPromise === null) {
            this.fetchPromise = this._fetch();
        }
        return this.fetchPromise;
    }
    async blockingFetch() {
        const blockingPromise = this.fetchPromise ?? this.fetch();
        return blockingPromise;
    }
    /**
     * Returns an idle peer that can process a next job.
     */
    peer() {
        return this.pool.idle();
    }
    /**
     * Expire job that has timed out and ban associated peer. Timed out tasks will
     * be re-inserted into the queue.
     */
    expire(job) {
        job.state = 'expired';
        const jobStr = this.jobStr(job, true);
        if (this.pool.contains(job.peer)) {
            this.debug(`Task timed out for peer (banning) ${jobStr} ${job.peer}`);
            this.pool.ban(job.peer, this.banTime);
        }
        else {
            this.debug(`Peer disconnected while performing task ${jobStr} ${job.peer}`);
        }
        this.enqueue(job);
    }
    async wait(delay) {
        await new Promise((resolve) => setTimeout(resolve, delay ?? this.interval));
    }
    /**
     * Helper to type guard job.task as {@link BlockFetcherJobTask}.
     * @param task
     */
    isBlockFetcherJobTask(task) {
        if (task === undefined || task === null)
            return false;
        const keys = Object.keys(task);
        return keys.filter((key) => key === 'first' || key === 'count').length === 2;
    }
}
exports.Fetcher = Fetcher;
//# sourceMappingURL=fetcher.js.map