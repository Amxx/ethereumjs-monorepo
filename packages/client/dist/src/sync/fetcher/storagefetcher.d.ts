import { DefaultStateManager } from '@ethereumjs/statemanager';
import { Fetcher } from './fetcher';
import type { Peer } from '../../net/peer';
import type { StorageData } from '../../net/protocol/snapprotocol';
import type { FetcherOptions } from './fetcher';
import type { Job, SnapFetcherDoneFlags } from './types';
import type { Debugger } from 'debug';
declare type StorageDataResponse = StorageData[][] & {
    completed?: boolean;
};
export declare type StorageRequest = {
    accountHash: Uint8Array;
    storageRoot: Uint8Array;
    first: bigint;
    count: bigint;
};
/**
 * Implements a snap1 based storage fetcher
 * @memberof module:sync/fetcher
 */
export interface StorageFetcherOptions extends FetcherOptions {
    /** Root hash of the account trie to serve */
    root: Uint8Array;
    /** Storage requests to fetch */
    storageRequests?: StorageRequest[];
    /** Storage slot hash of the first to retrieve - Ignored if multiple or no accounts are requested */
    first?: bigint;
    /** Range to eventually fetch - Ignored if multiple accounts are requested */
    count?: bigint;
    /** Destroy fetcher once all tasks are done */
    destroyWhenDone?: boolean;
    stateManager: DefaultStateManager;
    fetcherDoneFlags: SnapFetcherDoneFlags;
}
export declare type JobTask = {
    storageRequests: StorageRequest[];
    multi: boolean;
};
export declare class StorageFetcher extends Fetcher<JobTask, StorageData[][], StorageData[]> {
    protected debug: Debugger;
    root: Uint8Array;
    stateManager: DefaultStateManager;
    fetcherDoneFlags: SnapFetcherDoneFlags;
    /** The accounts to fetch storage data for */
    storageRequests: StorageRequest[];
    /** Fragmented requests to fetch remaining slot data for */
    fragmentedRequests: StorageRequest[];
    accountToHighestKnownHash: Map<String, Uint8Array>;
    /**
     * Create new storage fetcher
     */
    constructor(options: StorageFetcherOptions);
    private verifyRangeProof;
    /**
     *
     * @param job
     * @returns origin of job is set using either @first property of fetcher or latest hash of partial job
     */
    private getOrigin;
    private getLimit;
    private isMissingRightRange;
    setDestroyWhenDone(): void;
    /**
     * Request results from peer for the given job.
     * Resolves with the raw result
     * If `undefined` is returned, re-queue the job.
     * @param job
     * @param peer
     */
    request(job: Job<JobTask, StorageData[][], StorageData[]>): Promise<StorageDataResponse | undefined>;
    /**
     * Process the reply for the given job.
     * If the reply contains unexpected data, return `undefined`,
     * this re-queues the job.
     * @param job fetch job
     * @param result result data
     */
    process(job: Job<JobTask, StorageData[][], StorageData[]>, result: StorageDataResponse): StorageData[][] | undefined;
    /**
     * Store fetch result. Resolves once store operation is complete.
     * @param result fetch result
     */
    store(result: StorageData[][] & {
        requests: StorageRequest[];
    } & {
        multi: boolean;
    }): Promise<void>;
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
    enqueueByStorageRequestList(storageRequestList: StorageRequest[]): void;
    /**
     * Generate list of tasks to fetch. Modifies `first` and `count` to indicate
     * remaining items apart from the tasks it pushes in the queue
     *
     * Divides the full 256-bit range of hashes into @maxStorageRange ranges
     * and turns each range into a task for the fetcher
     */
    tasks(first?: bigint, count?: bigint, maxTasks?: number): JobTask[];
    nextTasks(): void;
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
    jobStr(job: Job<JobTask, StorageData[][], StorageData[]>, withIndex?: boolean): string;
}
export {};
//# sourceMappingURL=storagefetcher.d.ts.map