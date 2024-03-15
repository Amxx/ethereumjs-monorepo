"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWsRPCServerListener = exports.createRPCServerListener = exports.createRPCServer = exports.inspectParams = exports.MethodConfig = void 0;
const body_parser_1 = require("body-parser");
const http_1 = require("http");
const promise_1 = require("jayson/promise");
const jwt_simple_1 = require("jwt-simple");
const util_1 = require("util");
const Connect = require('connect');
const cors = require('cors');
const algorithm = 'HS256';
var MethodConfig;
(function (MethodConfig) {
    MethodConfig["WithEngine"] = "withengine";
    MethodConfig["WithoutEngine"] = "withoutengine";
    MethodConfig["EngineOnly"] = "engineonly";
})(MethodConfig = exports.MethodConfig || (exports.MethodConfig = {}));
/** Allowed drift for jwt token issuance is 60 seconds */
const ALLOWED_DRIFT = 60000;
/**
 * Check if the `method` matches the comma-separated filter string
 * @param method - Method to check the filter on
 * @param filterStringCSV - Comma-separated list of filters to use
 * @returns
 */
function checkFilter(method, filterStringCSV) {
    if (!filterStringCSV || filterStringCSV === '') {
        return false;
    }
    if (filterStringCSV === 'all') {
        return true;
    }
    const filters = filterStringCSV.split(',');
    for (const filter of filters) {
        if (method.includes(filter) === true) {
            return true;
        }
    }
    return false;
}
/**
 * Internal util to pretty print params for logging.
 */
