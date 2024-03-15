import { BlockHeader } from '@ethereumjs/block';
import { Protocol } from './protocol';
import type { Chain } from '../../blockchain';
import type { Message, ProtocolOptions } from './protocol';
import type { BlockBodyBytes } from '@ethereumjs/block';
import type { TypedTransaction } from '@ethereumjs/tx';
import type { TxReceipt } from '@ethereumjs/vm';
interface EthProtocolOptions extends ProtocolOptions {
    chain: Chain;
}
declare type GetBlockHeadersOpts = {
    reqId?: bigint;
    block: bigint | Uint8Array;
    max: number;
    skip?: number;
    reverse?: boolean;
};
declare type GetBlockBodiesOpts = {
    reqId?: bigint;
    hashes: Uint8Array[];
};
declare type GetPooledTransactionsOpts = {
    reqId?: bigint;
    hashes: Uint8Array[];
};
declare type GetReceiptsOpts = {
    reqId?: bigint;
    hashes: Uint8Array[];
};
export interface EthProtocolMethods {
    getBlockHeaders: (opts: GetBlockHeadersOpts) => Promise<[bigint, BlockHeader[]]>;
    getBlockBodies: (opts: GetBlockBodiesOpts) => Promise<[bigint, BlockBodyBytes[]]>;
    getPooledTransactions: (opts: GetPooledTransactionsOpts) => Promise<[bigint, TypedTransaction[]]>;
    getReceipts: (opts: GetReceiptsOpts) => Promise<[bigint, TxReceipt[]]>;
}
/**
 * Implements eth/66 protocol
 * @memberof module:net/protocol
 */
export declare class EthProtocol extends Protocol {
    private chain;
    private nextReqId;
    private chainTTD?;
    private protocolMessages;
    /**
     * Create eth protocol
     */
    constructor(options: EthProtocolOptions);
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
    /**
     * Encodes status into ETH status message payload
     */
    encodeStatus(): any;
    /**
     * Decodes ETH status message payload into a status object
     * @param status status message payload
     */
    decodeStatus(status: any): any;
}
export {};
//# sourceMappingURL=ethprotocol.d.ts.map