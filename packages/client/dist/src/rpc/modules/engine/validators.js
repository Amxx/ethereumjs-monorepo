"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payloadAttributesFieldValidatorsV3 = exports.payloadAttributesFieldValidatorsV2 = exports.payloadAttributesFieldValidatorsV1 = exports.forkchoiceFieldValidators = exports.executionPayloadV3FieldValidators = exports.executionPayloadV2FieldValidators = exports.executionPayloadV1FieldValidators = void 0;
const validation_1 = require("../../validation");
exports.executionPayloadV1FieldValidators = {
    parentHash: validation_1.validators.blockHash,
    feeRecipient: validation_1.validators.address,
    stateRoot: validation_1.validators.bytes32,
    receiptsRoot: validation_1.validators.bytes32,
    logsBloom: validation_1.validators.bytes256,
    prevRandao: validation_1.validators.bytes32,
    blockNumber: validation_1.validators.uint64,
    gasLimit: validation_1.validators.uint64,
    gasUsed: validation_1.validators.uint64,
    timestamp: validation_1.validators.uint64,
    extraData: validation_1.validators.variableBytes32,
    baseFeePerGas: validation_1.validators.uint256,
    blockHash: validation_1.validators.blockHash,
    transactions: validation_1.validators.array(validation_1.validators.hex),
};
exports.executionPayloadV2FieldValidators = {
    ...exports.executionPayloadV1FieldValidators,
    withdrawals: validation_1.validators.array(validation_1.validators.withdrawal()),
};
exports.executionPayloadV3FieldValidators = {
    ...exports.executionPayloadV2FieldValidators,
    blobGasUsed: validation_1.validators.uint64,
    excessBlobGas: validation_1.validators.uint64,
};
exports.forkchoiceFieldValidators = {
    headBlockHash: validation_1.validators.blockHash,
    safeBlockHash: validation_1.validators.blockHash,
    finalizedBlockHash: validation_1.validators.blockHash,
};
exports.payloadAttributesFieldValidatorsV1 = {
    timestamp: validation_1.validators.uint64,
    prevRandao: validation_1.validators.bytes32,
    suggestedFeeRecipient: validation_1.validators.address,
};
exports.payloadAttributesFieldValidatorsV2 = {
    ...exports.payloadAttributesFieldValidatorsV1,
    // withdrawals is optional in V2 because its backward forward compatible with V1
    withdrawals: validation_1.validators.optional(validation_1.validators.array(validation_1.validators.withdrawal())),
};
exports.payloadAttributesFieldValidatorsV3 = {
    ...exports.payloadAttributesFieldValidatorsV1,
    withdrawals: validation_1.validators.array(validation_1.validators.withdrawal()),
    parentBeaconBlockRoot: validation_1.validators.bytes32,
};
//# sourceMappingURL=validators.js.map