import { MetaDBManager } from '../util/metaDBManager';
/**
 * The `PreImagesManager` saves the preimages of hashed keys. This is necessary for the Verkle transition.
 * A "PreImage" of a hash is whatever the input is to the hashed function. So, if one calls `keccak256(X)` with
 * output `Y` then `X` is the preimage of `Y`. It thus serves to recover the input to the trapdoor hash function,
 * which would otherwise not be feasible.
 */
export declare class PreimagesManager extends MetaDBManager {
    /**
     * Returns the preimage for a given hashed key
     * @param key the hashed key
     * @returns the preimage of the hashed key
     */
    getPreimage(key: Uint8Array): Promise<Uint8Array | null>;
    /**
     * Saves a preimage to the db for a given hashed key.
     * @param key The hashed key
     * @param preimage The preimage to save
     */
    savePreimage(key: Uint8Array, preimage: Uint8Array): Promise<void>;
}
//# sourceMappingURL=preimage.d.ts.map