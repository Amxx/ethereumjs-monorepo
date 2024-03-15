"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockToExecutionPayload = void 0;
const util_1 = require("@ethereumjs/util");
/**
 * Formats a block to {@link ExecutionPayloadV1}.
 */
const blockToExecutionPayload = (block, value, bundle) => {
    const blockJson = block.toJSON();
    const header = blockJson.header;
    const transactions = block.transactions.map((tx) => (0, util_1.bytesToHex)(tx.serialize())) ?? [];
    const withdrawalsArr = blockJson.withdrawals ? { withdrawals: blockJson.withdrawals } : {};
    const blobsBundle = bundle
        ? {
            commitments: bundle.commitments.map(util_1.bytesToHex),
            blobs: bundle.blobs.map(util_1.bytesToHex),
            proofs: bundle.proofs.map(util_1.bytesToHex),
        }
        : undefined;
    const executionPayload = {
        blockNumber: header.number,
        parentHash: header.parentHash,
        feeRecipient: header.coinbase,
        stateRoot: header.stateRoot,
        receiptsRoot: header.receiptTrie,
        logsBloom: header.logsBloom,
        gasLimit: header.gasLimit,
        gasUsed: header.gasUsed,
        timestamp: header.timestamp,
        extraData: header.extraData,
        baseFeePerGas: header.baseFeePerGas,
        blobGasUsed: header.blobGasUsed,
        excessBlobGas: header.excessBlobGas,
        blockHash: (0, util_1.bytesToHex)(block.hash()),
        prevRandao: header.mixHash,
        transactions,
        ...withdrawalsArr,
    };
    // ethereumjs doesnot provide any transaction censoring detection (yet) to suggest
    // overriding builder/mev-boost blocks
    const shouldOverrideBuilder = false;
    return { executionPayload, blockValue: (0, util_1.bigIntToHex)(value), blobsBundle, shouldOverrideBuilder };
};
exports.blockToExecutionPayload = blockToExecutionPayload;
//# sourceMappingURL=getPayload.js.map