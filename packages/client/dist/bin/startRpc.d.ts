import type { EthereumClient } from '../src/client';
import type { Server as RPCServer } from 'jayson/promise';
export declare type RPCArgs = {
    rpc: boolean;
    rpcAddr: string;
    rpcPort: number;
    ws: boolean;
    wsPort: number;
    wsAddr: string;
    rpcEngine: boolean;
    rpcEngineAddr: string;
    rpcEnginePort: number;
    wsEngineAddr: string;
    wsEnginePort: number;
    rpcDebug: string;
    rpcDebugVerbose: string;
    helpRpc: boolean;
    jwtSecret?: string;
    rpcEngineAuth: boolean;
    rpcCors: string;
};
/**
 * Starts and returns enabled RPCServers
 */
export declare function startRPCServers(client: EthereumClient, args: RPCArgs): RPCServer[];
/**
 * Output RPC help and exit
 */
export declare function helprpc(): void;
//# sourceMappingURL=startRpc.d.ts.map