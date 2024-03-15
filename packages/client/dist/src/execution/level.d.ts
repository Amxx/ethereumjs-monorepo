import type { BatchDBOp, DB, DBObject, EncodingOpts } from '@ethereumjs/util';
import type { AbstractLevel } from 'abstract-level';
/**
 * LevelDB is a thin wrapper around the underlying levelup db,
 * corresponding to the {@link DB}
 */
export declare class LevelDB<TKey extends Uint8Array | string = Uint8Array | string, TValue extends Uint8Array | string | DBObject = Uint8Array | string | DBObject> implements DB<TKey, TValue> {
    _leveldb: AbstractLevel<string | Uint8Array, string | Uint8Array, string | Uint8Array>;
    /**
     * Initialize a DB instance. If `leveldb` is not provided, DB
     * defaults to an [in-memory store](https://github.com/Level/memdown).
     * @param leveldb - An abstract-leveldown compliant store
     */
    constructor(leveldb?: AbstractLevel<string | Uint8Array, string | Uint8Array, string | Uint8Array>);
    /**
     * @inheritDoc
     */
    get(key: TKey, opts?: EncodingOpts): Promise<TValue | undefined>;
    /**
     * @inheritDoc
     */
    put(key: TKey, val: TValue, opts?: {}): Promise<void>;
    /**
     * @inheritDoc
     */
    del(key: TKey): Promise<void>;
    /**
     * @inheritDoc
     */
    batch(opStack: BatchDBOp<TKey, TValue>[]): Promise<void>;
    /**
     * @inheritDoc
     */
    shallowCopy(): DB<TKey, TValue>;
    open(): Promise<void>;
}
//# sourceMappingURL=level.d.ts.map