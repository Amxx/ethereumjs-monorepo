"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAC = void 0;
const crypto_1 = require("crypto");
const keccak_js_1 = require("ethereum-cryptography/keccak.js");
const util_js_1 = require("../util.js");
class MAC {
    constructor(secret) {
        this._hash = keccak_js_1.keccak256.create();
        this._secret = secret;
    }
    update(data) {
        this._hash.update(data);
    }
    updateHeader(data) {
        const aes = (0, crypto_1.createCipheriv)('aes-256-ecb', this._secret, '');
        const encrypted = aes.update(this.digest());
        this._hash.update((0, util_js_1.xor)(encrypted, data));
    }
    updateBody(data) {
        this._hash.update(data);
        const prev = this.digest();
        const aes = (0, crypto_1.createCipheriv)('aes-256-ecb', this._secret, '');
        const encrypted = aes.update(prev);
        this._hash.update((0, util_js_1.xor)(encrypted, prev));
    }
    digest() {
        return Uint8Array.from(this._hash.clone().digest().subarray(0, 16));
    }
}
exports.MAC = MAC;
//# sourceMappingURL=mac.js.map