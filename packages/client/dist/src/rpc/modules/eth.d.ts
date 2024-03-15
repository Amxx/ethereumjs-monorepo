import type { EthereumClient } from '../..';
import type { RpcTx } from '../types';
import type { JsonRpcBlock } from '@ethereumjs/block';
import type { Proof } from '@ethereumjs/statemanager';
declare type GetLogsParams = {
    fromBlock?: string;
    toBlock?: string;
    address?: string;
    topics?: string[];
    blockHash?: string;
};
declare type JsonRpcReceipt = {
    transactionHash: string;
    transactionIndex: string;
    blockHash: string;
    blockNumber: string;
    from: string;
    to: string | null;
    cumulativeGasUsed: string;
    effectiveGasPrice: string;
    gasUsed: string;
    contractAddress: string | null;
    logs: JsonRpcLog[];
    logsBloom: string;
    root?: string;
    status?: string;
    blobGasUsed?: string;
    blobGasPrice?: string;
};
declare type JsonRpcLog = {
    removed: boolean;
    logIndex: string | null;
    transactionIndex: string | null;
    transactionHash: string | null;
    blockHash: string | null;
    blockNumber: string | null;
    address: string;
    data: string;
    topics: string[];
};
/**
 * eth_* RPC module
 * @memberof module:rpc/modules
 */
