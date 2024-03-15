import { Server as RPCServer } from 'jayson/promise';
import type { Logger } from '../logging';
import type { RPCManager } from '../rpc';
import type { IncomingMessage } from 'connect';
import type { HttpServer } from 'jayson/promise';
declare type CreateRPCServerOpts = {
    methodConfig: MethodConfig;
    rpcDebug: string;
    rpcDebugVerbose: string;
    logger?: Logger;
};
declare type CreateRPCServerReturn = {
    server: RPCServer;
    methods: {
        [key: string]: Function;
    };
    namespaces: string;
};
declare type CreateRPCServerListenerOpts = {
    rpcCors?: string;
    server: RPCServer;
    withEngineMiddleware?: WithEngineMiddleware;
};
declare type CreateWSServerOpts = CreateRPCServerListenerOpts & {
    httpServer?: HttpServer;
};
declare type WithEngineMiddleware = {
    jwtSecret: Uint8Array;
    unlessFn?: (req: IncomingMessage) => boolean;
};
export declare enum MethodConfig {
    WithEngine = "withengine",
    WithoutEngine = "withoutengine",
    EngineOnly = "engineonly"
}
/**
 * Internal util to pretty print params for logging.
 */
export declare function inspectParams(params: any, shorten?: number): string;
export declare function createRPCServer(manager: RPCManager, opts: CreateRPCServerOpts): CreateRPCServerReturn;
export declare function createRPCServerListener(opts: CreateRPCServerListenerOpts): HttpServer;
export declare function createWsRPCServerListener(opts: CreateWSServerOpts): HttpServer | undefined;
export {};
//# sourceMappingURL=rpc.d.ts.map