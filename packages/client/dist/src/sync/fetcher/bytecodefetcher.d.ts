import { DefaultStateManager } from '@ethereumjs/statemanager';
import { Fetcher } from './fetcher';
import type { Peer } from '../../net/peer';
import type { FetcherOptions } from './fetcher';
import type { Job, SnapFetcherDoneFlags } from './types';
import type { DB } from '@ethereumjs/util';
import type { Debugger } from 'debug';
declare type ByteCodeDataResponse = Uint8Array[] & {
    completed?: boolean;
};
/**
 * Implements an snap1 based bytecode fetcher
 * @memberof module:sync/fetcher
 */
export interface ByteCodeFetcherOptions extends FetcherOptions {
    hashes: Uint8Array[];
    stateManager?: DefaultStateManager;
    fetcherDoneFlags?: SnapFetcherDoneFlags;
    /** Destroy fetcher once all tasks are done */
    destroyWhenDone?: boolean;
}
export declare type JobTask = {
    hashes: Uint8Array[];
};
export declare class ByteCodeFetcher extends Fetcher<JobTask, Uint8Array[], Uint8Array> {
    protected debug: Debugger;
    stateManager: DefaultStateManager;
    fetcherDoneFlags: SnapFetcherDoneFlags;
    codeDB: DB;
    hashes: Uint8Array[];
    keccakFunction: Function;
    /**
     * Create new block fetcher
     */
    constructor(options: ByteCodeFetcherOptions);
    setDestroyWhenDone(): void;
    /**
     * Request results from peer for the given job.
     * Resolves with the raw result
     * If `undefined` is returned, re-queue the job.
     * @param job
     * @param peer
     */
    request(job: Job<JobTask, Uint8Array[], Uint8Array>): Promise<ByteCodeDataResponse | undefined>;
    /**
     * Process the reply for the given job.
     * If the reply contains unexpected data, return `undefined`,
     * this re-queues the job.
     * @param job fetch job
     * @param result result data
     */
    process(job: Job<JobTask, Uint8Array[], Uint8Array>, result: ByteCodeDataResponse): Uint8Array[] | undefined;
    /**
     * Store fetch result. Resolves once store operation is complete.
     * @param result fetch result
     */
    store(result: Uint8Array[]): Promise<void>;
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
    enqueueByByteCodeRequestList(byteCodeRequestList: Uint8Array[]): void;
    /**
     * Generate list of tasks to fetch. Modifies `first` and `count` to indicate
     * remaining items apart from the tasks it pushes in the queue
     */
    tasks(maxTasks?: number): JobTask[];
    nextTasks(): void;
    /**
     * Clears all outstanding tasks from the fetcher
     */
    clear(): void;
    /**
     * Returns an idle peer that can process a next job.
     */
    peer(): Peer | undefined;
    processStoreError(error: Error, _task: JobTask): {
        destroyFetcher: boolean;
        banPeer: boolean;
        stepBack: bigint;
    };
    /**
     * Job log format helper.
     * @param job
     * @param withIndex pass true to additionally output job.index
     */
    jobStr(job: Job<JobTask, Uint8Array[], Uint8Array>, withIndex?: boolean): string;
}
export {};
//# sourceMappingURL=bytecodefetcher.d.ts.map