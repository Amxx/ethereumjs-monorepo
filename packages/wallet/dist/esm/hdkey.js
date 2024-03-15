import { mnemonicToSeedSync } from 'ethereum-cryptography/bip39/index.js';
import { HDKey } from 'ethereum-cryptography/hdkey.js';
import { Wallet } from './wallet.js';
export class EthereumHDKey {
    constructor(_hdkey) {
        this._hdkey = _hdkey;
    }
    /**
     * Creates an instance based on a seed.
     */
    static fromMasterSeed(seedBuffer) {
        return new EthereumHDKey(HDKey.fromMasterSeed(seedBuffer));
    }
    /**
     * Creates an instance based on BIP39 mnemonic phrases
     */
    static fromMnemonic(mnemonic, passphrase) {
        return EthereumHDKey.fromMasterSeed(mnemonicToSeedSync(mnemonic, passphrase));
    }
    /**
     * Create an instance based on a BIP32 extended private or public key.
     */
    static fromExtendedKey(base58Key) {
        return new EthereumHDKey(HDKey.fromExtendedKey(base58Key));
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
            return Wallet.fromPrivateKey(this._hdkey.privateKey);
        }
        if (!this._hdkey.publicKey)
            throw new Error('No hdkey');
        return Wallet.fromPublicKey(this._hdkey.publicKey, true);
    }
}
//# sourceMappingURL=hdkey.js.map