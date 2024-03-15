import type { Config } from '../config';
import type { TxPool } from '../service/txpool';
import type { Block, HeaderData } from '@ethereumjs/block';
import type { WithdrawalData } from '@ethereumjs/util';
import type { BlockBuilder, TxReceipt, VM } from '@ethereumjs/vm';
interface PendingBlockOpts {
    config: Config;
    txPool: TxPool;
    skipHardForkValidation?: boolean;
}
export interface BlobsBundle {
    blobs: Uint8Array[];
    commitments: Uint8Array[];
    proofs: Uint8Array[];
}
export declare class PendingBlock {
    config: Config;
    txPool: TxPool;
    pendingPayloads: Map<string, BlockBuilder>;
    blobsBundles: Map<string, BlobsBundle>;
    private skipHardForkValidation?;
    constructor(opts: PendingBlockOpts);
    pruneSetToMax(maxItems: number): number;
    /**
     * Starts building a pending block with the given payload
     * @returns an 8-byte payload identifier to call {@link BlockBuilder.build} with
     */
    start(vm: VM, parentBlock: Block, headerData?: Partial<HeaderData>, withdrawals?: WithdrawalData[]): Promise<Uint8Array>;
    /**
     * Stops a pending payload
     */
    stop(payloadIdBytes: Uint8Array | string): void;
    /**
     * Returns the completed block
     */
    build(payloadIdBytes: Uint8Array | string): Promise<void | [block: Block, receipts: TxReceipt[], value: bigint, blobs?: BlobsBundle]>;
    private addTransactions;
    private addTransaction;
    /**
     * An internal helper for storing the blob bundle associated with each transaction in an EIP4844 world
     * @param payloadId the payload Id of the pending block
     * @param txs an array of {@BlobEIP4844Transaction } transactions
     * @param blockHash the blockhash of the pending block (computed from the header data provided)
     */
    private constructBlobsBundle;
}
export {};
//# sourceMappingURL=pendingBlock.d.ts.map