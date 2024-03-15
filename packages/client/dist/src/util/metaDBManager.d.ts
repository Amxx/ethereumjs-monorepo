import type { Chain } from '../blockchain';
import type { Config } from '../config';
import type { AbstractLevel } from 'abstract-level';
/**
 * Number prepended to the db key to avoid collisions
 * when using the meta db for different data.
 *
 * Only append new items to the bottom of the list to
 * remain backward compat.
 */
export declare enum DBKey {
    Receipts = 0,
    TxHash = 1,
    SkeletonBlock = 2,
    SkeletonBlockHashToNumber = 3,
    SkeletonStatus = 4,
    SkeletonUnfinalizedBlockByHash = 5,
    Preimage = 6
}
export interface MetaDBManagerOptions {
    chain: Chain;
    config: Config;
    metaDB: AbstractLevel<string | Uint8Array, string | Uint8Array, string | Uint8Array>;
}
/**
 * Helper class to access the metaDB with methods `put`, `get`, and `delete`
 */
export declare class MetaDBManager {
    protected chain: Chain;
    protected config: Config;
    private metaDB;
    constructor(options: MetaDBManagerOptions);
    private dbKey;
    put(type: DBKey, hash: Uint8Array, value: Uint8Array): Promise<void>;
    get(type: DBKey, hash: Uint8Array): Promise<Uint8Array | null>;
    delete(type: DBKey, hash: Uint8Array): Promise<void>;
}
//# sourceMappingURL=metaDBManager.d.ts.map