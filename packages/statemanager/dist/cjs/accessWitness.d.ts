import type { Address, PrefixedHexString } from '@ethereumjs/util';
/**
 * Tree key constants.
 */
export declare const VERSION_LEAF_KEY: Uint8Array;
export declare const BALANCE_LEAF_KEY: Uint8Array;
export declare const NONCE_LEAF_KEY: Uint8Array;
export declare const CODE_KECCAK_LEAF_KEY: Uint8Array;
export declare const CODE_SIZE_LEAF_KEY: Uint8Array;
export declare const HEADER_STORAGE_OFFSET = 64;
export declare const CODE_OFFSET = 128;
export declare const VERKLE_NODE_WIDTH = 256;
export declare const MAIN_STORAGE_OFFSET: bigint;
declare type StemAccessEvent = {
    write?: boolean;
};
declare type ChunkAccessEvent = StemAccessEvent & {
    fill?: boolean;
};
declare type AccessEventFlags = {
    stemRead: boolean;
    stemWrite: boolean;
    chunkRead: boolean;
    chunkWrite: boolean;
    chunkFill: boolean;
};
declare type StemMeta = {
    address: Address;
    treeIndex: number | bigint;
};
declare type RawAccessedState = {
    address: Address;
    treeIndex: number | bigint;
    chunkIndex: number;
    chunkKey: PrefixedHexString;
};
export declare enum AccessedStateType {
    Version = "version",
    Balance = "balance",
    Nonce = "nonce",
    CodeHash = "codeHash",
    CodeSize = "codeSize",
    Code = "code",
    Storage = "storage"
}
declare type AccessedState = {
    type: Exclude<AccessedStateType, AccessedStateType.Code | AccessedStateType.Storage>;
} | {
    type: AccessedStateType.Code;
    codeOffset: number;
} | {
    type: AccessedStateType.Storage;
    slot: bigint;
};
export declare type AccessedStateWithAddress = AccessedState & {
    address: Address;
    chunkKey: PrefixedHexString;
};
export declare class AccessWitness {
    stems: Map<PrefixedHexString, StemAccessEvent & StemMeta>;
    chunks: Map<PrefixedHexString, ChunkAccessEvent>;
    constructor(opts?: {
        stems?: Map<PrefixedHexString, StemAccessEvent & StemMeta>;
        chunks?: Map<PrefixedHexString, ChunkAccessEvent>;
    });
    touchAndChargeProofOfAbsence(address: Address): bigint;
    touchAndChargeMessageCall(address: Address): bigint;
    touchAndChargeValueTransfer(caller: Address, target: Address): bigint;
    touchAndChargeContractCreateInit(address: Address, { sendsValue }?: {
        sendsValue?: boolean;
    }): bigint;
    touchAndChargeContractCreateCompleted(address: Address): bigint;
    touchTxOriginAndComputeGas(origin: Address): bigint;
    touchTxExistingAndComputeGas(target: Address, { sendsValue }?: {
        sendsValue?: boolean;
    }): bigint;
    touchCodeChunksRangeOnReadAndChargeGas(contact: Address, startPc: number, endPc: number): bigint;
    touchCodeChunksRangeOnWriteAndChargeGas(contact: Address, startPc: number, endPc: number): bigint;
    touchAddressOnWriteAndComputeGas(address: Address, treeIndex: number | bigint, subIndex: number | Uint8Array): bigint;
    touchAddressOnReadAndComputeGas(address: Address, treeIndex: number | bigint, subIndex: number | Uint8Array): bigint;
    touchAddressAndChargeGas(address: Address, treeIndex: number | bigint, subIndex: number | Uint8Array, { isWrite }: {
        isWrite?: boolean;
    }): bigint;
    touchAddress(address: Address, treeIndex: number | bigint, subIndex: number | Uint8Array, { isWrite }?: {
        isWrite?: boolean;
    }): AccessEventFlags;
    /**Create a shallow copy, could clone some caches in future for optimizations */
    shallowCopy(): AccessWitness;
    merge(accessWitness: AccessWitness): void;
    rawAccesses(): Generator<RawAccessedState>;
    accesses(): Generator<AccessedStateWithAddress>;
}
export declare function getTreeIndexesForStorageSlot(storageKey: bigint): {
    treeIndex: bigint;
    subIndex: number;
};
export declare function getTreeIndicesForCodeChunk(chunkId: number): {
    treeIndex: number;
    subIndex: number;
};
export declare function decodeAccessedState(treeIndex: number | bigint, chunkIndex: number): AccessedState;
export declare function decodeValue(type: AccessedStateType, value: string | null): string;
export {};
//# sourceMappingURL=accessWitness.d.ts.map