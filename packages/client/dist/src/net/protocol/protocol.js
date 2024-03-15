"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Protocol = void 0;
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
class Protocol {
    /**
     * Create new protocol
     */
    constructor(options) {
        this.config = options.config;
        this.timeout = options.timeout ?? 8000;
        this.opened = false;
    }
    /**
     * Opens protocol and any associated dependencies
     */
    async open() {
        this.opened = true;
    }
    /**
     * Perform handshake given a sender from subclass.
     */
    async handshake(sender) {
        const status = this.encodeStatus();
        sender.sendStatus(status);
        return new Promise((resolve, reject) => {
            let timeout = setTimeout(() => {
                timeout = null;
                reject(new Error(`Handshake timed out after ${this.timeout}ms`));
            }, this.timeout);
            const handleStatus = (status) => {
                if (timeout !== null && timeout !== 0) {
                    clearTimeout(timeout);
                    resolve(this.decodeStatus(status));
                }
            };
            if (sender.status !== undefined && sender.status !== null && sender.status !== 0) {
                handleStatus(sender.status);
            }
            else {
                sender.once('status', handleStatus);
            }
        });
    }
    /**
     * Abstract getter for name of protocol
     */
    get name() {
        return 'protocol';
    }
    /**
     * Protocol versions supported
     */
    get versions() {
        throw new Error('Unimplemented');
    }
    /**
     * Messages defined by this protocol
     */
    get messages() {
        throw new Error('Unimplemented');
    }
    /**
     * Encodes status into status message payload. Must be implemented by subclass.
     */
    encodeStatus() {
        throw new Error('Unimplemented');
    }
    /**
     * Decodes status message payload into a status object.  Must be implemented
     * by subclass.
     * @param _status status message payload
     */
    decodeStatus(_status) {
        throw new Error('Unimplemented');
    }
    /**
     * Encodes message into proper format before sending
     * @param message message definition
     * @param args message arguments
     */
    encode(message, args) {
        if (message.encode) {
            return message.encode(args);
        }
        return args;
    }
    /**
     * Decodes message payload
     * @param message message definition
     * @param payload message payload
     */
    decode(message, payload) {
        if (message.decode) {
            return message.decode(payload);
        }
        return payload;
    }
}
exports.Protocol = Protocol;
//# sourceMappingURL=protocol.js.map