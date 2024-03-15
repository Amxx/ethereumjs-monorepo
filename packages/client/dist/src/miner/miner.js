"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Miner = void 0;
const block_1 = require("@ethereumjs/block");
const common_1 = require("@ethereumjs/common");
const ethash_1 = require("@ethereumjs/ethash");
const util_1 = require("@ethereumjs/util");
const memory_level_1 = require("memory-level");
const level_1 = require("../execution/level");
const types_1 = require("../types");
/**
 * @module miner
 */
/**
 * Implements Ethereum block creation and mining.
 * @memberof module:miner
 */
class Miner {
    /**
     * Create miner
     * @param options constructor parameters
     */
    constructor(options) {
        this.DEFAULT_PERIOD = 10;
        this.config = options.config;
        this.service = options.service;
        this.execution = this.service.execution;
        this.running = false;
        this.assembling = false;
        this.skipHardForkValidation = options.skipHardForkValidation;
        this.period =
            (this.config.chainCommon.consensusConfig().period ?? this.DEFAULT_PERIOD) *
                1000; // defined in ms for setTimeout use
        if (this.config.chainCommon.consensusType() === common_1.ConsensusType.ProofOfWork) {
            this.ethash = new ethash_1.Ethash(new level_1.LevelDB(new memory_level_1.MemoryLevel()));
        }
    }
    /**
     * Convenience alias to return the latest block in the blockchain
     */
    latestBlockHeader() {
        return this.service.chain.headers.latest;
    }
    /**
     * Sets the timeout for the next block assembly
     */
    async queueNextAssembly(timeout) {
        if (this._nextAssemblyTimeoutId) {
            clearTimeout(this._nextAssemblyTimeoutId);
        }
        if (!this.running) {
            return;
        }
        // Check if the new block to be minted isn't PoS
        const nextBlockHf = this.config.chainCommon.getHardforkBy({
            blockNumber: this.service.chain.headers.height + util_1.BIGINT_1,
            td: this.service.chain.headers.td,
        });
        if (this.config.chainCommon.hardforkGteHardfork(nextBlockHf, common_1.Hardfork.Paris)) {
            this.config.logger.info('Miner: reached merge hardfork - stopping');
            this.stop();
            return;
        }
        timeout = timeout ?? this.period;
        if (this.config.chainCommon.consensusType() === common_1.ConsensusType.ProofOfAuthority) {
            // EIP-225 spec: If the signer is out-of-turn,
            // delay signing by rand(SIGNER_COUNT * 500ms)
            const [signerAddress] = this.config.accounts[0];
            const { blockchain } = this.service.chain;
            const parentBlock = this.service.chain.blocks.latest;
            //eslint-disable-next-line
            const number = parentBlock.header.number + util_1.BIGINT_1;
            const inTurn = await blockchain.consensus.cliqueSignerInTurn(signerAddress, number);
            if (inTurn === false) {
                const signerCount = blockchain.consensus.cliqueActiveSigners(number).length;
                timeout += Math.random() * signerCount * 500;
            }
        }
        this._nextAssemblyTimeoutId = setTimeout(this.assembleBlock.bind(this), timeout);
        if (this.config.chainCommon.consensusType() === common_1.ConsensusType.ProofOfWork) {
            // If PoW, find next solution while waiting for next block assembly to start
            void this.findNextSolution();
        }
    }
    /**
     * Finds the next PoW solution.
     */
    async findNextSolution() {
        if (typeof this.ethash === 'undefined') {
            return;
        }
        this.config.logger.info('Miner: Finding next PoW solution 🔨');
        const header = this.latestBlockHeader();
        this.ethashMiner = this.ethash.getMiner(header);
        const solution = await this.ethashMiner.iterate(-1);
        if (!(0, util_1.equalsBytes)(header.hash(), this.latestBlockHeader().hash())) {
            // New block was inserted while iterating so we will discard solution
            return;
        }
        this.nextSolution = solution;
        this.config.logger.info('Miner: Found PoW solution 🔨');
        return solution;
    }
    /**
     * Sets the next block assembly to latestBlock.timestamp + period
     */
    async chainUpdated() {
        this.ethashMiner?.stop();
        const latestBlockHeader = this.latestBlockHeader();
        const target = Number(latestBlockHeader.timestamp) * 1000 + this.period - Date.now();
        const timeout = util_1.BIGINT_0 > target ? 0 : target;
        this.config.logger.debug(`Miner: Chain updated with block ${latestBlockHeader.number}. Queuing next block assembly in ${Math.round(timeout / 1000)}s`);
        await this.queueNextAssembly(timeout);
    }
    /**
     * Start miner
     */
    start() {
        if (!this.config.mine || this.running) {
            return false;
        }
        this.running = true;
        this._boundChainUpdatedHandler = this.chainUpdated.bind(this);
        this.config.events.on(types_1.Event.CHAIN_UPDATED, this._boundChainUpdatedHandler);
        this.config.logger.info(`Miner started. Assembling next block in ${this.period / 1000}s`);
        void this.queueNextAssembly();
        return true;
    }
    /**
     * Assembles a block from txs in the TxPool and adds it to the chain.
     * If a new block is received while assembling it will abort.
     */
    async assembleBlock() {
        if (this.assembling) {
            return;
        }
        this.assembling = true;
        // Abort if a new block is received while assembling this block
        // eslint-disable-next-line prefer-const
        let _boundSetInterruptHandler;
        let interrupt = false;
        const setInterrupt = () => {
            interrupt = true;
            this.assembling = false;
            this.config.events.removeListener(types_1.Event.CHAIN_UPDATED, _boundSetInterruptHandler);
        };
        _boundSetInterruptHandler = setInterrupt.bind(this);
        this.config.events.once(types_1.Event.CHAIN_UPDATED, _boundSetInterruptHandler);
        const parentBlock = this.service.chain.blocks.latest;
        //eslint-disable-next-line
        const number = parentBlock.header.number + util_1.BIGINT_1;
        let { gasLimit } = parentBlock.header;
        if (this.config.chainCommon.consensusType() === common_1.ConsensusType.ProofOfAuthority) {
            // Abort if we have too recently signed
            const cliqueSigner = this.config.accounts[0][1];
            const header = block_1.BlockHeader.fromHeaderData({ number }, { common: this.config.chainCommon, cliqueSigner });
            if (this.service.chain.blockchain.consensus.cliqueCheckRecentlySigned(header) === true) {
                this.config.logger.info(`Miner: We have too recently signed, waiting for next block`);
                this.assembling = false;
                return;
            }
        }
        if (this.config.chainCommon.consensusType() === common_1.ConsensusType.ProofOfWork) {
            while (this.nextSolution === undefined) {
                this.config.logger.info(`Miner: Waiting to find next PoW solution 🔨`);
                await new Promise((r) => setTimeout(r, 1000));
            }
        }
        // Use a copy of the vm to not modify the existing state.
        // The state will be updated when the newly assembled block
        // is inserted into the canonical chain.
        const vmCopy = await this.execution.vm.shallowCopy();
        // Set the state root to ensure the resulting state
        // is based on the parent block's state
        await vmCopy.stateManager.setStateRoot(parentBlock.header.stateRoot);
        let difficulty;
        let cliqueSigner;
        let inTurn;
        if (this.config.chainCommon.consensusType() === common_1.ConsensusType.ProofOfAuthority) {
            const [signerAddress, signerPrivKey] = this.config.accounts[0];
            cliqueSigner = signerPrivKey;
            // Determine if signer is INTURN (2) or NOTURN (1)
            inTurn = await vmCopy.blockchain.consensus.cliqueSignerInTurn(signerAddress, number);
            difficulty = inTurn ? 2 : 1;
        }
        let baseFeePerGas;
        const londonHardforkBlock = this.config.chainCommon.hardforkBlock(common_1.Hardfork.London);
        if (typeof londonHardforkBlock === 'bigint' &&
            londonHardforkBlock !== util_1.BIGINT_0 &&
            number === londonHardforkBlock) {
            // Get baseFeePerGas from `paramByEIP` since 1559 not currently active on common
            baseFeePerGas =
                this.config.chainCommon.paramByEIP('gasConfig', 'initialBaseFee', 1559) ?? util_1.BIGINT_0;
            // Set initial EIP1559 block gas limit to 2x parent gas limit per logic in `block.validateGasLimit`
            gasLimit = gasLimit * util_1.BIGINT_2;
        }
        else if (this.config.chainCommon.isActivatedEIP(1559) === true) {
            baseFeePerGas = parentBlock.header.calcNextBaseFee();
        }
        let calcDifficultyFromHeader;
        let coinbase;
        if (this.config.chainCommon.consensusType() === common_1.ConsensusType.ProofOfWork) {
            calcDifficultyFromHeader = parentBlock.header;
            coinbase = this.config.minerCoinbase ?? this.config.accounts[0][0];
        }
        const blockBuilder = await vmCopy.buildBlock({
            parentBlock,
            headerData: {
                number,
                difficulty,
                gasLimit,
                baseFeePerGas,
                coinbase,
            },
            blockOpts: {
                cliqueSigner,
                setHardfork: true,
                calcDifficultyFromHeader,
                putBlockIntoBlockchain: false,
            },
        });
        const txs = await this.service.txPool.txsByPriceAndNonce(vmCopy, { baseFee: baseFeePerGas });
        this.config.logger.info(`Miner: Assembling block from ${txs.length} eligible txs ${typeof baseFeePerGas === 'bigint' && baseFeePerGas !== util_1.BIGINT_0
            ? `(baseFee: ${baseFeePerGas})`
            : ''}`);
        let index = 0;
        let blockFull = false;
        const receipts = [];
        while (index < txs.length && !blockFull && !interrupt) {
            try {
                const txResult = await blockBuilder.addTransaction(txs[index], {
                    skipHardForkValidation: this.skipHardForkValidation,
                });
                if (this.config.saveReceipts) {
                    receipts.push(txResult.receipt);
                }
            }
            catch (error) {
                if (error.message ===
                    'tx has a higher gas limit than the remaining gas in the block') {
                    if (blockBuilder.gasUsed > gasLimit - BigInt(21000)) {
                        // If block has less than 21000 gas remaining, consider it full
                        blockFull = true;
                        this.config.logger.info(`Miner: Assembled block full (gasLeft: ${gasLimit - blockBuilder.gasUsed})`);
                    }
                }
                else {
                    // If there is an error adding a tx, it will be skipped
                    const hash = (0, util_1.bytesToHex)(txs[index].hash());
                    this.config.logger.debug(`Skipping tx ${hash}, error encountered when trying to add tx:\n${error}`);
                }
            }
            index++;
        }
        if (interrupt)
            return;
        // Build block, sealing it
        const block = await blockBuilder.build(this.nextSolution);
        if (this.config.saveReceipts) {
            await this.execution.receiptsManager?.saveReceipts(block, receipts);
        }
        this.config.logger.info(`Miner: Sealed block with ${block.transactions.length} txs ${this.config.chainCommon.consensusType() === common_1.ConsensusType.ProofOfWork
            ? `(difficulty: ${block.header.difficulty})`
            : `(${inTurn === true ? 'in turn' : 'not in turn'})`}`);
        this.assembling = false;
        if (interrupt)
            return;
        // Put block in blockchain
        await this.service.synchronizer.handleNewBlock(block);
        // Remove included txs from TxPool
        this.service.txPool.removeNewBlockTxs([block]);
        this.config.events.removeListener(types_1.Event.CHAIN_UPDATED, _boundSetInterruptHandler);
    }
    /**
     * Stop miner execution
     */
    stop() {
        if (!this.running) {
            return false;
        }
        this.config.events.removeListener(types_1.Event.CHAIN_UPDATED, this._boundChainUpdatedHandler);
        if (this._nextAssemblyTimeoutId) {
            clearTimeout(this._nextAssemblyTimeoutId);
        }
        this.running = false;
        this.config.logger.info('Miner stopped.');
        return true;
    }
}
exports.Miner = Miner;
//# sourceMappingURL=miner.js.map