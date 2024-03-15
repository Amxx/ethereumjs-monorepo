"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthereumClient = void 0;
const package_json_1 = require("../package.json");
const blockchain_1 = require("./blockchain");
const config_1 = require("./config");
const service_1 = require("./service");
const types_1 = require("./types");
/**
 * Represents the top-level ethereum node, and is responsible for managing the
 * lifecycle of included services.
 * @memberof module:node
 */
class EthereumClient {
    /**
     * Create new node
     */
    constructor(chain, options) {
        this.services = [];
        this.config = options.config;
        this.chain = chain;
        if (this.config.syncmode === config_1.SyncMode.Full || this.config.syncmode === config_1.SyncMode.None) {
            this.services = [
                new service_1.FullEthereumService({
                    config: this.config,
                    chainDB: options.chainDB,
                    stateDB: options.stateDB,
                    metaDB: options.metaDB,
                    chain,
                }),
            ];
        }
        if (this.config.syncmode === config_1.SyncMode.Light) {
            this.services = [
                new service_1.LightEthereumService({
                    config: this.config,
                    chainDB: options.chainDB,
                    chain,
                }),
            ];
        }
        this.opened = false;
        this.started = false;
    }
    /**
     * Main entrypoint for client initialization.
     *
     * Safe creation of a Chain object awaiting the initialization
     * of the underlying Blockchain object.
     */
    static async create(options) {
        const chain = await blockchain_1.Chain.create(options);
        return new this(chain, options);
    }
    /**
     * Open node. Must be called before node is started
     */
    async open() {
        if (this.opened) {
            return false;
        }
        const name = this.config.chainCommon.chainName();
        const chainId = this.config.chainCommon.chainId();
        this.config.logger.info(`Initializing Ethereumjs client version=v${package_json_1.version} network=${name} chainId=${chainId}`);
        this.config.events.on(types_1.Event.SERVER_ERROR, (error) => {
            this.config.logger.warn(`Server error: ${error.name} - ${error.message}`);
        });
        this.config.events.on(types_1.Event.SERVER_LISTENING, (details) => {
            this.config.logger.info(`Server listener up transport=${details.transport} url=${details.url}`);
        });
        await Promise.all(this.services.map((s) => s.open()));
        this.opened = true;
    }
    /**
     * Starts node and all services and network servers.
     */
    async start() {
        if (this.started) {
            return false;
        }
        this.config.logger.info('Setup networking and services.');
        await Promise.all(this.services.map((s) => s.start()));
        this.config.server && (await this.config.server.start());
        // Only call bootstrap if servers are actually started
        this.config.server && this.config.server.started && (await this.config.server.bootstrap());
        this.started = true;
    }
    /**
     * Stops node and all services and network servers.
     */
    async stop() {
        if (!this.started) {
            return false;
        }
        this.config.events.emit(types_1.Event.CLIENT_SHUTDOWN);
        await Promise.all(this.services.map((s) => s.stop()));
        this.config.server && this.config.server.started && (await this.config.server.stop());
        this.started = false;
    }
    /**
     *
     * @returns the RLPx server (if it exists)
     */
    server() {
        return this.config.server;
    }
    /**
     * Returns the service with the specified name.
     * @param name name of service
     */
    service(name) {
        return this.services.find((s) => s.name === name);
    }
}
exports.EthereumClient = EthereumClient;
//# sourceMappingURL=client.js.map