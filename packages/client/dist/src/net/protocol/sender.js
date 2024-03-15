"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sender = void 0;
const events_1 = require("events");
/**
 * Base class for transport specific message sender/receiver. Subclasses should
 * emit a message event when the sender receives a new message, and they should
 * emit a status event when the sender receives a handshake status message
 * @emits message
 * @emits status
 * @memberof module:net/protocol
 */
class Sender extends events_1.EventEmitter {
    constructor() {
        super();
        this._status = null;
    }
    get status() {
        return this._status;
    }
    set status(status) {
        this._status = status;
        this.emit('status', status);
    }
    /**
     * Send a status to peer
     * @param status
     */
    sendStatus(_status) {
        throw new Error('Unimplemented');
    }
    /**
     * Send a message to peer
     * @param code message code
     * @param rlpEncodedData rlp encoded message payload
     */
    sendMessage(_code, _rlpEncodedData) {
        throw new Error('Unimplemented');
    }
}
exports.Sender = Sender;
//# sourceMappingURL=sender.js.map