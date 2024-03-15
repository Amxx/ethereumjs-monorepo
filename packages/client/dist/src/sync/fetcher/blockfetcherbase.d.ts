import { Fetcher } from './fetcher';
import type { Chain } from '../../blockchain';
import type { FetcherOptions } from './fetcher';
import type { Job } from './types';
export interface BlockFetcherOptions extends FetcherOptions {
    /** Blockchain */
    chain: Chain;
    first: bigint;
    count: bigint;
    /** Whether to fetch the blocks in reverse order (e.g. for beacon sync). Default: false */
    reverse?: boolean;
    /** Destroy fetcher once all tasks are done */
    destroyWhenDone?: boolean;
}
export declare type JobTask = {
    first: bigint;
    count: number;
};
export declare abstract class BlockFetcherBase<JobResult, StorageItem> extends Fetcher<JobTask, JobResult, StorageItem> {
    protected chain: Chain;
    /**
     * Where the fetcher starts apart from the tasks already in the `in` queue.
     */
    first: bigint;
    /**
     * Number of items for the fetcher to fetch starting from (and including) `first`.
     */
    count: bigint;
    protected reverse: boolean;
    /**
     * Create new block fetcher
     */
    constructor(options: BlockFetcherOptions);
    /**
     * Generate list of tasks to fetch. Modifies `first` and `count` to indicate
     * remaining items apart from the tasks it pushes in the queue
     */
    tasks(first?: bigint, count?: bigint, maxTasks?: number): JobTask[];
    nextTasks(): void;
    /**
     * Clears all outstanding tasks from the fetcher
     */
    clear(): void;
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
    enqueueByNumberList(numberList: bigint[], min: bigint, max: bigint): void;
    processStoreError(error: Error, task: JobTask): {
        destroyFetcher: boolean;
        banPeer: boolean;
        stepBack: bigint;
    };
    /**
     * Job log format helper.
     * @param job
     * @param withIndex pass true to additionally output job.index
     */
    jobStr(job: Job<JobTask, JobResult, StorageItem>, withIndex?: boolean): string;
}
//# sourceMappingURL=blockfetcherbase.d.ts.map