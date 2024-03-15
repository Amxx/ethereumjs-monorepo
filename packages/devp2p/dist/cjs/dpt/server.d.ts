/// <reference types="node" />
/// <reference types="node" />
import { EventEmitter } from 'events';
import { LRUCache } from 'lru-cache';
import type { DPTServerOptions, PeerInfo } from '../types.js';
import type { DPT } from './dpt.js';
import type { Common } from '@ethereumjs/common';
import type { Socket as DgramSocket, RemoteInfo } from 'dgram';
export declare class Server {
    events: EventEmitter;
    protected _dpt: DPT;
    protected _privateKey: Uint8Array;
    protected _timeout: number;
    protected _endpoint: PeerInfo;
    protected _requests: Map<string, any>;
    protected _requestsCache: LRUCache<string, Promise<any>>;
    protected _socket: DgramSocket | null;
    private _debug;
    protected _common?: Common;
    private DEBUG;
    constructor(dpt: DPT, privateKey: Uint8Array, options: DPTServerOptions);
    bind(...args: any[]): void;
    destroy(...args: any[]): void;
    ping(peer: PeerInfo): Promise<any>;
    findneighbours(peer: PeerInfo, id: Uint8Array): void;
    _isAliveCheck(): void;
    _send(peer: PeerInfo, typename: string, data: any): Uint8Array;
    _handler(msg: Uint8Array, rinfo: RemoteInfo): void;
    /**
     * Debug message both on the generic as well as the
     * per-message debug logger
     * @param messageName Lower capital message name (e.g. `findneighbours`)
     * @param msg Message text to debug
     */
    private debug;
}
//# sourceMappingURL=server.d.ts.map