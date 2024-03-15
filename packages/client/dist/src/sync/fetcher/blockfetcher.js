"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockFetcher = void 0;
const block_1 = require("@ethereumjs/block");
const util_1 = require("@ethereumjs/util");
const types_1 = require("../../types");
const blockfetcherbase_1 = require("./blockfetcherbase");
/**
 * Implements an eth/66 based block fetcher
 * @memberof module:sync/fetcher
 */
class BlockFetcher extends blockfetcherbase_1.BlockFetcherBase {
    /**
     * Create new block fetcher
     */
    constructor(options) {
        super(options);
    }
    /**
     * Requests blocks associated with this job
     * @param job
     */
    async request(job) {
        const { task, peer, partialResult } = job;
        let { first, count } = task;
        if (partialResult) {
            first = !this.reverse
                ? first + BigInt(partialResult.length)
                : first - BigInt(partialResult.length);
            count -= partialResult.length;
        }
        const blocksRange = !this.reverse
            ? `${first}-${first + BigInt(count - 1)}`
            : `${first}-${first - BigInt(count - 1)}`;
        const peerInfo = `id=${peer?.id.slice(0, 8)} address=${peer?.address}`;
        const headersResult = await peer.eth.getBlockHeaders({
            block: first,
            max: count,
            reverse: this.reverse,
        });
        if (!Array.isArray(headersResult) || headersResult[1].length === 0) {
            // Catch occasional null or empty responses
            this.debug(`Peer ${peerInfo} returned no headers for blocks=${blocksRange}`);
            return [];
        }
        const headers = headersResult[1];
        const bodiesResult = await peer?.eth?.getBlockBodies({ hashes: headers.map((h) => h.hash()) });
        if (!Array.isArray(bodiesResult) ||
            !Array.isArray(bodiesResult[1]) ||
            bodiesResult[1].length === 0) {
            // Catch occasional null or empty responses
            this.debug(`Peer ${peerInfo} returned no bodies for blocks=${blocksRange}`);
            return [];
        }
        const bodies = bodiesResult[1];
        this.debug(`Requested blocks=${blocksRange} from ${peerInfo} (received: ${headers.length} headers / ${bodies.length} bodies)`);
        const blocks = [];
        for (const [i, [txsData, unclesData, withdrawalsData]] of bodies.entries()) {
            const header = headers[i];
            if ((!(0, util_1.equalsBytes)(header.transactionsTrie, util_1.KECCAK256_RLP) && txsData.length === 0) ||
                (!(0, util_1.equalsBytes)(header.uncleHash, util_1.KECCAK256_RLP_ARRAY) && unclesData.length === 0) ||
                (header.withdrawalsRoot !== undefined &&
                    !(0, util_1.equalsBytes)(header.withdrawalsRoot, util_1.KECCAK256_RLP) &&
                    (withdrawalsData?.length ?? 0) === 0)) {
                this.debug(`Requested block=${headers[i].number}} from peer ${peerInfo} missing non-empty txs=${txsData.length} or uncles=${unclesData.length} or withdrawals=${withdrawalsData?.length}`);
                return [];
            }
            const values = [headers[i].raw(), txsData, unclesData];
            if (withdrawalsData !== undefined) {
                values.push(withdrawalsData);
            }
            // Supply the common from the corresponding block header already set on correct fork
            const block = block_1.Block.fromValuesArray(values, { common: headers[i].common });
            // Only validate the data integrity
            // Upon putting blocks into blockchain (for BlockFetcher), `validateData` is called again
            // In ReverseBlockFetcher we do not need to validate the entire block, since CL
            // expects us to sync with the requested chain tip header
            await block.validateData(false, false);
            blocks.push(block);
        }
        this.debug(`Returning blocks=${blocksRange} from ${peerInfo} (received: ${headers.length} headers / ${bodies.length} bodies)`);
        return blocks;
    }
    /**
     * Process fetch result
     * @param job fetch job
     * @param result fetch result
     * @returns results of processing job or undefined if job not finished
     */
    process(job, result) {
        result = (job.partialResult ?? []).concat(result);
        job.partialResult = undefined;
        if (result !== undefined) {
            if (result.length === job.task.count) {
                return result;
            }
            else if (result.length > 0 && result.length < job.task.count) {
                // Save partial result to re-request missing items.
                job.partialResult = result;
                this.debug(`Partial result received=${result.length} expected=${job.task.count}`);
            }
        }
        return;
    }
    /**
     * Store fetch result. Resolves once store operation is complete.
     * @param blocks fetch result
     */
    async store(blocks) {
        try {
            const num = await this.chain.putBlocks(blocks);
            this.debug(`Fetcher results stored in blockchain (blocks num=${blocks.length} first=${blocks[0]?.header.number} last=${blocks[blocks.length - 1]?.header.number})`);
            this.config.events.emit(types_1.Event.SYNC_FETCHED_BLOCKS, blocks.slice(0, num));
        }
        catch (e) {
            this.debug(`Error storing fetcher results in blockchain (blocks num=${blocks.length} first=${blocks[0]?.header.number} last=${blocks[blocks.length - 1]?.header.number}): ${e}`);
            throw e;
        }
    }
    /**
     * Returns an idle peer that can process a next job.
     */
    peer() {
        return this.pool.idle((peer) => 'eth' in peer);
    }
}
exports.BlockFetcher = BlockFetcher;
//# sourceMappingURL=blockfetcher.js.map