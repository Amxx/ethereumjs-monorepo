import { RLP, utils } from '@ethereumjs/rlp';
import { bytesToHex } from '@ethereumjs/util';
import * as snappy from 'snappyjs';
import { ProtocolType } from '../types.js';
import { formatLogData } from '../util.js';
import { Protocol } from './protocol.js';
export class SNAP extends Protocol {
    constructor(version, peer, send) {
        super(peer, send, ProtocolType.SNAP, version, SNAP.MESSAGE_CODES);
        this.DEBUG =
            typeof window === 'undefined' ? process?.env?.DEBUG?.includes('ethjs') ?? false : false;
    }
    _handleMessage(code, data) {
        const payload = RLP.decode(data);
        // Note, this needs optimization, see issue #1882
        if (this.DEBUG) {
            this.debug(this.getMsgPrefix(code), 
            // @ts-ignore
            `Received ${this.getMsgPrefix(code)} message from ${this._peer._socket.remoteAddress}:${
            // @ts-ignore
            this._peer._socket.remotePort}: ${formatLogData(bytesToHex(data), this._verbose)}`);
        }
        switch (code) {
            case SNAP.MESSAGE_CODES.GET_ACCOUNT_RANGE:
            case SNAP.MESSAGE_CODES.ACCOUNT_RANGE:
            case SNAP.MESSAGE_CODES.GET_STORAGE_RANGES:
            case SNAP.MESSAGE_CODES.STORAGE_RANGES:
            case SNAP.MESSAGE_CODES.GET_BYTE_CODES:
            case SNAP.MESSAGE_CODES.BYTE_CODES:
            case SNAP.MESSAGE_CODES.GET_TRIE_NODES:
            case SNAP.MESSAGE_CODES.TRIE_NODES:
                break;
            default:
                return;
        }
        this.events.emit('message', code, payload);
    }
    sendStatus() {
        throw Error('SNAP protocol does not support status handshake');
    }
    /**
     *
     * @param code Message code
     * @param payload Payload (including reqId, e.g. `[1, [437000, 1, 0, 0]]`)
     */
    sendMessage(code, payload) {
        if (this.DEBUG) {
            this.debug(this.getMsgPrefix(code), 
            // @ts-ignore
            `Send ${this.getMsgPrefix(code)} message to ${this._peer._socket.remoteAddress}:${
            // @ts-ignore
            this._peer._socket.remotePort}: ${formatLogData(utils.bytesToHex(RLP.encode(payload)), this._verbose)}`);
        }
        switch (code) {
            case SNAP.MESSAGE_CODES.GET_ACCOUNT_RANGE:
            case SNAP.MESSAGE_CODES.ACCOUNT_RANGE:
            case SNAP.MESSAGE_CODES.GET_STORAGE_RANGES:
            case SNAP.MESSAGE_CODES.STORAGE_RANGES:
            case SNAP.MESSAGE_CODES.GET_BYTE_CODES:
            case SNAP.MESSAGE_CODES.BYTE_CODES:
            case SNAP.MESSAGE_CODES.GET_TRIE_NODES:
            case SNAP.MESSAGE_CODES.TRIE_NODES:
                break;
            default:
                throw new Error(`Unknown code ${code}`);
        }
        payload = RLP.encode(payload);
        // Use snappy compression if peer supports DevP2P >=v5
        // @ts-ignore
        const protocolVersion = this._peer._hello?.protocolVersion;
        if (protocolVersion !== undefined && protocolVersion >= 5) {
            payload = snappy.compress(payload);
        }
        this._send(code, payload);
    }
    getMsgPrefix(msgCode) {
        return SNAP.MESSAGE_CODES[msgCode];
    }
    getVersion() {
        return this._version;
    }
}
SNAP.snap = { name: 'snap', version: 1, length: 8, constructor: SNAP };
(function (SNAP) {
    let MESSAGE_CODES;
    (function (MESSAGE_CODES) {
        // snap1
        MESSAGE_CODES[MESSAGE_CODES["GET_ACCOUNT_RANGE"] = 0] = "GET_ACCOUNT_RANGE";
        MESSAGE_CODES[MESSAGE_CODES["ACCOUNT_RANGE"] = 1] = "ACCOUNT_RANGE";
        MESSAGE_CODES[MESSAGE_CODES["GET_STORAGE_RANGES"] = 2] = "GET_STORAGE_RANGES";
        MESSAGE_CODES[MESSAGE_CODES["STORAGE_RANGES"] = 3] = "STORAGE_RANGES";
        MESSAGE_CODES[MESSAGE_CODES["GET_BYTE_CODES"] = 4] = "GET_BYTE_CODES";
        MESSAGE_CODES[MESSAGE_CODES["BYTE_CODES"] = 5] = "BYTE_CODES";
        MESSAGE_CODES[MESSAGE_CODES["GET_TRIE_NODES"] = 6] = "GET_TRIE_NODES";
        MESSAGE_CODES[MESSAGE_CODES["TRIE_NODES"] = 7] = "TRIE_NODES";
    })(MESSAGE_CODES = SNAP.MESSAGE_CODES || (SNAP.MESSAGE_CODES = {}));
})(SNAP || (SNAP = {}));
//# sourceMappingURL=snap.js.map