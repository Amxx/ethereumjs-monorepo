/// <reference types="node" />
import { EventEmitter } from 'events';
/**
 * Base class for transport specific message sender/receiver. Subclasses should
 * emit a message event when the sender receives a new message, and they should
 * emit a status event when the sender receives a handshake status message
 * @emits message
 * @emits status
 * @memberof module:net/protocol
 */
export declare class Sender extends EventEmitter {
    private _status;
    constructor();
    get status(): any;
    set status(status: any);
    /**
     * Send a status to peer
     * @param status
     */
    sendStatus(_status: any): void;
    /**
     * Send a message to peer
     * @param code message code
     * @param rlpEncodedData rlp encoded message payload
     */
    sendMessage(_code: number, _rlpEncodedData: any[] | Uint8Array): void;
}
//# sourceMappingURL=sender.d.ts.map