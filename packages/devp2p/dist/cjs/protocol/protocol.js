"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Protocol = void 0;
const debug_1 = require("debug");
const events_1 = require("events");
const types_js_1 = require("../types.js");
const util_js_1 = require("../util.js");
const { debug: createDebugLogger } = debug_1.default;
class Protocol {
    constructor(peer, send, protocol, version, messageCodes) {
        /**
         * Will be set to the first successfully connected peer to allow for
         * debugging with the `devp2p:FIRST_PEER` debugger
         */
        this._firstPeer = '';
        // Message debuggers (e.g. { 'GET_BLOCK_HEADERS': [debug Object], ...})
        this.msgDebuggers = {};
        this.events = new events_1.EventEmitter();
        this._peer = peer;
        this._send = send;
        this._version = version;
        this._messageCodes = messageCodes;
        this._statusTimeoutId =
            protocol !== types_js_1.ProtocolType.SNAP
                ? setTimeout(() => {
                    this._peer.disconnect(types_js_1.DISCONNECT_REASON.TIMEOUT);
                }, 5000) // 5 sec * 1000
                : undefined;
        this._debug = util_js_1.devp2pDebug.extend(protocol);
        this._verbose = createDebugLogger('verbose').enabled;
        this.initMsgDebuggers(protocol);
    }
    initMsgDebuggers(protocol) {
        const MESSAGE_NAMES = Object.values(this._messageCodes).filter((value) => typeof value === 'string');
        for (const name of MESSAGE_NAMES) {
            this.msgDebuggers[name] = util_js_1.devp2pDebug.extend(protocol).extend(name);
        }
        // Remote Peer IP logger
        // @ts-ignore
        const ip = this._peer._socket.remoteAddress;
        if (typeof ip === 'string') {
            this.msgDebuggers[ip] = util_js_1.devp2pDebug.extend(ip);
        }
    }
    /**
     * Called once on the peer where a first successful `STATUS`
     * msg exchange could be achieved.
     *
     * Can be used together with the `devp2p:FIRST_PEER` debugger.
     */
    _addFirstPeerDebugger() {
        // @ts-ignore
        const ip = this._peer._socket.remoteAddress;
        if (typeof ip === 'string') {
            this.msgDebuggers[ip] = util_js_1.devp2pDebug.extend('FIRST_PEER');
            this._peer._addFirstPeerDebugger();
            this._firstPeer = ip;
        }
    }
    /**
     * Debug message both on the generic as well as the
     * per-message debug logger
     * @param messageName Capitalized message name (e.g. `GET_BLOCK_HEADERS`)
     * @param msg Message text to debug
     */
    debug(messageName, msg) {
        this._debug(msg);
        if (this.msgDebuggers[messageName] !== undefined) {
            this.msgDebuggers[messageName](msg);
        }
        // @ts-ignore
        const ip = this._peer._socket.remoteAddress;
        if (typeof ip === 'string' && this.msgDebuggers[ip] !== undefined) {
            this.msgDebuggers[ip](msg);
        }
    }
}
exports.Protocol = Protocol;
//# sourceMappingURL=protocol.js.map