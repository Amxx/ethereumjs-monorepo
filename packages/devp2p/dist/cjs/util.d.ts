import debugDefault from 'debug';
import type { ETH } from './protocol/eth.js';
import type { LES } from './protocol/les.js';
export declare const devp2pDebug: debugDefault.Debugger;
export declare function genPrivateKey(): Uint8Array;
export declare function pk2id(pk: Uint8Array): Uint8Array;
export declare function id2pk(id: Uint8Array): Uint8Array;
export declare function zfill(bytes: Uint8Array, size: number, leftpad?: boolean): Uint8Array;
export declare function xor(a: Uint8Array, b: any): Uint8Array;
declare type assertInput = Uint8Array | Uint8Array[] | ETH.StatusMsg | LES.Status | number | null;
export declare function assertEq(expected: assertInput, actual: assertInput, msg: string, debug: Function, messageName?: string): void;
export declare function formatLogId(id: string, verbose: boolean): string;
export declare function formatLogData(data: string, verbose: boolean): string;
export declare class Deferred<T> {
    promise: Promise<T>;
    resolve: (...args: any[]) => any;
    reject: (...args: any[]) => any;
    constructor();
}
export declare function createDeferred<T>(): Deferred<T>;
export declare function unstrictDecode(value: Uint8Array): Uint8Array | import("@ethereumjs/rlp").NestedUint8Array;
export declare function toNewUint8Array(buf: Uint8Array): Uint8Array;
/*************************** ************************************************************/
export declare const ipToString: (bytes: Uint8Array, offset?: number, length?: number) => string;
export declare const isV4Format: (ip: string) => boolean;
export declare const isV6Format: (ip: string) => boolean;
export declare const ipToBytes: (ip: string, bytes?: Uint8Array, offset?: number) => Uint8Array;
export {};
/************  End of methods borrowed from `node-ip` ***************************/
//# sourceMappingURL=util.d.ts.map