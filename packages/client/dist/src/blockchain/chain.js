"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chain = void 0;
const block_1 = require("@ethereumjs/block");
const blockchain_1 = require("@ethereumjs/blockchain");
const common_1 = require("@ethereumjs/common");
const util_1 = require("@ethereumjs/util");
const level_1 = require("../execution/level");
const types_1 = require("../types");
/**
 * Blockchain
 * @memberof module:blockchain
 */
class Chain {
    /**
     * Creates new chain
     *
     * Do not use directly but instead use the static async `create()` constructor
     * for concurrency safe initialization.
     *
     * @param options
     */
    constructor(options) {
        this._headers = {
            latest: null,
            finalized: null,
            safe: null,
            vm: null,
            td: util_1.BIGINT_0,
            height: util_1.BIGINT_0,
        };
        this._blocks = {
            latest: null,
            finalized: null,
            safe: null,
            vm: null,
            td: util_1.BIGINT_0,
            height: util_1.BIGINT_0,
        };
        this.config = options.config;
        this.blockchain = options.blockchain;
        this.blockCache = {
            remoteBlocks: new Map(),
            executedBlocks: new Map(),
            invalidBlocks: new Map(),
        };
        this.chainDB = this.blockchain.db;
        this._customGenesisState = options.genesisState;
        this._customGenesisStateRoot = options.genesisStateRoot;
        this.opened = false;
    }
    /**
     * Safe creation of a Chain object awaiting the initialization
     * of the underlying Blockchain object.
     *
     * @param options
     */
    static async create(options) {
        let validateConsensus = false;
        if (options.config.chainCommon.consensusAlgorithm() === common_1.ConsensusAlgorithm.Clique) {
            validateConsensus = true;
        }
        options.blockchain =
            options.blockchain ??
                new blockchain_1.Blockchain({
                    db: new level_1.LevelDB(options.chainDB),
                    common: options.config.chainCommon,
                    hardforkByHeadBlockNumber: true,
                    validateBlocks: true,
                    validateConsensus,
                });
        return new this(options);
    }
    /**
     * Resets _header, _blocks
     */
    reset() {
        this._headers = {
            latest: null,
            finalized: null,
            safe: null,
            vm: null,
            td: util_1.BIGINT_0,
            height: util_1.BIGINT_0,
        };
        this._blocks = {
            latest: null,
            finalized: null,
            safe: null,
            vm: null,
            td: util_1.BIGINT_0,
            height: util_1.BIGINT_0,
        };
    }
    /**
     * Network ID
     */
    get networkId() {
        return this.config.chainCommon.networkId();
    }
    /**
     * Genesis block for the chain
     */
    get genesis() {
        return this.blockchain.genesisBlock;
    }
    /**
     * Returns properties of the canonical headerchain.
     */
    get headers() {
        return { ...this._headers };
    }
    /**
     * Returns properties of the canonical blockchain.
     */
    get blocks() {
        return { ...this._blocks };
    }
    /**
     * Open blockchain and wait for database to load
     * @returns false if chain is already open, otherwise void
     */
    async open() {
        if (this.opened)
            return false;
        await this.blockchain.db.open();
        await this.blockchain._init({
            genesisState: this._customGenesisState,
            genesisStateRoot: this._customGenesisStateRoot,
        });
        this.opened = true;
        await this.update(false);
        this.config.chainCommon.events.on('hardforkChanged', async (hardfork) => {
            const block = this.config.chainCommon.hardforkBlock();
            this.config.superMsg(`New hardfork reached 🪢 ! hardfork=${hardfork} ${block !== null ? `block=${block}` : ''}`);
        });
    }
    /**
     * Closes chain
     * @returns false if chain is closed, otherwise void
     */
    async close() {
        if (!this.opened)
            return false;
        this.reset();
        await this.blockchain.db?.close?.();
        this.opened = false;
    }
    /**
     * Resets the chain to canonicalHead number
     */
    async resetCanonicalHead(canonicalHead) {
        if (!this.opened)
            return false;
        await this.blockchain.resetCanonicalHead(canonicalHead);
        return this.update(false);
    }
    /**
     * Update blockchain properties (latest block, td, height, etc...)
     * @param emit Emit a `CHAIN_UPDATED` event
     * @returns false if chain is closed, otherwise void
     */
    async update(emit = true) {
        if (!this.opened)
            return false;
        const headers = {
            latest: null,
            finalized: null,
            safe: null,
            vm: null,
            td: util_1.BIGINT_0,
            height: util_1.BIGINT_0,
        };
        const blocks = {
            latest: null,
            finalized: null,
            safe: null,
            vm: null,
            td: util_1.BIGINT_0,
            height: util_1.BIGINT_0,
        };
        blocks.latest = await this.getCanonicalHeadBlock();
        blocks.finalized = (await this.getCanonicalFinalizedBlock()) ?? null;
        blocks.safe = (await this.getCanonicalSafeBlock()) ?? null;
        blocks.vm = await this.getCanonicalVmHead();
        headers.latest = await this.getCanonicalHeadHeader();
        // finalized and safe are always blocks since they have to have valid execution
        // before they can be saved in chain
        headers.finalized = blocks.finalized?.header ?? null;
        headers.safe = blocks.safe?.header ?? null;
        headers.vm = blocks.vm.header;
        headers.height = headers.latest.number;
        blocks.height = blocks.latest.header.number;
        headers.td = await this.getTd(headers.latest.hash(), headers.height);
        blocks.td = await this.getTd(blocks.latest.hash(), blocks.height);
        this._headers = headers;
        this._blocks = blocks;
        const parentTd = await this.blockchain.getParentTD(headers.latest);
        this.config.chainCommon.setHardforkBy({
            blockNumber: headers.latest.number,
            td: parentTd,
            timestamp: headers.latest.timestamp,
        });
        // Check and log if this is a terminal block and next block could be merge
        if (!this.config.chainCommon.gteHardfork(common_1.Hardfork.Paris)) {
            const nextBlockHf = this.config.chainCommon.getHardforkBy({
                blockNumber: headers.height + util_1.BIGINT_1,
                td: headers.td,
            });
            if (this.config.chainCommon.hardforkGteHardfork(nextBlockHf, common_1.Hardfork.Paris)) {
                this.config.logger.info('*'.repeat(85));
                this.config.logger.info(`Paris (Merge) hardfork reached 🐼 👉 👈 🐼 ! block=${headers.height} td=${headers.td}`);
                this.config.logger.info('-'.repeat(85));
                this.config.logger.info(' ');
                this.config.logger.info('Consensus layer client (CL) needed for continued sync:');
                this.config.logger.info('https://ethereum.org/en/developers/docs/nodes-and-clients/#consensus-clients');
                this.config.logger.info(' ');
                this.config.logger.info('Make sure to have the JSON RPC (--rpc) and Engine API (--rpcEngine) endpoints exposed');
                this.config.logger.info('and JWT authentication configured (see client README).');
                this.config.logger.info(' ');
                this.config.logger.info('*'.repeat(85));
                this.config.logger.info(`Transitioning to PoS! First block for CL-framed execution: block=${headers.height + util_1.BIGINT_1}`);
            }
        }
        if (emit) {
            this.config.events.emit(types_1.Event.CHAIN_UPDATED);
        }
    }
    /**
     * Get blocks from blockchain
     * @param block hash or number to start from
     * @param max maximum number of blocks to get
     * @param skip number of blocks to skip
     * @param reverse get blocks in reverse
     * @returns an array of the blocks
     */
    async getBlocks(block, max = 1, skip = 0, reverse = false) {
        if (!this.opened)
            throw new Error('Chain closed');
        return this.blockchain.getBlocks(block, max, skip, reverse);
    }
    /**
     * Get a block by its hash or number
     * @param block block hash or number
     * @throws if block is not found
     */
    async getBlock(block) {
        if (!this.opened)
            throw new Error('Chain closed');
        return this.blockchain.getBlock(block);
    }
    /**
     * Insert new blocks into blockchain
     * @param blocks list of blocks to add
     * @param fromEngine pass true to process post-merge blocks, otherwise they will be skipped
     * @returns number of blocks added
     */
    async putBlocks(blocks, fromEngine = false, skipUpdateEmit = false) {
        if (!this.opened)
            throw new Error('Chain closed');
        if (blocks.length === 0)
            return 0;
        let numAdded = 0;
        // filter out finalized blocks
        const newBlocks = [];
        for (const block of blocks) {
            if (this.headers.finalized !== null && block.header.number <= this.headers.finalized.number) {
                const canonicalBlock = await this.getBlock(block.header.number);
                if (!(0, util_1.equalsBytes)(canonicalBlock.hash(), block.hash())) {
                    throw Error(`Invalid putBlock for block=${block.header.number} before finalized=${this.headers.finalized.number}`);
                }
            }
            else {
                newBlocks.push(block);
            }
        }
        for (const [i, b] of newBlocks.entries()) {
            if (!fromEngine && this.config.chainCommon.gteHardfork(common_1.Hardfork.Paris)) {
                if (i > 0) {
                    // emitOnLast below won't be reached, so run an update here
                    await this.update(!skipUpdateEmit);
                }
                break;
            }
            const td = await this.blockchain.getParentTD(b.header);
            if (b.header.number <= this.headers.height) {
                await this.blockchain.checkAndTransitionHardForkByNumber(b.header.number, td, b.header.timestamp);
                await this.blockchain.consensus.setup({ blockchain: this.blockchain });
            }
            const block = block_1.Block.fromValuesArray(b.raw(), {
                common: this.config.chainCommon,
                setHardfork: td,
            });
            await this.blockchain.putBlock(block);
            numAdded++;
            const emitOnLast = newBlocks.length === numAdded;
            await this.update(emitOnLast && !skipUpdateEmit);
        }
        return numAdded;
    }
    /**
     * Get headers from blockchain
     * @param block hash or number to start from
     * @param max maximum number of headers to get
     * @param skip number of headers to skip
     * @param reverse get headers in reverse
     * @returns list of block headers
     */
    async getHeaders(block, max, skip, reverse) {
        const blocks = await this.getBlocks(block, max, skip, reverse);
        return blocks.map((b) => b.header);
    }
    /**
     * Insert new headers into blockchain
     * @param headers
     * @param mergeIncludes skip adding headers after merge
     * @returns number of headers added
     */
    async putHeaders(headers, mergeIncludes = false) {
        if (!this.opened)
            throw new Error('Chain closed');
        if (headers.length === 0)
            return 0;
        let numAdded = 0;
        for (const [i, h] of headers.entries()) {
            if (!mergeIncludes && this.config.chainCommon.gteHardfork(common_1.Hardfork.Paris)) {
                if (i > 0) {
                    // emitOnLast below won't be reached, so run an update here
                    await this.update(true);
                }
                break;
            }
            const header = block_1.BlockHeader.fromValuesArray(h.raw(), {
                common: this.config.chainCommon,
                setHardfork: this.headers.td,
            });
            await this.blockchain.putHeader(header);
            numAdded++;
            const emitOnLast = headers.length === numAdded;
            await this.update(emitOnLast);
        }
        return numAdded;
    }
    /**
     * Gets the latest header in the canonical chain
     */
    async getCanonicalHeadHeader() {
        if (!this.opened)
            throw new Error('Chain closed');
        return this.blockchain.getCanonicalHeadHeader();
    }
    /**
     * Gets the latest block in the canonical chain
     */
    async getCanonicalHeadBlock() {
        if (!this.opened)
            throw new Error('Chain closed');
        return this.blockchain.getCanonicalHeadBlock();
    }
    /**
     * Gets the latest block in the canonical chain
     */
    async getCanonicalSafeBlock() {
        if (!this.opened)
            throw new Error('Chain closed');
        return this.blockchain.getIteratorHeadSafe('safe');
    }
    /**
     * Gets the latest block in the canonical chain
     */
    async getCanonicalFinalizedBlock() {
        if (!this.opened)
            throw new Error('Chain closed');
        return this.blockchain.getIteratorHeadSafe('finalized');
    }
    /**
     * Gets the latest block in the canonical chain
     */
    async getCanonicalVmHead() {
        if (!this.opened)
            throw new Error('Chain closed');
        return this.blockchain.getIteratorHead();
    }
    /**
     * Gets total difficulty for a block
     * @param hash the block hash
     * @param num the block number
     * @returns the td
     */
    async getTd(hash, num) {
        if (!this.opened)
            throw new Error('Chain closed');
        return this.blockchain.getTotalDifficulty(hash, num);
    }
}
exports.Chain = Chain;
//# sourceMappingURL=chain.js.map