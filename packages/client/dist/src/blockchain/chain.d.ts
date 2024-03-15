import { Block, BlockHeader } from '@ethereumjs/block';
import { Blockchain } from '@ethereumjs/blockchain';
import type { Config } from '../config';
import type { DB, DBObject, GenesisState } from '@ethereumjs/util';
import type { AbstractLevel } from 'abstract-level';
/**
 * The options that the Blockchain constructor can receive.
 */
export interface ChainOptions {
    /**
     * Client configuration instance
     */
    config: Config;
    /**
     * Database to store blocks and metadata. Should be an abstract-leveldown compliant store.
     */
    chainDB?: AbstractLevel<string | Uint8Array, string | Uint8Array, string | Uint8Array>;
    /**
     * Specify a blockchain which implements the Chain interface
     */
    blockchain?: Blockchain;
    genesisState?: GenesisState;
    genesisStateRoot?: Uint8Array;
}
/**
 * Returns properties of the canonical blockchain.
 */
export interface ChainBlocks {
    /**
     * The latest block in the chain
     */
    latest: Block | null;
    /**
     * The block as signalled `finalized` in the fcU
     * This corresponds to the last finalized beacon block
     */
    finalized: Block | null;
    /**
     * The block as signalled `safe` in the fcU
     * This corresponds to the last justified beacon block
     */
    safe: Block | null;
    /**
     * The header signalled as `vm` head
     * This corresponds to the last executed block in the canonical chain
     */
    vm: Block | null;
    /**
     * The total difficulty of the blockchain
     */
    td: bigint;
    /**
     * The height of the blockchain
     */
    height: bigint;
}
/**
 * Returns properties of the canonical headerchain.
 */
export interface ChainHeaders {
    /**
     * The latest header in the chain
     */
    latest: BlockHeader | null;
    /**
     * The header as signalled `finalized` in the fcU
     * This corresponds to the last finalized beacon block
     */
    finalized: BlockHeader | null;
    /**
     * The header as signalled `safe` in the fcU
     * This corresponds to the last justified beacon block
     */
    safe: BlockHeader | null;
    /**
     * The header signalled as `vm` head
     * This corresponds to the last executed block in the canonical chain
     */
    vm: BlockHeader | null;
    /**
     * The total difficulty of the headerchain
     */
    td: bigint;
    /**
     * The height of the headerchain
     */
    height: bigint;
}
declare type BlockCache = {
    remoteBlocks: Map<String, Block>;
    executedBlocks: Map<String, Block>;
    invalidBlocks: Map<String, Error>;
};
/**
 * Blockchain
 * @memberof module:blockchain
 */
export declare class Chain {
    config: Config;
    chainDB: DB<string | Uint8Array, string | Uint8Array | DBObject>;
    blockchain: Blockchain;
    blockCache: BlockCache;
    _customGenesisState?: GenesisState;
    _customGenesisStateRoot?: Uint8Array;
    opened: boolean;
    private _headers;
    private _blocks;
    /**
     * Safe creation of a Chain object awaiting the initialization
     * of the underlying Blockchain object.
     *
     * @param options
     */
    static create(options: ChainOptions): Promise<Chain>;
    /**
     * Creates new chain
     *
     * Do not use directly but instead use the static async `create()` constructor
     * for concurrency safe initialization.
     *
     * @param options
     */
    protected constructor(options: ChainOptions);
    /**
     * Resets _header, _blocks
     */
    private reset;
    /**
     * Network ID
     */
    get networkId(): bigint;
    /**
     * Genesis block for the chain
     */
    get genesis(): Block;
    /**
     * Returns properties of the canonical headerchain.
     */
    get headers(): ChainHeaders;
    /**
     * Returns properties of the canonical blockchain.
     */
    get blocks(): ChainBlocks;
    /**
     * Open blockchain and wait for database to load
     * @returns false if chain is already open, otherwise void
     */
    open(): Promise<boolean | void>;
    /**
     * Closes chain
     * @returns false if chain is closed, otherwise void
     */
    close(): Promise<boolean | void>;
    /**
     * Resets the chain to canonicalHead number
     */
    resetCanonicalHead(canonicalHead: bigint): Promise<boolean | void>;
    /**
     * Update blockchain properties (latest block, td, height, etc...)
     * @param emit Emit a `CHAIN_UPDATED` event
     * @returns false if chain is closed, otherwise void
     */
    update(emit?: boolean): Promise<boolean | void>;
    /**
     * Get blocks from blockchain
     * @param block hash or number to start from
     * @param max maximum number of blocks to get
     * @param skip number of blocks to skip
     * @param reverse get blocks in reverse
     * @returns an array of the blocks
     */
    getBlocks(block: Uint8Array | bigint, max?: number, skip?: number, reverse?: boolean): Promise<Block[]>;
    /**
     * Get a block by its hash or number
     * @param block block hash or number
     * @throws if block is not found
     */
    getBlock(block: Uint8Array | bigint): Promise<Block>;
    /**
     * Insert new blocks into blockchain
     * @param blocks list of blocks to add
     * @param fromEngine pass true to process post-merge blocks, otherwise they will be skipped
     * @returns number of blocks added
     */
    putBlocks(blocks: Block[], fromEngine?: boolean, skipUpdateEmit?: boolean): Promise<number>;
    /**
     * Get headers from blockchain
     * @param block hash or number to start from
     * @param max maximum number of headers to get
     * @param skip number of headers to skip
     * @param reverse get headers in reverse
     * @returns list of block headers
     */
    getHeaders(block: Uint8Array | bigint, max: number, skip: number, reverse: boolean): Promise<BlockHeader[]>;
    /**
     * Insert new headers into blockchain
     * @param headers
     * @param mergeIncludes skip adding headers after merge
     * @returns number of headers added
     */
    putHeaders(headers: BlockHeader[], mergeIncludes?: boolean): Promise<number>;
    /**
     * Gets the latest header in the canonical chain
     */
    getCanonicalHeadHeader(): Promise<BlockHeader>;
    /**
     * Gets the latest block in the canonical chain
     */
    getCanonicalHeadBlock(): Promise<Block>;
    /**
     * Gets the latest block in the canonical chain
     */
    getCanonicalSafeBlock(): Promise<Block | undefined>;
    /**
     * Gets the latest block in the canonical chain
     */
    getCanonicalFinalizedBlock(): Promise<Block | undefined>;
    /**
     * Gets the latest block in the canonical chain
     */
    getCanonicalVmHead(): Promise<Block>;
    /**
     * Gets total difficulty for a block
     * @param hash the block hash
     * @param num the block number
     * @returns the td
     */
    getTd(hash: Uint8Array, num: bigint): Promise<bigint>;
}
export {};
//# sourceMappingURL=chain.d.ts.map