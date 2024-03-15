import type { Chain } from '../blockchain';
import type { Block } from '@ethereumjs/block';
import type { JsonRpcTx, TypedTransaction } from '@ethereumjs/tx';
export declare function callWithStackTrace(handler: Function, debug: boolean): (...args: any) => Promise<any>;
/**
 * Returns tx formatted to the standard JSON-RPC fields
 */
export declare const jsonRpcTx: (tx: TypedTransaction, block?: Block, txIndex?: number) => JsonRpcTx;
/**
 * Get block by option
 */
export declare const getBlockByOption: (blockOpt: string, chain: Chain) => Promise<Block>;
//# sourceMappingURL=helpers.d.ts.map