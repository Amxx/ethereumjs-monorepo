"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TxPool = void 0;
const helpers_1 = require("../helpers");
const validation_1 = require("../validation");
/**
 * web3_* RPC module
 * @memberof module:rpc/modules
 */
class TxPool {
    /**
     * Create web3_* RPC module
     * @param client Client to which the module binds
     */
    constructor(client, rpcDebug) {
        const service = client.services.find((s) => s.name === 'eth');
        this._txpool = service.txPool;
        this._vm = service.execution.vm;
        this._rpcDebug = rpcDebug;
        this.content = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.content.bind(this), this._rpcDebug), 0, []);
    }
    /**
     * Returns the contents of the transaction pool
     * @param params An empty array
     */
    content(_params = []) {
        const pending = new Map();
        for (const pool of this._txpool.pool) {
            const pendingForAcct = new Map();
            for (const tx of pool[1]) {
                pendingForAcct.set(tx.tx.nonce, (0, helpers_1.jsonRpcTx)(tx.tx));
            }
            if (pendingForAcct.size > 0)
                pending.set('0x' + pool[0], Object.fromEntries(pendingForAcct));
        }
        return {
            pending: Object.fromEntries(pending),
        };
    }
}
exports.TxPool = TxPool;
//# sourceMappingURL=txpool.js.map