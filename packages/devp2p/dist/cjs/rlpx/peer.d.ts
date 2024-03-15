/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import { EventEmitter } from 'events';
import { DISCONNECT_REASON } from '../types.js';
import { ECIES } from './ecies.js';
import type { Protocol } from '../protocol/protocol.js';
import type { Capabilities, PeerOptions } from '../types.js';
import type { Common } from '@ethereumjs/common';
import type { Socket } from 'net';
declare enum PREFIXES {
    HELLO = 0,
    DISCONNECT = 1,
    PING = 2,
    PONG = 3
}
declare type HelloMsg = {
    0: Uint8Array;
    1: Uint8Array;
    2: Uint8Array[][];
    3: Uint8Array;
    4: Uint8Array;
    length: 5;
};
interface ProtocolDescriptor {
    protocol: Protocol;
    offset: number;
    length?: number;
}
interface Hello {
    protocolVersion: number;
    clientId: string;
    capabilities: Capabilities[];
    port: number;
    id: Uint8Array;
}
export declare class Peer {
    events: EventEmitter;
    readonly clientId: Uint8Array;
    protected _capabilities?: Capabilities[];
    common: Common;
    protected _port: number;
    readonly id: Uint8Array;
    protected _remoteClientIdFilter?: string[];
    protected _remoteId: Uint8Array;
    protected _EIP8: Uint8Array | boolean;
    protected _eciesSession: ECIES;
    protected _state: string;
    protected _weHello: HelloMsg | null;
    protected _hello: Hello | null;
    protected _nextPacketSize: number;
    protected _socket: Socket;
    protected _socketData: Uint8Array;
    protected _pingIntervalId: NodeJS.Timeout | null;
    protected _pingTimeoutId: NodeJS.Timeout | null;
    protected _closed: boolean;
    protected _connected: boolean;
    protected _disconnectReason?: DISCONNECT_REASON;
    protected _disconnectWe: null | boolean;
    protected _pingTimeout: number;
    private _logger;
    private DEBUG;
    /**
     * Subprotocols (e.g. `ETH`) derived from the exchange on
     * capabilities
     */
    _protocols: ProtocolDescriptor[];
    constructor(options: PeerOptions);
    /**
     * Send AUTH message
     */
    _sendAuth(): void;
    /**
     * Send ACK message
     */
    _sendAck(): void;
    /**
     * Create message HEADER and BODY and send to socket
     * Also called from SubProtocol context
     * @param code
     * @param data
     */
    _sendMessage(code: number, data: Uint8Array): boolean | undefined;
    /**
     * Send HELLO message
     */
    _sendHello(): void;
    /**
     * Send DISCONNECT message
     * @param reason
     */
    _sendDisconnect(reason: DISCONNECT_REASON): void;
    /**
     * Send PING message
     */
    _sendPing(): void;
    /**
     * Send PONG message
     */
    _sendPong(): void;
    /**
     * AUTH message received
     */
    _handleAuth(): void;
    /**
     * ACK message received
     */
    _handleAck(): void;
    /**
     * HELLO message received
     */
    _handleHello(payload: any): void;
    /**
     * DISCONNECT message received
     * @param payload
     */
    _handleDisconnect(payload: any): void;
    /**
     * PING message received
     */
    _handlePing(): void;
    /**
     * PONG message received
     */
    _handlePong(): void;
    /**
     * Message handling, called from a SubProtocol context
     * @param code
     * @param msg
     */
    _handleMessage(code: PREFIXES, msg: Uint8Array): void;
    /**
     * Handle message header
     */
    _handleHeader(): void;
    /**
     * Handle message body
     */
    _handleBody(): void;
    /**
     * Process socket data
     * @param data
     */
    _onSocketData(data: Uint8Array): void;
    /**
     * React to socket being closed
     */
    _onSocketClose(): void;
    /**
     * Returns either a protocol object with a `protocol` parameter
     * reference to this Peer instance or to a subprotocol instance (e.g. `ETH`)
     * (depending on the `code` provided)
     */
    _getProtocol(code: number): ProtocolDescriptor | undefined;
    getId(): Uint8Array | null;
    getHelloMessage(): Hello | null;
    getProtocols(): Protocol[];
    getMsgPrefix(code: PREFIXES): string;
    getDisconnectPrefix(code: DISCONNECT_REASON): string;
    disconnect(reason?: DISCONNECT_REASON): void;
    /**
     * Called once from the subprotocol (e.g. `ETH`) on the peer
     * where a first successful `STATUS` msg exchange could be achieved.
     *
     * Can be used together with the `devp2p:FIRST_PEER` debugger.
     */
    _addFirstPeerDebugger(): void;
    /**
     * Debug message both on the generic as well as the
     * per-message debug logger
     * @param messageName Capitalized message name (e.g. `HELLO`)
     * @param msg Message text to debug
     * @param disconnectReason Capitalized disconnect reason (e.g. 'TIMEOUT')
     */
    private debug;
}
export {};
//# sourceMappingURL=peer.d.ts.map