import { BlockFetcher } from './blockfetcher';
import type { Skeleton } from '../../service/skeleton';
import type { BlockFetcherOptions, JobTask } from './blockfetcherbase';
import type { Block } from '@ethereumjs/block';
interface ReverseBlockFetcherOptions extends BlockFetcherOptions {
    /** Skeleton */
    skeleton: Skeleton;
}
/**
 * Implements an eth/66 based reverse block fetcher
 * @memberof module:sync/fetcher
 */
export declare class ReverseBlockFetcher extends BlockFetcher {
    private skeleton;
    /**
     * Create new block fetcher
     */
    constructor(options: ReverseBlockFetcherOptions);
    /**
     * Store fetch result. Resolves once store operation is complete.
     * @param blocks fetch result
     */
    store(blocks: Block[]): Promise<void>;
    processStoreError(error: Error, _task: JobTask): {
        destroyFetcher: boolean;
        banPeer: boolean;
        stepBack: bigint;
    };
}
export {};
//# sourceMappingURL=reverseblockfetcher.d.ts.map