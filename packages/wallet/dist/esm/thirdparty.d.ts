import { Wallet } from './wallet.js';
export interface EvpKdfOpts {
    count: number;
    keysize: number;
    ivsize: number;
    digest: string;
}
export interface EtherWalletOptions {
    address: string;
    encrypted: boolean;
    locked: boolean;
    hash: string;
    private: string;
    public: string;
}
export declare function fromEtherWallet(input: string | EtherWalletOptions, password: string): Promise<Wallet>;
/**
 * Third Party API: Import a brain wallet used by Ether.Camp
 */
export declare function fromEtherCamp(passphrase: string): Wallet;
/**
 * Third Party API: Import a brain wallet used by Quorum Wallet
 */
export declare function fromQuorumWallet(passphrase: string, userid: string): Wallet;
export declare const Thirdparty: {
    fromEtherWallet: typeof fromEtherWallet;
    fromEtherCamp: typeof fromEtherCamp;
    fromQuorumWallet: typeof fromQuorumWallet;
};
//# sourceMappingURL=thirdparty.d.ts.map