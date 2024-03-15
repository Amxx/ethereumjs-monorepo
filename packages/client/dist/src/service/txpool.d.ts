import type { Config } from '../config';
import type { Peer } from '../net/peer';
import type { PeerPool } from '../net/peerpool';
import type { FullEthereumService } from './fullethereumservice';
import type { Block } from '@ethereumjs/block';
import type { TypedTransaction } from '@ethereumjs/tx';
import type { VM } from '@ethereumjs/vm';
export interface TxPoolOptions {
    config: Config;
    service: FullEthereumService;
}
declare type TxPoolObject = {
    tx: TypedTransaction;
    hash: UnprefixedHash;
    added: number;
    error?: Error;
};
declare type UnprefixedAddress = string;
declare type UnprefixedHash = string;
/**
 * @module service
 */
/**
 * Tx pool (mempool)
 * @memberof module:service
 */
export declare class TxPool {
    private config;
    private service;
    private opened;
    running: boolean;
    private _cleanupInterval;
    private _logInterval;
    /**
     * List of pending tx hashes to avoid double requests
     */
    private pending;
    /**
     * The central pool dataset.
     *
     * Maps an address to a `TxPoolObject`
     */
    pool: Map<UnprefixedAddress, TxPoolObject[]>;
    /**
     * The number of txs currently in the pool
     */
    txsInPool: number;
    /**
     * Map for handled tx hashes
     * (have been added to the pool at some point)
     *
     * This is meant to be a superset of the tx pool
     * so at any point it time containing minimally
     * all txs from the pool.
     */
    private handled;
    /**
     * Map for tx hashes a peer is already aware of
     * (so no need to re-broadcast)
     */
    private knownByPeer;
    /**
     * Activate before chain head is reached to start
     * tx pool preparation (sorting out included txs)
     */
    BLOCKS_BEFORE_TARGET_HEIGHT_ACTIVATION: number;
    /**
     * Max number of txs to request
     */
    private TX_RETRIEVAL_LIMIT;
    /**
     * Number of minutes to keep txs in the pool
     */
    POOLED_STORAGE_TIME_LIMIT: number;
    /**
     * Number of minutes to forget about handled
     * txs (for cleanup/memory reasons)
     */
    HANDLED_CLEANUP_TIME_LIMIT: number;
    /**
     * Rebroadcast full txs and new blocks to a fraction
     * of peers by doing
     * `max(1, floor(NUM_PEERS/NUM_PEERS_REBROADCAST_QUOTIENT))`
     */
    NUM_PEERS_REBROADCAST_QUOTIENT: number;
    /**
     * Log pool statistics on the given interval
     */
    private LOG_STATISTICS_INTERVAL;
    /**
     * Create new tx pool
     * @param options constructor parameters
     */
    constructor(options: TxPoolOptions);
    /**
     * Open pool
     */
    open(): boolean;
    /**
     * Start tx processing
     */
    start(): boolean;
    /**
     * Checks if tx pool should be started
     */
    checkRunState(): void;
    private validateTxGasBump;
    /**
     * Validates a transaction against the pool and other constraints
     * @param tx The tx to validate
     */
    private validate;
    /**
     * Adds a tx to the pool.
     *
     * If there is a tx in the pool with the same address and
     * nonce it will be replaced by the new tx, if it has a sufficient gas bump.
     * This also verifies certain constraints, if these are not met, tx will not be added to the pool.
     * @param tx Transaction
     * @param isLocalTransaction if this is a local transaction (loosens some constraints) (default: false)
     */
    add(tx: TypedTransaction, isLocalTransaction?: boolean): Promise<void>;
    /**
     * Returns the available txs from the pool
     * @param txHashes
     * @returns Array with tx objects
     */
    getByHash(txHashes: Uint8Array[]): TypedTransaction[];
    /**
     * Removes the given tx from the pool
     * @param txHash Hash of the transaction
     */
    removeByHash(txHash: UnprefixedHash): void;
    /**
     * Adds passed in txs to the map keeping track
     * of tx hashes known by a peer.
     * @param txHashes
     * @param peer
     * @returns Array with txs which are new to the list
     */
    addToKnownByPeer(txHashes: Uint8Array[], peer: Peer): Uint8Array[];
    /**
     * Send (broadcast) tx hashes from the pool to connected
     * peers.
     *
     * Double sending is avoided by compare towards the
     * `SentTxHashes` map.
     * @param txHashes Array with transactions to send
     * @param peers
     */
    sendNewTxHashes(txs: [number[], number[], Uint8Array[]], peers: Peer[]): void;
    /**
     * Send transactions to other peers in the peer pool
     *
     * Note that there is currently no data structure to avoid
     * double sending to a peer, so this has to be made sure
     * by checking on the context the sending is performed.
     * @param txs Array with transactions to send
     * @param peers
     */
    sendTransactions(txs: TypedTransaction[], peers: Peer[]): void;
    private markFailedSends;
    /**
     * Include new announced txs in the pool
     * and re-broadcast to other peers
     * @param txs
     * @param peer Announcing peer
     * @param peerPool Reference to the {@link PeerPool}
     */
    handleAnnouncedTxs(txs: TypedTransaction[], peer: Peer, peerPool: PeerPool): Promise<void>;
    /**
     * Request new pooled txs from tx hashes announced and include them in the pool
     * and re-broadcast to other peers
     * @param txHashes new tx hashes announced
     * @param peer Announcing peer
     * @param peerPool Reference to the peer pool
     */
    handleAnnouncedTxHashes(txHashes: Uint8Array[], peer: Peer, peerPool: PeerPool): Promise<void>;
    /**
     * Remove txs included in the latest blocks from the tx pool
     */
    removeNewBlockTxs(newBlocks: Block[]): void;
    /**
     * Regular tx pool cleanup
     */
    cleanup(): void;
    /**
     * Helper to return a normalized gas price across different
     * transaction types. Providing the baseFee param returns the
     * priority tip, and omitting it returns the max total fee.
     * @param tx The tx
     * @param baseFee Provide a baseFee to subtract from the legacy
     * gasPrice to determine the leftover priority tip.
     */
    private normalizedGasPrice;
    /**
     * Returns the GasPrice object to provide information of the tx' gas prices
     * @param tx Tx to use
     * @returns Gas price (both tip and max fee)
     */
    private txGasPrice;
    /**
     * Returns eligible txs to be mined sorted by price in such a way that the
     * nonce orderings within a single account are maintained.
     *
     * Note, this is not as trivial as it seems from the first look as there are three
     * different criteria that need to be taken into account (price, nonce, account
     * match), which cannot be done with any plain sorting method, as certain items
     * cannot be compared without context.
     *
     * This method first sorts the separates the list of transactions into individual
     * sender accounts and sorts them by nonce. After the account nonce ordering is
     * satisfied, the results are merged back together by price, always comparing only
     * the head transaction from each account. This is done via a heap to keep it fast.
     *
     * @param baseFee Provide a baseFee to exclude txs with a lower gasPrice
     */
    txsByPriceAndNonce(vm: VM, { baseFee, allowedBlobs }?: {
        baseFee?: bigint;
        allowedBlobs?: number;
    }): Promise<TypedTransaction[]>;
    /**
     * Stop pool execution
     */
    stop(): boolean;
    /**
     * Close pool
     */
    close(): void;
    _logPoolStats(): void;
}
export {};
//# sourceMappingURL=txpool.d.ts.map