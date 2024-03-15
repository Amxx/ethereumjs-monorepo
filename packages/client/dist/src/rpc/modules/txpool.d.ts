import type { EthereumClient } from '../..';
/**
 * web3_* RPC module
 * @memberof module:rpc/modules
 */
export declare class TxPool {
    private _txpool;
    private _vm;
    private _rpcDebug;
    /**
     * Create web3_* RPC module
     * @param client Client to which the module binds
     */
    constructor(client: EthereumClient, rpcDebug: boolean);
    /**
     * Returns the contents of the transaction pool
     * @param params An empty array
     */
    content(_params?: never[]): {
        pending: any;
    };
}
//# sourceMappingURL=txpool.d.ts.map