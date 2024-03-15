import { RLP } from '@ethereumjs/rlp';
import { bigIntToBytes, bytesToHex, bytesToInt, bytesToUtf8, intToBytes, utf8ToBytes, } from '@ethereumjs/util';
import * as snappy from 'snappyjs';
import { DISCONNECT_REASON, ProtocolType } from '../types.js';
import { assertEq, formatLogData } from '../util.js';
import { Protocol } from './protocol.js';
export const DEFAULT_ANNOUNCE_TYPE = 1;
export class LES extends Protocol {
    constructor(version, peer, send) {
        super(peer, send, ProtocolType.LES, version, LES.MESSAGE_CODES);
        this._status = null;
        this._peerStatus = null;
        this._statusTimeoutId = setTimeout(() => {
            this._peer.disconnect(DISCONNECT_REASON.TIMEOUT);
        }, 5000); // 5 sec * 1000
        this.DEBUG =
            typeof window === 'undefined' ? process?.env?.DEBUG?.includes('ethjs') ?? false : false;
    }
    _handleMessage(code, data) {
        const payload = RLP.decode(data);
        if (code !== LES.MESSAGE_CODES.STATUS) {
            const logData = formatLogData(bytesToHex(data), this._verbose);
            if (this.DEBUG) {
                this.debug(this.getMsgPrefix(code), `${`Received ${this.getMsgPrefix(code)} message from ${this._peer._socket.remoteAddress}:${
                // @ts-ignore
                this._peer._socket.remotePort}`}: ${logData}`);
            }
        }
        switch (code) {
            case LES.MESSAGE_CODES.STATUS: {
                assertEq(this._peerStatus, null, 'Uncontrolled status message', this.debug.bind(this), 'STATUS');
                const status = Object.assign({});
                for (const value of payload) {
                    status[bytesToUtf8(value[0])] = value[1];
                }
                this._peerStatus = status;
                if (this.DEBUG) {
                    this.debug(this.getMsgPrefix(code), `${`Received ${this.getMsgPrefix(code)} message from ${
                    // @ts-ignore
                    this._peer._socket.remoteAddress
                    // @ts-ignore
                    }:${this._peer._socket.remotePort}`}: ${this._getStatusString(this._peerStatus)}`);
                }
                this._handleStatus();
                break;
            }
            case LES.MESSAGE_CODES.ANNOUNCE:
            case LES.MESSAGE_CODES.GET_BLOCK_HEADERS:
            case LES.MESSAGE_CODES.BLOCK_HEADERS:
            case LES.MESSAGE_CODES.GET_BLOCK_BODIES:
            case LES.MESSAGE_CODES.BLOCK_BODIES:
            case LES.MESSAGE_CODES.GET_RECEIPTS:
            case LES.MESSAGE_CODES.RECEIPTS:
            case LES.MESSAGE_CODES.GET_PROOFS:
            case LES.MESSAGE_CODES.PROOFS:
            case LES.MESSAGE_CODES.GET_CONTRACT_CODES:
            case LES.MESSAGE_CODES.CONTRACT_CODES:
            case LES.MESSAGE_CODES.GET_HEADER_PROOFS:
            case LES.MESSAGE_CODES.HEADER_PROOFS:
            case LES.MESSAGE_CODES.SEND_TX:
            case LES.MESSAGE_CODES.GET_PROOFS_V2:
            case LES.MESSAGE_CODES.PROOFS_V2:
            case LES.MESSAGE_CODES.GET_HELPER_TRIE_PROOFS:
            case LES.MESSAGE_CODES.HELPER_TRIE_PROOFS:
            case LES.MESSAGE_CODES.SEND_TX_V2:
            case LES.MESSAGE_CODES.GET_TX_STATUS:
            case LES.MESSAGE_CODES.TX_STATUS:
                if (this._version >= LES.les2.version)
                    break;
                return;
            case LES.MESSAGE_CODES.STOP_MSG:
            case LES.MESSAGE_CODES.RESUME_MSG:
                if (this._version >= LES.les3.version)
                    break;
                return;
            default:
                return;
        }
        this.events.emit('message', code, payload);
    }
    _handleStatus() {
        if (this._status === null || this._peerStatus === null)
            return;
        clearTimeout(this._statusTimeoutId);
        assertEq(this._status['protocolVersion'], this._peerStatus['protocolVersion'], 'Protocol version mismatch', this.debug.bind(this), 'STATUS');
        assertEq(this._status['networkId'], this._peerStatus['networkId'], 'NetworkId mismatch', this.debug.bind(this), 'STATUS');
        assertEq(this._status['genesisHash'], this._peerStatus['genesisHash'], 'Genesis block mismatch', this.debug.bind(this), 'STATUS');
        this.events.emit('status', this._peerStatus);
        if (this._firstPeer === '') {
            this._addFirstPeerDebugger();
        }
    }
    getVersion() {
        return this._version;
    }
    _getStatusString(status) {
        let sStr = `[V:${bytesToInt(status['protocolVersion'])}, `;
        sStr += `NID:${bytesToInt(status['networkId'])}, HTD:${bytesToInt(status['headTd'])}, `;
        sStr += `HeadH:${bytesToHex(status['headHash'])}, HeadN:${bytesToInt(status['headNum'])}, `;
        sStr += `GenH:${bytesToHex(status['genesisHash'])}`;
        if (status['serveHeaders'] !== undefined)
            sStr += `, serveHeaders active`;
        if (status['serveChainSince'] !== undefined)
            sStr += `, ServeCS: ${bytesToInt(status['serveChainSince'])}`;
        if (status['serveStateSince'] !== undefined)
            sStr += `, ServeSS: ${bytesToInt(status['serveStateSince'])}`;
        if (status['txRelay'] !== undefined)
            sStr += `, txRelay active`;
        if (status['flowControl/BL)'] !== undefined)
            sStr += `, flowControl/BL set`;
        if (status['flowControl/MRR)'] !== undefined)
            sStr += `, flowControl/MRR set`;
        if (status['flowControl/MRC)'] !== undefined)
            sStr += `, flowControl/MRC set`;
        if (status['forkID'] !== undefined)
            sStr += `, forkID: [crc32: ${bytesToHex(status['forkID'][0])}, nextFork: ${bytesToInt(status['forkID'][1])}]`;
        if (status['recentTxLookup'] !== undefined)
            sStr += `, recentTxLookup: ${bytesToInt(status['recentTxLookup'])}`;
        sStr += `]`;
        return sStr;
    }
    sendStatus(status) {
        if (this._status !== null)
            return;
        if (status.announceType === undefined) {
            status['announceType'] = intToBytes(DEFAULT_ANNOUNCE_TYPE);
        }
        status['protocolVersion'] = intToBytes(this._version);
        status['networkId'] = bigIntToBytes(this._peer.common.chainId());
        this._status = status;
        const statusList = [];
        for (const key of Object.keys(status)) {
            statusList.push([utf8ToBytes(key), status[key]]);
        }
        if (this.DEBUG) {
            this.debug('STATUS', 
            // @ts-ignore
            `Send STATUS message to ${this._peer._socket.remoteAddress}:${
            // @ts-ignore
            this._peer._socket.remotePort} (les${this._version}): ${this._getStatusString(this._status)}`);
        }
        let payload = RLP.encode(statusList);
        // Use snappy compression if peer supports DevP2P >=v5
        // @ts-ignore
        if (this._peer._hello !== null && this._peer._hello.protocolVersion >= 5) {
            payload = snappy.compress(payload);
        }
        this._send(LES.MESSAGE_CODES.STATUS, payload);
        this._handleStatus();
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
            this._peer._socket.remotePort}: ${formatLogData(bytesToHex(RLP.encode(payload)), this._verbose)}`);
        }
        switch (code) {
            case LES.MESSAGE_CODES.STATUS:
                throw new Error('Please send status message through .sendStatus');
            case LES.MESSAGE_CODES.ANNOUNCE: // LES/1
            case LES.MESSAGE_CODES.GET_BLOCK_HEADERS:
            case LES.MESSAGE_CODES.BLOCK_HEADERS:
            case LES.MESSAGE_CODES.GET_BLOCK_BODIES:
            case LES.MESSAGE_CODES.BLOCK_BODIES:
            case LES.MESSAGE_CODES.GET_RECEIPTS:
            case LES.MESSAGE_CODES.RECEIPTS:
            case LES.MESSAGE_CODES.GET_PROOFS:
            case LES.MESSAGE_CODES.PROOFS:
            case LES.MESSAGE_CODES.GET_CONTRACT_CODES:
            case LES.MESSAGE_CODES.CONTRACT_CODES:
            case LES.MESSAGE_CODES.GET_HEADER_PROOFS:
            case LES.MESSAGE_CODES.HEADER_PROOFS:
            case LES.MESSAGE_CODES.SEND_TX:
            case LES.MESSAGE_CODES.GET_PROOFS_V2: // LES/2
            case LES.MESSAGE_CODES.PROOFS_V2:
            case LES.MESSAGE_CODES.GET_HELPER_TRIE_PROOFS:
            case LES.MESSAGE_CODES.HELPER_TRIE_PROOFS:
            case LES.MESSAGE_CODES.SEND_TX_V2:
            case LES.MESSAGE_CODES.GET_TX_STATUS:
            case LES.MESSAGE_CODES.TX_STATUS:
                if (this._version >= LES.les2.version)
                    break;
                throw new Error(`Code ${code} not allowed with version ${this._version}`);
            case LES.MESSAGE_CODES.STOP_MSG:
            case LES.MESSAGE_CODES.RESUME_MSG:
                if (this._version >= LES.les3.version)
                    break;
                throw new Error(`Code ${code} not allowed with version ${this._version}`);
            default:
                throw new Error(`Unknown code ${code}`);
        }
        payload = RLP.encode(payload);
        // Use snappy compression if peer supports DevP2P >=v5
        // @ts-ignore
        if (this._peer._hello !== null && this._peer._hello.protocolVersion >= 5) {
            payload = snappy.compress(payload);
        }
        this._send(code, payload);
    }
    getMsgPrefix(msgCode) {
        return LES.MESSAGE_CODES[msgCode];
    }
}
LES.les2 = { name: 'les', version: 2, length: 21, constructor: LES };
LES.les3 = { name: 'les', version: 3, length: 23, constructor: LES };
LES.les4 = { name: 'les', version: 4, length: 23, constructor: LES };
(function (LES) {
    let MESSAGE_CODES;
    (function (MESSAGE_CODES) {
        // LES/1
        MESSAGE_CODES[MESSAGE_CODES["STATUS"] = 0] = "STATUS";
        MESSAGE_CODES[MESSAGE_CODES["ANNOUNCE"] = 1] = "ANNOUNCE";
        MESSAGE_CODES[MESSAGE_CODES["GET_BLOCK_HEADERS"] = 2] = "GET_BLOCK_HEADERS";
        MESSAGE_CODES[MESSAGE_CODES["BLOCK_HEADERS"] = 3] = "BLOCK_HEADERS";
        MESSAGE_CODES[MESSAGE_CODES["GET_BLOCK_BODIES"] = 4] = "GET_BLOCK_BODIES";
        MESSAGE_CODES[MESSAGE_CODES["BLOCK_BODIES"] = 5] = "BLOCK_BODIES";
        MESSAGE_CODES[MESSAGE_CODES["GET_RECEIPTS"] = 6] = "GET_RECEIPTS";
        MESSAGE_CODES[MESSAGE_CODES["RECEIPTS"] = 7] = "RECEIPTS";
        MESSAGE_CODES[MESSAGE_CODES["GET_PROOFS"] = 8] = "GET_PROOFS";
        MESSAGE_CODES[MESSAGE_CODES["PROOFS"] = 9] = "PROOFS";
        MESSAGE_CODES[MESSAGE_CODES["GET_CONTRACT_CODES"] = 10] = "GET_CONTRACT_CODES";
        MESSAGE_CODES[MESSAGE_CODES["CONTRACT_CODES"] = 11] = "CONTRACT_CODES";
        MESSAGE_CODES[MESSAGE_CODES["GET_HEADER_PROOFS"] = 13] = "GET_HEADER_PROOFS";
        MESSAGE_CODES[MESSAGE_CODES["HEADER_PROOFS"] = 14] = "HEADER_PROOFS";
        MESSAGE_CODES[MESSAGE_CODES["SEND_TX"] = 12] = "SEND_TX";
        // LES/2
        MESSAGE_CODES[MESSAGE_CODES["GET_PROOFS_V2"] = 15] = "GET_PROOFS_V2";
        MESSAGE_CODES[MESSAGE_CODES["PROOFS_V2"] = 16] = "PROOFS_V2";
        MESSAGE_CODES[MESSAGE_CODES["GET_HELPER_TRIE_PROOFS"] = 17] = "GET_HELPER_TRIE_PROOFS";
        MESSAGE_CODES[MESSAGE_CODES["HELPER_TRIE_PROOFS"] = 18] = "HELPER_TRIE_PROOFS";
        MESSAGE_CODES[MESSAGE_CODES["SEND_TX_V2"] = 19] = "SEND_TX_V2";
        MESSAGE_CODES[MESSAGE_CODES["GET_TX_STATUS"] = 20] = "GET_TX_STATUS";
        MESSAGE_CODES[MESSAGE_CODES["TX_STATUS"] = 21] = "TX_STATUS";
        // LES/3
        MESSAGE_CODES[MESSAGE_CODES["STOP_MSG"] = 22] = "STOP_MSG";
        MESSAGE_CODES[MESSAGE_CODES["RESUME_MSG"] = 23] = "RESUME_MSG";
    })(MESSAGE_CODES = LES.MESSAGE_CODES || (LES.MESSAGE_CODES = {}));
})(LES || (LES = {}));
//# sourceMappingURL=les.js.map