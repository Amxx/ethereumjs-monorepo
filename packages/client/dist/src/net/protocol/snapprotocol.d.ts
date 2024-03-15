import { Protocol } from './protocol';
import type { Chain } from '../../blockchain';
import type { Message, ProtocolOptions } from './protocol';
import type { AccountBodyBytes } from '@ethereumjs/util';
interface SnapProtocolOptions extends ProtocolOptions {
    chain: Chain;
    /**
     * If to convert slim body received of an account to normal while decoding.
     * Encoding is always converted to slim
     */
    convertSlimBody?: boolean;
}
export declare type AccountData = {
    hash: Uint8Array;
    body: AccountBodyBytes;
};
declare type GetAccountRangeOpts = {
    reqId?: bigint;
    root: Uint8Array;
    origin: Uint8Array;
    limit: Uint8Array;
    bytes: bigint;
};
declare type GetStorageRangesOpts = {
    reqId?: bigint;
    root: Uint8Array;
    accounts: Uint8Array[];
    origin: Uint8Array;
    limit: Uint8Array;
    bytes: bigint;
};
export declare type StorageData = {
    hash: Uint8Array;
    body: Uint8Array;
};
declare type GetByteCodesOpts = {
    reqId?: bigint;
    hashes: Uint8Array[];
    bytes: bigint;
};
declare type GetTrieNodesOpts = {
    reqId?: bigint;
    root: Uint8Array;
    paths: Uint8Array[][];
    bytes: bigint;
};
export interface SnapProtocolMethods {
    getAccountRange: (opts: GetAccountRangeOpts) => Promise<{
        reqId: bigint;
        accounts: AccountData[];
        proof: Uint8Array[];
    }>;
    getStorageRanges: (opts: GetStorageRangesOpts) => Promise<{
        reqId: bigint;
        slots: StorageData[][];
        proof: Uint8Array[];
    }>;
    getByteCodes: (opts: GetByteCodesOpts) => Promise<{
        reqId: bigint;
        codes: Uint8Array[];
    }>;
    getTrieNodes: (opts: GetTrieNodesOpts) => Promise<{
        reqId: bigint;
        nodes: Uint8Array[];
    }>;
}
/**
 * Implements snap/1 protocol
 * @memberof module:net/protocol
 */
export declare class SnapProtocol extends Protocol {
    private chain;
    /** If to convert slim body received of an account to normal */
    private convertSlimBody?;
    private nextReqId;
    private protocolMessages;
    /**
     * Create snap protocol
     */
    constructor(options: SnapProtocolOptions);
    /**
     * Name of protocol
     */
    get name(): string;
    /**
     * Protocol versions supported
     */
    get versions(): number[];
    /**
     * Messages defined by this protocol
     */
    get messages(): Message[];
    /**
     * Opens protocol and any associated dependencies
     */
    open(): Promise<boolean | void>;
}
export {};
//# sourceMappingURL=snapprotocol.d.ts.map