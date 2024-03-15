import { MetaDBManager } from '../util/metaDBManager';
import type { Block } from '@ethereumjs/block';
import type { Log } from '@ethereumjs/evm';
import type { TransactionType, TypedTransaction } from '@ethereumjs/tx';
import type { PostByzantiumTxReceipt, PreByzantiumTxReceipt, TxReceipt } from '@ethereumjs/vm';
/**
 * TxReceiptWithType extends TxReceipt to provide:
 *  - txType: byte prefix for serializing typed tx receipts
 */
export declare type TxReceiptWithType = PreByzantiumTxReceiptWithType | PostByzantiumTxReceiptWithType;
interface PreByzantiumTxReceiptWithType extends PreByzantiumTxReceipt {
    txType: TransactionType;
}
interface PostByzantiumTxReceiptWithType extends PostByzantiumTxReceipt {
    txType: TransactionType;
}
/**
 * Function return values
 */
declare type GetReceiptByTxHashReturn = [
    receipt: TxReceipt,
    blockHash: Uint8Array,
    txIndex: number,
    logIndex: number
];
declare type GetLogsReturn = {
    log: Log;
    block: Block;
    tx: TypedTransaction;
    txIndex: number;
    logIndex: number;
}[];
export declare class ReceiptsManager extends MetaDBManager {
    /**
     * Limit of logs to return in getLogs
     */
    GET_LOGS_LIMIT: number;
    /**
     * Size limit for the getLogs response in megabytes
     */
    GET_LOGS_LIMIT_MEGABYTES: number;
    /**
     * Block range limit for getLogs
     */
    GET_LOGS_BLOCK_RANGE_LIMIT: number;
    /**
     * Saves receipts to db. Also saves tx hash indexes if within txLookupLimit,
     * and removes tx hash indexes for one block past txLookupLimit.
     * @param block the block to save receipts for
     * @param receipts the receipts to save
     */
    saveReceipts(block: Block, receipts: TxReceipt[]): Promise<void>;
    deleteReceipts(block: Block): Promise<void>;
    /**
     * Returns receipts for given blockHash
     * @param blockHash the block hash
     * @param calcBloom whether to calculate and return the logs bloom for each receipt (default: false)
     * @param includeTxType whether to include the tx type for each receipt (default: false)
     */
    getReceipts(blockHash: Uint8Array, calcBloom?: boolean, includeTxType?: true): Promise<TxReceiptWithType[]>;
    getReceipts(blockHash: Uint8Array, calcBloom?: boolean, includeTxType?: false): Promise<TxReceipt[]>;
    /**
     * Returns receipt by tx hash with additional metadata for the JSON RPC response, or null if not found
     * @param txHash the tx hash
     */
    getReceiptByTxHash(txHash: Uint8Array): Promise<GetReceiptByTxHashReturn | null>;
    /**
     * Returns logs as specified by the eth_getLogs JSON RPC query parameters
     */
    getLogs(from: Block, to: Block, addresses?: Uint8Array[], topics?: (Uint8Array | Uint8Array[] | null)[]): Promise<GetLogsReturn>;
    /**
     * Saves or deletes an index from the metaDB
     * @param operation the {@link IndexOperation}
     * @param type the {@link IndexType}
     * @param value for {@link IndexType.TxHash}, the block to save or delete the tx hash indexes for
     */
    private updateIndex;
    /**
     * Returns the value for an index or null if not found
     * @param type the {@link IndexType}
     * @param value for {@link IndexType.TxHash}, the txHash to get
     */
    private getIndex;
    /**
     * RLP encodes or decodes the specified data type for storage or retrieval from the metaDB
     * @param conversion {@link RlpConvert.Encode} or {@link RlpConvert.Decode}
     * @param type one of {@link RlpType}
     * @param value the value to encode or decode
     */
    private rlp;
    /**
     * Returns the logs bloom for a receipt's logs
     * @param logs
     */
    private logsBloom;
}
export {};
//# sourceMappingURL=receipt.d.ts.map