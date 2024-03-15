import type { EthereumClient } from '../..';
import type { RpcTx } from '../types';
export interface tracerOpts {
    disableStack?: boolean;
    disableStorage?: boolean;
    enableMemory?: boolean;
    enableReturnData?: boolean;
    tracer?: string;
    timeout?: string;
    tracerConfig?: any;
}
export interface structLog {
    depth: number;
    gas: number;
    gasCost: number;
    op: string;
    pc: number;
    stack: string[] | undefined;
    memory: string[] | undefined;
    returnData: string[] | undefined;
    storage: {
        [key: string]: string;
    };
    error: boolean | undefined | null;
}
/**
 * debug_* RPC module
 * @memberof module:rpc/modules
 */
export declare class Debug {
    private service;
    private chain;
    private vm;
    private _rpcDebug;
    /**
     * Create debug_* RPC module
     * @param client Client to which the module binds
     */
    constructor(client: EthereumClient, rpcDebug: boolean);
    /**
     * Returns a call trace for the requested transaction or null if not available
     * @param params an array of two parameters:
     *     1. string representing the transaction hash
     *     2. an optional tracer options object
     */
    traceTransaction(params: [string, tracerOpts]): Promise<{
        gas: string;
        returnValue: string;
        failed: boolean;
        structLogs: structLog[];
    } | null>;
    /**
     * Returns a trace of an eth_call within the context of the given block execution using the final state of the parent block
     * @param params an array of 3 parameters:
     *    1. an {@link RpcTx} object that mirrors the eth_call parameters object
     *    2. A block hash or number formatted as a hex prefixed string
     *    3. An optional tracer options object
     * @returns an execution trace of an {@link eth_call} in the context of a given block execution
     * mirroring the output from {@link traceTransaction}
     */
    traceCall(params: [RpcTx, string, tracerOpts]): Promise<{
        gas: string;
        returnValue: string;
        failed: boolean;
        structLogs: structLog[];
    }>;
    /**
     * Returns a limited set of storage keys belonging to an account.
     * @param params An array of 5 parameters:
     *    1. The hash of the block at which to get storage from the state.
     *    2. The transaction index of the requested block post which to get the storage.
     *    3. The address of the account.
     *    4. The starting (hashed) key from which storage will be returned. To include the entire range, pass '0x00'.
     *    5. The maximum number of storage values that could be returned.
     * @returns A {@link StorageRange} object that will contain at most `limit` entries in its `storage` field.
     * The object will also contain `nextKey`, the next (hashed) storage key after the range included in `storage`.
     */
    storageRangeAt(params: [string, number, string, string, number]): Promise<import("@ethereumjs/common/src").StorageRange>;
}
//# sourceMappingURL=debug.d.ts.map