import { BlockHeader } from '@ethereumjs/block';
import { Protocol } from './protocol';
import type { Chain } from '../../blockchain';
import type { FlowControl } from './flowcontrol';
import type { Message, ProtocolOptions } from './protocol';
export interface LesProtocolOptions extends ProtocolOptions {
    chain: Chain;
    flow?: FlowControl;
}
declare type GetBlockHeadersOpts = {
    reqId?: bigint;
    block: bigint | Uint8Array;
    max: number;
    skip?: number;
    reverse?: boolean;
};
export interface LesProtocolMethods {
    getBlockHeaders: (opts: GetBlockHeadersOpts) => Promise<{
        reqId: bigint;
        bv: bigint;
        headers: BlockHeader[];
    }>;
}
/**
 * Implements les/1 and les/2 protocols
 * @memberof module:net/protocol
 */
export declare class LesProtocol extends Protocol {
    private chain;
    private flow;
    private isServer;
    private nextReqId;
    private protocolMessages;
    /**
     * Create les protocol
     */
    constructor(options: LesProtocolOptions);
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
     * Encodes status into LES status message payload
     */
    encodeStatus(): any;
    /**
     * Decodes ETH status message payload into a status object
     * @param status status message payload
     */
    decodeStatus(status: any): any;
}
export {};
//# sourceMappingURL=lesprotocol.d.ts.map