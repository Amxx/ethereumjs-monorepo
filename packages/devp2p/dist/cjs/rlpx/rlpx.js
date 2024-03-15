"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RLPx = void 0;
const util_1 = require("@ethereumjs/util");
const debug_1 = require("debug");
const keccak_js_1 = require("ethereum-cryptography/keccak.js");
const secp256k1_js_1 = require("ethereum-cryptography/secp256k1.js");
const events_1 = require("events");
const lru_cache_1 = require("lru-cache");
const net = require("net");
const os = require("os");
const types_js_1 = require("../types.js");
const util_js_1 = require("../util.js");
const peer_js_1 = require("./peer.js");
const { debug: createDebugLogger } = debug_1.default;
// note: relative path only valid in .js file in dist
const DEBUG_BASE_NAME = 'rlpx';
const verbose = createDebugLogger('verbose').enabled;
class RLPx {
    constructor(privateKey, options) {
        this._refillIntervalSelectionCounter = 0;
        this.events = new events_1.EventEmitter();
        this._privateKey = privateKey;
        this.id = (0, util_js_1.pk2id)(secp256k1_js_1.secp256k1.getPublicKey(this._privateKey, false));
        // options
        this._timeout = options.timeout ?? 10000; // 10 sec * 1000
        this._maxPeers = options.maxPeers ?? 10;
        this.clientId = options.clientId
            ? options.clientId
            : (0, util_1.utf8ToBytes)(`ethereumjs-devp2p/${os.platform()}-${os.arch()}/nodejs`);
        this._remoteClientIdFilter = options.remoteClientIdFilter;
        this._capabilities = options.capabilities;
        this._common = options.common;
        this._listenPort = options.listenPort ?? null;
        // DPT
        this._dpt = options.dpt ?? null;
        if (this._dpt !== null) {
            this._dpt.events.on('peer:new', (peer) => {
                if (peer.tcpPort === null || peer.tcpPort === undefined) {
                    this._dpt.banPeer(peer, 300000); // 5 min * 60 * 1000
                    this._debug(`banning peer with missing tcp port: ${peer.address}`);
                    return;
                }
                const key = (0, util_1.bytesToUnprefixedHex)(peer.id);
                if (this._peersLRU.has(key))
                    return;
                this._peersLRU.set(key, true);
                if (this._getOpenSlots() > 0) {
                    return this._connectToPeer(peer);
                }
                else if (this._getOpenQueueSlots() > 0) {
                    this._peersQueue.push({ peer, ts: 0 }); // save to queue
                }
            });
            this._dpt.events.on('peer:removed', (peer) => {
                // remove from queue
                this._peersQueue = this._peersQueue.filter((item) => !(0, util_1.equalsBytes)(item.peer.id, peer.id));
            });
        }
        // internal
        this._server = net.createServer();
        this._server.once('listening', () => this.events.emit('listening'));
        this._server.once('close', () => this.events.emit('close'));
        this._server.on('error', (err) => this.events.emit('error', err));
        this._server.on('connection', (socket) => this._onConnect(socket, null));
        const serverAddress = this._server.address();
        this._debug =
            serverAddress !== null
                ? util_js_1.devp2pDebug.extend(DEBUG_BASE_NAME).extend(serverAddress)
                : util_js_1.devp2pDebug.extend(DEBUG_BASE_NAME);
        this._peers = new Map();
        this._peersQueue = [];
        this._peersLRU = new lru_cache_1.LRUCache({ max: 25000 });
        const REFILL_INTERVALL = 10000; // 10 sec * 1000
        const refillIntervalSubdivided = Math.floor(REFILL_INTERVALL / 10);
        this._refillIntervalId = setInterval(() => this._refillConnections(), refillIntervalSubdivided);
        this._keccakFunction = options.common?.customCrypto.keccak256 ?? keccak_js_1.keccak256;
        this.DEBUG =
            typeof window === 'undefined' ? process?.env?.DEBUG?.includes('ethjs') ?? false : false;
    }
    listen(...args) {
        this._isAliveCheck();
        if (this.DEBUG) {
            this._debug('call .listen');
        }
        if (this._server)
            this._server.listen(...args);
    }
    destroy(...args) {
        this._isAliveCheck();
        if (this.DEBUG) {
            this._debug('call .destroy');
        }
        clearInterval(this._refillIntervalId);
        if (this._server)
            this._server.close(...args);
        this._server = null;
        for (const peerKey of this._peers.keys())
            this.disconnect((0, util_1.unprefixedHexToBytes)(peerKey));
    }
    async connect(peer) {
        if (peer.tcpPort === undefined || peer.tcpPort === null || peer.address === undefined)
            return;
        this._isAliveCheck();
        if (!(peer.id instanceof Uint8Array))
            throw new TypeError('Expected peer.id as Uint8Array');
        const peerKey = (0, util_1.bytesToUnprefixedHex)(peer.id);
        if (this._peers.has(peerKey))
            throw new Error('Already connected');
        if (this._getOpenSlots() === 0)
            throw new Error('Too many peers already connected');
        if (this.DEBUG) {
            this._debug(`connect to ${peer.address}:${peer.tcpPort} (id: ${(0, util_js_1.formatLogId)(peerKey, verbose)})`);
        }
        const deferred = (0, util_js_1.createDeferred)();
        const socket = new net.Socket();
        this._peers.set(peerKey, socket);
        socket.once('close', () => {
            this._peers.delete(peerKey);
            this._refillConnections();
        });
        socket.once('error', deferred.reject);
        socket.setTimeout(this._timeout, () => deferred.reject(new Error('Connection timeout')));
        socket.connect(peer.tcpPort, peer.address, deferred.resolve);
        await deferred.promise;
        this._onConnect(socket, peer.id);
    }
    getPeers() {
        return Array.from(this._peers.values()).filter((item) => item instanceof peer_js_1.Peer);
    }
    disconnect(id) {
        const peer = this._peers.get((0, util_1.bytesToUnprefixedHex)(id));
        if (peer instanceof peer_js_1.Peer) {
            peer.disconnect(types_js_1.DISCONNECT_REASON.CLIENT_QUITTING);
        }
    }
    _isAlive() {
        return this._server !== null;
    }
    _isAliveCheck() {
        if (!this._isAlive())
            throw new Error('Server already destroyed');
    }
    _getOpenSlots() {
        return Math.max(this._maxPeers - this._peers.size, 0);
    }
    _getOpenQueueSlots() {
        return this._maxPeers * 2 - this._peersQueue.length;
    }
    _connectToPeer(peer) {
        this.connect(peer).catch((err) => {
            if (this._dpt === null)
                return;
            if (err.code === 'ECONNRESET' || err.toString().includes('Connection timeout')) {
                this._dpt.banPeer(peer, 300000); // 5 min * 60 * 1000
            }
        });
    }
    _onConnect(socket, peerId) {
        if (this.DEBUG) {
            this._debug(`connected to ${socket.remoteAddress}:${socket.remotePort}, handshake waiting..`);
        }
        const peer = new peer_js_1.Peer({
            socket,
            remoteId: peerId,
            privateKey: this._privateKey,
            id: this.id,
            timeout: this._timeout,
            clientId: this.clientId,
            remoteClientIdFilter: this._remoteClientIdFilter,
            capabilities: this._capabilities,
            common: this._common,
            port: this._listenPort,
        });
        peer.events.on('error', (err) => this.events.emit('peer:error', peer, err));
        // handle incoming connection
        if (peerId === null && this._getOpenSlots() === 0) {
            peer.events.once('connect', () => peer.disconnect(types_js_1.DISCONNECT_REASON.TOO_MANY_PEERS));
            socket.once('error', () => { });
            return;
        }
        peer.events.once('connect', () => {
            let msg = `handshake with ${socket.remoteAddress}:${socket.remotePort} was successful`;
            if (peer['_eciesSession']['_gotEIP8Auth'] === true) {
                msg += ` (peer eip8 auth)`;
            }
            if (peer['_eciesSession']['_gotEIP8Ack'] === true) {
                msg += ` (peer eip8 ack)`;
            }
            if (this.DEBUG) {
                this._debug(msg);
            }
            const id = peer.getId();
            if (id && (0, util_1.equalsBytes)(id, this.id)) {
                return peer.disconnect(types_js_1.DISCONNECT_REASON.SAME_IDENTITY);
            }
            const peerKey = (0, util_1.bytesToUnprefixedHex)(id);
            const item = this._peers.get(peerKey);
            if (item && item instanceof peer_js_1.Peer) {
                return peer.disconnect(types_js_1.DISCONNECT_REASON.ALREADY_CONNECTED);
            }
            this._peers.set(peerKey, peer);
            this.events.emit('peer:added', peer);
        });
        peer.events.once('close', (reason, disconnectWe) => {
            if (disconnectWe === true) {
                if (this.DEBUG) {
                    this._debug(`disconnect from ${socket.remoteAddress}:${socket.remotePort}, reason: ${types_js_1.DISCONNECT_REASON[reason]}`, `disconnect`);
                }
            }
            if (disconnectWe !== true && reason === types_js_1.DISCONNECT_REASON.TOO_MANY_PEERS) {
                // hack
                if (this._getOpenQueueSlots() > 0) {
                    this._peersQueue.push({
                        peer: {
                            id: peer.getId(),
                            // @ts-ignore
                            address: peer._socket.remoteAddress,
                            // @ts-ignore
                            tcpPort: peer._socket.remotePort,
                        },
                        ts: (Date.now() + 300000), // 5 min * 60 * 1000
                    });
                }
            }
            const id = peer.getId();
            if (id) {
                const peerKey = (0, util_1.bytesToUnprefixedHex)(id);
                this._peers.delete(peerKey);
                this.events.emit('peer:removed', peer, reason, disconnectWe);
            }
        });
    }
    _refillConnections() {
        if (!this._isAlive())
            return;
        if (this._refillIntervalSelectionCounter === 0) {
            if (this.DEBUG) {
                this._debug(`Restart connection refill .. with selector ${this._refillIntervalSelectionCounter} peers: ${this._peers.size}, queue size: ${this._peersQueue.length}, open slots: ${this._getOpenSlots()}`);
            }
        }
        // Rotating selection counter going in loop from 0..9
        this._refillIntervalSelectionCounter = (this._refillIntervalSelectionCounter + 1) % 10;
        this._peersQueue = this._peersQueue.filter((item) => {
            if (this._getOpenSlots() === 0)
                return true;
            if (item.ts > Date.now())
                return true;
            // Randomly distributed selector based on peer ID
            // to decide on subdivided execution
            const selector = (0, util_1.bytesToInt)(item.peer.id.subarray(0, 1)) % 10;
            if (selector === this._refillIntervalSelectionCounter) {
                this._connectToPeer(item.peer);
                return false;
            }
            else {
                // Still keep peer in queue
                return true;
            }
        });
    }
}
exports.RLPx = RLPx;
//# sourceMappingURL=rlpx.js.map