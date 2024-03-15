"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Execution = void 0;
class Execution {
    /**
     * Create new execution module
     * @memberof module:sync/execution
     */
    constructor(options) {
        this.running = false;
        this.started = false;
        this.config = options.config;
        this.chain = options.chain;
        this.stateDB = options.stateDB;
        this.metaDB = options.metaDB;
    }
    /**
     * Starts execution
     */
    async open() {
        this.started = true;
        this.config.logger.info('Setup EVM execution.');
    }
    /**
     * Stop execution. Returns a promise that resolves once stopped.
     */
    async stop() {
        this.started = false;
        this.config.logger.info('Stopped execution.');
        return true;
    }
}
exports.Execution = Execution;
//# sourceMappingURL=execution.js.map