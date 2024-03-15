"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LevelDB = void 0;
const util_1 = require("@ethereumjs/util");
const memory_level_1 = require("memory-level");
// Helper to infer the `valueEncoding` option for `putting` a value in a levelDB
const getEncodings = (opts = {}) => {
    const encodings = { keyEncoding: '', valueEncoding: '' };
    switch (opts.valueEncoding) {
        case util_1.ValueEncoding.String:
            encodings.valueEncoding = 'utf8';
            break;
        case util_1.ValueEncoding.Bytes:
            encodings.valueEncoding = 'view';
            break;
        case util_1.ValueEncoding.JSON:
            encodings.valueEncoding = 'json';
            break;
        default:
            encodings.valueEncoding = 'view';
    }
    switch (opts.keyEncoding) {
        case util_1.KeyEncoding.Bytes:
            encodings.keyEncoding = 'view';
            break;
        case util_1.KeyEncoding.Number:
        case util_1.KeyEncoding.String:
            encodings.keyEncoding = 'utf8';
            break;
        default:
            encodings.keyEncoding = 'utf8';
    }
    return encodings;
};
/**
 * LevelDB is a thin wrapper around the underlying levelup db,
 * corresponding to the {@link DB}
 */
class LevelDB {
    /**
     * Initialize a DB instance. If `leveldb` is not provided, DB
     * defaults to an [in-memory store](https://github.com/Level/memdown).
     * @param leveldb - An abstract-leveldown compliant store
     */
    constructor(leveldb) {
        this._leveldb = leveldb ?? new memory_level_1.MemoryLevel();
    }
    /**
     * @inheritDoc
     */
    async get(key, opts) {
        let value;
        const encodings = getEncodings(opts);
        try {
            value = await this._leveldb.get(key, encodings);
            if (value === null)
                return undefined;
        }
        catch (error) {
            // https://github.com/Level/abstract-level/blob/915ad1317694d0ce8c580b5ab85d81e1e78a3137/abstract-level.js#L309
            // This should be `true` if the error came from LevelDB
            // so we can check for `NOT true` to identify any non-404 errors
            if (error.notFound !== true) {
                throw error;
            }
        }
        // eslint-disable-next-line
        if (value instanceof Buffer)
            value = Uint8Array.from(value);
        return value;
    }
    /**
     * @inheritDoc
     */
    async put(key, val, opts) {
        const encodings = getEncodings(opts);
        await this._leveldb.put(key, val, encodings);
    }
    /**
     * @inheritDoc
     */
    async del(key) {
        await this._leveldb.del(key);
    }
    /**
     * @inheritDoc
     */
    async batch(opStack) {
        const levelOps = [];
        for (const op of opStack) {
            const encodings = getEncodings(op.opts);
            levelOps.push({ ...op, ...encodings });
        }
        // TODO: Investigate why as any is necessary
        await this._leveldb.batch(levelOps);
    }
    /**
     * @inheritDoc
     */
    shallowCopy() {
        return new LevelDB(this._leveldb);
    }
    open() {
        return this._leveldb.open();
    }
}
exports.LevelDB = LevelDB;
//# sourceMappingURL=level.js.map