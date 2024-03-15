"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReverseBlockFetcher = void 0;
const util_1 = require("@ethereumjs/util");
const skeleton_1 = require("../../service/skeleton");
const types_1 = require("../../types");
const blockfetcher_1 = require("./blockfetcher");
/**
 * Implements an eth/66 based reverse block fetcher
 * @memberof module:sync/fetcher
 */
class ReverseBlockFetcher extends blockfetcher_1.BlockFetcher {
    /**
     * Create new block fetcher
     */
    constructor(options) {
        super({ ...options, reverse: true });
        this.skeleton = options.skeleton;
    }
    /**
     * Store fetch result. Resolves once store operation is complete.
     * @param blocks fetch result
     */
    async store(blocks) {
        try {
            const num = await this.skeleton.putBlocks(blocks);
            this.debug(`Fetcher results stored in skeleton chain (blocks num=${blocks.length} first=${blocks[0]?.header.number} last=${blocks[blocks.length - 1]?.header.number})`);
            this.config.events.emit(types_1.Event.SYNC_FETCHED_BLOCKS, blocks.slice(0, num));
        }
        catch (e) {
            if (e === skeleton_1.errSyncMerged) {
                // Tear down the syncer to restart from new subchain segments
                this.debug('Skeleton subchains merged, restarting sync');
                this.running = false;
                this.clear();
                this.destroy();
            }
            else {
                this.debug(`Error storing fetcher results in skeleton chain (blocks num=${blocks.length} first=${blocks[0]?.header.number} last=${blocks[blocks.length - 1]?.header.number}): ${e}`);
                throw e;
            }
        }
    }
    processStoreError(error, _task) {
        const stepBack = util_1.BIGINT_0;
        const destroyFetcher = !error.message.includes(`Blocks don't extend canonical subchain`);
        const banPeer = true;
        return { destroyFetcher, banPeer, stepBack };
    }
}
exports.ReverseBlockFetcher = ReverseBlockFetcher;
//# sourceMappingURL=reverseblockfetcher.js.map