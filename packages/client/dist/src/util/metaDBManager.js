"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaDBManager = exports.DBKey = void 0;
const util_1 = require("@ethereumjs/util");
const encodingOpts = { keyEncoding: 'view', valueEncoding: 'view' };
/**
 * Number prepended to the db key to avoid collisions
 * when using the meta db for different data.
 *
 * Only append new items to the bottom of the list to
 * remain backward compat.
 */
var DBKey;
(function (DBKey) {
    DBKey[DBKey["Receipts"] = 0] = "Receipts";
    DBKey[DBKey["TxHash"] = 1] = "TxHash";
    DBKey[DBKey["SkeletonBlock"] = 2] = "SkeletonBlock";
    DBKey[DBKey["SkeletonBlockHashToNumber"] = 3] = "SkeletonBlockHashToNumber";
    DBKey[DBKey["SkeletonStatus"] = 4] = "SkeletonStatus";
    DBKey[DBKey["SkeletonUnfinalizedBlockByHash"] = 5] = "SkeletonUnfinalizedBlockByHash";
    DBKey[DBKey["Preimage"] = 6] = "Preimage";
})(DBKey = exports.DBKey || (exports.DBKey = {}));
/**
 * Helper class to access the metaDB with methods `put`, `get`, and `delete`
 */
class MetaDBManager {
    constructor(options) {
        this.chain = options.chain;
        this.config = options.config;
        this.metaDB = options.metaDB;
    }
    dbKey(type, key) {
        return (0, util_1.concatBytes)((0, util_1.intToBytes)(type), key);
    }
    async put(type, hash, value) {
        await this.metaDB.put(this.dbKey(type, hash), value, encodingOpts);
    }
    async get(type, hash) {
        try {
            return await this.metaDB.get(this.dbKey(type, hash), encodingOpts);
        }
        catch (error) {
            if (error.code === 'LEVEL_NOT_FOUND') {
                return null;
            }
            throw Error;
        }
    }
    async delete(type, hash) {
        await this.metaDB.del(this.dbKey(type, hash), encodingOpts);
    }
}
exports.MetaDBManager = MetaDBManager;
//# sourceMappingURL=metaDBManager.js.map