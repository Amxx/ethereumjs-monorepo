"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoundLesProtocol = exports.BoundSnapProtocol = exports.BoundEthProtocol = exports.BoundProtocol = void 0;
const util_1 = require("@ethereumjs/util");
const types_1 = require("../../types");
/**
 * Binds a protocol implementation to the specified peer
 * @memberof module:net/protocol
 */
class BoundProtocol {
    /**
     * Create bound protocol
     */
    constructor(options) {
        this.messageQueue = [];
        this.config = options.config;
        this.protocol = options.protocol;
        this.peer = options.peer;
        this.sender = options.sender;
        this.name = this.protocol.name;
        this.versions = this.protocol.versions;
        this.timeout = this.protocol.timeout;
        this._status = {};
        this.resolvers = new Map();
        this.sender.on('message', (message) => {
            try {
                if (this.peer.pooled) {
                    this.handle(message);
                }
                else {
                    this.messageQueue.push(message);
                    // Expected message queue growth is in the single digits
                    // so this adds a guard here if something goes wrong
                    if (this.messageQueue.length >= 50) {
                        const error = new Error('unexpected message queue growth for peer');
                        this.config.events.emit(types_1.Event.PROTOCOL_ERROR, error, this.peer);
                    }
                }
            }
            catch (error) {
                this.config.events.emit(types_1.Event.PROTOCOL_ERROR, error, this.peer);
            }
        });
        this.sender.on('error', (error) => this.config.events.emit(types_1.Event.PROTOCOL_ERROR, error, this.peer));
    }
    get status() {
        return this._status;
    }
    set status(status) {
        Object.assign(this._status, status);
    }
    async handshake(sender) {
        this._status = await this.protocol.handshake(sender);
    }
    /**
     * Handle incoming message
     * @param message message object
     * @emits {@link Event.PROTOCOL_MESSAGE}
     * @emits {@link Event.PROTOCOL_ERROR}
     */
    handle(incoming) {
        const messages = this.protocol.messages;
        const message = messages.find((m) => m.code === incoming.code);
        if (!message) {
            return;
        }
        let data;
        let error;
        try {
            data = this.protocol.decode(message, incoming.payload);
        }
        catch (e) {
            error = new Error(`Could not decode message ${message.name}: ${e}`);
        }
        const resolver = this.resolvers.get(incoming.code);
        if (resolver !== undefined) {
            clearTimeout(resolver.timeout);
            this.resolvers.delete(incoming.code);
            if (error) {
                resolver.reject(error);
            }
            else {
                resolver.resolve(data);
            }
        }
        else {
            if (error) {
                this.config.events.emit(types_1.Event.PROTOCOL_ERROR, error, this.peer);
            }
            else {
                this.config.events.emit(types_1.Event.PROTOCOL_MESSAGE, { name: message.name, data }, this.protocol.name, this.peer);
            }
        }
    }
    /**
     * Handle unhandled messages along handshake
     */
    handleMessageQueue() {
        for (const message of this.messageQueue) {
            this.handle(message);
        }
    }
    /**
     * Send message with name and the specified args
     * @param name message name
     * @param args message arguments
     */
    send(name, args) {
        const messages = this.protocol.messages;
        const message = messages.find((m) => m.name === name);
        if (message) {
            const encoded = this.protocol.encode(message, args);
            this.sender.sendMessage(message.code, encoded);
        }
        else {
            throw new Error(`Unknown message: ${name}`);
        }
        return message;
    }
    /**
     * Returns a promise that resolves with the message payload when a response
     * to the specified message is received
     * @param name message to wait for
     * @param args message arguments
     */
    async request(name, args) {
        const message = this.send(name, args);
        let lock;
        if (typeof message.response === 'number' &&
            this.resolvers.get(message.response) !== undefined) {
            const res = this.resolvers.get(message.response);
            lock = res.lock;
            await res.lock.acquire();
        }
        const resolver = {
            timeout: null,
            resolve: null,
            reject: null,
            lock: lock ?? new util_1.Lock(),
        };
        this.resolvers.set(message.response, resolver);
        if (lock === undefined) {
            await resolver.lock.acquire();
        }
        return new Promise((resolve, reject) => {
            resolver.resolve = function (e) {
                resolver.lock.release();
                resolve(e);
            };
            resolver.reject = function (e) {
                resolver.lock.release();
                reject(e);
            };
            resolver.timeout = setTimeout(() => {
                resolver.timeout = null;
                this.resolvers.delete(message.response);
                resolver.reject(new Error(`Request timed out after ${this.timeout}ms`));
            }, this.timeout);
        });
    }
}
exports.BoundProtocol = BoundProtocol;
class BoundEthProtocol extends BoundProtocol {
    constructor(options) {
        super(options);
        this.name = 'eth'; // public name: string
    }
    async getBlockHeaders(opts) {
        return this.request('GetBlockHeaders', opts).catch((error) => {
            this.config.events.emit(types_1.Event.PROTOCOL_ERROR, error, this.peer);
            return undefined;
        });
    }
    async getBlockBodies(opts) {
        return this.request('GetBlockBodies', opts).catch((error) => {
            this.config.events.emit(types_1.Event.PROTOCOL_ERROR, error, this.peer);
            return undefined;
        });
    }
    async getPooledTransactions(opts) {
        return this.request('GetPooledTransactions', opts).catch((error) => {
            this.config.events.emit(types_1.Event.PROTOCOL_ERROR, error, this.peer);
            return undefined;
        });
    }
    async getReceipts(opts) {
        return this.request('GetReceipts', opts).catch((error) => {
            this.config.events.emit(types_1.Event.PROTOCOL_ERROR, error, this.peer);
            return undefined;
        });
    }
}
exports.BoundEthProtocol = BoundEthProtocol;
class BoundSnapProtocol extends BoundProtocol {
    constructor(options) {
        super(options);
        this.name = 'snap'; // public name: string
    }
    async getAccountRange(opts) {
        return this.request('GetAccountRange', opts).catch((error) => {
            this.config.events.emit(types_1.Event.PROTOCOL_ERROR, error, this.peer);
            return undefined;
        });
    }
    async getStorageRanges(opts) {
        return this.request('GetStorageRanges', opts).catch((error) => {
            this.config.events.emit(types_1.Event.PROTOCOL_ERROR, error, this.peer);
            return undefined;
        });
    }
    async getByteCodes(opts) {
        return this.request('GetByteCodes', opts).catch((error) => {
            this.config.events.emit(types_1.Event.PROTOCOL_ERROR, error, this.peer);
            return undefined;
        });
    }
    async getTrieNodes(opts) {
        return this.request('GetTrieNodes', opts).catch((error) => {
            this.config.events.emit(types_1.Event.PROTOCOL_ERROR, error, this.peer);
            return undefined;
        });
    }
}
exports.BoundSnapProtocol = BoundSnapProtocol;
class BoundLesProtocol extends BoundProtocol {
    constructor(options) {
        super(options);
        this.name = 'les'; // public name: string
    }
    async getBlockHeaders(opts) {
        return this.request('GetBlockHeaders', opts).catch((error) => {
            this.config.events.emit(types_1.Event.PROTOCOL_ERROR, error, this.peer);
            return undefined;
        });
    }
}
exports.BoundLesProtocol = BoundLesProtocol;
//# sourceMappingURL=boundprotocol.js.map