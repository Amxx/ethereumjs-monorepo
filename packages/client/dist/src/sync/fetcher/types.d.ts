import type { Peer } from '../../net/peer';
export declare type Job<JobTask, JobResult, StorageItem> = {
    task: JobTask;
    time: number;
    index: number;
    result?: JobResult | StorageItem[];
    partialResult?: StorageItem[];
    state: 'idle' | 'expired' | 'active';
    peer: Peer | null;
};
export declare type SnapFetcherDoneFlags = {
    snapTargetHeight?: bigint;
    snapTargetRoot?: Uint8Array;
    snapTargetHash?: Uint8Array;
    done: boolean;
    syncing: boolean;
    accountFetcher: {
        started: boolean;
        first: bigint;
        done: boolean;
    };
    storageFetcher: {
        started: boolean;
        first: bigint;
        count: bigint;
        done: boolean;
    };
    byteCodeFetcher: {
        started: boolean;
        first: bigint;
        count: bigint;
        done: boolean;
    };
    trieNodeFetcher: {
        started: boolean;
        first: bigint;
        count: bigint;
        done: boolean;
    };
    stateRoot?: Uint8Array;
};
export declare function getInitFecherDoneFlags(): SnapFetcherDoneFlags;
//# sourceMappingURL=types.d.ts.map