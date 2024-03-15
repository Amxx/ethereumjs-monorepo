import { ReverseBlockFetcher } from './fetcher';
import { Synchronizer } from './sync';
import type { VMExecution } from '../execution';
import type { Peer } from '../net/peer/peer';
import type { Skeleton } from '../service/skeleton';
import type { SynchronizerOptions } from './sync';
import type { Block } from '@ethereumjs/block';
interface BeaconSynchronizerOptions extends SynchronizerOptions {
    /** Skeleton chain */
    skeleton: Skeleton;
    /** VM Execution */
    execution: VMExecution;
}
/**
 * Beacon sync is the post-merge version of the chain synchronization, where the
 * chain is not downloaded from genesis onward, rather from trusted head backwards.
 * @memberof module:sync
 */
export declare class BeaconSynchronizer extends Synchronizer {
    skeleton: Skeleton;
    private execution;
    running: boolean;
    constructor(options: BeaconSynchronizerOptions);
    /**
     * Returns synchronizer type
     */
    get type(): string;
    get fetcher(): ReverseBlockFetcher | null;
    set fetcher(fetcher: ReverseBlockFetcher | null);
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
     * If passed a block, will initialize sync starting from the block.
     */
    start(): Promise<void>;
    reorged(block: Block): Promise<void>;
    /**
     * Returns true if the block successfully extends the chain.
     */
    extendChain(block: Block): Promise<boolean>;
    /**
     * Sets the new head of the skeleton chain.
     */
    setHead(block: Block): Promise<boolean>;
    /**
     * Sync blocks from the skeleton chain tail.
     * @param peer remote peer to sync with
     * @return Resolves when sync completed
     */
    syncWithPeer(peer?: Peer): Promise<boolean>;
    processSkeletonBlocks(blocks: Block[]): Promise<void>;
    /**
     * Runs vm execution on {@link Event.CHAIN_UPDATED}
     */
    runExecution(): Promise<void>;
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
//# sourceMappingURL=beaconsync.d.ts.map