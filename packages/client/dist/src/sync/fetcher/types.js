"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInitFecherDoneFlags = void 0;
function getInitFecherDoneFlags() {
    return {
        done: false,
        syncing: false,
        accountFetcher: {
            started: false,
            // entire account range
            first: BigInt(0),
            done: false,
        },
        storageFetcher: {
            started: false,
            first: BigInt(0),
            count: BigInt(0),
            done: false,
        },
        byteCodeFetcher: {
            started: false,
            first: BigInt(0),
            count: BigInt(0),
            done: false,
        },
        trieNodeFetcher: {
            started: false,
            first: BigInt(0),
            count: BigInt(0),
            done: false,
        },
    };
}
exports.getInitFecherDoneFlags = getInitFecherDoneFlags;
//# sourceMappingURL=types.js.map