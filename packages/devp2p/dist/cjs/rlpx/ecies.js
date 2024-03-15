"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ECIES = void 0;
const rlp_1 = require("@ethereumjs/rlp");
const util_1 = require("@ethereumjs/util");
const crypto = require("crypto");
const debug_1 = require("debug");
const keccak_js_1 = require("ethereum-cryptography/keccak.js");
const random_js_1 = require("ethereum-cryptography/random.js");
const secp256k1_compat_js_1 = require("ethereum-cryptography/secp256k1-compat.js");
const secp256k1_js_1 = require("ethereum-cryptography/secp256k1.js");
const util_js_1 = require("../util.js");
const mac_js_1 = require("./mac.js");
const { debug: createDebugLogger } = debug_1.default;
const debug = createDebugLogger('devp2p:rlpx:peer');
function ecdhX(publicKey, privateKey) {
    // return (publicKey * privateKey).x
    function hashfn(x, y) {
        const pubKey = new Uint8Array(33);
        pubKey[0] = (y[31] & 1) === 0 ? 0x02 : 0x03;
        pubKey.set(x, 1);
        return pubKey.subarray(1);
    }
    return (0, secp256k1_compat_js_1.ecdh)(publicKey, privateKey, { hashfn }, new Uint8Array(32));
}
// a straight rip from python interop w/go ecies implementation
// for sha3, blocksize is 136 bytes
// for sha256, blocksize is 64 bytes
// NIST SP 800-56a Concatenation Key Derivation Function (see section 5.8.1).
// https://github.com/ethereum/pydevp2p/blob/master/devp2p/crypto.py#L295
// https://github.com/ethereum/go-ethereum/blob/fe532a98f9f32bb81ef0d8d013cf44327830d11e/crypto/ecies/ecies.go#L165
// https://github.com/ethereum/cpp-ethereum/blob/develop/libdevcrypto/CryptoPP.cpp#L36
function concatKDF(keyMaterial, keyLength) {
    const SHA256BlockSize = 64;
    const reps = ((keyLength + 7) * 8) / (SHA256BlockSize * 8);
    const bytes = [];
    for (let counter = 0, tmp = new Uint8Array(4); counter <= reps;) {
        counter += 1;
        new DataView(tmp.buffer).setUint32(0, counter);
        bytes.push(Uint8Array.from(crypto.createHash('sha256').update(tmp).update(keyMaterial).digest()));
    }
    return (0, util_1.concatBytes)(...bytes).subarray(0, keyLength);
}
class ECIES {
    constructor(privateKey, id, remoteId, common) {
        this._remoteNonce = null;
        this._initMsg = null;
        this._remoteInitMsg = null;
        this._gotEIP8Auth = false;
        this._gotEIP8Ack = false;
        this._ingressAes = null;
        this._egressAes = null;
        this._ingressMac = null;
        this._egressMac = null;
        this._remoteEphemeralPublicKey = null; // we don't need store this key, but why don't?
        this._ephemeralSharedSecret = null;
        this._bodySize = null;
        this._privateKey = privateKey;
        this._publicKey = (0, util_js_1.id2pk)(id);
        this._remotePublicKey = remoteId !== null ? (0, util_js_1.id2pk)(remoteId) : null;
        this._nonce = (0, random_js_1.getRandomBytesSync)(32);
        this._ephemeralPrivateKey = (0, util_js_1.genPrivateKey)();
        this._ephemeralPublicKey = secp256k1_js_1.secp256k1.getPublicKey(this._ephemeralPrivateKey, false);
        this._keccakFunction = common?.customCrypto.keccak256 ?? keccak_js_1.keccak256;
        this._ecdsaSign = common?.customCrypto.ecdsaSign ?? secp256k1_compat_js_1.ecdsaSign;
        this._ecdsaRecover = common?.customCrypto.ecdsaRecover ?? secp256k1_compat_js_1.ecdsaRecover;
    }
    _encryptMessage(data, sharedMacData = null) {
        const privateKey = (0, util_js_1.genPrivateKey)();
        if (!this._remotePublicKey)
            return;
        const x = ecdhX(this._remotePublicKey, privateKey);
        const key = concatKDF(x, 32);
        const ekey = key.subarray(0, 16); // encryption key
        const mkey = crypto.createHash('sha256').update(key.subarray(16, 32)).digest(); // MAC key
        // encrypt
        const IV = (0, random_js_1.getRandomBytesSync)(16);
        const cipher = crypto.createCipheriv('aes-128-ctr', ekey, IV);
        const encryptedData = Uint8Array.from(cipher.update(data));
        const dataIV = (0, util_1.concatBytes)(IV, encryptedData);
        // create tag
        if (!sharedMacData) {
            sharedMacData = Uint8Array.from([]);
        }
        const tag = Uint8Array.from(crypto.createHmac('sha256', mkey).update((0, util_1.concatBytes)(dataIV, sharedMacData)).digest());
        const publicKey = secp256k1_js_1.secp256k1.getPublicKey(privateKey, false);
        return (0, util_1.concatBytes)(publicKey, dataIV, tag);
    }
    _decryptMessage(data, sharedMacData = null) {
        (0, util_js_1.assertEq)(data.subarray(0, 1), (0, util_1.hexToBytes)('0x04'), 'wrong ecies header (possible cause: EIP8 upgrade)', debug);
        const publicKey = data.subarray(0, 65);
        const dataIV = data.subarray(65, -32);
        const tag = data.subarray(-32);
        // derive keys
        const x = ecdhX(publicKey, this._privateKey);
        const key = concatKDF(x, 32);
        const ekey = key.subarray(0, 16); // encryption key
        const mkey = Uint8Array.from(crypto.createHash('sha256').update(key.subarray(16, 32)).digest()); // MAC key
        // check the tag
        if (!sharedMacData) {
            sharedMacData = Uint8Array.from([]);
        }
        const _tag = crypto
            .createHmac('sha256', mkey)
            .update((0, util_1.concatBytes)(dataIV, sharedMacData))
            .digest();
        (0, util_js_1.assertEq)(_tag, tag, 'should have valid tag', debug);
        // decrypt data
        const IV = dataIV.subarray(0, 16);
        const encryptedData = dataIV.subarray(16);
        const decipher = crypto.createDecipheriv('aes-128-ctr', ekey, IV);
        return Uint8Array.from(decipher.update(encryptedData));
    }
    _setupFrame(remoteData, incoming) {
        if (!this._remoteNonce)
            return;
        const nonceMaterial = incoming
            ? (0, util_1.concatBytes)(this._nonce, this._remoteNonce)
            : (0, util_1.concatBytes)(this._remoteNonce, this._nonce);
        const hNonce = this._keccakFunction(nonceMaterial);
        if (!this._ephemeralSharedSecret)
            return;
        const IV = new Uint8Array(16).fill(0x00);
        const sharedSecret = this._keccakFunction((0, util_1.concatBytes)(this._ephemeralSharedSecret, hNonce));
        const aesSecret = this._keccakFunction((0, util_1.concatBytes)(this._ephemeralSharedSecret, sharedSecret));
        this._ingressAes = crypto.createDecipheriv('aes-256-ctr', aesSecret, IV);
        this._egressAes = crypto.createDecipheriv('aes-256-ctr', aesSecret, IV);
        const macSecret = this._keccakFunction((0, util_1.concatBytes)(this._ephemeralSharedSecret, aesSecret));
        this._ingressMac = new mac_js_1.MAC(macSecret);
        this._ingressMac.update((0, util_1.concatBytes)((0, util_js_1.xor)(macSecret, this._nonce), remoteData));
        this._egressMac = new mac_js_1.MAC(macSecret);
        if (this._initMsg === null || this._initMsg === undefined)
            return;
        this._egressMac.update((0, util_1.concatBytes)((0, util_js_1.xor)(macSecret, this._remoteNonce), this._initMsg));
    }
    createAuthEIP8() {
        if (!this._remotePublicKey)
            return;
        const x = ecdhX(this._remotePublicKey, this._privateKey);
        const sig = this._ecdsaSign((0, util_js_1.xor)(x, this._nonce), this._ephemeralPrivateKey);
        const data = [
            (0, util_1.concatBytes)(sig.signature, Uint8Array.from([sig.recid])),
            // this._keccakFunction(pk2id(this._ephemeralPublicKey)),
            (0, util_js_1.pk2id)(this._publicKey),
            this._nonce,
            Uint8Array.from([0x04]),
        ];
        const dataRLP = rlp_1.RLP.encode(data);
        const pad = (0, random_js_1.getRandomBytesSync)(100 + Math.floor(Math.random() * 151)); // Random padding between 100, 250
        const authMsg = (0, util_1.concatBytes)(dataRLP, pad);
        const overheadLength = 113;
        const sharedMacData = (0, util_1.intToBytes)(authMsg.length + overheadLength);
        const encryptedMsg = this._encryptMessage(authMsg, sharedMacData);
        if (!encryptedMsg)
            return;
        this._initMsg = (0, util_1.concatBytes)(sharedMacData, encryptedMsg);
        return this._initMsg;
    }
    createAuthNonEIP8() {
        if (!this._remotePublicKey)
            return;
        const x = ecdhX(this._remotePublicKey, this._privateKey);
        const sig = this._ecdsaSign((0, util_js_1.xor)(x, this._nonce), this._ephemeralPrivateKey);
        const data = (0, util_1.concatBytes)(sig.signature, Uint8Array.from([sig.recid]), this._keccakFunction((0, util_js_1.pk2id)(this._ephemeralPublicKey)), (0, util_js_1.pk2id)(this._publicKey), this._nonce, Uint8Array.from([0x00]));
        this._initMsg = this._encryptMessage(data);
        return this._initMsg;
    }
    parseAuthPlain(data, sharedMacData = null) {
        const prefix = sharedMacData !== null ? sharedMacData : new Uint8Array();
        this._remoteInitMsg = (0, util_1.concatBytes)(prefix, data);
        const decrypted = this._decryptMessage(data, sharedMacData);
        let signature = null;
        let recoveryId = null;
        let heid = null;
        let remotePublicKey = null;
        let nonce = null;
        if (!this._gotEIP8Auth) {
            (0, util_js_1.assertEq)(decrypted.length, 194, 'invalid packet length', debug);
            signature = decrypted.subarray(0, 64);
            recoveryId = decrypted[64];
            heid = decrypted.subarray(65, 97); // 32 bytes
            remotePublicKey = (0, util_js_1.id2pk)(decrypted.subarray(97, 161));
            nonce = decrypted.subarray(161, 193);
        }
        else {
            const decoded = (0, util_js_1.unstrictDecode)(decrypted);
            signature = decoded[0].subarray(0, 64);
            recoveryId = decoded[0][64];
            remotePublicKey = (0, util_js_1.id2pk)(decoded[1]);
            nonce = decoded[2];
        }
        // parse packet
        this._remotePublicKey = remotePublicKey; // 64 bytes
        this._remoteNonce = nonce; // 32 bytes
        // assertEq(decrypted[193], 0, 'invalid postfix', debug)
        const x = ecdhX(this._remotePublicKey, this._privateKey);
        if (this._remoteNonce === null) {
            return;
        }
        this._remoteEphemeralPublicKey = this._ecdsaRecover(signature, recoveryId, (0, util_js_1.xor)(x, this._remoteNonce), false);
        if (this._remoteEphemeralPublicKey === null)
            return;
        this._ephemeralSharedSecret = ecdhX(this._remoteEphemeralPublicKey, this._ephemeralPrivateKey);
        if (heid !== null && this._remoteEphemeralPublicKey !== null) {
            (0, util_js_1.assertEq)(this._keccakFunction((0, util_js_1.pk2id)(this._remoteEphemeralPublicKey)), heid, 'the hash of the ephemeral key should match', debug);
        }
    }
    parseAuthEIP8(data) {
        const size = (0, util_1.bytesToInt)(data.subarray(0, 2)) + 2;
        (0, util_js_1.assertEq)(data.length, size, 'message length different from specified size (EIP8)', debug);
        this.parseAuthPlain(data.subarray(2), data.subarray(0, 2));
    }
    createAckEIP8() {
        const data = [(0, util_js_1.pk2id)(this._ephemeralPublicKey), this._nonce, Uint8Array.from([0x04])];
        const dataRLP = rlp_1.RLP.encode(data);
        const pad = (0, random_js_1.getRandomBytesSync)(100 + Math.floor(Math.random() * 151)); // Random padding between 100, 250
        const ackMsg = (0, util_1.concatBytes)(dataRLP, pad);
        const overheadLength = 113;
        const sharedMacData = (0, util_1.intToBytes)(ackMsg.length + overheadLength);
        const encryptedMsg = this._encryptMessage(ackMsg, sharedMacData);
        if (!encryptedMsg)
            return;
        this._initMsg = (0, util_1.concatBytes)(sharedMacData, encryptedMsg);
        if (!this._remoteInitMsg)
            return;
        this._setupFrame(this._remoteInitMsg, true);
        return this._initMsg;
    }
    createAckOld() {
        const data = (0, util_1.concatBytes)((0, util_js_1.pk2id)(this._ephemeralPublicKey), this._nonce, new Uint8Array([0x00]));
        this._initMsg = this._encryptMessage(data);
        if (!this._remoteInitMsg)
            return;
        this._setupFrame(this._remoteInitMsg, true);
        return this._initMsg;
    }
    parseAckPlain(data, sharedMacData = null) {
        const decrypted = this._decryptMessage(data, sharedMacData);
        let remoteEphemeralPublicKey = null;
        let remoteNonce = null;
        if (!this._gotEIP8Ack) {
            (0, util_js_1.assertEq)(decrypted.length, 97, 'invalid packet length', debug);
            (0, util_js_1.assertEq)(decrypted[96], 0, 'invalid postfix', debug);
            remoteEphemeralPublicKey = (0, util_js_1.id2pk)(decrypted.subarray(0, 64));
            remoteNonce = decrypted.subarray(64, 96);
        }
        else {
            const decoded = (0, util_js_1.unstrictDecode)(decrypted);
            remoteEphemeralPublicKey = (0, util_js_1.id2pk)(decoded[0]);
            remoteNonce = decoded[1];
        }
        // parse packet
        this._remoteEphemeralPublicKey = remoteEphemeralPublicKey;
        this._remoteNonce = remoteNonce;
        this._ephemeralSharedSecret = ecdhX(this._remoteEphemeralPublicKey, this._ephemeralPrivateKey);
        if (!sharedMacData) {
            sharedMacData = Uint8Array.from([]);
        }
        this._setupFrame((0, util_1.concatBytes)(sharedMacData, data), false);
    }
    parseAckEIP8(data) {
        const size = (0, util_1.bytesToInt)(data.subarray(0, 2)) + 2;
        (0, util_js_1.assertEq)(data.length, size, 'message length different from specified size (EIP8)', debug);
        this.parseAckPlain(data.subarray(2), data.subarray(0, 2));
    }
    createHeader(size) {
        const bufSize = (0, util_js_1.zfill)((0, util_1.intToBytes)(size), 3);
        const headerData = rlp_1.RLP.encode([0, 0]); // [capability-id, context-id] (currently unused in spec)
        let header = (0, util_1.concatBytes)(bufSize, headerData);
        header = (0, util_js_1.zfill)(header, 16, false);
        if (!this._egressAes)
            return;
        header = Uint8Array.from(this._egressAes.update(header));
        if (!this._egressMac)
            return;
        this._egressMac.updateHeader(header);
        const tag = Uint8Array.from(this._egressMac.digest());
        return (0, util_1.concatBytes)(header, tag);
    }
    parseHeader(data) {
        // parse header
        let header = data.subarray(0, 16);
        const mac = data.subarray(16, 32);
        if (!this._ingressMac)
            return;
        this._ingressMac.updateHeader(header);
        const _mac = Uint8Array.from(this._ingressMac.digest());
        (0, util_js_1.assertEq)(_mac, mac, 'Invalid MAC', debug);
        if (!this._ingressAes)
            return;
        header = Uint8Array.from(this._ingressAes.update(header));
        this._bodySize = (0, util_1.bytesToInt)(header.subarray(0, 3));
        return this._bodySize;
    }
    createBody(data) {
        data = (0, util_js_1.zfill)(data, Math.ceil(data.length / 16) * 16, false);
        if (!this._egressAes)
            return;
        const encryptedData = Uint8Array.from(this._egressAes.update(data));
        if (!this._egressMac)
            return;
        this._egressMac.updateBody(encryptedData);
        const tag = Uint8Array.from(this._egressMac.digest());
        return (0, util_1.concatBytes)(encryptedData, tag);
    }
    parseBody(data) {
        if (this._bodySize === null)
            throw new Error('need to parse header first');
        const body = data.subarray(0, -16);
        const mac = data.subarray(-16);
        if (!this._ingressMac)
            return;
        this._ingressMac.updateBody(body);
        const _mac = Uint8Array.from(this._ingressMac.digest());
        (0, util_js_1.assertEq)(_mac, mac, 'Invalid MAC', debug);
        const size = this._bodySize;
        this._bodySize = null;
        if (!this._ingressAes)
            return;
        return Uint8Array.from(this._ingressAes.update(body)).subarray(0, size);
    }
}
exports.ECIES = ECIES;
//# sourceMappingURL=ecies.js.map