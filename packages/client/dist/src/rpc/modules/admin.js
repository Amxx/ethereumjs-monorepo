"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Admin = void 0;
const util_1 = require("@ethereumjs/util");
const util_2 = require("../../util");
const helpers_1 = require("../helpers");
const validation_1 = require("../validation");
/**
 * admin_* RPC module
 * @memberof module:rpc/modules
 */
class Admin {
    /**
     * Create admin_* RPC module
     * @param client Client to which the module binds
     */
    constructor(client, rpcDebug) {
        const service = client.services.find((s) => s.name === 'eth');
        this._chain = service.chain;
        this._client = client;
        this._rpcDebug = rpcDebug;
        this.nodeInfo = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.nodeInfo.bind(this), this._rpcDebug), 0, []);
    }
    /**
     * Returns information about the currently running node.
     * see for reference: https://geth.ethereum.org/docs/rpc/ns-admin#admin_nodeinfo
     * @param params An empty array
     */
    async nodeInfo(_params) {
        const rlpxInfo = this._client.config.server.getRlpxInfo();
        const { enode, id, ip, listenAddr, ports } = rlpxInfo;
        const { discovery, listener } = ports;
        const clientName = (0, util_2.getClientVersion)();
        const latestHeader = this._chain.headers.latest;
        const difficulty = latestHeader.difficulty.toString();
        const genesis = (0, util_1.bytesToHex)(this._chain.genesis.hash());
        const head = (0, util_1.bytesToHex)(latestHeader.mixHash);
        const network = this._chain.networkId.toString();
        const nodeInfo = {
            name: clientName,
            enode,
            id,
            ip,
            listenAddr,
            ports: {
                discovery,
                listener,
            },
            protocols: {
                eth: {
                    difficulty,
                    genesis,
                    head,
                    network,
                },
            },
        };
        return nodeInfo;
    }
}
exports.Admin = Admin;
//# sourceMappingURL=admin.js.map