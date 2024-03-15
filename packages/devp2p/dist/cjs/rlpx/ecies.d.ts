/// <reference types="node" />
import * as crypto from 'crypto';
import { MAC } from './mac.js';
import type { Common } from '@ethereumjs/common';
declare type Decipher = crypto.Decipher;
export declare class ECIES {
    protected _privateKey: Uint8Array;
    protected _publicKey: Uint8Array;
    protected _remotePublicKey: Uint8Array | null;
    protected _nonce: Uint8Array;
    protected _remoteNonce: Uint8Array | null;
    protected _initMsg: Uint8Array | null | undefined;
    protected _remoteInitMsg: Uint8Array | null;
    protected _gotEIP8Auth: boolean;
    protected _gotEIP8Ack: boolean;
    protected _ingressAes: Decipher | null;
    protected _egressAes: Decipher | null;
    protected _ingressMac: MAC | null;
    protected _egressMac: MAC | null;
    protected _ephemeralPrivateKey: Uint8Array;
    protected _ephemeralPublicKey: Uint8Array;
    protected _remoteEphemeralPublicKey: Uint8Array | null;
    protected _ephemeralSharedSecret: Uint8Array | null;
    protected _bodySize: number | null;
    protected _keccakFunction: (msg: Uint8Array) => Uint8Array;
    protected _ecdsaSign: (msg: Uint8Array, pk: Uint8Array) => {
        signature: Uint8Array;
        recid: number;
    };
    protected _ecdsaRecover: (sig: Uint8Array, recId: number, hash: Uint8Array, compressed?: boolean) => Uint8Array;
    constructor(privateKey: Uint8Array, id: Uint8Array, remoteId: Uint8Array, common?: Common);
    _encryptMessage(data: Uint8Array, sharedMacData?: Uint8Array | null): Uint8Array | undefined;
    _decryptMessage(data: Uint8Array, sharedMacData?: Uint8Array | null): Uint8Array;
    _setupFrame(remoteData: Uint8Array, incoming: boolean): void;
    createAuthEIP8(): Uint8Array | undefined;
    createAuthNonEIP8(): Uint8Array | undefined;
    parseAuthPlain(data: Uint8Array, sharedMacData?: Uint8Array | null): Uint8Array | undefined;
    parseAuthEIP8(data: Uint8Array): void;
    createAckEIP8(): Uint8Array | undefined;
    createAckOld(): Uint8Array | undefined;
    parseAckPlain(data: Uint8Array, sharedMacData?: Uint8Array | null): void;
    parseAckEIP8(data: Uint8Array): void;
    createHeader(size: number): Uint8Array | undefined;
    parseHeader(data: Uint8Array): number | undefined;
    createBody(data: Uint8Array): Uint8Array | undefined;
    parseBody(data: Uint8Array): Uint8Array | undefined;
}
export {};
//# sourceMappingURL=ecies.d.ts.map