import type { Config } from '../../config';
import type { Sender } from './sender';
export interface ProtocolOptions {
    config: Config;
    timeout?: number;
}
export declare type Message = {
    name: string;
    code: number;
    payload?: any;
    response?: number;
    encode?: Function;
    decode?: Function;
};
/**
 * Protocol message
 * @typedef {Object} Protocol~Message
 * @property {string} name message name
 * @property {number} code message code
 * @property {response} response code of response message
 * @property {boolean} flow true if message includes flow control
 * @property {function(...*): *} encode encode message arguments
 * @property {function(*): *} decode decodes message payload
 */
/**
 * Base class for all wire protocols
 * @memberof module:net/protocol
 */
export declare class Protocol {
    config: Config;
    timeout: number;
    opened: boolean;
    /**
     * Create new protocol
     */
    constructor(options: ProtocolOptions);
    /**
     * Opens protocol and any associated dependencies
     */
    open(): Promise<boolean | void>;
    /**
     * Perform handshake given a sender from subclass.
     */
    handshake(sender: Sender): Promise<unknown>;
    /**
     * Abstract getter for name of protocol
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
     * Encodes status into status message payload. Must be implemented by subclass.
     */
    encodeStatus(): any;
    /**
     * Decodes status message payload into a status object.  Must be implemented
     * by subclass.
     * @param _status status message payload
     */
    decodeStatus(_status: any): Object;
    /**
     * Encodes message into proper format before sending
     * @param message message definition
     * @param args message arguments
     */
    encode(message: Message, args: any): any;
    /**
     * Decodes message payload
     * @param message message definition
     * @param payload message payload
     */
    decode(message: Message, payload: any): any;
}
//# sourceMappingURL=protocol.d.ts.map