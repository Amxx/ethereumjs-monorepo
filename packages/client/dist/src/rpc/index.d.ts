import type { EthereumClient } from '../client';
import type { Config } from '../config';
export declare const saveReceiptsMethods: string[];
/**
 * @module rpc
 */
/**
 * RPC server manager
 * @memberof module:rpc
 */
export declare class RPCManager {
    private _config;
    private _client;
    private _modules;
    constructor(client: EthereumClient, config: Config);
    /**
     * Returns bound methods for modules concat with underscore `_`
     * @param engine Pass true to return only `engine_` API endpoints (default: false)
     * @param rpcDebug Pass true to include stack traces on errors (default: false)
     */
    getMethods(engine?: boolean, rpcDebug?: boolean): {
        [key: string]: Function;
    };
    /**
     * Returns all methods in a module
     */
    static getMethodNames(mod: Object): string[];
}
//# sourceMappingURL=index.d.ts.map