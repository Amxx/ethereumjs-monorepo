"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.helprpc = exports.startRPCServers = void 0;
const util_1 = require("@ethereumjs/util");
const fs_1 = require("fs");
const rpc_1 = require("../src/rpc");
const modules = require("../src/rpc/modules");
const util_2 = require("../src/util");
/**
 * Returns a jwt secret from a provided file path, otherwise saves a randomly generated one to datadir if none already exists
 */
function parseJwtSecret(config, jwtFilePath) {
    let jwtSecret;
    const defaultJwtPath = `${config.datadir}/jwtsecret`;
    const usedJwtPath = jwtFilePath !== undefined ? jwtFilePath : defaultJwtPath;
    // If jwtFilePath is provided, it should exist
    if (jwtFilePath !== undefined && !(0, fs_1.existsSync)(jwtFilePath)) {
        throw new Error(`No file exists at provided jwt secret path=${jwtFilePath}`);
    }
    if (jwtFilePath !== undefined || (0, fs_1.existsSync)(defaultJwtPath)) {
        const jwtSecretContents = (0, fs_1.readFileSync)(jwtFilePath ?? defaultJwtPath, 'utf-8').trim();
        const hexPattern = new RegExp(/^(0x|0X)?(?<jwtSecret>[a-fA-F0-9]+)$/, 'g');
        const jwtSecretHex = hexPattern.exec(jwtSecretContents)?.groups?.jwtSecret;
        if (jwtSecretHex === undefined || jwtSecretHex.length !== 64) {
            throw Error('Need a valid 256 bit hex encoded secret');
        }
        jwtSecret = (0, util_1.hexToBytes)('0x' + jwtSecretHex);
    }
    else {
        const folderExists = (0, fs_1.existsSync)(config.datadir);
        if (!folderExists) {
            (0, fs_1.mkdirSync)(config.datadir, { recursive: true });
        }
        jwtSecret = (0, util_1.randomBytes)(32);
        (0, fs_1.writeFileSync)(defaultJwtPath, (0, util_1.bytesToUnprefixedHex)(jwtSecret), {});
        config.logger.info(`New Engine API JWT token created path=${defaultJwtPath}`);
    }
    config.logger.info(`Using Engine API with JWT token authentication path=${usedJwtPath}`);
    return jwtSecret;
}
/**
 * Starts and returns enabled RPCServers
 */
