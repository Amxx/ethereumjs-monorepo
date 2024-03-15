import { Block } from '@ethereumjs/block';
import type { Chain } from '../../../../blockchain';
import type { ChainCache, PayloadStatusV1 } from '../types';
import type { ExecutionPayload } from '@ethereumjs/block';
/**
 * Returns a block from a payload.
 * If errors, returns {@link PayloadStatusV1}
 */
export declare const assembleBlock: (payload: ExecutionPayload, chain: Chain, chainCache: ChainCache) => Promise<{
    block?: Block;
    error?: PayloadStatusV1;
}>;
export declare const validate4844BlobVersionedHashes: (headBlock: Block, blobVersionedHashes: string[]) => string | null;
//# sourceMappingURL=newPayload.d.ts.map