export declare class Eth {
    private client;
    private service;
    private receiptsManager;
    private _chain;
    private _vm;
    private _rpcDebug;
    ethVersion: number;
    /**
     * Create eth_* RPC module
     * @param client Client to which the module binds
     */
    constructor(client: EthereumClient, rpcDebug: boolean);
    /**
     * Returns number of the most recent block.
     * @param params An empty array
     */
    blockNumber(_params?: never[]): Promise<string>;
    /**
     * Executes a new message call immediately without creating a transaction on the block chain.
     * @param params An array of two parameters:
     *   1. The transaction object
     *       * from (optional) - The address the transaction is sent from
     *       * to - The address the transaction is directed to
     *       * gas (optional) - Integer of the gas provided for the transaction execution
     *       * gasPrice (optional) - Integer of the gasPrice used for each paid gas
     *       * value (optional) - Integer of the value sent with this transaction
     *       * data (optional) - Hash of the method signature and encoded parameters.
     *   2. integer block number, or the string "latest", "earliest" or "pending"
     * @returns The return value of the executed contract.
     */
    call(params: [RpcTx, string]): Promise<string>;
    /**
     * Returns the currently configured chain id, a value used in replay-protected transaction signing as introduced by EIP-155.
     * @param _params An empty array
     * @returns The chain ID.
     */
    chainId(_params?: never[]): Promise<string>;
    /**
     * Generates and returns an estimate of how much gas is necessary to allow the transaction to complete.
     * The transaction will not be added to the blockchain.
     * Note that the estimate may be significantly more than the amount of gas actually used by the transaction,
     * for a variety of reasons including EVM mechanics and node performance.
     * @param params An array of two parameters:
     *   1. The transaction object
     *       * from (optional) - The address the transaction is sent from
     *       * to - The address the transaction is directed to
     *       * gas (optional) - Integer of the gas provided for the transaction execution
     *       * gasPrice (optional) - Integer of the gasPrice used for each paid gas
     *       * value (optional) - Integer of the value sent with this transaction
     *       * data (optional) - Hash of the method signature and encoded parameters.
     *   2. integer block number, or the string "latest", "earliest" or "pending" (optional)
     * @returns The amount of gas used.
     */
    estimateGas(params: [RpcTx, string?]): Promise<string>;
    /**
     * Returns the balance of the account at the given address.
     * @param params An array of two parameters:
     *   1. address of the account
     *   2. integer block number, or the string "latest", "earliest" or "pending"
     */
    getBalance(params: [string, string]): Promise<string>;
    /**
     * Returns the currently configured coinbase address.
     * @param _params An empty array
     * @returns The chain ID.
     */
    coinbase(_params?: never[]): Promise<string>;
    /**
     * Returns information about a block by hash.
     * @param params An array of two parameters:
     *   1. a block hash
     *   2. boolean - if true returns the full transaction objects, if false only the hashes of the transactions.
     */
    getBlockByHash(params: [string, boolean]): Promise<JsonRpcBlock>;
    /**
     * Returns information about a block by block number.
     * @param params An array of two parameters:
     *   1. integer of a block number, or the string "latest", "earliest" or "pending"
     *   2. boolean - if true returns the full transaction objects, if false only the hashes of the transactions.
     */
    getBlockByNumber(params: [string, boolean]): Promise<JsonRpcBlock>;
    /**
     * Returns the transaction count for a block given by the block hash.
     * @param params An array of one parameter: A block hash
     */
    getBlockTransactionCountByHash(params: [string]): Promise<string>;
    /**
     * Returns code of the account at the given address.
     * @param params An array of two parameters:
     *   1. address of the account
     *   2. integer block number, or the string "latest", "earliest" or "pending"
     */
    getCode(params: [string, string]): Promise<string>;
    /**
     * Returns the value from a storage position at a given address.
     * @param params An array of three parameters:
     *   1. address of the storage
     *   2. integer of the position in the storage
     *   3. integer block number, or the string "latest", "earliest" or "pending"
     */
    getStorageAt(params: [string, string, string]): Promise<string>;
    /**
     * Returns information about a transaction given a block hash and a transaction's index position.
     * @param params An array of two parameter:
     *   1. a block hash
     *   2. an integer of the transaction index position encoded as a hexadecimal.
     */
    getTransactionByBlockHashAndIndex(params: [string, string]): Promise<import("@ethereumjs/tx").JsonRpcTx | null>;
    /**
     * Returns the transaction by hash when available within `--txLookupLimit`
     * @param params An array of one parameter:
     *   1. hash of the transaction
     */
    getTransactionByHash(params: [string]): Promise<import("@ethereumjs/tx").JsonRpcTx | null>;
    /**
     * Returns the number of transactions sent from an address.
     * @param params An array of two parameters:
     *   1. address of the account
     *   2. integer block number, or the string "latest", "earliest" or "pending"
     */
    getTransactionCount(params: [string, string]): Promise<string>;
    /**
     * Returns the current ethereum protocol version as a hex-encoded string
     * @param params An empty array
     */
    protocolVersion(_params?: never[]): string;
    /**
     * Returns the number of uncles in a block from a block matching the given block number
     * @param params An array of one parameter:
     *   1: hexadecimal representation of a block number
     */
    getUncleCountByBlockNumber(params: [string]): Promise<number>;
    /**
     * Returns the receipt of a transaction by transaction hash.
     * *Note* That the receipt is not available for pending transactions.
     * Only available with `--saveReceipts` enabled
     * Will return empty if tx is past set `--txLookupLimit`
     * (default = 2350000 = about one year, 0 = entire chain)
     * @param params An array of one parameter:
     *  1: Transaction hash
     */
    getTransactionReceipt(params: [string]): Promise<JsonRpcReceipt | null>;
    /**
     * Returns an array of all logs matching a given filter object.
     * Only available with `--saveReceipts` enabled
     * @param params An object of the filter options {@link GetLogsParams}
     */
    getLogs(params: [GetLogsParams]): Promise<JsonRpcLog[]>;
    /**
     * Creates new message call transaction or a contract creation for signed transactions.
     * @param params An array of one parameter:
     *   1. the signed transaction data
     * @returns a 32-byte tx hash or the zero hash if the tx is not yet available.
     */
    sendRawTransaction(params: [string]): Promise<string>;
    /**
     * Returns an account object along with data about the proof.
     * @param params An array of three parameters:
     *   1. address of the account
     *   2. array of storage keys which should be proofed and included
     *   3. integer block number, or the string "latest" or "earliest"
     * @returns The {@link Proof}
     */
    getProof(params: [string, string[], string]): Promise<Proof>;
    /**
     * Returns an object with data about the sync status or false.
     * @param params An empty array
     * @returns An object with sync status data or false (when not syncing)
     *   * startingBlock - The block at which the import started (will only be reset after the sync reached his head)
     *   * currentBlock - The current block, same as eth_blockNumber
     *   * highestBlock - The estimated highest block
     */
    syncing(_params?: never[]): Promise<false | {
        startingBlock: string;
        currentBlock: string;
        highestBlock: string;
    }>;
    /**
     * Returns the transaction count for a block given by the block number.
     * @param params An array of one parameter:
     *  1. integer of a block number, or the string "latest", "earliest" or "pending"
     */
    getBlockTransactionCountByNumber(params: [string]): Promise<string>;
    /**
     * Gas price oracle.
     *
     * Returns a suggested gas price.
     * @returns a hex code of an integer representing the suggested gas price in wei.
     */
    gasPrice(): Promise<string>;
    feeHistory(params: [string | number | bigint, string, [number]?]): Promise<{
        baseFeePerGas: string[];
        gasUsedRatio: number[];
        baseFeePerBlobGas: string[];
        blobGasUsedRatio: number[];
        oldestBlock: string;
        reward: string[][];
    }>;
}
export {};
//# sourceMappingURL=eth.d.ts.map