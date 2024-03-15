"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Peer = void 0;
const rlp_1 = require("@ethereumjs/rlp");
const util_1 = require("@ethereumjs/util");
const debug_1 = require("debug");
const events_1 = require("events");
const snappy = require("snappyjs");
const types_js_1 = require("../types.js");
const util_js_1 = require("../util.js");
const ecies_js_1 = require("./ecies.js");
const { debug: createDebugLogger } = debug_1.default;
const DEBUG_BASE_NAME = 'rlpx:peer';
const verbose = createDebugLogger('verbose').enabled;
const BASE_PROTOCOL_VERSION = 5;
const BASE_PROTOCOL_LENGTH = 16;
const PING_INTERVAL = 15000; // 15 sec * 1000
var PREFIXES;
(function (PREFIXES) {
    PREFIXES[PREFIXES["HELLO"] = 0] = "HELLO";
    PREFIXES[PREFIXES["DISCONNECT"] = 1] = "DISCONNECT";
    PREFIXES[PREFIXES["PING"] = 2] = "PING";
    PREFIXES[PREFIXES["PONG"] = 3] = "PONG";
})(PREFIXES || (PREFIXES = {}));
class Peer {
    constructor(options) {
        this.events = new events_1.EventEmitter();
        // hello data
        this.clientId = options.clientId;
        this._capabilities = options.capabilities;
        this.common = options.common;
        this._port = options.port;
        this.id = options.id;
        this._remoteClientIdFilter = options.remoteClientIdFilter;
        // ECIES session
        this._remoteId = options.remoteId;
        this._EIP8 = options.EIP8 ?? true;
        this._eciesSession = new ecies_js_1.ECIES(options.privateKey, this.id, this._remoteId, this.common);
        // Auth, Ack, Header, Body
        this._state = 'Auth';
        this._weHello = null;
        this._hello = null;
        this._nextPacketSize = 307;
        // socket
        this._socket = options.socket;
        this._socketData = new Uint8Array();
        this._socket.on('data', this._onSocketData.bind(this));
        this._socket.on('error', (err) => this.events.emit('error', err));
        this._socket.once('close', this._onSocketClose.bind(this));
        this._logger =
            this._socket.remoteAddress !== undefined
                ? util_js_1.devp2pDebug.extend(this._socket.remoteAddress).extend(DEBUG_BASE_NAME)
                : util_js_1.devp2pDebug.extend(DEBUG_BASE_NAME);
        this._connected = false;
        this._closed = false;
        this._disconnectWe = null;
        this._pingIntervalId = null;
        this._pingTimeout = options.timeout;
        this._pingTimeoutId = null;
        // sub-protocols
        this._protocols = [];
        // send AUTH if outgoing connection
        if (this._remoteId !== null) {
            this._sendAuth();
        }
        this.DEBUG =
            typeof window === 'undefined' ? process?.env?.DEBUG?.includes('ethjs') ?? false : false;
    }
    /**
     * Send AUTH message
     */
    _sendAuth() {
        if (this._closed)
            return;
        this._logger(`Send auth (EIP8: ${this._EIP8}) to ${this._socket.remoteAddress}:${this._socket.remotePort}`);
        if (this._EIP8 === true) {
            const authEIP8 = this._eciesSession.createAuthEIP8();
            if (!authEIP8)
                return;
            this._socket.write(authEIP8);
        }
        else {
            const authNonEIP8 = this._eciesSession.createAuthNonEIP8();
            if (!authNonEIP8)
                return;
            this._socket.write(authNonEIP8);
        }
        this._state = 'Ack';
        this._nextPacketSize = 210;
    }
    /**
     * Send ACK message
     */
    _sendAck() {
        if (this._closed)
            return;
        this._logger(
        // @ts-ignore
        `Send ack (EIP8: ${this._eciesSession._gotEIP8Auth}) to ${this._socket.remoteAddress}:${this._socket.remotePort}`);
        // @ts-ignore
        if (this._eciesSession._gotEIP8Auth) {
            const ackEIP8 = this._eciesSession.createAckEIP8();
            if (!ackEIP8)
                return;
            this._socket.write(ackEIP8);
        }
        else {
            const ackOld = this._eciesSession.createAckOld();
            if (!ackOld)
                return;
            this._socket.write(ackOld);
        }
        this._state = 'Header';
        this._nextPacketSize = 32;
        this._sendHello();
    }
    /**
     * Create message HEADER and BODY and send to socket
     * Also called from SubProtocol context
     * @param code
     * @param data
     */
    _sendMessage(code, data) {
        if (this._closed)
            return false;
        const msg = (0, util_1.concatBytes)(rlp_1.RLP.encode(code), data);
        const header = this._eciesSession.createHeader(msg.length);
        if (!header || this._socket.destroyed)
            return;
        this._socket.write(header);
        const body = this._eciesSession.createBody(msg);
        // this._socket.destroyed added here and above to safeguard against
        // occasional "Cannot call write after a stream was destroyed" errors.
        // Eventually this can be caught earlier down the line.
        if (!body || this._socket.destroyed)
            return;
        this._socket.write(body);
        return true;
    }
    /**
     * Send HELLO message
     */
    _sendHello() {
        if (this.DEBUG) {
            this.debug('HELLO', `Send HELLO to ${this._socket.remoteAddress}:${this._socket.remotePort}  protocolVersion=${BASE_PROTOCOL_VERSION} capabilities=${(this._capabilities ?? [])
                // Filter out snap because we can't yet provide snap endpoints to the peers
                // TODO: Remove when we can also serve snap requests from other peers
                .filter((c) => c.name !== 'snap')
                .map((c) => `${c.name}${c.version}`)
                .join(',')} clientId=${(0, util_1.bytesToUtf8)(this.clientId)}`);
        }
        const payload = [
            (0, util_1.intToBytes)(BASE_PROTOCOL_VERSION),
            this.clientId,
            this._capabilities.map((c) => [(0, util_1.utf8ToBytes)(c.name), (0, util_1.intToBytes)(c.version)]),
            this._port === null ? new Uint8Array(0) : (0, util_1.intToBytes)(this._port),
            this.id,
        ];
        if (!this._closed) {
            if (this._sendMessage(PREFIXES.HELLO, rlp_1.RLP.encode(payload)) === true) {
                this._weHello = payload;
            }
            if (this._hello) {
                this.events.emit('connect');
            }
        }
    }
    /**
     * Send DISCONNECT message
     * @param reason
     */
    _sendDisconnect(reason) {
        const reasonName = this.getDisconnectPrefix(reason);
        if (this.DEBUG) {
            this.debug('DISCONNECT', `Send DISCONNECT to ${this._socket.remoteAddress}:${this._socket.remotePort} (reason: ${reasonName})`, reasonName);
        }
        const data = rlp_1.RLP.encode(reason);
        if (this._sendMessage(PREFIXES.DISCONNECT, data) !== true)
            return;
        this._disconnectReason = reason;
        this._disconnectWe = true;
        this._closed = true;
        setTimeout(() => this._socket.end(), 2000); // 2 sec * 1000
    }
    /**
     * Send PING message
     */
    _sendPing() {
        if (this.DEBUG) {
            this.debug('PING', `Send PING to ${this._socket.remoteAddress}:${this._socket.remotePort}`);
        }
        let data = rlp_1.RLP.encode([]);
        if (this._hello !== null && this._hello.protocolVersion >= 5) {
            data = snappy.compress(data);
        }
        if (this._sendMessage(PREFIXES.PING, data) !== true)
            return;
        clearTimeout(this._pingTimeoutId);
        this._pingTimeoutId = setTimeout(() => {
            this.disconnect(types_js_1.DISCONNECT_REASON.TIMEOUT);
        }, this._pingTimeout);
    }
    /**
     * Send PONG message
     */
    _sendPong() {
        if (this.DEBUG) {
            this.debug('PONG', `Send PONG to ${this._socket.remoteAddress}:${this._socket.remotePort}`);
        }
        let data = rlp_1.RLP.encode([]);
        if (this._hello !== null && this._hello.protocolVersion >= 5) {
            data = snappy.compress(data);
        }
        this._sendMessage(PREFIXES.PONG, data);
    }
    /**
     * AUTH message received
     */
    _handleAuth() {
        const bytesCount = this._nextPacketSize;
        const parseData = this._socketData.subarray(0, bytesCount);
        // @ts-ignore
        if (!this._eciesSession._gotEIP8Auth) {
            if (parseData.subarray(0, 1) === (0, util_1.hexToBytes)('0x04')) {
                this._eciesSession.parseAuthPlain(parseData);
            }
            else {
                // @ts-ignore
                this._eciesSession._gotEIP8Auth = true;
                this._nextPacketSize = (0, util_1.bytesToInt)(this._socketData.subarray(0, 2)) + 2;
                return;
            }
        }
        else {
            this._eciesSession.parseAuthEIP8(parseData);
        }
        this._state = 'Header';
        this._nextPacketSize = 32;
        process.nextTick(() => this._sendAck());
        this._socketData = this._socketData.subarray(bytesCount);
    }
    /**
     * ACK message received
     */
    _handleAck() {
        const bytesCount = this._nextPacketSize;
        const parseData = this._socketData.subarray(0, bytesCount);
        // @ts-ignore
        if (!this._eciesSession._gotEIP8Ack) {
            if (parseData.subarray(0, 1) === (0, util_1.hexToBytes)('0x04')) {
                this._eciesSession.parseAckPlain(parseData);
                this._logger(`Received ack (old format) from ${this._socket.remoteAddress}:${this._socket.remotePort}`);
            }
            else {
                // @ts-ignore
                this._eciesSession._gotEIP8Ack = true;
                this._nextPacketSize = (0, util_1.bytesToInt)(this._socketData.subarray(0, 2)) + 2;
                return;
            }
        }
        else {
            this._eciesSession.parseAckEIP8(parseData);
            this._logger(`Received ack (EIP8) from ${this._socket.remoteAddress}:${this._socket.remotePort}`);
        }
        this._state = 'Header';
        this._nextPacketSize = 32;
        process.nextTick(() => this._sendHello());
        this._socketData = this._socketData.subarray(bytesCount);
    }
    /**
     * HELLO message received
     */
    _handleHello(payload) {
        this._hello = {
            protocolVersion: (0, util_1.bytesToInt)(payload[0]),
            clientId: (0, util_1.bytesToUtf8)(payload[1]),
            capabilities: payload[2].map((item) => {
                return { name: (0, util_1.bytesToUtf8)(item[0]), version: (0, util_1.bytesToInt)(item[1]) };
            }),
            port: (0, util_1.bytesToInt)(payload[3]),
            id: payload[4],
        };
        if (this.DEBUG) {
            this.debug('HELLO', `Received HELLO ${this._socket.remoteAddress}:${this._socket.remotePort} protocolVersion=${this._hello.protocolVersion} capabilities=${(this._hello.capabilities ?? [])
                .map((c) => `${c.name}${c.version}`)
                .join(',')} clientId=${this._hello.clientId}`);
        }
        if (this._remoteId === null) {
            this._remoteId = this._hello.id;
        }
        else if (!(0, util_1.equalsBytes)(this._remoteId, this._hello.id)) {
            return this.disconnect(types_js_1.DISCONNECT_REASON.INVALID_IDENTITY);
        }
        if (this._remoteClientIdFilter !== undefined) {
            for (const filterStr of this._remoteClientIdFilter) {
                if (this._hello.clientId.toLowerCase().includes(filterStr.toLowerCase())) {
                    return this.disconnect(types_js_1.DISCONNECT_REASON.USELESS_PEER);
                }
            }
        }
        const shared = {};
        for (const item of this._hello.capabilities) {
            for (const c of this._capabilities) {
                if (c.name !== item.name || c.version !== item.version)
                    continue;
                if (shared[c.name] !== undefined && shared[c.name].version > c.version)
                    continue;
                shared[c.name] = c;
            }
        }
        let offset = BASE_PROTOCOL_LENGTH;
        this._protocols = Object.keys(shared)
            .map((key) => shared[key])
            .sort((obj1, obj2) => (obj1.name < obj2.name ? -1 : 1))
            .map((obj) => {
            const _offset = offset;
            offset += obj.length;
            // The send method handed over to the subprotocol object (e.g. an `ETH` instance).
            // The subprotocol is then calling into the lower level method
            // (e.g. `ETH` calling into `Peer._sendMessage()`).
            const sendMethod = (code, data) => {
                if (code > obj.length)
                    throw new Error('Code out of range');
                this._sendMessage(_offset + code, data);
            };
            // Dynamically instantiate the subprotocol object
            // from the constructor
            const SubProtocol = obj.constructor;
            const protocol = new SubProtocol(obj.version, this, sendMethod);
            return { protocol, offset: _offset, length: obj.length };
        });
        if (this._protocols.length === 0) {
            return this.disconnect(types_js_1.DISCONNECT_REASON.USELESS_PEER);
        }
        this._connected = true;
        this._pingIntervalId = setInterval(() => this._sendPing(), PING_INTERVAL);
        if (this._weHello) {
            this.events.emit('connect');
        }
    }
    /**
     * DISCONNECT message received
     * @param payload
     */
    _handleDisconnect(payload) {
        this._closed = true;
        // When `payload` is from rlpx it is `Uint8Array` and when from subprotocol it is `[Uint8Array]`
        this._disconnectReason =
            payload instanceof Uint8Array
                ? (0, util_1.bytesToInt)(payload)
                : (0, util_1.bytesToInt)(payload[0] ?? Uint8Array.from([0]));
        if (this.DEBUG) {
            this.debug('DISCONNECT', `DISCONNECT reason: ${types_js_1.DISCONNECT_REASON[this._disconnectReason]} ${this._socket.remoteAddress}:${this._socket.remotePort}`, types_js_1.DISCONNECT_REASON[this._disconnectReason]);
        }
        this._disconnectWe = false;
        this._socket.end();
    }
    /**
     * PING message received
     */
    _handlePing() {
        this._sendPong();
    }
    /**
     * PONG message received
     */
    _handlePong() {
        clearTimeout(this._pingTimeoutId);
    }
    /**
     * Message handling, called from a SubProtocol context
     * @param code
     * @param msg
     */
    _handleMessage(code, msg) {
        switch (code) {
            case PREFIXES.HELLO:
                this._handleHello(msg);
                break;
            case PREFIXES.DISCONNECT:
                this._handleDisconnect(msg);
                break;
            case PREFIXES.PING:
                this._handlePing();
                break;
            case PREFIXES.PONG:
                this._handlePong();
                break;
        }
    }
    /**
     * Handle message header
     */
    _handleHeader() {
        const bytesCount = this._nextPacketSize;
        const parseData = this._socketData.subarray(0, bytesCount);
        this._logger(`Received header ${this._socket.remoteAddress}:${this._socket.remotePort}`);
        const size = this._eciesSession.parseHeader(parseData);
        if (size === undefined) {
            this._logger('invalid header size!');
            return;
        }
        this._state = 'Body';
        this._nextPacketSize = size + 16;
        if (size % 16 > 0)
            this._nextPacketSize += 16 - (size % 16);
        this._socketData = this._socketData.subarray(bytesCount);
    }
    /**
     * Handle message body
     */
    _handleBody() {
        const bytesCount = this._nextPacketSize;
        const parseData = this._socketData.subarray(0, bytesCount);
        const body = this._eciesSession.parseBody(parseData);
        if (!body) {
            this._logger('empty body!');
            return;
        }
        this._logger(`Received body ${this._socket.remoteAddress}:${this._socket.remotePort} ${(0, util_js_1.formatLogData)((0, util_1.bytesToHex)(body), verbose)}`);
        this._state = 'Header';
        this._nextPacketSize = 32;
        // RLP hack
        let code = body[0];
        if (code === 0x80)
            code = 0;
        if (code !== PREFIXES.HELLO && code !== PREFIXES.DISCONNECT && this._hello === null) {
            return this.disconnect(types_js_1.DISCONNECT_REASON.PROTOCOL_ERROR);
        }
        // Protocol object referencing either this Peer object or the
        // underlying subprotocol (e.g. `ETH`)
        const protocolObj = this._getProtocol(code);
        if (protocolObj === undefined)
            return this.disconnect(types_js_1.DISCONNECT_REASON.PROTOCOL_ERROR);
        const msgCode = code - protocolObj.offset;
        const protocolName = protocolObj.protocol.constructor.name;
        const postAdd = `(code: ${code} - ${protocolObj.offset} = ${msgCode}) ${this._socket.remoteAddress}:${this._socket.remotePort}`;
        if (protocolName === 'Peer') {
            const messageName = this.getMsgPrefix(msgCode);
            if (this.DEBUG) {
                this.debug(messageName, `Received ${messageName} message ${postAdd}`);
            }
        }
        else {
            this._logger(`Received ${protocolName} subprotocol message ${postAdd}`);
        }
        try {
            let payload = body.subarray(1);
            // Use snappy uncompression if peer supports DevP2P >=v5
            let compressed = false;
            const origPayload = payload;
            if (this._hello !== null && this._hello.protocolVersion >= 5) {
                payload = snappy.uncompress(payload);
                compressed = true;
            }
            // Hotfix, 2021-09-21
            // For a DISCONNECT message received it is often hard to
            // decide if received within or outside the scope of the
            // protocol handshake (both can happen).
            //
            // This lead to problems with unjustifiedly applying
            // the snappy compression which subsequently breaks the
            // RLP decoding.
            //
            // This is fixed by this hotfix by re-trying with the
            // respective compressed/non-compressed payload.
            //
            // Note: there might be a cleaner solution to apply here.
            //
            if (protocolName === 'Peer') {
                try {
                    payload = rlp_1.RLP.decode(payload);
                }
                catch (e) {
                    if (msgCode === PREFIXES.DISCONNECT) {
                        if (compressed) {
                            payload = rlp_1.RLP.decode(origPayload);
                        }
                        else {
                            payload = rlp_1.RLP.decode(snappy.uncompress(payload));
                        }
                    }
                    else {
                        throw new Error(e);
                    }
                }
            }
            protocolObj.protocol._handleMessage?.(msgCode, payload);
        }
        catch (err) {
            this.disconnect(types_js_1.DISCONNECT_REASON.SUBPROTOCOL_ERROR);
            this._logger(`Error on peer subprotocol message handling: ${err}`);
            this.events.emit('error', err);
        }
        this._socketData = this._socketData.subarray(bytesCount);
    }
    /**
     * Process socket data
     * @param data
     */
    _onSocketData(data) {
        if (this._closed)
            return;
        this._socketData = (0, util_1.concatBytes)(this._socketData, data);
        try {
            while (this._socketData.length >= this._nextPacketSize) {
                switch (this._state) {
                    case 'Auth':
                        this._handleAuth();
                        break;
                    case 'Ack':
                        this._handleAck();
                        break;
                    case 'Header':
                        this._handleHeader();
                        break;
                    case 'Body':
                        this._handleBody();
                        break;
                }
            }
        }
        catch (err) {
            this.disconnect(types_js_1.DISCONNECT_REASON.SUBPROTOCOL_ERROR);
            this._logger(`Error on peer socket data handling: ${err}`);
            this.events.emit('error', err);
        }
    }
    /**
     * React to socket being closed
     */
    _onSocketClose() {
        clearInterval(this._pingIntervalId);
        clearTimeout(this._pingTimeoutId);
        this._closed = true;
        if (this._connected)
            this.events.emit('close', this._disconnectReason, this._disconnectWe);
    }
    /**
     * Returns either a protocol object with a `protocol` parameter
     * reference to this Peer instance or to a subprotocol instance (e.g. `ETH`)
     * (depending on the `code` provided)
     */
    _getProtocol(code) {
        if (code < BASE_PROTOCOL_LENGTH)
            return { protocol: this, offset: 0 };
        for (const obj of this._protocols) {
            if (code >= obj.offset && code < obj.offset + obj.length)
                return obj;
        }
    }
    getId() {
        if (this._remoteId === null)
            return null;
        return this._remoteId;
    }
    getHelloMessage() {
        return this._hello;
    }
    getProtocols() {
        return this._protocols.map((obj) => obj.protocol);
    }
    getMsgPrefix(code) {
        return PREFIXES[code];
    }
    getDisconnectPrefix(code) {
        return types_js_1.DISCONNECT_REASON[code];
    }
    disconnect(reason = types_js_1.DISCONNECT_REASON.DISCONNECT_REQUESTED) {
        this._sendDisconnect(reason);
    }
    /**
     * Called once from the subprotocol (e.g. `ETH`) on the peer
     * where a first successful `STATUS` msg exchange could be achieved.
     *
     * Can be used together with the `devp2p:FIRST_PEER` debugger.
     */
    _addFirstPeerDebugger() {
        const ip = this._socket.remoteAddress;
        if (typeof ip === 'string') {
            this._logger = util_js_1.devp2pDebug.extend(ip).extend(`FIRST_PEER`).extend(DEBUG_BASE_NAME);
        }
    }
    /**
     * Debug message both on the generic as well as the
     * per-message debug logger
     * @param messageName Capitalized message name (e.g. `HELLO`)
     * @param msg Message text to debug
     * @param disconnectReason Capitalized disconnect reason (e.g. 'TIMEOUT')
     */
    debug(messageName, msg, disconnectReason) {
        if (disconnectReason !== undefined) {
            this._logger.extend(messageName).extend(disconnectReason)(msg);
        }
        else {
            this._logger.extend(messageName)(msg);
        }
    }
}
exports.Peer = Peer;
//# sourceMappingURL=peer.js.map