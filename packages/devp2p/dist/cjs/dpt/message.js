"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decode = exports.encode = void 0;
const rlp_1 = require("@ethereumjs/rlp");
const util_1 = require("@ethereumjs/util");
const debug_1 = require("debug");
const keccak_js_1 = require("ethereum-cryptography/keccak.js");
const secp256k1_compat_js_1 = require("ethereum-cryptography/secp256k1-compat.js");
const util_js_1 = require("../util.js");
const { debug: createDebugLogger } = debug_1.default;
const debug = createDebugLogger('devp2p:dpt:server');
function getTimestamp() {
    return (Date.now() / 1000) | 0;
}
const timestamp = {
    encode(value = getTimestamp() + 60) {
        const bytes = new Uint8Array(4);
        new DataView(bytes.buffer).setUint32(0, value);
        return bytes;
    },
    decode(bytes) {
        if (bytes.length !== 4)
            throw new RangeError(`Invalid timestamp bytes :${(0, util_1.bytesToHex)(bytes)}`);
        return new DataView(bytes.buffer).getUint32(0);
    },
};
const address = {
    encode(value) {
        if ((0, util_js_1.isV4Format)(value))
            return (0, util_js_1.ipToBytes)(value);
        if ((0, util_js_1.isV6Format)(value))
            return (0, util_js_1.ipToBytes)(value);
        throw new Error(`Invalid address: ${value}`);
    },
    decode(bytes) {
        if (bytes.length === 4)
            return (0, util_js_1.ipToString)(bytes);
        if (bytes.length === 16)
            return (0, util_js_1.ipToString)(bytes);
        const str = (0, util_1.bytesToUtf8)(bytes);
        if ((0, util_js_1.isV4Format)(str) || (0, util_js_1.isV6Format)(str))
            return str;
        // also can be host, but skip it right now (because need async function for resolve)
        throw new Error(`Invalid address bytes: ${(0, util_1.bytesToHex)(bytes)}`);
    },
};
const port = {
    encode(value) {
        if (value === null)
            return new Uint8Array();
        if (value >>> 16 > 0)
            throw new RangeError(`Invalid port: ${value}`);
        return Uint8Array.from([(value >>> 8) & 0xff, (value >>> 0) & 0xff]);
    },
    decode(bytes) {
        if (bytes.length === 0)
            return null;
        return (0, util_1.bytesToInt)(bytes);
    },
};
const endpoint = {
    encode(obj) {
        return [
            address.encode(obj.address),
            port.encode(obj.udpPort ?? null),
            port.encode(obj.tcpPort ?? null),
        ];
    },
    decode(payload) {
        return {
            address: address.decode(payload[0]),
            udpPort: port.decode(payload[1]),
            tcpPort: port.decode(payload[2]),
        };
    },
};
const ping = {
    encode(obj) {
        return [
            (0, util_1.intToBytes)(obj.version),
            endpoint.encode(obj.from),
            endpoint.encode(obj.to),
            timestamp.encode(obj.timestamp),
        ];
    },
    decode(payload) {
        return {
            version: (0, util_1.bytesToInt)(payload[0]),
            from: endpoint.decode(payload[1]),
            to: endpoint.decode(payload[2]),
            timestamp: timestamp.decode(payload[3]),
        };
    },
};
const pong = {
    encode(obj) {
        return [endpoint.encode(obj.to), obj.hash, timestamp.encode(obj.timestamp)];
    },
    decode(payload) {
        return {
            to: endpoint.decode(payload[0]),
            hash: payload[1],
            timestamp: timestamp.decode(payload[2]),
        };
    },
};
const findneighbours = {
    encode(obj) {
        return [obj.id, timestamp.encode(obj.timestamp)];
    },
    decode(payload) {
        return {
            id: payload[0],
            timestamp: timestamp.decode(payload[1]),
        };
    },
};
const neighbours = {
    encode(obj) {
        return [
            obj.peers.map((peer) => endpoint.encode(peer).concat(peer.id)),
            timestamp.encode(obj.timestamp),
        ];
    },
    decode(payload) {
        return {
            peers: payload[0].map((data) => {
                return { endpoint: endpoint.decode(data), id: data[3] }; // hack for id
            }),
            timestamp: timestamp.decode(payload[1]),
        };
    },
};
const messages = { ping, pong, findneighbours, neighbours };
const types = {
    byName: {
        ping: 0x01,
        pong: 0x02,
        findneighbours: 0x03,
        neighbours: 0x04,
    },
    byType: {
        0x01: 'ping',
        0x02: 'pong',
        0x03: 'findneighbours',
        0x04: 'neighbours',
    },
};
// [0, 32) data hash
// [32, 96) signature
// 96 recoveryId
// 97 type
// [98, length) data
function encode(typename, data, privateKey, common) {
    const type = types.byName[typename];
    if (type === undefined)
        throw new Error(`Invalid typename: ${typename}`);
    const encodedMsg = messages[typename].encode(data);
    const typedata = (0, util_1.concatBytes)(Uint8Array.from([type]), rlp_1.RLP.encode(encodedMsg));
    const sighash = (common?.customCrypto.keccak256 ?? keccak_js_1.keccak256)(typedata);
    const sig = (common?.customCrypto.ecdsaSign ?? secp256k1_compat_js_1.ecdsaSign)(sighash, privateKey);
    const hashdata = (0, util_1.concatBytes)(sig.signature, Uint8Array.from([sig.recid]), typedata);
    const hash = (common?.customCrypto.keccak256 ?? keccak_js_1.keccak256)(hashdata);
    return (0, util_1.concatBytes)(hash, hashdata);
}
exports.encode = encode;
function decode(bytes, common) {
    const hash = (common?.customCrypto.keccak256 ?? keccak_js_1.keccak256)(bytes.subarray(32));
    (0, util_js_1.assertEq)(bytes.subarray(0, 32), hash, 'Hash verification failed', debug);
    const typedata = bytes.subarray(97);
    const type = typedata[0];
    const typename = types.byType[type];
    if (typename === undefined)
        throw new Error(`Invalid type: ${type}`);
    const data = messages[typename].decode((0, util_js_1.unstrictDecode)(typedata.subarray(1)));
    const sighash = (common?.customCrypto.keccak256 ?? keccak_js_1.keccak256)(typedata);
    const signature = bytes.subarray(32, 96);
    const recoverId = bytes[96];
    const publicKey = (common?.customCrypto.ecdsaRecover ?? secp256k1_compat_js_1.ecdsaRecover)(signature, recoverId, sighash, false);
    return { typename, data, publicKey };
}
exports.decode = decode;
//# sourceMappingURL=message.js.map