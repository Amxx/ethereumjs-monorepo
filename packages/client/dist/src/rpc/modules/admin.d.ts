import type { Chain } from '../../blockchain';
import type { EthereumClient } from '../../client';
/**
 * admin_* RPC module
 * @memberof module:rpc/modules
 */
export declare class Admin {
    readonly _chain: Chain;
    readonly _client: EthereumClient;
    private _rpcDebug;
    /**
     * Create admin_* RPC module
     * @param client Client to which the module binds
     */
    constructor(client: EthereumClient, rpcDebug: boolean);
    /**
     * Returns information about the currently running node.
     * see for reference: https://geth.ethereum.org/docs/rpc/ns-admin#admin_nodeinfo
     * @param params An empty array
     */
    nodeInfo(_params: []): Promise<{
        name: string;
        enode: string | undefined;
        id: string | undefined;
        ip: string;
        listenAddr: string;
        ports: {
            discovery: number | undefined;
            listener: number | undefined;
        };
        protocols: {
            eth: {
                difficulty: string;
                genesis: string;
                head: string;
                network: string;
            };
        };
    }>;
}
//# sourceMappingURL=admin.d.ts.map