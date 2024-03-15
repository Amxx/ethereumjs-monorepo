import { DefaultStateManager } from '@ethereumjs/statemanager';
import { Trie } from '@ethereumjs/trie';
import { ByteCodeFetcher } from './bytecodefetcher';
import { Fetcher } from './fetcher';
import { StorageFetcher } from './storagefetcher';
import { TrieNodeFetcher } from './trienodefetcher';
import type { Peer } from '../../net/peer';
import type { AccountData } from '../../net/protocol/snapprotocol';
import type { FetcherOptions } from './fetcher';
import type { Job, SnapFetcherDoneFlags } from './types';
import type { Debugger } from 'debug';
declare type AccountDataResponse = AccountData[] & {
    completed?: boolean;
};
/**
 * Implements an snap1 based account fetcher
 * @memberof module:sync/fetcher
 */
export interface AccountFetcherOptions extends FetcherOptions {
    /** Root hash of the account trie to serve */
    root: Uint8Array;
    /** The origin to start account fetcher from (including), by default starts from 0 (0x0000...) */
    first: bigint;
    /** The range to eventually, by default should be set at BIGINT_2 ** BigInt(256) + BIGINT_1 - first */
    count?: bigint;
    /** Destroy fetcher once all tasks are done */
    destroyWhenDone?: boolean;
    stateManager?: DefaultStateManager;
    fetcherDoneFlags?: SnapFetcherDoneFlags;
}
export declare type JobTask = {
    /** The origin to start account fetcher from */
    first: bigint;
    /** Range to eventually fetch */
    count: bigint;
};
export declare class AccountFetcher extends Fetcher<JobTask, AccountData[], AccountData> {
    protected debug: Debugger;
    stateManager: DefaultStateManager;
    accountTrie: Trie;
    root: Uint8Array;
    highestKnownHash: Uint8Array | undefined;
    /** The origin to start account fetcher from (including), by default starts from 0 (0x0000...) */
    first: bigint;
    /** The range to eventually, by default should be set at BIGINT_2 ** BigInt(256) + BIGINT_1 - first */
    count: bigint;
    storageFetcher: StorageFetcher;
    byteCodeFetcher: ByteCodeFetcher;
    trieNodeFetcher: TrieNodeFetcher;
    private readonly fetcherDoneFlags;
    /**
     * Create new block fetcher
     */
    constructor(options: AccountFetcherOptions);
    blockingFetch(): Promise<boolean>;
    snapFetchersCompleted(fetcherType: Object, root?: Uint8Array): void;
    private verifyRangeProof;
    private getOrigin;
    private getLimit;
    private isMissingRightRange;
    /**
     * Request results from peer for the given job.
     * Resolves with the raw result
     * If `undefined` is returned, re-queue the job.
     * @param job
     * @param peer
     */
    request(job: Job<JobTask, AccountData[], AccountData>): Promise<AccountDataResponse | undefined>;
    /**
     * Process the reply for the given job.
     * If the reply contains unexpected data, return `undefined`,
     * this re-queues the job.
     * @param job fetch job
     * @param result result data
     */
    process(job: Job<JobTask, AccountData[], AccountData>, result: AccountDataResponse): AccountData[] | undefined;
    /**
     * Store fetch result. Resolves once store operation is complete.
     * @param result fetch result
     */
    store(result: AccountData[]): Promise<void>;
    /**
     * Generate list of tasks to fetch. Modifies `first` and `count` to indicate
     * remaining items apart from the tasks it pushes in the queue
     *
     * Divides the full 256-bit range of hashes into ranges of @maxAccountRange
     * size and turnes each range into a task for the fetcher
     */
    tasks(first?: bigint, count?: bigint, maxTasks?: number): JobTask[];
    updateStateRoot(stateRoot: Uint8Array): void;
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
    jobStr(job: Job<JobTask, AccountData[], AccountData>, withIndex?: boolean): string;
}
export {};
//# sourceMappingURL=accountfetcher.d.ts.map