"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Peer = void 0;
const events_1 = require("events");
const protocol_1 = require("../protocol");
/**
 * Network peer
 * @memberof module:net/peer
 */
class Peer extends events_1.EventEmitter {
    /**
     * Create new peer
     */
    constructor(options) {
        super();
        this.boundProtocols = [];
        /*
          If the peer is in the PeerPool.
          If true, messages are handled immediately.
          If false, adds incoming messages to handleMessageQueue,
          which are handled after the peer is added to the pool.
        */
        this.pooled = false;
        this.config = options.config;
        this.id = options.id ?? '';
        this.address = options.address;
        this.transport = options.transport;
        this.inbound = options.inbound ?? false;
        this.protocols = options.protocols ?? [];
        this._idle = true;
    }
    /**
     * Get idle state of peer
     */
    get idle() {
        return this._idle;
    }
    /**
     * Set idle state of peer
     */
    set idle(value) {
        this._idle = value;
    }
    /**
     * Handle unhandled messages along handshake
     */
    handleMessageQueue() {
        this.boundProtocols.map((e) => e.handleMessageQueue());
    }
    async addProtocol(sender, protocol) {
        let bound;
        const boundOpts = {
            config: protocol.config,
            protocol,
            peer: this,
            sender,
        };
        if (protocol.name === 'eth') {
            bound = new protocol_1.BoundEthProtocol(boundOpts);
        }
        else if (protocol.name === 'les') {
            bound = new protocol_1.BoundLesProtocol(boundOpts);
        }
        else if (protocol.name === 'snap') {
            bound = new protocol_1.BoundSnapProtocol(boundOpts);
        }
        else {
            throw new Error(`addProtocol: ${protocol.name} protocol not supported`);
        }
        // Handshake only when snap, else
        if (protocol.name !== 'snap') {
            await bound.handshake(sender);
        }
        else {
            if (sender.status === undefined)
                throw Error('Snap can only be bound on handshaked peer');
        }
        if (protocol.name === 'eth') {
            this.eth = bound;
        }
        else if (protocol.name === 'snap') {
            this.snap = bound;
        }
        else if (protocol.name === 'les') {
            this.les = bound;
        }
        this.boundProtocols.push(bound);
    }
    toString(withFullId = false) {
        const properties = {
            id: withFullId ? this.id : this.id.substr(0, 8),
            address: this.address,
            transport: this.transport,
            protocols: this.boundProtocols.map((e) => e.name),
            inbound: this.inbound,
        };
        return Object.entries(properties)
            .filter(([, value]) => value !== undefined && value !== null && value.toString() !== '')
            .map((keyValue) => keyValue.join('='))
            .join(' ');
    }
}
exports.Peer = Peer;
//# sourceMappingURL=peer.js.map