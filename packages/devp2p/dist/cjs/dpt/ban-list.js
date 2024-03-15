"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BanList = void 0;
const debug_1 = require("debug");
const lru_cache_1 = require("lru-cache");
const util_js_1 = require("../util.js");
const kbucket_js_1 = require("./kbucket.js");
const { debug: createDebugLogger } = debug_1.default;
const debug = createDebugLogger('devp2p:dpt:ban-list');
const verbose = createDebugLogger('verbose').enabled;
class BanList {
    constructor() {
        this._lru = new lru_cache_1.LRUCache({ max: 10000 });
        this.DEBUG =
            typeof window === 'undefined' ? process?.env?.DEBUG?.includes('ethjs') ?? false : false;
    }
    add(obj, maxAge) {
        for (const key of kbucket_js_1.KBucket.getKeys(obj)) {
            this._lru.set(key, true, { ttl: maxAge });
            if (this.DEBUG) {
                debug(`Added peer ${(0, util_js_1.formatLogId)(key, verbose)}, size: ${this._lru.size}`);
            }
        }
    }
    has(obj) {
        return kbucket_js_1.KBucket.getKeys(obj).some((key) => Boolean(this._lru.get(key)));
    }
}
exports.BanList = BanList;
//# sourceMappingURL=ban-list.js.map