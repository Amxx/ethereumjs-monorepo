import { FlowControl } from '../net/protocol';
import type { Chain } from '../blockchain';
import type { Config } from '../config';
import type { Peer } from '../net/peer/peer';
import type { PeerPool } from '../net/peerpool';
import type { AccountFetcher, BlockFetcher, HeaderFetcher, ReverseBlockFetcher } from './fetcher';
export interface SynchronizerOptions {
    config: Config;
    pool: PeerPool;
    chain: Chain;
    flow?: FlowControl;
    interval?: number;
}
/**
 * Base class for blockchain synchronizers
 * @memberof module:sync
 */
export declare abstract class Synchronizer {
    config: Config;
    protected pool: PeerPool;
    protected chain: Chain;
    protected flow: FlowControl;
    protected interval: number;
    protected forceSync: boolean;
    _fetcher: AccountFetcher | BlockFetcher | HeaderFetcher | ReverseBlockFetcher | null;
    opened: boolean;
    running: boolean;
    startingBlock: bigint;
    private SYNCED_STATE_REMOVAL_PERIOD;
    private _syncedStatusCheckInterval;
    /**
     * Create new node
     */
    constructor(options: SynchronizerOptions);
    /**
     * Returns synchronizer type
     */
    get type(): string;
    get fetcher(): AccountFetcher | BlockFetcher | HeaderFetcher | ReverseBlockFetcher | null;
    set fetcher(fetcher: AccountFetcher | BlockFetcher | HeaderFetcher | ReverseBlockFetcher | null);
    /**
     * Open synchronizer. Must be called before sync() is called
     */
    open(): Promise<void>;
    /**
     * Returns true if peer can be used for syncing
     */
    syncable(_peer: Peer): boolean;
    /**
     * Start synchronization
     */
    start(): Promise<void | boolean>;
    abstract best(): Promise<Peer | undefined>;
    abstract syncWithPeer(peer?: Peer): Promise<boolean>;
    resolveSync(height?: number): boolean;
    syncWithFetcher(): Promise<boolean>;
    /**
     * Fetch all blocks from current height up to highest found amongst peers
     * @returns when sync is completed
     */
    sync(): Promise<boolean>;
    /**
     * Clears and removes the fetcher.
     */
    clearFetcher(): void;
    /**
     * Stop synchronizer.
     */
    stop(): Promise<boolean>;
    /**
     * Close synchronizer.
     */
    close(): Promise<void>;
    /**
     * Reset synced status after a certain time with no chain updates
     */
    _syncedStatusCheck(): void;
}
//# sourceMappingURL=sync.d.ts.map