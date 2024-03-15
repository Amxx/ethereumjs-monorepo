import { RLP } from '@ethereumjs/rlp';
import { bytesToHex, bytesToInt, bytesToUtf8, concatBytes, intToBytes } from '@ethereumjs/util';
import debugDefault from 'debug';
import { keccak256 } from 'ethereum-cryptography/keccak.js';
import { ecdsaRecover, ecdsaSign } from 'ethereum-cryptography/secp256k1-compat.js';
import { assertEq, ipToBytes, ipToString, isV4Format, isV6Format, unstrictDecode } from '../util.js';
const { debug: createDebugLogger } = debugDefault;
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
            throw new RangeError(`Invalid timestamp bytes :${bytesToHex(bytes)}`);
        return new DataView(bytes.buffer).getUint32(0);
    },
};
const address = {
    encode(value) {
        if (isV4Format(value))
            return ipToBytes(value);
        if (isV6Format(value))
            return ipToBytes(value);
        throw new Error(`Invalid address: ${value}`);
    },
    decode(bytes) {
        if (bytes.length === 4)
            return ipToString(bytes);
        if (bytes.length === 16)
            return ipToString(bytes);
        const str = bytesToUtf8(bytes);
        if (isV4Format(str) || isV6Format(str))
            return str;
        // also can be host, but skip it right now (because need async function for resolve)
        throw new Error(`Invalid address bytes: ${bytesToHex(bytes)}`);
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
        return bytesToInt(bytes);
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
            intToBytes(obj.version),
            endpoint.encode(obj.from),
            endpoint.encode(obj.to),
            timestamp.encode(obj.timestamp),
        ];
    },
    decode(payload) {
        return {
            version: bytesToInt(payload[0]),
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
export function encode(typename, data, privateKey, common) {
    const type = types.byName[typename];
    if (type === undefined)
        throw new Error(`Invalid typename: ${typename}`);
    const encodedMsg = messages[typename].encode(data);
    const typedata = concatBytes(Uint8Array.from([type]), RLP.encode(encodedMsg));
    const sighash = (common?.customCrypto.keccak256 ?? keccak256)(typedata);
    const sig = (common?.customCrypto.ecdsaSign ?? ecdsaSign)(sighash, privateKey);
    const hashdata = concatBytes(sig.signature, Uint8Array.from([sig.recid]), typedata);
    const hash = (common?.customCrypto.keccak256 ?? keccak256)(hashdata);
    return concatBytes(hash, hashdata);
}
export function decode(bytes, common) {
    const hash = (common?.customCrypto.keccak256 ?? keccak256)(bytes.subarray(32));
    assertEq(bytes.subarray(0, 32), hash, 'Hash verification failed', debug);
    const typedata = bytes.subarray(97);
    const type = typedata[0];
    const typename = types.byType[type];
    if (typename === undefined)
        throw new Error(`Invalid type: ${type}`);
    const data = messages[typename].decode(unstrictDecode(typedata.subarray(1)));
    const sighash = (common?.customCrypto.keccak256 ?? keccak256)(typedata);
    const signature = bytes.subarray(32, 96);
    const recoverId = bytes[96];
    const publicKey = (common?.customCrypto.ecdsaRecover ?? ecdsaRecover)(signature, recoverId, sighash, false);
    return { typename, data, publicKey };
}
//# sourceMappingURL=message.js.map