"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockFetcherBase = void 0;
const util_1 = require("@ethereumjs/util");
const fetcher_1 = require("./fetcher");
class BlockFetcherBase extends fetcher_1.Fetcher {
    /**
     * Create new block fetcher
     */
    constructor(options) {
        super(options);
        this.chain = options.chain;
        this.first = options.first;
        this.count = options.count;
        this.reverse = options.reverse ?? false;
        this.debug(`Block fetcher instantiated interval=${this.interval} first=${this.first} count=${this.count} reverse=${this.reverse} destroyWhenDone=${this.destroyWhenDone}`);
    }
    /**
     * Generate list of tasks to fetch. Modifies `first` and `count` to indicate
     * remaining items apart from the tasks it pushes in the queue
     */
    tasks(first = this.first, count = this.count, maxTasks = this.config.maxFetcherJobs) {
        const max = this.config.maxPerRequest;
        const tasks = [];
        let debugStr = `first=${first}`;
        let pushedCount = util_1.BIGINT_0;
        const startedWith = first;
        while (count >= BigInt(max) && tasks.length < maxTasks) {
            tasks.push({ first, count: max });
            !this.reverse ? (first += BigInt(max)) : (first -= BigInt(max));
            count -= BigInt(max);
            pushedCount += BigInt(max);
        }
        if (count > util_1.BIGINT_0 && tasks.length < maxTasks) {
            tasks.push({ first, count: Number(count) });
            !this.reverse ? (first += BigInt(count)) : (first -= BigInt(count));
            pushedCount += count;
            count = util_1.BIGINT_0;
        }
        // If we started with where this.first was, i.e. there are no gaps and hence
        // we can move this.first to where its now, and reduce count by pushedCount
        if (startedWith === this.first) {
            this.first = first;
            this.count = this.count - pushedCount;
        }
        debugStr += ` count=${pushedCount} reverse=${this.reverse}`;
        this.debug(`Created new tasks num=${tasks.length} ${debugStr}`);
        return tasks;
    }
    nextTasks() {
        // processed - finished gives out how many jobs have been popped out from in to make parallel requests to peers
        // Do not generate any new tasks unless maxFetcherRequests are resolved
        if (this.in.length === 0 &&
            this.count > util_1.BIGINT_0 &&
            this.processed - this.finished < this.config.maxFetcherRequests) {
            this.debug(`Fetcher pending with first=${this.first} count=${this.count} reverse=${this.reverse}`);
            const tasks = this.tasks(this.first, this.count);
            for (const task of tasks) {
                this.enqueueTask(task);
            }
            this.debug(`Enqueued num=${tasks.length} tasks`);
        }
        else {
            this.debug(`No new tasks enqueued in=${this.in.length} count=${this.count} processed=${this.processed} finished=${this.finished}`);
        }
    }
    /**
     * Clears all outstanding tasks from the fetcher
     */
    clear() {
        let first = this.first;
        let last = this.first + this.count - util_1.BIGINT_1;
        // We have to loop because the jobs won't always be in increasing order.
        // Some jobs could have refetch tasks enqueued, so it is better to find
        // the first and last by examining each job.
        while (this.in.length > 0) {
            const job = this.in.remove();
            if (!job)
                break;
            if (job.task.first < first) {
                first = job.task.first;
            }
            const jobLast = job.task.first + BigInt(job.task.count) - util_1.BIGINT_1;
            if (jobLast > last) {
                last = jobLast;
            }
        }
        this.first = first;
        this.count = last - this.first + util_1.BIGINT_1;
        // Already removed jobs from the `in` heap, just pass to super for further cleanup
        super.clear();
    }
    /**
     * Create new tasks based on a provided list of block numbers.
     *
     * If numbers are sequential the request is created as bulk request.
     *
     * If there are no tasks in the fetcher and `min` is behind head,
     * inserts the requests for the missing blocks first.
     *
     * @param numberList List of block numbers
     * @param min Start block number
     */
    enqueueByNumberList(numberList, min, max) {
        // Check and update the height
        const last = this.first + this.count - util_1.BIGINT_1;
        let updateHeightStr = '';
        if (max > last) {
            this.count += max - last;
            updateHeightStr = `updated height=${max}`;
        }
        // Re-enqueue the numbers which are less than `first` to refetch them,
        // else they will be fetched in the future with the jobs created by `nextTasks`.
        numberList = numberList.filter((num) => num <= this.first);
        const numBlocks = numberList.length;
        let bulkRequest = true;
        let seqCheckNum = min;
        for (let num = 1; num <= numBlocks; num++) {
            if (!numberList.includes(seqCheckNum)) {
                bulkRequest = false;
                break;
            }
            seqCheckNum++;
        }
        if (bulkRequest && numBlocks > 0) {
            this.enqueueTask({
                first: min,
                count: numBlocks,
            }, true);
        }
        else {
            for (const first of numberList) {
                this.enqueueTask({
                    first,
                    count: 1,
                }, true);
            }
        }
        this.debug(`Enqueued tasks by number list num=${numberList.length} min=${min} bulkRequest=${bulkRequest} ${updateHeightStr}`);
        if (this.in.length === 0) {
            this.nextTasks();
        }
    }
    processStoreError(error, task) {
        let stepBack = util_1.BIGINT_0;
        const destroyFetcher = !error.message.includes('could not find parent header');
        const banPeer = true;
        // we can step back here for blockfetcher
        if (!destroyFetcher && this.reverse === false) {
            stepBack = task.first - util_1.BIGINT_1;
            if (stepBack > BigInt(this.config.safeReorgDistance)) {
                stepBack = BigInt(this.config.safeReorgDistance);
            }
        }
        return { destroyFetcher, banPeer, stepBack };
    }
    /**
     * Job log format helper.
     * @param job
     * @param withIndex pass true to additionally output job.index
     */
    jobStr(job, withIndex = false) {
        let str = '';
        if (withIndex) {
            str += `index=${job.index} `;
        }
        let { first, count } = job.task;
        let partialResult = '';
        if (job.partialResult) {
            first = first + BigInt(job.partialResult.length);
            count -= job.partialResult.length;
            partialResult = ` partialResults=${job.partialResult.length}`;
        }
        str += `first=${first} count=${count}${partialResult}`;
        if ('reverse' in this) {
            str += ` reverse=${this.reverse}`;
        }
        str += ` state=${job.state}`;
        return str;
    }
}
exports.BlockFetcherBase = BlockFetcherBase;
//# sourceMappingURL=blockfetcherbase.js.map