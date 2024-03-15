import { DefaultStateManager } from '@ethereumjs/statemanager';
import { Trie } from '@ethereumjs/trie';
import { OrderedMap } from 'js-sdsl';
import { Fetcher } from './fetcher';
import type { Peer } from '../../net/peer';
import type { FetcherOptions } from './fetcher';
import type { Job, SnapFetcherDoneFlags } from './types';
import type { DB } from '@ethereumjs/util';
import type { Debugger } from 'debug';
declare type TrieNodesResponse = Uint8Array[] & {
    completed?: boolean;
};
/**
 * Implements an snap1 based trie node fetcher
 * @memberof module:sync/fetcher
 */
export interface TrieNodeFetcherOptions extends FetcherOptions {
    root: Uint8Array;
    accountToStorageTrie?: Map<String, Trie>;
    stateManager?: DefaultStateManager;
    /** Destroy fetcher once all tasks are done */
    destroyWhenDone?: boolean;
    fetcherDoneFlags?: SnapFetcherDoneFlags;
}
export declare type JobTask = {
    pathStrings: string[];
    paths: Uint8Array[][];
};
declare type FetchedNodeData = {
    parentHash: string;
    deps: number;
    nodeData: Uint8Array;
    path: string;
    pathToStorageNode?: Map<string, Uint8Array>;
};
declare type NodeRequestData = {
    nodeHash: string;
    nodeParentHash: string;
    parentAccountHash?: string;
};
export declare class TrieNodeFetcher extends Fetcher<JobTask, Uint8Array[], Uint8Array> {
    protected debug: Debugger;
    root: Uint8Array;
    stateManager: DefaultStateManager;
    fetcherDoneFlags: SnapFetcherDoneFlags;
    accountTrie: Trie;
    codeDB: DB;
    /**
     * Holds all paths and nodes that need to be requested
     *
     * A path is represented as a string of variable length between 0 to 129 characters.
     * The first 64 are used to represent the hex-encoded path in the account trie. The
     * final 64 are used to represent the hex-encoded path in the storage trie. A forward
     * slash ('/') is used as a separator. This format is referred to as a "sync" or
     * "stacked" path, representing the full path to a node in an account or storage trie.
     * All keys in pathToNodeRequestData are sync paths.
     */
    pathToNodeRequestData: OrderedMap<string, NodeRequestData>;
    requestedNodeToPath: Map<string, string>;
    fetchedAccountNodes: Map<string, FetchedNodeData>;
    nodeCount: number;
    keccakFunction: Function;
    /**
     * Create new trie node fetcher
     */
    constructor(options: TrieNodeFetcherOptions);
    setDestroyWhenDone(): void;
    /**
     * Request results from peer for the given job.
     * Resolves with the raw result
     * If `undefined` is returned, re-queue the job.
     * @param job
     * @param peer
     */
    request(job: Job<JobTask, Uint8Array[], Uint8Array>): Promise<TrieNodesResponse | undefined>;
    /**
     * Process the reply for the given job.
     * If the reply contains unexpected data, return `undefined`,
     * this re-queues the job.
     * @param job fetch job
     * @param result result data
     */
    process(job: Job<JobTask, Uint8Array[], Uint8Array>, result: TrieNodesResponse): Uint8Array[] | undefined;
    /**
     * Store fetch result. Resolves once store operation is complete.
     * @param result fetch result
     */
    store(result: Uint8Array[]): Promise<void>;
    getSortedPathStrings(): {
        pathStrings: string[];
    };
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
//# sourceMappingURL=trienodefetcher.d.ts.map