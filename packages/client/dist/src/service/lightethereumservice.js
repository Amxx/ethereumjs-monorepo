"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LightEthereumService = void 0;
const lesprotocol_1 = require("../net/protocol/lesprotocol");
const lightsync_1 = require("../sync/lightsync");
const service_1 = require("./service");
/**
 * Light Ethereum service
 * @memberof module:service
 */
class LightEthereumService extends service_1.Service {
    /**
     * Create new LES service
     */
    constructor(options) {
        super(options);
        this.config.logger.info('Light sync mode');
        this.synchronizer = new lightsync_1.LightSynchronizer({
            config: this.config,
            pool: this.pool,
            chain: this.chain,
            flow: this.flow,
            interval: this.interval,
        });
    }
    /**
     * Returns all protocols required by this service
     */
    get protocols() {
        return [
            new lesprotocol_1.LesProtocol({
                config: this.config,
                chain: this.chain,
                timeout: this.timeout,
            }),
        ];
    }
    /**
     * Handles incoming message from connected peer
     * @param message message object
     * @param protocol protocol name
     * @param peer peer
     */
    async handle(_message, _protocol, _peer) { }
    /**
     * Stop service
     */
    async stop() {
        if (!this.running) {
            return false;
        }
        await this.synchronizer?.stop();
        await super.stop();
        return true;
    }
}
exports.LightEthereumService = LightEthereumService;
//# sourceMappingURL=lightethereumservice.js.map