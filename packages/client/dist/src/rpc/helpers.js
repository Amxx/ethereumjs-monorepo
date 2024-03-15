"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlockByOption = exports.jsonRpcTx = exports.callWithStackTrace = void 0;
const util_1 = require("@ethereumjs/util");
const error_code_1 = require("./error-code");
function callWithStackTrace(handler, debug) {
    return async (...args) => {
        try {
            const res = await handler(...args);
            return res;
        }
        catch (error) {
            const e = {
                code: error.code ?? error_code_1.INTERNAL_ERROR,
                message: error.message,
            };
            if (debug === true) {
                e['trace'] = error.stack ?? 'Stack trace is not available';
            }
            throw e;
        }
    };
}
exports.callWithStackTrace = callWithStackTrace;
/**
 * Returns tx formatted to the standard JSON-RPC fields
 */
const jsonRpcTx = (tx, block, txIndex) => {
    const txJSON = tx.toJSON();
    return {
        blockHash: block ? (0, util_1.bytesToHex)(block.hash()) : null,
        blockNumber: block ? (0, util_1.bigIntToHex)(block.header.number) : null,
        from: tx.getSenderAddress().toString(),
        gas: txJSON.gasLimit,
        gasPrice: txJSON.gasPrice ?? txJSON.maxFeePerGas,
        maxFeePerGas: txJSON.maxFeePerGas,
        maxPriorityFeePerGas: txJSON.maxPriorityFeePerGas,
        type: (0, util_1.intToHex)(tx.type),
        accessList: txJSON.accessList,
        chainId: txJSON.chainId,
        hash: (0, util_1.bytesToHex)(tx.hash()),
        input: txJSON.data,
        nonce: txJSON.nonce,
        to: tx.to?.toString() ?? null,
        transactionIndex: txIndex !== undefined ? (0, util_1.intToHex)(txIndex) : null,
        value: txJSON.value,
        v: txJSON.v,
        r: txJSON.r,
        s: txJSON.s,
        maxFeePerBlobGas: txJSON.maxFeePerBlobGas,
        blobVersionedHashes: txJSON.blobVersionedHashes,
    };
};
exports.jsonRpcTx = jsonRpcTx;
/**
 * Get block by option
 */
const getBlockByOption = async (blockOpt, chain) => {
    if (blockOpt === 'pending') {
        throw {
            code: error_code_1.INVALID_PARAMS,
            message: `"pending" is not yet supported`,
        };
    }
    let block;
    let tempBlock; // Used in `safe` and `finalized` blocks
    const latest = chain.blocks.latest ?? (await chain.getCanonicalHeadBlock());
    switch (blockOpt) {
        case 'earliest':
            block = await chain.getBlock(util_1.BIGINT_0);
            break;
        case 'latest':
            block = latest;
            break;
        case 'safe':
            tempBlock = chain.blocks.safe ?? (await chain.getCanonicalSafeBlock());
            if (tempBlock === null || tempBlock === undefined) {
                throw {
                    message: 'Unknown block',
                    code: error_code_1.INVALID_BLOCK,
                };
            }
            block = tempBlock;
            break;
        case 'finalized':
            tempBlock = chain.blocks.finalized ?? (await chain.getCanonicalFinalizedBlock());
            if (tempBlock === null || tempBlock === undefined) {
                throw {
                    message: 'Unknown block',
                    code: error_code_1.INVALID_BLOCK,
                };
            }
            block = tempBlock;
            break;
        default: {
            const blockNumber = BigInt(blockOpt);
            if (blockNumber === latest.header.number) {
                block = latest;
            }
            else if (blockNumber > latest.header.number) {
                throw {
                    code: error_code_1.INVALID_PARAMS,
                    message: 'specified block greater than current height',
                };
            }
            else {
                block = await chain.getBlock(blockNumber);
            }
        }
    }
    return block;
};
exports.getBlockByOption = getBlockByOption;
//# sourceMappingURL=helpers.js.map