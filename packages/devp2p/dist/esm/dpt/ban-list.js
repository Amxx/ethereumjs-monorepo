import debugDefault from 'debug';
import { LRUCache } from 'lru-cache';
import { formatLogId } from '../util.js';
import { KBucket } from './kbucket.js';
const { debug: createDebugLogger } = debugDefault;
const debug = createDebugLogger('devp2p:dpt:ban-list');
const verbose = createDebugLogger('verbose').enabled;
export class BanList {
    constructor() {
        this._lru = new LRUCache({ max: 10000 });
        this.DEBUG =
            typeof window === 'undefined' ? process?.env?.DEBUG?.includes('ethjs') ?? false : false;
    }
    add(obj, maxAge) {
        for (const key of KBucket.getKeys(obj)) {
            this._lru.set(key, true, { ttl: maxAge });
            if (this.DEBUG) {
                debug(`Added peer ${formatLogId(key, verbose)}, size: ${this._lru.size}`);
            }
        }
    }
    has(obj) {
        return KBucket.getKeys(obj).some((key) => Boolean(this._lru.get(key)));
    }
}
//# sourceMappingURL=ban-list.js.map