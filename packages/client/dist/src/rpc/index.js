"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RPCManager = exports.saveReceiptsMethods = void 0;
const error_code_1 = require("./error-code");
const modules = require("./modules");
exports.saveReceiptsMethods = ['getLogs', 'getTransactionReceipt', 'getTransactionByHash'];
/**
 * @module rpc
 */
/**
 * RPC server manager
 * @memberof module:rpc
 */
class RPCManager {
    constructor(client, config) {
        this._modules = {};
        this._config = config;
        this._client = client;
    }
    /**
     * Returns bound methods for modules concat with underscore `_`
     * @param engine Pass true to return only `engine_` API endpoints (default: false)
     * @param rpcDebug Pass true to include stack traces on errors (default: false)
     */
    getMethods(engine = false, rpcDebug = false) {
        const methods = {};
        const mods = modules.list.filter((name) => engine ? name === 'Engine' : name !== 'Engine');
        for (const modName of mods) {
            const mod = new modules[modName](this._client, rpcDebug);
            this._modules[modName] = mod;
            const rpcMethods = RPCManager.getMethodNames(modules[modName]);
            for (const methodName of rpcMethods) {
                if (!this._config.saveReceipts && exports.saveReceiptsMethods.includes(methodName)) {
                    continue;
                }
                const concatedMethodName = `${modName.toLowerCase()}_${methodName}`;
                methods[concatedMethodName] = mod[methodName].bind((...params) => {
                    try {
                        mod(...params);
                    }
                    catch (error) {
                        throw {
                            code: error_code_1.INTERNAL_ERROR,
                            message: error.message ?? error,
                        };
                    }
                });
            }
        }
        this._config.logger.debug(`RPC Initialized ${Object.keys(methods).join(', ')}`);
        return methods;
    }
    /**
     * Returns all methods in a module
     */
    static getMethodNames(mod) {
        const methodNames = Object.getOwnPropertyNames(mod.prototype).filter((methodName) => methodName !== 'constructor');
        return methodNames;
    }
}
exports.RPCManager = RPCManager;
//# sourceMappingURL=index.js.map