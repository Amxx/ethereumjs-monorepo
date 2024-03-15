"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SNAP = void 0;
const rlp_1 = require("@ethereumjs/rlp");
const util_1 = require("@ethereumjs/util");
const snappy = require("snappyjs");
const types_js_1 = require("../types.js");
const util_js_1 = require("../util.js");
const protocol_js_1 = require("./protocol.js");
class SNAP extends protocol_js_1.Protocol {
    constructor(version, peer, send) {
        super(peer, send, types_js_1.ProtocolType.SNAP, version, SNAP.MESSAGE_CODES);
        this.DEBUG =
            typeof window === 'undefined' ? process?.env?.DEBUG?.includes('ethjs') ?? false : false;
    }
    _handleMessage(code, data) {
        const payload = rlp_1.RLP.decode(data);
        // Note, this needs optimization, see issue #1882
        if (this.DEBUG) {
            this.debug(this.getMsgPrefix(code), 
            // @ts-ignore
            `Received ${this.getMsgPrefix(code)} message from ${this._peer._socket.remoteAddress}:${
            // @ts-ignore
            this._peer._socket.remotePort}: ${(0, util_js_1.formatLogData)((0, util_1.bytesToHex)(data), this._verbose)}`);
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
            this._peer._socket.remotePort}: ${(0, util_js_1.formatLogData)(rlp_1.utils.bytesToHex(rlp_1.RLP.encode(payload)), this._verbose)}`);
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
        payload = rlp_1.RLP.encode(payload);
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
exports.SNAP = SNAP;
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
})(SNAP = exports.SNAP || (exports.SNAP = {}));
//# sourceMappingURL=snap.js.map