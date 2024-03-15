"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeerPool = void 0;
const common_1 = require("@ethereumjs/common");
const types_1 = require("../types");
/**
 * @module net
 */
/**
 * Pool of connected peers
 * @memberof module:net
 */
class PeerPool {
    /**
     * Create new peer pool
     */
    constructor(options) {
        /**
         * Default status check interval (in ms)
         */
        this.DEFAULT_STATUS_CHECK_INTERVAL = 20000;
        this.config = options.config;
        this.pool = new Map();
        this.noPeerPeriods = 0;
        this.opened = false;
        this.running = false;
        this.init();
    }
    init() {
        this.opened = false;
    }
    /**
     * Open pool
     */
    async open() {
        if (this.opened) {
            return false;
        }
        this.config.events.on(types_1.Event.PEER_CONNECTED, (peer) => {
            this.connected(peer);
        });
        this.config.events.on(types_1.Event.PEER_DISCONNECTED, (peer) => {
            this.disconnected(peer);
        });
        this.config.events.on(types_1.Event.PEER_ERROR, (error, peer) => {
            if (this.pool.get(peer.id)) {
                this.config.logger.warn(`Peer error: ${error} ${peer}`);
                this.ban(peer);
            }
        });
        this.opened = true;
    }
    /**
     * Start peer pool
     */
    async start() {
        if (this.running) {
            return false;
        }
        this._statusCheckInterval = setInterval(
        // eslint-disable-next-line @typescript-eslint/await-thenable
        await this._statusCheck.bind(this), this.DEFAULT_STATUS_CHECK_INTERVAL);
        this.running = true;
        return true;
    }
    /**
     * Stop peer pool
     */
    async stop() {
        if (this.opened) {
            await this.close();
        }
        clearInterval(this._statusCheckInterval);
        clearTimeout(this._reconnectTimeout);
        this.running = false;
        return true;
    }
    /**
     * Close pool
     */
    async close() {
        this.config.events.removeAllListeners(types_1.Event.PEER_CONNECTED);
        this.config.events.removeAllListeners(types_1.Event.PEER_DISCONNECTED);
        this.config.events.removeAllListeners(types_1.Event.PEER_ERROR);
        this.pool.clear();
        this.opened = false;
    }
    /**
     * Connected peers
     */
    get peers() {
        const connectedPeers = Array.from(this.pool.values());
        return connectedPeers;
    }
    /**
     * Number of peers in pool
     */
    get size() {
        return this.peers.length;
    }
    /**
     * Return true if pool contains the specified peer
     * @param peer peer object or id
     */
    contains(peer) {
        if (typeof peer !== 'string') {
            peer = peer.id;
        }
        return !!this.pool.get(peer);
    }
    /**
     * Returns a random idle peer from the pool
     * @param filterFn filter function to apply before finding idle peers
     */
    idle(filterFn = (_peer) => true) {
        const idle = this.peers.filter((p) => p.idle && filterFn(p));
        if (idle.length > 0) {
            const index = Math.floor(Math.random() * idle.length);
            return idle[index];
        }
        return;
    }
    /**
     * Handler for peer connections
     * @param peer peer
     */
    connected(peer) {
        if (this.size >= this.config.maxPeers)
            return;
        this.add(peer);
        peer.handleMessageQueue();
    }
    /**
     * Handler for peer disconnections
     * @param peer peer
     */
    disconnected(peer) {
        this.remove(peer);
    }
    /**
     * Ban peer from being added to the pool for a period of time
     * @param peer peer
     * @param maxAge ban period in ms
     * @emits {@link Event.POOL_PEER_BANNED}
     */
    ban(peer, maxAge = 60000) {
        if (!peer.server) {
            return;
        }
        peer.server.ban(peer.id, maxAge);
        this.remove(peer);
        this.config.events.emit(types_1.Event.POOL_PEER_BANNED, peer);
        // Reconnect to peer after ban period if pool is empty
        this._reconnectTimeout = setTimeout(async () => {
            if (this.running && this.size === 0) {
                await peer.connect();
                this.connected(peer);
            }
        }, maxAge + 1000);
    }
    /**
     * Add peer to pool
     * @param peer peer
     * @emits {@link Event.POOL_PEER_ADDED}
     */
    add(peer) {
        if (peer && peer.id && !this.pool.get(peer.id)) {
            this.pool.set(peer.id, peer);
            peer.pooled = true;
            this.config.events.emit(types_1.Event.POOL_PEER_ADDED, peer);
        }
    }
    /**
     * Remove peer from pool
     * @param peer peer
     * @emits {@link Event.POOL_PEER_REMOVED}
     */
    remove(peer) {
        if (peer && peer.id) {
            if (this.pool.delete(peer.id)) {
                peer.pooled = false;
                this.config.events.emit(types_1.Event.POOL_PEER_REMOVED, peer);
            }
        }
    }
    /**
     * Peer pool status check on a repeated interval
     */
    async _statusCheck() {
        let NO_PEER_PERIOD_COUNT = 3;
        if (this.config.chainCommon.gteHardfork(common_1.Hardfork.Paris)) {
            NO_PEER_PERIOD_COUNT = 6;
        }
        if (this.size === 0 && this.config.maxPeers > 0) {
            this.noPeerPeriods += 1;
            if (this.noPeerPeriods >= NO_PEER_PERIOD_COUNT) {
                this.noPeerPeriods = 0;
                if (this.config.server !== undefined) {
                    this.config.logger.info('Restarting RLPx server');
                    await this.config.server.stop();
                    await this.config.server.start();
                    this.config.logger.info('Reinitiating server bootstrap');
                    await this.config.server.bootstrap();
                }
            }
            else {
                let tablesize = 0;
                if (this.config.server !== undefined && this.config.server.discovery) {
                    tablesize = this.config.server.dpt?.getPeers().length;
                    this.config.logger.info(`Looking for suited peers: peertablesize=${tablesize}`);
                }
            }
        }
        else {
            this.noPeerPeriods = 0;
        }
    }
}
exports.PeerPool = PeerPool;
//# sourceMappingURL=peerpool.js.map