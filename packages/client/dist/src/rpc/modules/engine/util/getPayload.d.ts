import type { BlobsBundle } from '../../../../miner';
import type { BlobsBundleV1 } from '../types';
import type { Block, ExecutionPayload } from '@ethereumjs/block';
/**
 * Formats a block to {@link ExecutionPayloadV1}.
 */
export declare const blockToExecutionPayload: (block: Block, value: bigint, bundle?: BlobsBundle) => {
    executionPayload: ExecutionPayload;
    blockValue: string;
    blobsBundle: BlobsBundleV1 | undefined;
    shouldOverrideBuilder: boolean;
};
//# sourceMappingURL=getPayload.d.ts.map