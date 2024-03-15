export declare const executionPayloadV1FieldValidators: {
    parentHash: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    feeRecipient: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    stateRoot: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    receiptsRoot: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    logsBloom: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    prevRandao: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    blockNumber: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    gasLimit: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    gasUsed: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    timestamp: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    extraData: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    baseFeePerGas: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    blockHash: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    transactions: (params: any[], index: number) => any;
};
export declare const executionPayloadV2FieldValidators: {
    withdrawals: (params: any[], index: number) => any;
    parentHash: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    feeRecipient: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    stateRoot: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    receiptsRoot: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    logsBloom: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    prevRandao: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    blockNumber: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    gasLimit: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    gasUsed: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    timestamp: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    extraData: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    baseFeePerGas: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    blockHash: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    transactions: (params: any[], index: number) => any;
};
export declare const executionPayloadV3FieldValidators: {
    blobGasUsed: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    excessBlobGas: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    withdrawals: (params: any[], index: number) => any;
    parentHash: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    feeRecipient: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    stateRoot: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    receiptsRoot: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    logsBloom: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    prevRandao: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    blockNumber: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    gasLimit: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    gasUsed: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    timestamp: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    extraData: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    baseFeePerGas: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    blockHash: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    transactions: (params: any[], index: number) => any;
};
export declare const forkchoiceFieldValidators: {
    headBlockHash: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    safeBlockHash: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    finalizedBlockHash: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
};
export declare const payloadAttributesFieldValidatorsV1: {
    timestamp: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    prevRandao: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    suggestedFeeRecipient: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
};
export declare const payloadAttributesFieldValidatorsV2: {
    withdrawals: (params: any, index: number) => any;
    timestamp: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    prevRandao: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    suggestedFeeRecipient: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
};
export declare const payloadAttributesFieldValidatorsV3: {
    withdrawals: (params: any[], index: number) => any;
    parentBeaconBlockRoot: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    timestamp: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    prevRandao: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    suggestedFeeRecipient: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
};
//# sourceMappingURL=validators.d.ts.map