function startRPCServers(client, args) {
    const { config } = client;
    const servers = [];
    const { rpc, rpcAddr, rpcPort, ws, wsPort, wsAddr, rpcEngine, rpcEngineAddr, rpcEnginePort, wsEngineAddr, wsEnginePort, jwtSecret: jwtSecretPath, rpcEngineAuth, rpcCors, rpcDebug, rpcDebugVerbose, } = args;
    const manager = new rpc_1.RPCManager(client, config);
    const { logger } = config;
    const jwtSecret = rpcEngine && rpcEngineAuth ? parseJwtSecret(config, jwtSecretPath) : new Uint8Array(0);
    let withEngineMethods = false;
    if ((rpc || rpcEngine) && !config.saveReceipts) {
        logger?.warn(`Starting client without --saveReceipts might lead to interop issues with a CL especially if the CL intends to propose blocks, omitting methods=${rpc_1.saveReceiptsMethods}`);
    }
    if (rpc || ws) {
        let rpcHttpServer;
        withEngineMethods = rpcEngine && rpcEnginePort === rpcPort && rpcEngineAddr === rpcAddr;
        const { server, namespaces, methods } = (0, util_2.createRPCServer)(manager, {
            methodConfig: withEngineMethods ? util_2.MethodConfig.WithEngine : util_2.MethodConfig.WithoutEngine,
            rpcDebugVerbose,
            rpcDebug,
            logger,
        });
        servers.push(server);
        if (rpc) {
            rpcHttpServer = (0, util_2.createRPCServerListener)({
                rpcCors,
                server,
                withEngineMiddleware: withEngineMethods && rpcEngineAuth
                    ? {
                        jwtSecret,
                        unlessFn: (req) => Array.isArray(req.body)
                            ? req.body.some((r) => r.method.includes('engine_')) === false
                            : req.body.method.includes('engine_') === false,
                    }
                    : undefined,
            });
            rpcHttpServer.listen(rpcPort, rpcAddr);
            logger.info(`Started JSON RPC Server address=http://${rpcAddr}:${rpcPort} namespaces=${namespaces}${withEngineMethods ? ' rpcEngineAuth=' + rpcEngineAuth.toString() : ''}`);
            logger.debug(`Methods available at address=http://${rpcAddr}:${rpcPort} namespaces=${namespaces} methods=${Object.keys(methods).join(',')}`);
        }
        if (ws) {
            const opts = {
                rpcCors,
                server,
                withEngineMiddleware: withEngineMethods && rpcEngineAuth ? { jwtSecret } : undefined,
            };
            if (rpcAddr === wsAddr && rpcPort === wsPort) {
                // We want to load the websocket upgrade request to the same server
                opts.httpServer = rpcHttpServer;
            }
            const rpcWsServer = (0, util_2.createWsRPCServerListener)(opts);
            if (rpcWsServer)
                rpcWsServer.listen(wsPort);
            logger.info(`Started JSON RPC Server address=ws://${wsAddr}:${wsPort} namespaces=${namespaces}${withEngineMethods ? ` rpcEngineAuth=${rpcEngineAuth}` : ''}`);
            logger.debug(`Methods available at address=ws://${wsAddr}:${wsPort} namespaces=${namespaces} methods=${Object.keys(methods).join(',')}`);
        }
    }
    if (rpcEngine && !(rpc && rpcPort === rpcEnginePort && rpcAddr === rpcEngineAddr)) {
        const { server, namespaces, methods } = (0, util_2.createRPCServer)(manager, {
            methodConfig: util_2.MethodConfig.EngineOnly,
            rpcDebug,
            rpcDebugVerbose,
            logger,
        });
        servers.push(server);
        const rpcHttpServer = (0, util_2.createRPCServerListener)({
            rpcCors,
            server,
            withEngineMiddleware: rpcEngineAuth
                ? {
                    jwtSecret,
                }
                : undefined,
        });
        rpcHttpServer.listen(rpcEnginePort, rpcEngineAddr);
        logger.info(`Started JSON RPC server address=http://${rpcEngineAddr}:${rpcEnginePort} namespaces=${namespaces} rpcEngineAuth=${rpcEngineAuth}`);
        logger.debug(`Methods available at address=http://${rpcEngineAddr}:${rpcEnginePort} namespaces=${namespaces} methods=${Object.keys(methods).join(',')}`);
        if (ws) {
            const opts = {
                rpcCors,
                server,
                withEngineMiddleware: rpcEngineAuth ? { jwtSecret } : undefined,
            };
            if (rpcEngineAddr === wsEngineAddr && rpcEnginePort === wsEnginePort) {
                // We want to load the websocket upgrade request to the same server
                opts.httpServer = rpcHttpServer;
            }
            const rpcWsServer = (0, util_2.createWsRPCServerListener)(opts);
            if (rpcWsServer)
                rpcWsServer.listen(wsEnginePort, wsEngineAddr);
            logger.info(`Started JSON RPC Server address=ws://${wsEngineAddr}:${wsEnginePort} namespaces=${namespaces} rpcEngineAuth=${rpcEngineAuth}`);
            logger.debug(`Methods available at address=ws://${wsEngineAddr}:${wsEnginePort} namespaces=${namespaces} methods=${Object.keys(methods).join(',')}`);
        }
    }
    return servers;
}
exports.startRPCServers = startRPCServers;
/**
 * Output RPC help and exit
 */
function helprpc() {
    console.log('-'.repeat(27));
    console.log('JSON-RPC: Supported Methods');
    console.log('-'.repeat(27));
    console.log();
    for (const modName of modules.list) {
        console.log(`${modName}:`);
        const methods = rpc_1.RPCManager.getMethodNames(modules[modName]);
        for (const methodName of methods) {
            console.log(`-> ${modName.toLowerCase()}_${methodName}`);
        }
        console.log();
    }
    console.log();
    process.exit();
}
exports.helprpc = helprpc;
//# sourceMappingURL=startRpc.js.map