import { Block } from '@ethereumjs/block';
import { Hardfork } from '@ethereumjs/common';
import { type ChainCache } from '../types';
import type { Chain } from '../../../../blockchain';
import type { Common } from '@ethereumjs/common';
/**
 * Recursively finds parent blocks starting from the parentHash.
 */
export declare const recursivelyFindParents: (vmHeadHash: Uint8Array, parentHash: Uint8Array, chain: Chain) => Promise<Block[]>;
/**
 * Returns the block hash as a 0x-prefixed hex string if found valid in the blockchain, otherwise returns null.
 */
export declare const validExecutedChainBlock: (blockOrHash: Uint8Array | Block, chain: Chain) => Promise<Block | null>;
/**
 * Returns the block hash as a 0x-prefixed hex string if found valid in the blockchain, otherwise returns null.
 */
export declare const validHash: (hash: Uint8Array, chain: Chain, chainCache: ChainCache) => Promise<string | null>;
/**
 * Validates that the block satisfies post-merge conditions.
 */
export declare const validateTerminalBlock: (block: Block, chain: Chain) => Promise<boolean>;
export declare function validateHardforkRange(chainCommon: Common, methodVersion: number, checkNotBeforeHf: Hardfork | null, checkNotAfterHf: Hardfork | null, timestamp: bigint): void;
//# sourceMappingURL=generic.d.ts.map