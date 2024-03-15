"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const util_1 = require("@ethereumjs/util");
const debug_1 = require("debug");
const dgram = require("dgram");
const events_1 = require("events");
const lru_cache_1 = require("lru-cache");
const util_js_1 = require("../util.js");
const message_js_1 = require("./message.js");
const { debug: createDebugLogger } = debug_1.default;
const DEBUG_BASE_NAME = 'dpt:server';
const verbose = createDebugLogger('verbose').enabled;
const VERSION = 0x04;
class Server {
    constructor(dpt, privateKey, options) {
        this.events = new events_1.EventEmitter();
        this._dpt = dpt;
        this._privateKey = privateKey;
        this._timeout = options.timeout ?? 4000; // 4 * 1000
        this._endpoint = options.endpoint ?? { address: '0.0.0.0', udpPort: null, tcpPort: null };
        this._requests = new Map();
        this._requestsCache = new lru_cache_1.LRUCache({ max: 1000, ttl: 1000 }); // 1 sec * 1000
        const createSocket = options.createSocket ?? dgram.createSocket.bind(null, { type: 'udp4' });
        this._socket = createSocket();
        this._debug = util_js_1.devp2pDebug.extend(DEBUG_BASE_NAME);
        if (this._socket) {
            this._socket.once('listening', () => this.events.emit('listening'));
            this._socket.once('close', () => this.events.emit('close'));
            this._socket.on('error', (err) => this.events.emit('error', err));
            this._socket.on('message', (msg, rinfo) => {
                try {
                    this._handler(msg, rinfo);
                }
                catch (err) {
                    this.events.emit('error', err);
                }
            });
        }
        this._common = options.common;
        this.DEBUG =
            typeof window === 'undefined' ? process?.env?.DEBUG?.includes('ethjs') ?? false : false;
    }
    bind(...args) {
        this._isAliveCheck();
        if (this.DEBUG) {
            this._debug('call .bind');
        }
        if (this._socket)
            this._socket.bind(...args);
    }
    destroy(...args) {
        this._isAliveCheck();
        if (this.DEBUG) {
            this._debug('call .destroy');
        }
        if (this._socket) {
            this._socket.close(...args);
            this._socket = null;
        }
    }
    async ping(peer) {
        this._isAliveCheck();
        const rckey = `${peer.address}:${peer.udpPort}`;
        const promise = this._requestsCache.get(rckey);
        if (promise !== undefined)
            return promise;
        const hash = this._send(peer, 'ping', {
            version: VERSION,
            from: this._endpoint,
            to: peer,
        });
        const deferred = (0, util_js_1.createDeferred)();
        const rkey = (0, util_1.bytesToUnprefixedHex)(hash);
        this._requests.set(rkey, {
            peer,
            deferred,
            timeoutId: setTimeout(() => {
                if (this._requests.get(rkey) !== undefined) {
                    if (this.DEBUG) {
                        this._debug(`ping timeout: ${peer.address}:${peer.udpPort} ${peer.id ? (0, util_js_1.formatLogId)((0, util_1.bytesToHex)(peer.id), verbose) : '-'}`);
                    }
                    this._requests.delete(rkey);
                    deferred.reject(new Error(`Timeout error: ping ${peer.address}:${peer.udpPort}`));
                }
                else {
                    return deferred.promise;
                }
            }, this._timeout),
        });
        this._requestsCache.set(rckey, deferred.promise);
        return deferred.promise;
    }
    findneighbours(peer, id) {
        this._isAliveCheck();
        this._send(peer, 'findneighbours', { id });
    }
    _isAliveCheck() {
        if (this._socket === null)
            throw new Error('Server already destroyed');
    }
    _send(peer, typename, data) {
        if (this.DEBUG) {
            this.debug(typename, `send ${typename} to ${peer.address}:${peer.udpPort} (peerId: ${peer.id ? (0, util_js_1.formatLogId)((0, util_1.bytesToHex)(peer.id), verbose) : '-'})`);
        }
        const msg = (0, message_js_1.encode)(typename, data, this._privateKey, this._common);
        if (this._socket && typeof peer.udpPort === 'number')
            this._socket.send(msg, 0, msg.length, peer.udpPort, peer.address);
        return msg.subarray(0, 32); // message id
    }
    _handler(msg, rinfo) {
        const info = (0, message_js_1.decode)(msg, this._common); // Dgram serializes everything to `Uint8Array`
        const peerId = (0, util_js_1.pk2id)(info.publicKey);
        if (this.DEBUG) {
            this.debug(info.typename.toString(), `received ${info.typename} from ${rinfo.address}:${rinfo.port} (peerId: ${(0, util_js_1.formatLogId)((0, util_1.bytesToHex)(peerId), verbose)})`);
        }
        // add peer if not in our table
        const peer = this._dpt.getPeer(peerId);
        if (peer === null && info.typename === 'ping' && info.data.from.udpPort !== null) {
            setTimeout(() => this.events.emit('peers', [info.data.from]), 100); // 100 ms
        }
        switch (info.typename) {
            case 'ping': {
                const remote = {
                    id: peerId,
                    udpPort: rinfo.port,
                    address: rinfo.address,
                };
                this._send(remote, 'pong', {
                    to: {
                        address: rinfo.address,
                        udpPort: rinfo.port,
                        tcpPort: info.data.from.tcpPort,
                    },
                    hash: msg.subarray(0, 32),
                });
                break;
            }
            case 'pong': {
                const rkey = (0, util_1.bytesToUnprefixedHex)(info.data.hash);
                const request = this._requests.get(rkey);
                if (request !== undefined) {
                    this._requests.delete(rkey);
                    request.deferred.resolve({
                        id: peerId,
                        address: request.peer.address,
                        udpPort: request.peer.udpPort,
                        tcpPort: request.peer.tcpPort,
                    });
                }
                break;
            }
            case 'findneighbours': {
                const remote = {
                    id: peerId,
                    udpPort: rinfo.port,
                    address: rinfo.address,
                };
                this._send(remote, 'neighbours', {
                    peers: this._dpt.getClosestPeers(info.data.id),
                });
                break;
            }
            case 'neighbours': {
                this.events.emit('peers', info.data.peers.map((peer) => peer.endpoint));
                break;
            }
        }
    }
    /**
     * Debug message both on the generic as well as the
     * per-message debug logger
     * @param messageName Lower capital message name (e.g. `findneighbours`)
     * @param msg Message text to debug
     */
    debug(messageName, msg) {
        this._debug.extend(messageName)(msg);
    }
}
exports.Server = Server;
//# sourceMappingURL=server.js.map