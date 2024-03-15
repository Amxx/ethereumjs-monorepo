import { Block } from '@ethereumjs/block';
import { BlockFetcherBase } from './blockfetcherbase';
import type { Peer } from '../../net/peer';
import type { BlockFetcherOptions, JobTask } from './blockfetcherbase';
import type { Job } from './types';
/**
 * Implements an eth/66 based block fetcher
 * @memberof module:sync/fetcher
 */
export declare class BlockFetcher extends BlockFetcherBase<Block[], Block> {
    /**
     * Create new block fetcher
     */
    constructor(options: BlockFetcherOptions);
    /**
     * Requests blocks associated with this job
     * @param job
     */
    request(job: Job<JobTask, Block[], Block>): Promise<Block[]>;
    /**
     * Process fetch result
     * @param job fetch job
     * @param result fetch result
     * @returns results of processing job or undefined if job not finished
     */
    process(job: Job<JobTask, Block[], Block>, result: Block[]): Block[] | undefined;
    /**
     * Store fetch result. Resolves once store operation is complete.
     * @param blocks fetch result
     */
    store(blocks: Block[]): Promise<void>;
    /**
     * Returns an idle peer that can process a next job.
     */
    peer(): Peer | undefined;
}
//# sourceMappingURL=blockfetcher.d.ts.map