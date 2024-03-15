"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate4844BlobVersionedHashes = exports.assembleBlock = void 0;
const block_1 = require("@ethereumjs/block");
const common_1 = require("@ethereumjs/common");
const tx_1 = require("@ethereumjs/tx");
const util_1 = require("@ethereumjs/util");
const util_2 = require("../../../../util");
const types_1 = require("../types");
const generic_1 = require("./generic");
/**
 * Returns a block from a payload.
 * If errors, returns {@link PayloadStatusV1}
 */
const assembleBlock = async (payload, chain, chainCache) => {
    const { blockNumber, timestamp } = payload;
    const { config } = chain;
    const common = config.chainCommon.copy();
    // This is a post merge block, so set its common accordingly
    // Can't use setHardfork flag, as the transactions will need to be deserialized
    // first before the header can be constucted with their roots
    const ttd = common.hardforkTTD(common_1.Hardfork.Paris);
    common.setHardforkBy({ blockNumber, td: ttd !== null ? ttd : undefined, timestamp });
    try {
        const block = await block_1.Block.fromExecutionPayload(payload, { common });
        // TODO: validateData is also called in applyBlock while runBlock, may be it can be optimized
        // by removing/skipping block data validation from there
        await block.validateData();
        return { block };
    }
    catch (error) {
        const validationError = `Error assembling block from payload: ${error}`;
        config.logger.error(validationError);
        const latestValidHash = await (0, generic_1.validHash)((0, util_1.hexToBytes)(payload.parentHash), chain, chainCache);
        const response = {
            status: `${error}`.includes('Invalid blockHash') ? types_1.Status.INVALID_BLOCK_HASH : types_1.Status.INVALID,
            latestValidHash,
            validationError,
        };
        return { error: response };
    }
};
exports.assembleBlock = assembleBlock;
const validate4844BlobVersionedHashes = (headBlock, blobVersionedHashes) => {
    let validationError = null;
    // Collect versioned hashes in the flat array `txVersionedHashes` to match with received
    const txVersionedHashes = [];
    for (const tx of headBlock.transactions) {
        if (tx instanceof tx_1.BlobEIP4844Transaction) {
            for (const vHash of tx.blobVersionedHashes) {
                txVersionedHashes.push(vHash);
            }
        }
    }
    if (blobVersionedHashes.length !== txVersionedHashes.length) {
        validationError = `Error verifying blobVersionedHashes: expected=${txVersionedHashes.length} received=${blobVersionedHashes.length}`;
    }
    else {
        // match individual hashes
        for (let vIndex = 0; vIndex < blobVersionedHashes.length; vIndex++) {
            // if mismatch, record error and break
            if (!(0, util_1.equalsBytes)((0, util_1.hexToBytes)(blobVersionedHashes[vIndex]), txVersionedHashes[vIndex])) {
                validationError = `Error verifying blobVersionedHashes: mismatch at index=${vIndex} expected=${(0, util_2.short)(txVersionedHashes[vIndex])} received=${(0, util_2.short)(blobVersionedHashes[vIndex])}`;
                break;
            }
        }
    }
    return validationError;
};
exports.validate4844BlobVersionedHashes = validate4844BlobVersionedHashes;
//# sourceMappingURL=newPayload.js.map