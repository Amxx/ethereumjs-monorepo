import { BlockFetcher } from './fetcher';
import { Synchronizer } from './sync';
import type { VMExecution } from '../execution';
import type { Peer } from '../net/peer/peer';
import type { TxPool } from '../service/txpool';
import type { SynchronizerOptions } from './sync';
import type { Block } from '@ethereumjs/block';
interface FullSynchronizerOptions extends SynchronizerOptions {
    /** Tx Pool */
    txPool: TxPool;
    execution: VMExecution;
}
/**
 * Implements an ethereum full sync synchronizer
 * @memberof module:sync
 */
export declare class FullSynchronizer extends Synchronizer {
    private txPool;
    private execution;
    private newBlocksKnownByPeer;
    constructor(options: FullSynchronizerOptions);
    /**
     * Returns synchronizer type
     */
    get type(): string;
    get fetcher(): BlockFetcher | null;
    set fetcher(fetcher: BlockFetcher | null);
    sync(): Promise<boolean>;
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
     * Checks if tx pool should be started
     */
    checkTxPoolState(): void;
    /**
     * Sync all blocks and state from peer starting from current height.
     * @param peer remote peer to sync with
     * @returns a boolean if the setup was successful
     */
    syncWithPeer(peer?: Peer): Promise<boolean>;
    /**
     * Process blocks fetched from the fetcher.
     */
    processBlocks(blocks: Block[]): Promise<true | undefined>;
    /**
     * Add newly broadcasted blocks to peer record
     * @param blockHash hash of block received in NEW_BLOCK message
     * @param peer
     * @returns true if block has already been sent to peer
     */
    private addToKnownByPeer;
    /**
     * Send (broadcast) a new block to connected peers.
     * @param Block
     * @param peers
     */
    sendNewBlock(block: Block, peers: Peer[]): Promise<void>;
    /**
     * Handles `NEW_BLOCK` announcement from a peer and inserts into local chain if child of chain tip
     * @param blockData `NEW_BLOCK` received from peer
     * @param peer `Peer` that sent `NEW_BLOCK` announcement
     */
    handleNewBlock(block: Block, peer?: Peer): Promise<void>;
    /**
     * Chain was updated, new block hashes received
     * @param data new block hash announcements
     */
    handleNewBlockHashes(data: [Uint8Array, bigint][]): void;
    /**
     * Runs vm execution on {@link Event.CHAIN_UPDATED}
     */
    runExecution(): Promise<void>;
    stop(): Promise<boolean>;
    /**
     * Close synchronizer.
     */
    close(): Promise<void>;
}
export {};
//# sourceMappingURL=fullsync.d.ts.map