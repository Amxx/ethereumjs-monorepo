import { Multiaddr } from 'multiaddr';
import type { MultiaddrLike } from '../types';
/**
 * Parses multiaddrs and bootnodes to multiaddr format.
 * @param input comma separated string
 */
export declare function parseMultiaddrs(input: MultiaddrLike): Multiaddr[];
/**
 * Returns Uint8Array from input hexadecimal string or Uint8Array
 * @param input hexadecimal string or Uint8Array
 */
export declare function parseKey(input: string | Uint8Array): Uint8Array;
//# sourceMappingURL=parse.d.ts.map