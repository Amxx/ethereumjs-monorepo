"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Net = void 0;
const util_1 = require("@ethereumjs/util");
const helpers_1 = require("../helpers");
const validation_1 = require("../validation");
/**
 * net_* RPC module
 * @memberof module:rpc/modules
 */
class Net {
    /**
     * Create net_* RPC module
     * @param client Client to which the module binds
     */
    constructor(client, rpcDebug) {
        const service = client.services.find((s) => s.name === 'eth');
        this._chain = service.chain;
        this._client = client;
        this._peerPool = service.pool;
        this._rpcDebug = rpcDebug;
        this.version = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.version.bind(this), this._rpcDebug), 0, []);
        this.listening = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.listening.bind(this), this._rpcDebug), 0, []);
        this.peerCount = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.peerCount.bind(this), this._rpcDebug), 0, []);
    }
    /**
     * Returns the current network id
     * @param params An empty array
     */
    version(_params = []) {
        return this._chain.config.chainCommon.chainId().toString();
    }
    /**
     * Returns true if client is actively listening for network connections
     * @param params An empty array
     */
    listening(_params = []) {
        return this._client.opened;
    }
    /**
     * Returns number of peers currently connected to the client
     * @param params An empty array
     */
    peerCount(_params = []) {
        return (0, util_1.addHexPrefix)(this._peerPool.peers.length.toString(16));
    }
}
exports.Net = Net;
//# sourceMappingURL=net.js.map