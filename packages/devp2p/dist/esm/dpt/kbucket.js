import { bytesToUnprefixedHex } from '@ethereumjs/util';
import { EventEmitter } from 'events';
import { KBucket as _KBucket } from '../ext/index.js';
const KBUCKET_SIZE = 16;
const KBUCKET_CONCURRENCY = 3;
export class KBucket {
    constructor(localNodeId) {
        this._peers = new Map();
        this.events = new EventEmitter();
        this._kbucket = new _KBucket({
            localNodeId,
            numberOfNodesPerKBucket: KBUCKET_SIZE,
            numberOfNodesToPing: KBUCKET_CONCURRENCY,
        });
        this._kbucket.events.on('added', (peer) => {
            for (const key of KBucket.getKeys(peer)) {
                this._peers.set(key, peer);
            }
            this.events.emit('added', peer);
        });
        this._kbucket.events.on('removed', (peer) => {
            for (const key of KBucket.getKeys(peer)) {
                this._peers.delete(key);
            }
            this.events.emit('removed', peer);
        });
        this._kbucket.events.on('ping', (oldPeers, newPeer) => {
            this.events.emit('ping', oldPeers, newPeer);
        });
    }
    static getKeys(obj) {
        if (obj instanceof Uint8Array)
            return [bytesToUnprefixedHex(obj)];
        if (typeof obj === 'string')
            return [obj];
        const keys = [];
        if (obj.id instanceof Uint8Array)
            keys.push(bytesToUnprefixedHex(obj.id));
        if (obj.address !== undefined && typeof obj.tcpPort === 'number')
            keys.push(`${obj.address}:${obj.tcpPort}`);
        return keys;
    }
    add(peer) {
        const isExists = KBucket.getKeys(peer).some((key) => this._peers.has(key));
        if (!isExists)
            this._kbucket.add(peer);
    }
    get(obj) {
        for (const key of KBucket.getKeys(obj)) {
            const peer = this._peers.get(key);
            if (peer !== undefined)
                return peer;
        }
        return null;
    }
    getAll() {
        return this._kbucket.toArray();
    }
    closest(id) {
        return this._kbucket.closest(id, KBUCKET_SIZE);
    }
    remove(obj) {
        const peer = this.get(obj);
        if (peer?.id !== undefined)
            this._kbucket.remove(peer.id);
    }
}
//# sourceMappingURL=kbucket.js.map