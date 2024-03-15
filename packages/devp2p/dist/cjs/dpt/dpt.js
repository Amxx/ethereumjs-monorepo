"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DPT = void 0;
const util_1 = require("@ethereumjs/util");
const keccak_js_1 = require("ethereum-cryptography/keccak.js");
const secp256k1_js_1 = require("ethereum-cryptography/secp256k1.js");
const events_1 = require("events");
const index_js_1 = require("../dns/index.js");
const util_js_1 = require("../util.js");
const ban_list_js_1 = require("./ban-list.js");
const kbucket_js_1 = require("./kbucket.js");
const server_js_1 = require("./server.js");
const DEBUG_BASE_NAME = 'dpt';
class DPT {
    constructor(privateKey, options) {
        this._refreshIntervalSelectionCounter = 0;
        this.events = new events_1.EventEmitter();
        this._privateKey = privateKey;
        this.id = (0, util_js_1.pk2id)(secp256k1_js_1.secp256k1.getPublicKey(this._privateKey, false));
        this._shouldFindNeighbours = options.shouldFindNeighbours ?? true;
        this._shouldGetDnsPeers = options.shouldGetDnsPeers ?? false;
        // By default, tries to connect to 12 new peers every 3s
        this._dnsRefreshQuantity = Math.floor((options.dnsRefreshQuantity ?? 25) / 2);
        this._dnsNetworks = options.dnsNetworks ?? [];
        this._dnsAddr = options.dnsAddr ?? '8.8.8.8';
        this._dns = new index_js_1.DNS({ dnsServerAddress: this._dnsAddr, common: options.common });
        this._banlist = new ban_list_js_1.BanList();
        this._onlyConfirmed = options.onlyConfirmed ?? false;
        this._confirmedPeers = new Set();
        this._keccakFunction = options.common?.customCrypto.keccak256 ?? keccak_js_1.keccak256;
        this._kbucket = new kbucket_js_1.KBucket(this.id);
        this._kbucket.events.on('added', (peer) => this.events.emit('peer:added', peer));
        this._kbucket.events.on('removed', (peer) => this.events.emit('peer:removed', peer));
        this._kbucket.events.on('ping', this._onKBucketPing.bind(this));
        this._server = new server_js_1.Server(this, this._privateKey, {
            timeout: options.timeout,
            endpoint: options.endpoint,
            createSocket: options.createSocket,
            common: options.common,
        });
        this._server.events.once('listening', () => this.events.emit('listening'));
        this._server.events.once('close', () => this.events.emit('close'));
        this._server.events.on('error', (err) => this.events.emit('error', err));
        this._debug = util_js_1.devp2pDebug.extend(DEBUG_BASE_NAME);
        // When not using peer neighbour discovery we don't add peers here
        // because it results in duplicate calls for the same targets
        this._server.events.on('peers', (peers) => {
            if (!this._shouldFindNeighbours)
                return;
            this._addPeerBatch(peers);
        });
        // By default calls refresh every 3s
        const refreshIntervalSubdivided = Math.floor((options.refreshInterval ?? 60000) / 10); // 60 sec * 1000
        this._refreshIntervalId = setInterval(() => this.refresh(), refreshIntervalSubdivided);
        this.DEBUG =
            typeof window === 'undefined' ? process?.env?.DEBUG?.includes('ethjs') ?? false : false;
    }
    bind(...args) {
        this._server.bind(...args);
    }
    destroy(...args) {
        clearInterval(this._refreshIntervalId);
        this._server.destroy(...args);
    }
    _onKBucketPing(oldPeers, newPeer) {
        if (this._banlist.has(newPeer))
            return;
        let count = 0;
        let err = null;
        for (const peer of oldPeers) {
            this._server
                .ping(peer)
                .catch((_err) => {
                this._banlist.add(peer, 300000); // 5 min * 60 * 1000
                this._kbucket.remove(peer);
                err = err ?? _err;
            })
                .then(() => {
                if (++count < oldPeers.length)
                    return;
                if (err === null)
                    this._banlist.add(newPeer, 300000); // 5 min * 60 * 1000
                else
                    this._kbucket.add(newPeer);
            });
        }
    }
    _addPeerBatch(peers) {
        const DIFF_TIME_MS = 200;
        let ms = 0;
        for (const peer of peers) {
            setTimeout(() => {
                this.addPeer(peer).catch((error) => {
                    this.events.emit('error', error);
                });
            }, ms);
            ms += DIFF_TIME_MS;
        }
    }
    async bootstrap(peer) {
        try {
            peer = await this.addPeer(peer);
            if (peer.id !== undefined) {
                this._confirmedPeers.add((0, util_1.bytesToUnprefixedHex)(peer.id));
            }
        }
        catch (error) {
            this.events.emit('error', error);
            return;
        }
        if (!this.id)
            return;
        if (this._shouldFindNeighbours) {
            this._server.findneighbours(peer, this.id);
        }
    }
    async addPeer(obj) {
        if (this._banlist.has(obj))
            throw new Error('Peer is banned');
        if (this.DEBUG) {
            this._debug(`attempt adding peer ${obj.address}:${obj.udpPort}`);
        }
        // check k-bucket first
        const peer = this._kbucket.get(obj);
        if (peer !== null)
            return peer;
        // check that peer is alive
        try {
            const peer = await this._server.ping(obj);
            this.events.emit('peer:new', peer);
            this._kbucket.add(peer);
            return peer;
        }
        catch (err) {
            this._banlist.add(obj, 300000); // 5 min * 60 * 1000
            throw err;
        }
    }
    /**
     * Add peer to a confirmed list of peers (peers meeting some
     * level of quality, e.g. being on the same network) to allow
     * for a more selective findNeighbours request and sending
     * (with activated `onlyConfirmed` setting)
     *
     * @param id Unprefixed hex id
     */
    confirmPeer(id) {
        if (this._confirmedPeers.size < 5000) {
            this._confirmedPeers.add(id);
        }
    }
    getPeer(obj) {
        return this._kbucket.get(obj);
    }
    getPeers() {
        return this._kbucket.getAll();
    }
    numPeers() {
        return this._kbucket.getAll().length;
    }
    getClosestPeers(id) {
        let peers = this._kbucket.closest(id);
        if (this._onlyConfirmed && this._confirmedPeers.size > 0) {
            peers = peers.filter((peer) => this._confirmedPeers.has((0, util_1.bytesToUnprefixedHex)(peer.id)) ? true : false);
        }
        return peers;
    }
    removePeer(obj) {
        const peer = this._kbucket.get(obj);
        if (peer?.id !== undefined) {
            this._confirmedPeers.delete((0, util_1.bytesToUnprefixedHex)(peer.id));
        }
        this._kbucket.remove(obj);
    }
    banPeer(obj, maxAge) {
        this._banlist.add(obj, maxAge);
        this._kbucket.remove(obj);
    }
    async getDnsPeers() {
        return this._dns.getPeers(this._dnsRefreshQuantity, this._dnsNetworks);
    }
    async refresh() {
        if (this._shouldFindNeighbours) {
            // Rotating selection counter going in loop from 0..9
            this._refreshIntervalSelectionCounter = (this._refreshIntervalSelectionCounter + 1) % 10;
            const peers = this.getPeers();
            if (this.DEBUG) {
                this._debug(`call .refresh() (selector ${this._refreshIntervalSelectionCounter}) (${peers.length} peers in table)`);
            }
            for (const peer of peers) {
                // Randomly distributed selector based on peer ID
                // to decide on subdivided execution
                const selector = (0, util_1.bytesToInt)(peer.id.subarray(0, 1)) % 10;
                let confirmed = true;
                if (this._onlyConfirmed && this._confirmedPeers.size > 0) {
                    const id = (0, util_1.bytesToUnprefixedHex)(peer.id);
                    if (!this._confirmedPeers.has(id)) {
                        confirmed = false;
                    }
                }
                if (confirmed && selector === this._refreshIntervalSelectionCounter) {
                    this._server.findneighbours(peer, (0, util_1.randomBytes)(64));
                }
            }
        }
        if (this._shouldGetDnsPeers) {
            const dnsPeers = await this.getDnsPeers();
            if (this.DEBUG) {
                this._debug(`.refresh() Adding ${dnsPeers.length} from DNS tree, (${this.getPeers().length} current peers in table)`);
            }
            this._addPeerBatch(dnsPeers);
        }
    }
}
exports.DPT = DPT;
//# sourceMappingURL=dpt.js.map