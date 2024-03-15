/// <reference types="node" />
/// <reference types="node" />
import { EventEmitter } from 'events';
import { ProtocolType } from '../types.js';
import type { Peer } from '../rlpx/peer.js';
import type { SendMethod } from '../types.js';
declare type MessageCodes = {
    [key: number | string]: number | string;
};
export declare abstract class Protocol {
    events: EventEmitter;
    protected _version: number;
    protected _peer: Peer;
    protected _send: SendMethod;
    protected _statusTimeoutId?: NodeJS.Timeout;
    protected _messageCodes: MessageCodes;
    private _debug;
    protected _verbose: boolean;
    /**
     * Will be set to the first successfully connected peer to allow for
     * debugging with the `devp2p:FIRST_PEER` debugger
     */
    _firstPeer: string;
    protected msgDebuggers: {
        [key: string]: (debug: string) => void;
    };
    constructor(peer: Peer, send: SendMethod, protocol: ProtocolType, version: number, messageCodes: MessageCodes);
    private initMsgDebuggers;
    /**
     * Called once on the peer where a first successful `STATUS`
     * msg exchange could be achieved.
     *
     * Can be used together with the `devp2p:FIRST_PEER` debugger.
     */
    _addFirstPeerDebugger(): void;
    /**
     * Debug message both on the generic as well as the
     * per-message debug logger
     * @param messageName Capitalized message name (e.g. `GET_BLOCK_HEADERS`)
     * @param msg Message text to debug
     */
    protected debug(messageName: string, msg: string): void;
    /**
     * Abstract method to handle incoming messages
     * @param code
     * @param data
     */
    abstract _handleMessage(code: number, data: Uint8Array): void;
}
export {};
//# sourceMappingURL=protocol.d.ts.map