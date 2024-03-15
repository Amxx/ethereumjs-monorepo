"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const parse_1 = require("../../util/parse");
/**
 * Base class for transport specific server implementations.
 * @memberof module:net/server
 */
class Server {
    /**
     * Create new server
     */
    constructor(options) {
        this.bootnodes = [];
        this.config = options.config;
        this.key = options.key !== undefined ? (0, parse_1.parseKey)(options.key) : this.config.key;
        this.bootnodes = options.bootnodes !== undefined ? (0, parse_1.parseMultiaddrs)(options.bootnodes) : [];
        this.dnsNetworks = options.dnsNetworks ?? [];
        this.refreshInterval = options.refreshInterval ?? 30000;
        this.protocols = new Set();
        this.started = false;
    }
    get name() {
        return this.constructor.name;
    }
    /**
     * Check if server is running
     */
    get running() {
        return this.started;
    }
    /**
     * Start server.
     * Returns a promise that resolves once server has been started.
     * @returns true if server successfully started
     */
    async start() {
        if (this.started) {
            return false;
        }
        const protocols = Array.from(this.protocols);
        await Promise.all(protocols.map((p) => p.open()));
        this.started = true;
        this.config.logger.info(`Started ${this.name} server maxPeers=${this.config.maxPeers}`);
        return true;
    }
    /**
     * Server bootstrap.
     * In Libp2p this is done during server start.
     */
    async bootstrap() { }
    /**
     * Stop server. Returns a promise that resolves once server has been stopped.
     */
    async stop() {
        this.started = false;
        this.config.logger.info(`Stopped ${this.name} server.`);
        return this.started;
    }
    /**
     * Specify which protocols the server must support
     * @param protocols protocol classes
     * @returns true if protocol added successfully
     */
    addProtocols(protocols) {
        if (this.started) {
            this.config.logger.error('Cannot require protocols after server has been started');
            return false;
        }
        for (const p of protocols) {
            this.protocols.add(p);
        }
        return true;
    }
    /**
     * Ban peer for a specified time
     * @param peerId id of peer
     * @param maxAge how long to ban peer
     */
    ban(_peerId, _maxAge) {
        // don't do anything by default
    }
    async connect(_peerId, _stream) { }
}
exports.Server = Server;
//# sourceMappingURL=server.js.map