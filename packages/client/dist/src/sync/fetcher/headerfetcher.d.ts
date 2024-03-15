import { BlockFetcherBase } from './blockfetcherbase';
import type { Peer } from '../../net/peer';
import type { FlowControl } from '../../net/protocol';
import type { BlockFetcherOptions, JobTask } from './blockfetcherbase';
import type { Job } from './types';
import type { BlockHeader } from '@ethereumjs/block';
export interface HeaderFetcherOptions extends BlockFetcherOptions {
    flow: FlowControl;
}
declare type BlockHeaderResult = {
    reqId: bigint;
    bv: bigint;
    headers: BlockHeader[];
};
/**
 * Implements an les/1 based header fetcher
 * @memberof module:sync/fetcher
 */
export declare class HeaderFetcher extends BlockFetcherBase<BlockHeaderResult, BlockHeader> {
    private flow;
    /**
     * Create new header fetcher
     */
    constructor(options: any);
    /**
     * Requests block headers for the given task
     * @param job
     */
    request(job: Job<JobTask, BlockHeaderResult, BlockHeader>): Promise<{
        reqId: bigint;
        bv: bigint;
        headers: BlockHeader[];
    } | undefined>;
    /**
     * Process fetch result
     * @param job fetch job
     * @param result fetch result
     * @returns results of processing job or undefined if job not finished
     */
    process(job: Job<JobTask, BlockHeaderResult, BlockHeader>, result: BlockHeaderResult): BlockHeader[] | undefined;
    /**
     * Store fetch result. Resolves once store operation is complete.
     * @param headers fetch result
     */
    store(headers: BlockHeader[]): Promise<void>;
    /**
     * Returns an idle peer that can process a next job.
     */
    peer(): Peer | undefined;
}
export {};
//# sourceMappingURL=headerfetcher.d.ts.map