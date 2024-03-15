import type { Config } from '../../config';
import type { Peer } from '../peer/peer';
import type { EthProtocolMethods } from './ethprotocol';
import type { LesProtocolMethods } from './lesprotocol';
import type { Message, Protocol } from './protocol';
import type { Sender } from './sender';
import type { AccountData, SnapProtocolMethods, StorageData } from './snapprotocol';
import type { BlockBodyBytes, BlockHeader } from '@ethereumjs/block';
import type { TypedTransaction } from '@ethereumjs/tx';
import type { TxReceipt } from '@ethereumjs/vm';
export interface BoundProtocolOptions {
    config: Config;
    protocol: Protocol;
    peer: Peer;
    sender: Sender;
}
/**
 * Binds a protocol implementation to the specified peer
 * @memberof module:net/protocol
 */
export declare class BoundProtocol {
    config: Config;
    name: string;
    private protocol;
    protected peer: Peer;
    private sender;
    private versions;
    private timeout;
    private _status;
    private resolvers;
    private messageQueue;
    /**
     * Create bound protocol
     */
    constructor(options: BoundProtocolOptions);
    get status(): any;
    set status(status: any);
    handshake(sender: Sender): Promise<void>;
    /**
     * Handle incoming message
     * @param message message object
     * @emits {@link Event.PROTOCOL_MESSAGE}
     * @emits {@link Event.PROTOCOL_ERROR}
     */
    private handle;
    /**
     * Handle unhandled messages along handshake
     */
    handleMessageQueue(): void;
    /**
     * Send message with name and the specified args
     * @param name message name
     * @param args message arguments
     */
    send(name: string, args?: any): Message;
    /**
     * Returns a promise that resolves with the message payload when a response
     * to the specified message is received
     * @param name message to wait for
     * @param args message arguments
     */
    request(name: string, args: any): Promise<any>;
}
export declare class BoundEthProtocol extends BoundProtocol implements EthProtocolMethods {
    name: string;
    constructor(options: BoundProtocolOptions);
    getBlockHeaders(opts: {
        reqId?: bigint | undefined;
        block: bigint | Uint8Array;
        max: number;
        skip?: number | undefined;
        reverse?: boolean | undefined;
    }): Promise<[bigint, BlockHeader[]]>;
    getBlockBodies(opts: {
        reqId?: bigint | undefined;
        hashes: Uint8Array[];
    }): Promise<[bigint, BlockBodyBytes[]]>;
    getPooledTransactions(opts: {
        reqId?: bigint | undefined;
        hashes: Uint8Array[];
    }): Promise<[bigint, TypedTransaction[]]>;
    getReceipts(opts: {
        reqId?: bigint | undefined;
        hashes: Uint8Array[];
    }): Promise<[bigint, TxReceipt[]]>;
}
export declare class BoundSnapProtocol extends BoundProtocol implements SnapProtocolMethods {
    name: string;
    constructor(options: BoundProtocolOptions);
    getAccountRange(opts: {
        reqId?: bigint | undefined;
        root: Uint8Array;
        origin: Uint8Array;
        limit: Uint8Array;
        bytes: bigint;
    }): Promise<{
        reqId: bigint;
        accounts: AccountData[];
        proof: Uint8Array[];
    }>;
    getStorageRanges(opts: {
        reqId?: bigint | undefined;
        root: Uint8Array;
        accounts: Uint8Array[];
        origin: Uint8Array;
        limit: Uint8Array;
        bytes: bigint;
    }): Promise<{
        reqId: bigint;
        slots: StorageData[][];
        proof: Uint8Array[];
    }>;
    getByteCodes(opts: {
        reqId?: bigint | undefined;
        hashes: Uint8Array[];
        bytes: bigint;
    }): Promise<{
        reqId: bigint;
        codes: Uint8Array[];
    }>;
    getTrieNodes(opts: {
        reqId?: bigint | undefined;
        root: Uint8Array;
        paths: Uint8Array[][];
        bytes: bigint;
    }): Promise<{
        reqId: bigint;
        nodes: Uint8Array[];
    }>;
}
export declare class BoundLesProtocol extends BoundProtocol implements LesProtocolMethods {
    name: string;
    constructor(options: BoundProtocolOptions);
    getBlockHeaders(opts: {
        reqId?: bigint | undefined;
        block: bigint | Uint8Array;
        max: number;
        skip?: number | undefined;
        reverse?: boolean | undefined;
    }): Promise<{
        reqId: bigint;
        bv: bigint;
        headers: BlockHeader[];
    }>;
}
//# sourceMappingURL=boundprotocol.d.ts.map