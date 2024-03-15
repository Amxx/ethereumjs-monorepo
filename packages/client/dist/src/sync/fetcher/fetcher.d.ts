/// <reference types="node" />
import { Readable } from 'stream';
import type { Config } from '../../config';
import type { Peer } from '../../net/peer';
import type { PeerPool } from '../../net/peerpool';
import type { JobTask as BlockFetcherJobTask } from './blockfetcherbase';
import type { Job } from './types';
import type { Debugger } from 'debug';
import type QHeap from 'qheap';
export interface FetcherOptions {
    config: Config;
    pool: PeerPool;
    timeout?: number;
    banTime?: number;
    maxQueue?: number;
    interval?: number;
    destroyWhenDone?: boolean;
}
/**
 * Base class for fetchers that retrieve various data from peers. Subclasses must
 * request(), process() and store() methods. Tasks can be arbitrary objects whose structure
 * is defined by subclasses. A priority queue is used to ensure tasks are fetched
 * in order. Three types need to be provided: the JobTask, which describes a task the job should perform,
 * a JobResult, which is the direct result when a Peer replies to a Task, and a StorageItem, which
 * represents the to-be-stored items.
 * @memberof module:sync/fetcher
 */
export declare abstract class Fetcher<JobTask, JobResult, StorageItem> extends Readable {
    config: Config;
    fetchPromise: Promise<boolean> | null;
    protected debug: Debugger;
    protected pool: PeerPool;
    protected timeout: number;
    protected interval: number;
    protected banTime: number;
    protected maxQueue: number;
    protected in: QHeap<Job<JobTask, JobResult, StorageItem>>;
    protected out: QHeap<Job<JobTask, JobResult, StorageItem>>;
    protected total: number;
    protected processed: number;
    protected finished: number;
    protected running: boolean;
    protected reading: boolean;
    protected destroyWhenDone: boolean;
    syncErrored?: Error;
    private _readableState?;
    private writer;
    /**
     * Create new fetcher
     */
    constructor(options: FetcherOptions);
    /**
     * Request results from peer for the given job.
     * Resolves with the raw result.
     * If `undefined` is returned, re-queue the job.
     * @param job
     * @param peer
     */
    abstract request(_job?: Job<JobTask, JobResult, StorageItem>, _peer?: Peer): Promise<JobResult | undefined>;
    /**
     * Process the reply for the given job.
     * If the reply contains unexpected data, return `undefined`,
     * this re-queues the job.
     * @param job fetch job
     * @param result result data
     */
    abstract process(_job?: Job<JobTask, JobResult, StorageItem>, _result?: JobResult): StorageItem[] | undefined;
    /**
     * Store fetch result. Resolves once store operation is complete.
     * @param result fetch result
     */
    abstract store(_result: StorageItem[]): Promise<void>;
    /**
     * Process the error and evaluate if fetcher is to be destroyed, peer banned and if there
     * is any stepback
     */
    abstract processStoreError(_error: Error, _task: JobTask | BlockFetcherJobTask): {
        destroyFetcher: boolean;
        banPeer: boolean;
        stepBack: bigint;
    };
    abstract jobStr(job: Job<JobTask, JobResult, StorageItem>, withIndex?: boolean): string;
    /**
     * Generate list of tasks to fetch
     */
    tasks(): JobTask[];
    nextTasks(): void;
    /**
     * Enqueue job
     * @param job
     */
    enqueue(job: Job<JobTask, JobResult, StorageItem>, dequeued?: boolean): void;
    /**
     * Dequeue all done tasks that completed in order
     */
    dequeue(): void;
    /**
     * Enqueues a task. If autoRestart is true, and Fetcher is not running, then restart the fetcher.
     * @param task
     * @param autoRestart
     */
    enqueueTask(task: JobTask, autoRestart?: boolean): void;
    /**
     * Implements Readable._read() by pushing completed tasks to the read queue
     */
    _read(): void;
    /**
     * handle successful job completion
     * @param job successful job
     * @param result job result
     */
    private success;
    /**
     * Handle failed job completion
     * @param job failed job
     * @param error error
     */
    private failure;
    /**
     * Process next task
     */
    next(): false | Job<JobTask, JobResult, StorageItem>;
    /**
     * Clears all outstanding tasks from the fetcher
     * TODO: figure out a way to reject the jobs which are under async processing post
     * `this.request`
     */
    clear(): void;
    /**
     * Handle error
     * @param error error object
     * @param job task
     */
    error(error: Error, job?: Job<JobTask, JobResult, StorageItem>, irrecoverable?: boolean): void;
    /**
     * Setup writer pipe and start writing fetch results. A pipe is used in order
     * to support backpressure from storing results.
     */
    write(): boolean;
    /**
     * Run the fetcher. Returns a promise that resolves once all tasks are completed.
     */
    _fetch(): Promise<boolean>;
    /**
     * Wraps the internal fetcher to track its promise
     */
    fetch(): Promise<boolean>;
    blockingFetch(): Promise<boolean>;
    /**
     * Returns an idle peer that can process a next job.
     */
    peer(): Peer | undefined;
    /**
     * Expire job that has timed out and ban associated peer. Timed out tasks will
     * be re-inserted into the queue.
     */
    expire(job: Job<JobTask, JobResult, StorageItem>): void;
    wait(delay?: number): Promise<void>;
    /**
     * Helper to type guard job.task as {@link BlockFetcherJobTask}.
     * @param task
     */
    private isBlockFetcherJobTask;
}
//# sourceMappingURL=fetcher.d.ts.map