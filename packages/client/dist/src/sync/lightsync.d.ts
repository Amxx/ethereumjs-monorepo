import { HeaderFetcher } from './fetcher';
import { Synchronizer } from './sync';
import type { Peer } from '../net/peer/peer';
import type { SynchronizerOptions } from './sync';
import type { BlockHeader } from '@ethereumjs/block';
/**
 * Implements an ethereum light sync synchronizer
 * @memberof module:sync
 */
export declare class LightSynchronizer extends Synchronizer {
    constructor(options: SynchronizerOptions);
    /**
     * Returns synchronizer type
     */
    get type(): string;
    get fetcher(): HeaderFetcher | null;
    set fetcher(fetcher: HeaderFetcher | null);
    /**
     * Open synchronizer. Must be called before sync() is called
     */
    open(): Promise<void>;
    /**
     * Returns true if peer can be used for syncing
     */
    syncable(peer: Peer): boolean;
    /**
     * Finds the best peer to sync with.
     * We will synchronize to this peer's blockchain.
     * @returns undefined if no valid peer is found
     */
    best(): Promise<Peer | undefined>;
    /**
     * Get latest header of peer
     */
    latest(peer: Peer): Promise<BlockHeader | undefined>;
    /**
     * Called from `sync()` to sync headers and state from peer starting from current height.
     * @param peer remote peer to sync with
     * @returns a boolean if the setup was successful
     */
    syncWithPeer(peer?: Peer): Promise<boolean>;
    /**
     * Process headers fetched from the fetcher.
     */
    processHeaders(headers: BlockHeader[]): Promise<void>;
    /**
     * Stop synchronizer.
     */
    stop(): Promise<boolean>;
}
//# sourceMappingURL=lightsync.d.ts.map