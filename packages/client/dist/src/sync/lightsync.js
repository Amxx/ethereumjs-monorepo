"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LightSynchronizer = void 0;
const common_1 = require("@ethereumjs/common");
const util_1 = require("@ethereumjs/util");
const types_1 = require("../types");
const util_2 = require("../util");
const fetcher_1 = require("./fetcher");
const sync_1 = require("./sync");
/**
 * Implements an ethereum light sync synchronizer
 * @memberof module:sync
 */
class LightSynchronizer extends sync_1.Synchronizer {
    constructor(options) {
        super(options);
        this.processHeaders = this.processHeaders.bind(this);
        this.config.events.on(types_1.Event.SYNC_FETCHED_HEADERS, this.processHeaders);
    }
    /**
     * Returns synchronizer type
     */
    get type() {
        return 'light';
    }
    get fetcher() {
        if (this._fetcher !== null && !(this._fetcher instanceof fetcher_1.HeaderFetcher)) {
            throw Error(`Invalid Fetcher, expected HeaderFetcher`);
        }
        return this._fetcher;
    }
    set fetcher(fetcher) {
        this._fetcher = fetcher;
    }
    /**
     * Open synchronizer. Must be called before sync() is called
     */
    async open() {
        await super.open();
        await this.chain.open();
        await this.pool.open();
        const { height: number, td } = this.chain.headers;
        const hash = this.chain.blocks.latest.hash();
        this.startingBlock = number;
        this.config.logger.info(`Latest local header: number=${number} td=${td} hash=${(0, util_2.short)(hash)}`);
    }
    /**
     * Returns true if peer can be used for syncing
     */
    syncable(peer) {
        return peer.les?.status.serveHeaders ?? false;
    }
    /**
     * Finds the best peer to sync with.
     * We will synchronize to this peer's blockchain.
     * @returns undefined if no valid peer is found
     */
    async best() {
        let best;
        const peers = this.pool.peers.filter(this.syncable.bind(this));
        if (peers.length < this.config.minPeers && !this.forceSync)
            return;
        for (const peer of peers) {
            if (peer.les) {
                const td = peer.les.status.headTd;
                if ((!best && td >= this.chain.headers.td) ||
                    (best && best.les && best.les.status.headTd < td)) {
                    best = peer;
                }
            }
        }
        return best;
    }
    /**
     * Get latest header of peer
     */
    async latest(peer) {
        const result = await peer.les?.getBlockHeaders({
            block: peer.les.status.headHash,
            max: 1,
        });
        return result?.headers[0];
    }
    /**
     * Called from `sync()` to sync headers and state from peer starting from current height.
     * @param peer remote peer to sync with
     * @returns a boolean if the setup was successful
     */
    async syncWithPeer(peer) {
        const latest = peer ? await this.latest(peer) : undefined;
        if (!latest)
            return false;
        const height = peer.les.status.headNum;
        if (this.config.syncTargetHeight === undefined ||
            this.config.syncTargetHeight === util_1.BIGINT_0 ||
            this.config.syncTargetHeight < height) {
            this.config.syncTargetHeight = height;
            this.config.logger.info(`New sync target height=${height} hash=${(0, util_2.short)(latest.hash())}`);
        }
        // Start fetcher from a safe distance behind because if the previous fetcher exited
        // due to a reorg, it would make sense to step back and refetch.
        const first = this.chain.headers.height >= BigInt(this.config.safeReorgDistance)
            ? this.chain.headers.height - BigInt(this.config.safeReorgDistance) + util_1.BIGINT_1
            : util_1.BIGINT_1;
        const count = height - first + util_1.BIGINT_1;
        if (count < util_1.BIGINT_0)
            return false;
        if (!this.fetcher || this.fetcher.syncErrored) {
            this.fetcher = new fetcher_1.HeaderFetcher({
                config: this.config,
                pool: this.pool,
                chain: this.chain,
                flow: this.flow,
                interval: this.interval,
                first,
                count,
                destroyWhenDone: false,
            });
        }
        else {
            const fetcherHeight = this.fetcher.first + this.fetcher.count - util_1.BIGINT_1;
            if (height > fetcherHeight) {
                this.fetcher.count += height - fetcherHeight;
                this.config.logger.info(`Updated fetcher target to height=${height} peer=${peer} `);
            }
        }
        return true;
    }
    /**
     * Process headers fetched from the fetcher.
     */
    async processHeaders(headers) {
        if (headers.length === 0) {
            this.config.logger.warn('No headers fetched are applicable for import');
            return;
        }
        const first = headers[0].number;
        const hash = (0, util_2.short)(headers[0].hash());
        const baseFeeAdd = this.config.chainCommon.gteHardfork(common_1.Hardfork.London) === true
            ? `baseFee=${headers[0].baseFeePerGas} `
            : '';
        this.config.logger.info(`Imported headers count=${headers.length} number=${first} hash=${hash} ${baseFeeAdd}peers=${this.pool.size}`);
    }
    /**
     * Stop synchronizer.
     */
    async stop() {
        this.config.events.removeListener(types_1.Event.SYNC_FETCHED_HEADERS, this.processHeaders);
        return super.stop();
    }
}
exports.LightSynchronizer = LightSynchronizer;
//# sourceMappingURL=lightsync.js.map