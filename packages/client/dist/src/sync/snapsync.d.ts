import { AccountFetcher } from './fetcher';
import { Synchronizer } from './sync';
import type { VMExecution } from '../execution';
import type { Peer } from '../net/peer/peer';
import type { Skeleton } from '../service/skeleton';
import type { SnapFetcherDoneFlags } from './fetcher/types';
import type { SynchronizerOptions } from './sync';
interface SnapSynchronizerOptions extends SynchronizerOptions {
    /** Skeleton chain */
    skeleton?: Skeleton;
    /** VM Execution */
    execution: VMExecution;
}
export declare class SnapSynchronizer extends Synchronizer {
    running: boolean;
    skeleton?: Skeleton;
    private execution;
    readonly fetcherDoneFlags: SnapFetcherDoneFlags;
    constructor(options: SnapSynchronizerOptions);
    /**
     * Returns synchronizer type
     */
    get type(): string;
    get fetcher(): AccountFetcher | null;
    set fetcher(fetcher: AccountFetcher | null);
    /**
     * Open synchronizer. Must be called before sync() is called
     */
    open(): Promise<void>;
    /**
     * Returns true if peer can be used for syncing
     */
    syncable(peer: Peer): boolean;
    /**
     * Finds the best peer to sync with. We will synchronize to this peer's
     * blockchain. Returns null if no valid peer is found
     */
    best(): Promise<Peer | undefined>;
    /**
     * Get latest header of peer
     */
    latest(peer: Peer): Promise<import("@ethereumjs/block").BlockHeader | undefined>;
    /**
     * Start synchronizer.
     */
    start(): Promise<void>;
    checkAndSync(): Promise<{
        syncedHash: Uint8Array;
        syncedRoot: Uint8Array;
        syncedHeight: bigint;
    } | null>;
    /**
     * Called from `sync()` to sync blocks and state from peer starting from current height.
     * @param peer remote peer to sync with
     * @returns a boolean if the setup was successful
     */
    syncWithPeer(peer?: Peer): Promise<boolean>;
    /**
     * Stop synchronization. Returns a promise that resolves once its stopped.
     */
    stop(): Promise<boolean>;
    /**
     * Close synchronizer.
     */
    close(): Promise<void>;
}
export {};
//# sourceMappingURL=snapsync.d.ts.map