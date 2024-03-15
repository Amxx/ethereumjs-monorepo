import type { Config } from '../config';
import type { Peer } from './peer';
export interface PeerPoolOptions {
    config: Config;
}
/**
 * @module net
 */
/**
 * Pool of connected peers
 * @memberof module:net
 */
export declare class PeerPool {
    config: Config;
    private pool;
    private noPeerPeriods;
    private opened;
    running: boolean;
    /**
     * Default status check interval (in ms)
     */
    private DEFAULT_STATUS_CHECK_INTERVAL;
    private _statusCheckInterval;
    private _reconnectTimeout;
    /**
     * Create new peer pool
     */
    constructor(options: PeerPoolOptions);
    init(): void;
    /**
     * Open pool
     */
    open(): Promise<boolean | void>;
    /**
     * Start peer pool
     */
    start(): Promise<boolean>;
    /**
     * Stop peer pool
     */
    stop(): Promise<boolean>;
    /**
     * Close pool
     */
    close(): Promise<void>;
    /**
     * Connected peers
     */
    get peers(): Peer[];
    /**
     * Number of peers in pool
     */
    get size(): number;
    /**
     * Return true if pool contains the specified peer
     * @param peer peer object or id
     */
    contains(peer: Peer | string): boolean;
    /**
     * Returns a random idle peer from the pool
     * @param filterFn filter function to apply before finding idle peers
     */
    idle(filterFn?: (_peer: Peer) => boolean): Peer | undefined;
    /**
     * Handler for peer connections
     * @param peer peer
     */
    private connected;
    /**
     * Handler for peer disconnections
     * @param peer peer
     */
    private disconnected;
    /**
     * Ban peer from being added to the pool for a period of time
     * @param peer peer
     * @param maxAge ban period in ms
     * @emits {@link Event.POOL_PEER_BANNED}
     */
    ban(peer: Peer, maxAge?: number): void;
    /**
     * Add peer to pool
     * @param peer peer
     * @emits {@link Event.POOL_PEER_ADDED}
     */
    add(peer?: Peer): void;
    /**
     * Remove peer from pool
     * @param peer peer
     * @emits {@link Event.POOL_PEER_REMOVED}
     */
    remove(peer?: Peer): void;
    /**
     * Peer pool status check on a repeated interval
     */
    _statusCheck(): Promise<void>;
}
//# sourceMappingURL=peerpool.d.ts.map