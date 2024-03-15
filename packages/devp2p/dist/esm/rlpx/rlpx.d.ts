/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import { EventEmitter } from 'events';
import { LRUCache } from 'lru-cache';
import * as net from 'net';
import { Peer } from './peer.js';
import type { DPT } from '../dpt/index.js';
import type { Capabilities, PeerInfo, RLPxOptions } from '../types.js';
import type { Common } from '@ethereumjs/common';
export declare class RLPx {
    events: EventEmitter;
    protected _privateKey: Uint8Array;
    readonly id: Uint8Array;
    private _debug;
    protected _timeout: number;
    protected _maxPeers: number;
    readonly clientId: Uint8Array;
    protected _remoteClientIdFilter?: string[];
    protected _capabilities: Capabilities[];
    protected _common: Common;
    protected _listenPort: number | null;
    protected _dpt: DPT | null;
    protected _peersLRU: LRUCache<string, boolean>;
    protected _peersQueue: {
        peer: PeerInfo;
        ts: number;
    }[];
    protected _server: net.Server | null;
    protected _peers: Map<string, net.Socket | Peer>;
    protected _refillIntervalId: NodeJS.Timeout;
    protected _refillIntervalSelectionCounter: number;
    protected _keccakFunction: (msg: Uint8Array) => Uint8Array;
    private DEBUG;
    constructor(privateKey: Uint8Array, options: RLPxOptions);
    listen(...args: any[]): void;
    destroy(...args: any[]): void;
    connect(peer: PeerInfo): Promise<void>;
    getPeers(): (net.Socket | Peer)[];
    disconnect(id: Uint8Array): void;
    _isAlive(): boolean;
    _isAliveCheck(): void;
    _getOpenSlots(): number;
    _getOpenQueueSlots(): number;
    _connectToPeer(peer: PeerInfo): void;
    _onConnect(socket: net.Socket, peerId: Uint8Array | null): void;
    _refillConnections(): void;
}
//# sourceMappingURL=rlpx.d.ts.map