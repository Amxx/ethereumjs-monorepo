export interface RpcTx {
    from?: string;
    to?: string;
    gas?: string;
    gasPrice?: string;
    value?: string;
    data?: string;
    maxPriorityFeePerGas?: string;
    maxFeePerGas?: string;
    type?: string;
}
export interface RpcTxRes {
    from: string;
    to?: string;
    gas: string;
    gasPrice: string;
    value: string;
    input?: string;
    data?: string;
    maxPriorityFeePerGas: string;
    maxFeePerGas: string;
    type: string;
}
/**
 * Convert the return value from eth_getTransactionByHash to a {@link RpcTx} interface
 */
export declare type TxResult = Record<string, string> & RpcTxRes;
export declare function toRpcTx(t: TxResult): RpcTx;
//# sourceMappingURL=types.d.ts.map