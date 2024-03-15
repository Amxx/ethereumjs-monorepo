"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthereumHDKey = void 0;
const index_js_1 = require("ethereum-cryptography/bip39/index.js");
const hdkey_js_1 = require("ethereum-cryptography/hdkey.js");
const wallet_js_1 = require("./wallet.js");
class EthereumHDKey {
    constructor(_hdkey) {
        this._hdkey = _hdkey;
    }
    /**
     * Creates an instance based on a seed.
     */
    static fromMasterSeed(seedBuffer) {
        return new EthereumHDKey(hdkey_js_1.HDKey.fromMasterSeed(seedBuffer));
    }
    /**
     * Creates an instance based on BIP39 mnemonic phrases
     */
    static fromMnemonic(mnemonic, passphrase) {
        return EthereumHDKey.fromMasterSeed((0, index_js_1.mnemonicToSeedSync)(mnemonic, passphrase));
    }
    /**
     * Create an instance based on a BIP32 extended private or public key.
     */
    static fromExtendedKey(base58Key) {
        return new EthereumHDKey(hdkey_js_1.HDKey.fromExtendedKey(base58Key));
    }
    /**
     * Returns a BIP32 extended private key (xprv)
     */
    privateExtendedKey() {
        if (!this._hdkey.privateExtendedKey) {
            throw new Error('This is a public key only wallet');
        }
        return this._hdkey.privateExtendedKey;
    }
    /**
     * Return a BIP32 extended public key (xpub)
     */
    publicExtendedKey() {
        return this._hdkey.publicExtendedKey;
    }
    /**
     * Derives a node based on a path (e.g. m/44'/0'/0/1)
     */
    derivePath(path) {
        return new EthereumHDKey(this._hdkey.derive(path));
    }
    /**
     * Derive a node based on a child index
     */
    deriveChild(index) {
        return new EthereumHDKey(this._hdkey.deriveChild(index));
    }
    /**
     * Return a `Wallet` instance as seen above
     */
    getWallet() {
        if (this._hdkey.privateKey) {
            return wallet_js_1.Wallet.fromPrivateKey(this._hdkey.privateKey);
        }
        if (!this._hdkey.publicKey)
            throw new Error('No hdkey');
        return wallet_js_1.Wallet.fromPublicKey(this._hdkey.publicKey, true);
    }
}
exports.EthereumHDKey = EthereumHDKey;
//# sourceMappingURL=hdkey.js.map