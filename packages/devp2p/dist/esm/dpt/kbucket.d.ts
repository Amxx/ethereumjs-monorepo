/// <reference types="node" />
import { EventEmitter } from 'events';
import { KBucket as _KBucket } from '../ext/index.js';
import type { PeerInfo } from '../types.js';
export declare class KBucket {
    events: EventEmitter;
    protected _peers: Map<string, PeerInfo>;
    protected _kbucket: _KBucket;
    constructor(localNodeId: Uint8Array);
    static getKeys(obj: Uint8Array | string | PeerInfo): string[];
    add(peer: PeerInfo): _KBucket | void;
    get(obj: Uint8Array | string | PeerInfo): PeerInfo | null;
    getAll(): Array<PeerInfo>;
    closest(id: Uint8Array): PeerInfo[];
    remove(obj: Uint8Array | string | PeerInfo): void;
}
//# sourceMappingURL=kbucket.d.ts.map