function inspectParams(params, shorten) {
    let inspected = (0, util_1.inspect)(params, {
        colors: true,
        maxStringLength: 100,
    });
    if (typeof shorten === 'number') {
        inspected = inspected.replace(/\n/g, '').replace(/ {2}/g, ' ');
        if (inspected.length > shorten) {
            inspected = inspected.slice(0, shorten) + '...';
        }
    }
    return inspected;
}
exports.inspectParams = inspectParams;
function createRPCServer(manager, opts) {
    const { methodConfig, rpcDebug, rpcDebugVerbose, logger } = opts;
    const onRequest = (request) => {
        if (checkFilter(request.method, rpcDebugVerbose)) {
            logger?.info(`${request.method} called with params:\n${inspectParams(request.params)}`);
        }
        else if (checkFilter(request.method, rpcDebug)) {
            logger?.info(`${request.method} called with params: ${inspectParams(request.params, 125)}`);
        }
    };
    const handleResponse = (request, response, batchAddOn = '') => {
        if (checkFilter(request.method, rpcDebugVerbose)) {
            logger?.info(`${request.method}${batchAddOn} responded with:\n${inspectParams(response)}`);
        }
        else if (checkFilter(request.method, rpcDebug)) {
            logger?.info(`${request.method}${batchAddOn} responded with:\n${inspectParams(response, 125)}`);
        }
    };
    const onBatchResponse = (request, response) => {
        // Batch request
        if (request.length !== undefined) {
            if (response.length === undefined || response.length !== request.length) {
                logger?.debug('Invalid batch request received.');
                return;
            }
            for (let i = 0; i < request.length; i++) {
                handleResponse(request[i], response[i], ' (batch request)');
            }
        }
        else {
            handleResponse(request, response);
        }
    };
    let methods;
    const ethMethods = manager.getMethods(false, rpcDebug !== 'false' && rpcDebug !== '');
    switch (methodConfig) {
        case MethodConfig.WithEngine:
            methods = {
                ...ethMethods,
                ...manager.getMethods(true, rpcDebug !== 'false' && rpcDebug !== ''),
            };
            break;
        case MethodConfig.WithoutEngine:
            methods = { ...ethMethods };
            break;
        case MethodConfig.EngineOnly: {
            /**
             * Filter eth methods which should be strictly exposed if only the engine is started:
             * https://github.com/ethereum/execution-apis/blob/6d2c035e4caafef7224cbb5fac7993b820bb61ce/src/engine/common.md#underlying-protocol
             * (Feb 3 2023)
             */
            const ethMethodsToBeIncluded = [
                'eth_blockNumber',
                'eth_call',
                'eth_chainId',
                'eth_getCode',
                'eth_getBlockByHash',
                'eth_getBlockByNumber',
                'eth_getLogs',
                'eth_sendRawTransaction',
                'eth_syncing',
            ];
            const ethEngineSubsetMethods = {};
            for (const method of ethMethodsToBeIncluded) {
                if (ethMethods[method] !== undefined)
                    ethEngineSubsetMethods[method] = ethMethods[method];
            }
            methods = { ...ethEngineSubsetMethods, ...manager.getMethods(true) };
            break;
        }
    }
    const server = new promise_1.Server(methods);
    server.on('request', onRequest);
    server.on('response', onBatchResponse);
    const namespaces = [...new Set(Object.keys(methods).map((m) => m.split('_')[0]))].join(',');
    return { server, methods, namespaces };
}
exports.createRPCServer = createRPCServer;
function checkHeaderAuth(req, jwtSecret) {
    const header = (req.headers['Authorization'] ?? req.headers['authorization']);
    if (!header)
        throw Error(`Missing auth header`);
    const token = header.trim().split(' ')[1];
    if (!token)
        throw Error(`Missing jwt token`);
    const claims = (0, jwt_simple_1.decode)(token.trim(), jwtSecret, false, algorithm);
    const drift = Math.abs(new Date().getTime() - claims.iat * 1000 ?? 0);
    if (drift > ALLOWED_DRIFT) {
        throw Error(`Stale jwt token drift=${drift}, allowed=${ALLOWED_DRIFT}`);
    }
}
function createRPCServerListener(opts) {
    const { server, withEngineMiddleware, rpcCors } = opts;
    const app = Connect();
    if (typeof rpcCors === 'string')
        app.use(cors({ origin: rpcCors }));
    // GOSSIP_MAX_SIZE_BELLATRIX is proposed to be 10MiB
    app.use((0, body_parser_1.json)({ limit: '11mb' }));
    if (withEngineMiddleware) {
        const { jwtSecret, unlessFn } = withEngineMiddleware;
        app.use((req, res, next) => {
            try {
                if (unlessFn && unlessFn(req))
                    return next();
                checkHeaderAuth(req, jwtSecret);
                return next();
            }
            catch (error) {
                if (error instanceof Error) {
                    res.writeHead(401);
                    res.end(`Unauthorized: ${error}`);
                    return;
                }
                next(error);
            }
        });
    }
    app.use(server.middleware());
    const httpServer = (0, http_1.createServer)(app);
    return httpServer;
}
exports.createRPCServerListener = createRPCServerListener;
function createWsRPCServerListener(opts) {
    const { server, withEngineMiddleware, rpcCors } = opts;
    // Get the server to hookup upgrade request on
    let httpServer = opts.httpServer;
    if (!httpServer) {
        const app = Connect();
        // In case browser pre-flights the upgrade request with an options request
        // more likely in case of wss connection
        if (typeof rpcCors === 'string')
            app.use(cors({ origin: rpcCors }));
        httpServer = (0, http_1.createServer)(app);
    }
    const wss = server.websocket({ noServer: true });
    httpServer.on('upgrade', (req, socket, head) => {
        if (withEngineMiddleware) {
            const { jwtSecret } = withEngineMiddleware;
            try {
                checkHeaderAuth(req, jwtSecret);
            }
            catch (error) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
            }
        }
        ;
        wss.handleUpgrade(req, socket, head, (ws) => {
            ;
            wss.emit('connection', ws, req);
        });
    });
    // Only return something if a new server was created
    return !opts.httpServer ? httpServer : undefined;
}
exports.createWsRPCServerListener = createWsRPCServerListener;
//# sourceMappingURL=rpc.js.map