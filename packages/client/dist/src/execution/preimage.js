"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreimagesManager = void 0;
const metaDBManager_1 = require("../util/metaDBManager");
/**
 * The `PreImagesManager` saves the preimages of hashed keys. This is necessary for the Verkle transition.
 * A "PreImage" of a hash is whatever the input is to the hashed function. So, if one calls `keccak256(X)` with
 * output `Y` then `X` is the preimage of `Y`. It thus serves to recover the input to the trapdoor hash function,
 * which would otherwise not be feasible.
 */
class PreimagesManager extends metaDBManager_1.MetaDBManager {
    /**
     * Returns the preimage for a given hashed key
     * @param key the hashed key
     * @returns the preimage of the hashed key
     */
    async getPreimage(key) {
        return this.get(metaDBManager_1.DBKey.Preimage, key);
    }
    /**
     * Saves a preimage to the db for a given hashed key.
     * @param key The hashed key
     * @param preimage The preimage to save
     */
    async savePreimage(key, preimage) {
        await this.put(metaDBManager_1.DBKey.Preimage, key, preimage);
    }
}
exports.PreimagesManager = PreimagesManager;
//# sourceMappingURL=preimage.js.map