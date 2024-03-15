"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Web3 = void 0;
const util_1 = require("@ethereumjs/util");
const keccak_1 = require("ethereum-cryptography/keccak");
const util_2 = require("../../util");
const helpers_1 = require("../helpers");
const validation_1 = require("../validation");
/**
 * web3_* RPC module
 * @memberof module:rpc/modules
 */
class Web3 {
    /**
     * Create web3_* RPC module
     * @param client Client to which the module binds
     */
    constructor(client, rpcDebug) {
        const service = client.services.find((s) => s.name === 'eth');
        this._chain = service.chain;
        this._rpcDebug = rpcDebug;
        this.clientVersion = (0, validation_1.middleware)(this.clientVersion.bind(this), 0, []);
        this.sha3 = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.sha3.bind(this), this._rpcDebug), 1, [
            [validation_1.validators.hex],
        ]);
    }
    /**
     * Returns the current client version
     * @param params An empty array
     */
    clientVersion(_params = []) {
        return (0, util_2.getClientVersion)();
    }
    /**
     * Returns Keccak-256 (not the standardized SHA3-256) of the given data
     * @param params The data to convert into a SHA3 hash
     */
    sha3(params) {
        const hexEncodedDigest = (0, util_1.bytesToHex)((0, keccak_1.keccak256)((0, util_1.toBytes)(params[0])));
        return hexEncodedDigest;
    }
}
exports.Web3 = Web3;
//# sourceMappingURL=web3.js.map