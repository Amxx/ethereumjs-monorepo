import type { Skeleton } from '../../../service';
import type { Block, ExecutionPayload } from '@ethereumjs/block';
export declare enum Status {
    ACCEPTED = "ACCEPTED",
    INVALID = "INVALID",
    INVALID_BLOCK_HASH = "INVALID_BLOCK_HASH",
    SYNCING = "SYNCING",
    VALID = "VALID"
}
export declare type Bytes8 = string;
export declare type Bytes20 = string;
export declare type Bytes32 = string;
export declare type Blob = Bytes32;
export declare type Bytes48 = string;
export declare type Uint64 = string;
export declare type Uint256 = string;
declare type WithdrawalV1 = Exclude<ExecutionPayload['withdrawals'], undefined>[number];
export declare type ExecutionPayloadV1 = ExecutionPayload;
export declare type ExecutionPayloadV2 = ExecutionPayloadV1 & {
    withdrawals: WithdrawalV1[];
};
export declare type ExecutionPayloadV3 = ExecutionPayloadV2 & {
    excessBlobGas: Uint64;
    blobGasUsed: Uint64;
};
export declare type ForkchoiceStateV1 = {
    headBlockHash: Bytes32;
    safeBlockHash: Bytes32;
    finalizedBlockHash: Bytes32;
};
export declare type PayloadAttributes = {
    timestamp: Uint64;
    prevRandao: Bytes32;
    suggestedFeeRecipient: Bytes20;
    withdrawals?: WithdrawalV1[];
    parentBeaconBlockRoot?: Bytes32;
};
export declare type PayloadAttributesV1 = Omit<PayloadAttributes, 'withdrawals' | 'parentBeaconBlockRoot'>;
export declare type PayloadAttributesV2 = PayloadAttributesV1 & {
    withdrawals: WithdrawalV1[];
};
export declare type PayloadAttributesV3 = PayloadAttributesV2 & {
    parentBeaconBlockRoot: Bytes32;
};
export declare type PayloadStatusV1 = {
    status: Status;
    latestValidHash: Bytes32 | null;
    validationError: string | null;
};
export declare type ForkchoiceResponseV1 = {
    payloadStatus: PayloadStatusV1;
    payloadId: Bytes8 | null;
};
export declare type TransitionConfigurationV1 = {
    terminalTotalDifficulty: Uint256;
    terminalBlockHash: Bytes32;
    terminalBlockNumber: Uint64;
};
export declare type BlobsBundleV1 = {
    commitments: Bytes48[];
    blobs: Blob[];
    proofs: Bytes48[];
};
export declare type ExecutionPayloadBodyV1 = {
    transactions: string[];
    withdrawals: WithdrawalV1[] | null;
};
export declare type ChainCache = {
    remoteBlocks: Map<String, Block>;
    executedBlocks: Map<String, Block>;
    invalidBlocks: Map<String, Error>;
    skeleton: Skeleton;
};
export declare const EngineError: {
    UnknownPayload: {
        code: number;
        message: string;
    };
};
export {};
//# sourceMappingURL=types.d.ts.map