import type { EthereumClient } from '../..';
/**
 * net_* RPC module
 * @memberof module:rpc/modules
 */
export declare class Net {
    private _chain;
    private _client;
    private _peerPool;
    private _rpcDebug;
    /**
     * Create net_* RPC module
     * @param client Client to which the module binds
     */
    constructor(client: EthereumClient, rpcDebug: boolean);
    /**
     * Returns the current network id
     * @param params An empty array
     */
    version(_params?: never[]): string;
    /**
     * Returns true if client is actively listening for network connections
     * @param params An empty array
     */
    listening(_params?: never[]): boolean;
    /**
     * Returns number of peers currently connected to the client
     * @param params An empty array
     */
    peerCount(_params?: never[]): string;
}
//# sourceMappingURL=net.d.ts.map