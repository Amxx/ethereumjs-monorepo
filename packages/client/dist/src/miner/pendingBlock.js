"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PendingBlock = void 0;
const common_1 = require("@ethereumjs/common");
const tx_1 = require("@ethereumjs/tx");
const util_1 = require("@ethereumjs/util");
const vm_1 = require("@ethereumjs/vm");
const keccak_1 = require("ethereum-cryptography/keccak");
/**
 * In the future this class should build a pending block by keeping the
 * transaction set up-to-date with the state of local mempool until called.
 *
 * For now this simple implementation just adds txs from the pool when
 * started and called.
 */
// Max two payload to be cached
const MAX_PAYLOAD_CACHE = 2;
var AddTxResult;
(function (AddTxResult) {
    AddTxResult[AddTxResult["Success"] = 0] = "Success";
    AddTxResult[AddTxResult["BlockFull"] = 1] = "BlockFull";
    AddTxResult[AddTxResult["SkippedByGasLimit"] = 2] = "SkippedByGasLimit";
    AddTxResult[AddTxResult["SkippedByErrors"] = 3] = "SkippedByErrors";
    AddTxResult[AddTxResult["RemovedByErrors"] = 4] = "RemovedByErrors";
})(AddTxResult || (AddTxResult = {}));
class PendingBlock {
    constructor(opts) {
        this.pendingPayloads = new Map();
        this.blobsBundles = new Map();
        /**
         * An internal helper for storing the blob bundle associated with each transaction in an EIP4844 world
         * @param payloadId the payload Id of the pending block
         * @param txs an array of {@BlobEIP4844Transaction } transactions
         * @param blockHash the blockhash of the pending block (computed from the header data provided)
         */
        this.constructBlobsBundle = (payloadId, txs) => {
            let blobs = [];
            let commitments = [];
            let proofs = [];
            const bundle = this.blobsBundles.get(payloadId);
            if (bundle !== undefined) {
                blobs = bundle.blobs;
                commitments = bundle.commitments;
                proofs = bundle.proofs;
            }
            for (let tx of txs) {
                tx = tx;
                if (tx.blobs !== undefined && tx.blobs.length > 0) {
                    blobs = blobs.concat(tx.blobs);
                    commitments = commitments.concat(tx.kzgCommitments);
                    proofs = proofs.concat(tx.kzgProofs);
                }
            }
            const blobsBundle = {
                blobs,
                commitments,
                proofs,
            };
            this.blobsBundles.set(payloadId, blobsBundle);
            return blobsBundle;
        };
        this.config = opts.config;
        this.txPool = opts.txPool;
        this.skipHardForkValidation = opts.skipHardForkValidation;
    }
    pruneSetToMax(maxItems) {
        let itemsToDelete = this.pendingPayloads.size - maxItems;
        const deletedItems = Math.max(0, itemsToDelete);
        if (itemsToDelete > 0) {
            // keys are in fifo order
            for (const payloadId of this.pendingPayloads.keys()) {
                this.stop(payloadId);
                itemsToDelete--;
                if (itemsToDelete <= 0) {
                    break;
                }
            }
        }
        return deletedItems;
    }
    /**
     * Starts building a pending block with the given payload
     * @returns an 8-byte payload identifier to call {@link BlockBuilder.build} with
     */
    async start(vm, parentBlock, headerData = {}, withdrawals) {
        const number = parentBlock.header.number + util_1.BIGINT_1;
        const { timestamp, mixHash, parentBeaconBlockRoot, coinbase } = headerData;
        let { gasLimit } = parentBlock.header;
        if (typeof vm.blockchain.getTotalDifficulty !== 'function') {
            throw new Error('cannot get iterator head: blockchain has no getTotalDifficulty function');
        }
        const td = await vm.blockchain.getTotalDifficulty(parentBlock.hash());
        vm.common.setHardforkBy({
            blockNumber: number,
            td,
            timestamp,
        });
        const baseFeePerGas = parentBlock.header.common.isActivatedEIP(1559)
            ? parentBlock.header.calcNextBaseFee()
            : undefined;
        if (number === vm.common.hardforkBlock(common_1.Hardfork.London)) {
            gasLimit = gasLimit * util_1.BIGINT_2;
        }
        // payload is uniquely defined by timestamp, parent and mixHash, gasLimit can also be
        // potentially included in the fcU in future and can be safely added in uniqueness calc
        const timestampBuf = (0, util_1.bigIntToUnpaddedBytes)((0, util_1.toType)(timestamp ?? 0, util_1.TypeOutput.BigInt));
        const gasLimitBuf = (0, util_1.bigIntToUnpaddedBytes)(gasLimit);
        const mixHashBuf = (0, util_1.toType)(mixHash, util_1.TypeOutput.Uint8Array) ?? (0, util_1.zeros)(32);
        const parentBeaconBlockRootBuf = (0, util_1.toType)(parentBeaconBlockRoot, util_1.TypeOutput.Uint8Array) ?? (0, util_1.zeros)(32);
        const coinbaseBuf = (0, util_1.toType)(coinbase ?? (0, util_1.zeros)(20), util_1.TypeOutput.Uint8Array);
        let withdrawalsBuf = (0, util_1.zeros)(0);
        if (withdrawals !== undefined && withdrawals !== null) {
            const withdrawalsBufTemp = [];
            for (const withdrawal of withdrawals) {
                const indexBuf = (0, util_1.bigIntToUnpaddedBytes)((0, util_1.toType)(withdrawal.index ?? 0, util_1.TypeOutput.BigInt));
                const validatorIndex = (0, util_1.bigIntToUnpaddedBytes)((0, util_1.toType)(withdrawal.validatorIndex ?? 0, util_1.TypeOutput.BigInt));
                const address = (0, util_1.toType)(withdrawal.address ?? util_1.Address.zero(), util_1.TypeOutput.Uint8Array);
                const amount = (0, util_1.bigIntToUnpaddedBytes)((0, util_1.toType)(withdrawal.amount ?? 0, util_1.TypeOutput.BigInt));
                withdrawalsBufTemp.push((0, util_1.concatBytes)(indexBuf, validatorIndex, address, amount));
            }
            withdrawalsBuf = (0, util_1.concatBytes)(...withdrawalsBufTemp);
        }
        const keccakFunction = this.config.chainCommon.customCrypto.keccak256 ?? keccak_1.keccak256;
        const payloadIdBytes = (0, util_1.toBytes)(keccakFunction((0, util_1.concatBytes)(parentBlock.hash(), mixHashBuf, timestampBuf, gasLimitBuf, parentBeaconBlockRootBuf, coinbaseBuf, withdrawalsBuf)).subarray(0, 8));
        const payloadId = (0, util_1.bytesToHex)(payloadIdBytes);
        // If payload has already been triggered, then return the payloadid
        if (this.pendingPayloads.get(payloadId) !== undefined) {
            return payloadIdBytes;
        }
        // Prune the builders and blobsbundles
        this.pruneSetToMax(MAX_PAYLOAD_CACHE);
        // Set the state root to ensure the resulting state
        // is based on the parent block's state
        await vm.stateManager.setStateRoot(parentBlock.header.stateRoot);
        const builder = await vm.buildBlock({
            parentBlock,
            // excessBlobGas will be correctly calculated and set in buildBlock constructor,
            // unless already explicity provided in headerData
            headerData: {
                ...headerData,
                number,
                gasLimit,
                baseFeePerGas,
            },
            withdrawals,
            blockOpts: {
                putBlockIntoBlockchain: false,
                setHardfork: td,
            },
        });
        this.pendingPayloads.set(payloadId, builder);
        // Get if and how many blobs are allowed in the tx
        let allowedBlobs;
        if (vm.common.isActivatedEIP(4844)) {
            const blobGasLimit = vm.common.param('gasConfig', 'maxblobGasPerBlock');
            const blobGasPerBlob = vm.common.param('gasConfig', 'blobGasPerBlob');
            allowedBlobs = Number(blobGasLimit / blobGasPerBlob);
        }
        else {
            allowedBlobs = 0;
        }
        // Add current txs in pool
        const txs = await this.txPool.txsByPriceAndNonce(vm, {
            baseFee: baseFeePerGas,
            allowedBlobs,
        });
        this.config.logger.info(`Pending: Assembling block from ${txs.length} eligible txs (baseFee: ${baseFeePerGas})`);
        const { addedTxs, skippedByAddErrors, blobTxs } = await this.addTransactions(builder, txs);
        this.config.logger.info(`Pending: Added txs=${addedTxs} skippedByAddErrors=${skippedByAddErrors} from total=${txs.length} tx candidates`);
        // Construct initial blobs bundle when payload is constructed
        if (vm.common.isActivatedEIP(4844)) {
            this.constructBlobsBundle(payloadId, blobTxs);
        }
        return payloadIdBytes;
    }
    /**
     * Stops a pending payload
     */
    stop(payloadIdBytes) {
        const payloadId = typeof payloadIdBytes !== 'string' ? (0, util_1.bytesToHex)(payloadIdBytes) : payloadIdBytes;
        const builder = this.pendingPayloads.get(payloadId);
        if (builder === undefined)
            return;
        // Revert blockBuilder
        void builder.revert();
        // Remove from pendingPayloads
        this.pendingPayloads.delete(payloadId);
        this.blobsBundles.delete(payloadId);
    }
    /**
     * Returns the completed block
     */
    async build(payloadIdBytes) {
        const payloadId = typeof payloadIdBytes !== 'string' ? (0, util_1.bytesToHex)(payloadIdBytes) : payloadIdBytes;
        const builder = this.pendingPayloads.get(payloadId);
        if (builder === undefined) {
            return;
        }
        const blockStatus = builder.getStatus();
        if (blockStatus.status === vm_1.BuildStatus.Build) {
            return [
                blockStatus.block,
                builder.transactionReceipts,
                builder.minerValue,
                this.blobsBundles.get(payloadId),
            ];
        }
        const { vm, headerData } = builder;
        // get the number of blobs that can be further added
        let allowedBlobs;
        if (vm.common.isActivatedEIP(4844)) {
            const bundle = this.blobsBundles.get(payloadId) ?? { blobs: [], commitments: [], proofs: [] };
            const blobGasLimit = vm.common.param('gasConfig', 'maxblobGasPerBlock');
            const blobGasPerBlob = vm.common.param('gasConfig', 'blobGasPerBlob');
            allowedBlobs = Number(blobGasLimit / blobGasPerBlob) - bundle.blobs.length;
        }
        else {
            allowedBlobs = 0;
        }
        // Add new txs that the pool received
        const txs = (await this.txPool.txsByPriceAndNonce(vm, {
            baseFee: headerData.baseFeePerGas,
            allowedBlobs,
        })).filter((tx) => builder.transactions.some((t) => (0, util_1.equalsBytes)(t.hash(), tx.hash())) === false);
        const { skippedByAddErrors, blobTxs } = await this.addTransactions(builder, txs);
        const block = await builder.build();
        // Construct blobs bundle
        const blobs = block.common.isActivatedEIP(4844)
            ? this.constructBlobsBundle(payloadId, blobTxs)
            : undefined;
        const withdrawalsStr = block.withdrawals !== undefined ? ` withdrawals=${block.withdrawals.length}` : '';
        const blobsStr = blobs ? ` blobs=${blobs.blobs.length}` : '';
        this.config.logger.info(`Pending: Built block number=${block.header.number} txs=${block.transactions.length}${withdrawalsStr}${blobsStr} skippedByAddErrors=${skippedByAddErrors}  hash=${(0, util_1.bytesToHex)(block.hash())}`);
        return [block, builder.transactionReceipts, builder.minerValue, blobs];
    }
    async addTransactions(builder, txs) {
        this.config.logger.info(`Pending: Adding ${txs.length} additional eligible txs`);
        let index = 0;
        let blockFull = false;
        let skippedByAddErrors = 0;
        const blobTxs = [];
        while (index < txs.length && !blockFull) {
            const tx = txs[index];
            const addTxResult = await this.addTransaction(builder, tx);
            switch (addTxResult) {
                case AddTxResult.Success:
                    // Push the tx in blobTxs only after successful addTransaction
                    if (tx instanceof tx_1.BlobEIP4844Transaction)
                        blobTxs.push(tx);
                    break;
                case AddTxResult.BlockFull:
                    blockFull = true;
                // Falls through
                default:
                    skippedByAddErrors++;
            }
            index++;
        }
        return {
            addedTxs: index - skippedByAddErrors,
            skippedByAddErrors,
            totalTxs: txs.length,
            blobTxs,
        };
    }
    async addTransaction(builder, tx) {
        let addTxResult;
        try {
            await builder.addTransaction(tx, {
                skipHardForkValidation: this.skipHardForkValidation,
            });
            addTxResult = AddTxResult.Success;
        }
        catch (error) {
            if (error.message === 'tx has a higher gas limit than the remaining gas in the block') {
                if (builder.gasUsed > builder.headerData.gasLimit - BigInt(21000)) {
                    // If block has less than 21000 gas remaining, consider it full
                    this.config.logger.info(`Pending: Assembled block full`);
                    addTxResult = AddTxResult.BlockFull;
                }
                else {
                    addTxResult = AddTxResult.SkippedByGasLimit;
                }
            }
            else if (error.message.includes('blobs missing')) {
                // Remove the blob tx which doesn't has blobs bundled
                this.txPool.removeByHash((0, util_1.bytesToHex)(tx.hash()));
                this.config.logger.error(`Pending: Removed from txPool a blob tx ${(0, util_1.bytesToHex)(tx.hash())} with missing blobs`);
                addTxResult = AddTxResult.RemovedByErrors;
            }
            else {
                // If there is an error adding a tx, it will be skipped
                this.config.logger.debug(`Pending: Skipping tx ${(0, util_1.bytesToHex)(tx.hash())}, error encountered when trying to add tx:\n${error}`);
                addTxResult = AddTxResult.SkippedByErrors;
            }
        }
        return addTxResult;
    }
}
exports.PendingBlock = PendingBlock;
//# sourceMappingURL=pendingBlock.js.map