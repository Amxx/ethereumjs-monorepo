import { HDKey } from 'ethereum-cryptography/hdkey.js';
import { Wallet } from './wallet.js';
export declare class EthereumHDKey {
    private readonly _hdkey;
    /**
     * Creates an instance based on a seed.
     */
    static fromMasterSeed(seedBuffer: Uint8Array): EthereumHDKey;
    /**
     * Creates an instance based on BIP39 mnemonic phrases
     */
    static fromMnemonic(mnemonic: string, passphrase?: string): EthereumHDKey;
    /**
     * Create an instance based on a BIP32 extended private or public key.
     */
    static fromExtendedKey(base58Key: string): EthereumHDKey;
    constructor(_hdkey: HDKey);
    /**
     * Returns a BIP32 extended private key (xprv)
     */
    privateExtendedKey(): string;
    /**
     * Return a BIP32 extended public key (xpub)
     */
    publicExtendedKey(): string;
    /**
     * Derives a node based on a path (e.g. m/44'/0'/0/1)
     */
    derivePath(path: string): EthereumHDKey;
    /**
     * Derive a node based on a child index
     */
    deriveChild(index: number): EthereumHDKey;
    /**
     * Return a `Wallet` instance as seen above
     */
    getWallet(): Wallet;
}
//# sourceMappingURL=hdkey.d.ts.map