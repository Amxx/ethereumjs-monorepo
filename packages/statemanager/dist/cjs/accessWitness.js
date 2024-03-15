"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeValue = exports.decodeAccessedState = exports.getTreeIndicesForCodeChunk = exports.getTreeIndexesForStorageSlot = exports.AccessWitness = exports.AccessedStateType = exports.MAIN_STORAGE_OFFSET = exports.VERKLE_NODE_WIDTH = exports.CODE_OFFSET = exports.HEADER_STORAGE_OFFSET = exports.CODE_SIZE_LEAF_KEY = exports.CODE_KECCAK_LEAF_KEY = exports.NONCE_LEAF_KEY = exports.BALANCE_LEAF_KEY = exports.VERSION_LEAF_KEY = void 0;
const util_1 = require("@ethereumjs/util");
const verkle_1 = require("@ethereumjs/verkle");
const debug_1 = require("debug");
const { debug: createDebugLogger } = debug_1.default;
const debug = createDebugLogger('statemanager:verkle:aw');
/**
 * Tree key constants.
 */
exports.VERSION_LEAF_KEY = (0, util_1.toBytes)(0);
exports.BALANCE_LEAF_KEY = (0, util_1.toBytes)(1);
exports.NONCE_LEAF_KEY = (0, util_1.toBytes)(2);
exports.CODE_KECCAK_LEAF_KEY = (0, util_1.toBytes)(3);
exports.CODE_SIZE_LEAF_KEY = (0, util_1.toBytes)(4);
exports.HEADER_STORAGE_OFFSET = 64;
exports.CODE_OFFSET = 128;
exports.VERKLE_NODE_WIDTH = 256;
// export const MAIN_STORAGE_OFFSET = BigInt(256) ** BigInt(31)
// incorrect value to match with kaustinen2 offset
exports.MAIN_STORAGE_OFFSET = BigInt(256) * BigInt(2) ** BigInt(31);
const WitnessBranchReadCost = BigInt(1900);
const WitnessChunkReadCost = BigInt(200);
const WitnessBranchWriteCost = BigInt(3000);
const WitnessChunkWriteCost = BigInt(500);
const WitnessChunkFillCost = BigInt(6200);
var AccessedStateType;
(function (AccessedStateType) {
    AccessedStateType["Version"] = "version";
    AccessedStateType["Balance"] = "balance";
    AccessedStateType["Nonce"] = "nonce";
    AccessedStateType["CodeHash"] = "codeHash";
    AccessedStateType["CodeSize"] = "codeSize";
    AccessedStateType["Code"] = "code";
    AccessedStateType["Storage"] = "storage";
})(AccessedStateType = exports.AccessedStateType || (exports.AccessedStateType = {}));
class AccessWitness {
    constructor(opts = {}) {
        this.stems = opts.stems ?? new Map();
        this.chunks = opts.chunks ?? new Map();
    }
    touchAndChargeProofOfAbsence(address) {
        let gas = util_1.BIGINT_0;
        gas += this.touchAddressOnReadAndComputeGas(address, 0, exports.VERSION_LEAF_KEY);
        gas += this.touchAddressOnReadAndComputeGas(address, 0, exports.BALANCE_LEAF_KEY);
        gas += this.touchAddressOnReadAndComputeGas(address, 0, exports.CODE_SIZE_LEAF_KEY);
        gas += this.touchAddressOnReadAndComputeGas(address, 0, exports.CODE_KECCAK_LEAF_KEY);
        gas += this.touchAddressOnReadAndComputeGas(address, 0, exports.NONCE_LEAF_KEY);
        return gas;
    }
    touchAndChargeMessageCall(address) {
        let gas = util_1.BIGINT_0;
        gas += this.touchAddressOnReadAndComputeGas(address, 0, exports.VERSION_LEAF_KEY);
        gas += this.touchAddressOnReadAndComputeGas(address, 0, exports.CODE_SIZE_LEAF_KEY);
        return gas;
    }
    touchAndChargeValueTransfer(caller, target) {
        let gas = util_1.BIGINT_0;
        gas += this.touchAddressOnWriteAndComputeGas(caller, 0, exports.BALANCE_LEAF_KEY);
        gas += this.touchAddressOnWriteAndComputeGas(target, 0, exports.BALANCE_LEAF_KEY);
        return gas;
    }
    touchAndChargeContractCreateInit(address, { sendsValue } = {}) {
        let gas = util_1.BIGINT_0;
        gas += this.touchAddressOnWriteAndComputeGas(address, 0, exports.VERSION_LEAF_KEY);
        gas += this.touchAddressOnWriteAndComputeGas(address, 0, exports.NONCE_LEAF_KEY);
        gas += this.touchAddressOnWriteAndComputeGas(address, 0, exports.CODE_KECCAK_LEAF_KEY);
        if (sendsValue === true) {
            gas += this.touchAddressOnWriteAndComputeGas(address, 0, exports.BALANCE_LEAF_KEY);
        }
        return gas;
    }
    touchAndChargeContractCreateCompleted(address) {
        let gas = util_1.BIGINT_0;
        gas += this.touchAddressOnWriteAndComputeGas(address, 0, exports.VERSION_LEAF_KEY);
        gas += this.touchAddressOnWriteAndComputeGas(address, 0, exports.BALANCE_LEAF_KEY);
        gas += this.touchAddressOnWriteAndComputeGas(address, 0, exports.CODE_SIZE_LEAF_KEY);
        gas += this.touchAddressOnWriteAndComputeGas(address, 0, exports.CODE_KECCAK_LEAF_KEY);
        gas += this.touchAddressOnWriteAndComputeGas(address, 0, exports.NONCE_LEAF_KEY);
        return gas;
    }
    touchTxOriginAndComputeGas(origin) {
        let gas = util_1.BIGINT_0;
        gas += this.touchAddressOnReadAndComputeGas(origin, 0, exports.VERSION_LEAF_KEY);
        gas += this.touchAddressOnReadAndComputeGas(origin, 0, exports.CODE_SIZE_LEAF_KEY);
        gas += this.touchAddressOnReadAndComputeGas(origin, 0, exports.CODE_KECCAK_LEAF_KEY);
        gas += this.touchAddressOnWriteAndComputeGas(origin, 0, exports.NONCE_LEAF_KEY);
        gas += this.touchAddressOnWriteAndComputeGas(origin, 0, exports.BALANCE_LEAF_KEY);
        return gas;
    }
    touchTxExistingAndComputeGas(target, { sendsValue } = {}) {
        let gas = util_1.BIGINT_0;
        gas += this.touchAddressOnReadAndComputeGas(target, 0, exports.VERSION_LEAF_KEY);
        gas += this.touchAddressOnReadAndComputeGas(target, 0, exports.CODE_SIZE_LEAF_KEY);
        gas += this.touchAddressOnReadAndComputeGas(target, 0, exports.CODE_KECCAK_LEAF_KEY);
        gas += this.touchAddressOnReadAndComputeGas(target, 0, exports.NONCE_LEAF_KEY);
        if (sendsValue === true) {
            gas += this.touchAddressOnWriteAndComputeGas(target, 0, exports.BALANCE_LEAF_KEY);
        }
        else {
            gas += this.touchAddressOnReadAndComputeGas(target, 0, exports.BALANCE_LEAF_KEY);
        }
        return gas;
    }
    touchCodeChunksRangeOnReadAndChargeGas(contact, startPc, endPc) {
        let gas = util_1.BIGINT_0;
        for (let chunkNum = Math.floor(startPc / 31); chunkNum <= Math.floor(endPc / 31); chunkNum++) {
            const { treeIndex, subIndex } = getTreeIndicesForCodeChunk(chunkNum);
            gas += this.touchAddressOnReadAndComputeGas(contact, treeIndex, subIndex);
        }
        return gas;
    }
    touchCodeChunksRangeOnWriteAndChargeGas(contact, startPc, endPc) {
        let gas = util_1.BIGINT_0;
        for (let chunkNum = Math.floor(startPc / 31); chunkNum <= Math.floor(endPc / 31); chunkNum++) {
            const { treeIndex, subIndex } = getTreeIndicesForCodeChunk(chunkNum);
            gas += this.touchAddressOnWriteAndComputeGas(contact, treeIndex, subIndex);
        }
        return gas;
    }
    touchAddressOnWriteAndComputeGas(address, treeIndex, subIndex) {
        return this.touchAddressAndChargeGas(address, treeIndex, subIndex, { isWrite: true });
    }
    touchAddressOnReadAndComputeGas(address, treeIndex, subIndex) {
        return this.touchAddressAndChargeGas(address, treeIndex, subIndex, { isWrite: false });
    }
    touchAddressAndChargeGas(address, treeIndex, subIndex, { isWrite }) {
        let gas = util_1.BIGINT_0;
        const { stemRead, stemWrite, chunkRead, chunkWrite, chunkFill } = this.touchAddress(address, treeIndex, subIndex, { isWrite });
        if (stemRead) {
            gas += WitnessBranchReadCost;
        }
        if (stemWrite) {
            gas += WitnessBranchWriteCost;
        }
        if (chunkRead) {
            gas += WitnessChunkReadCost;
        }
        if (chunkWrite) {
            gas += WitnessChunkWriteCost;
        }
        if (chunkFill) {
            gas += WitnessChunkFillCost;
        }
        debug(`touchAddressAndChargeGas=${gas} address=${address} treeIndex=${treeIndex} subIndex=${subIndex}`);
        return gas;
    }
    touchAddress(address, treeIndex, subIndex, { isWrite } = {}) {
        let stemRead = false, stemWrite = false, chunkRead = false, chunkWrite = false;
        // currently there are no gas charges for setting the chunk for the first time
        // i.e. no fill cost is charged right now
        const chunkFill = false;
        const accessedStemKey = (0, verkle_1.getStem)(address, treeIndex);
        const accessedStemHex = (0, util_1.bytesToHex)(accessedStemKey);
        let accessedStem = this.stems.get(accessedStemHex);
        if (accessedStem === undefined) {
            stemRead = true;
            accessedStem = { address, treeIndex };
            this.stems.set(accessedStemHex, accessedStem);
        }
        const accessedChunkKey = (0, verkle_1.getKey)(accessedStemKey, (0, util_1.toBytes)(subIndex));
        const accessedChunkKeyHex = (0, util_1.bytesToHex)(accessedChunkKey);
        let accessedChunk = this.chunks.get(accessedChunkKeyHex);
        if (accessedChunk === undefined) {
            chunkRead = true;
            accessedChunk = {};
            this.chunks.set(accessedChunkKeyHex, accessedChunk);
        }
        if (isWrite === true) {
            if (accessedStem.write !== true) {
                stemWrite = true;
                // this would also directly modify in the map
                accessedStem.write = true;
            }
            if (accessedChunk.write !== true) {
                chunkWrite = true;
                // this would also directly modify in the map
                accessedChunk.write = true;
            }
        }
        debug(`${accessedChunkKeyHex}: isWrite=${isWrite} for steamRead=${stemRead} stemWrite=${stemWrite} chunkRead=${chunkRead} chunkWrite=${chunkWrite} chunkFill=${chunkFill}`);
        return { stemRead, stemWrite, chunkRead, chunkWrite, chunkFill };
    }
    /**Create a shallow copy, could clone some caches in future for optimizations */
    shallowCopy() {
        return new AccessWitness();
    }
    merge(accessWitness) {
        for (const [chunkKey, chunkValue] of accessWitness.chunks.entries()) {
            const stemKey = chunkKey.slice(0, chunkKey.length - 2);
            const stem = accessWitness.stems.get(stemKey);
            if (stem === undefined) {
                throw Error(`Internal error: missing stem for the chunkKey=${chunkKey}`);
            }
            const thisStem = this.stems.get(stemKey);
            if (thisStem === undefined) {
                this.stems.set(stemKey, stem);
            }
            else {
                thisStem.write = thisStem.write !== true ? stem.write : true;
            }
            const thisChunk = this.chunks.get(chunkKey);
            if (thisChunk === undefined) {
                this.chunks.set(chunkKey, chunkValue);
            }
            else {
                thisChunk.write = thisChunk.write !== true ? chunkValue.write : true;
                thisChunk.fill = thisChunk.fill !== true ? thisChunk.fill : true;
            }
        }
    }
    *rawAccesses() {
        for (const chunkKey of this.chunks.keys()) {
            // drop the last byte
            const stemKey = chunkKey.slice(0, chunkKey.length - 2);
            const stem = this.stems.get(stemKey);
            if (stem === undefined) {
                throw Error(`Internal error: missing stem for the chunkKey=${chunkKey}`);
            }
            const { address, treeIndex } = stem;
            const chunkIndex = Number(`0x${chunkKey.slice(chunkKey.length - 2)}`);
            const accessedState = { address, treeIndex, chunkIndex, chunkKey };
            yield accessedState;
        }
    }
    *accesses() {
        for (const rawAccess of this.rawAccesses()) {
            const { address, treeIndex, chunkIndex, chunkKey } = rawAccess;
            const accessedState = decodeAccessedState(treeIndex, chunkIndex);
            yield { ...accessedState, address, chunkKey };
        }
    }
}
exports.AccessWitness = AccessWitness;
function getTreeIndexesForStorageSlot(storageKey) {
    let position;
    if (storageKey < exports.CODE_OFFSET - exports.HEADER_STORAGE_OFFSET) {
        position = BigInt(exports.HEADER_STORAGE_OFFSET) + storageKey;
    }
    else {
        position = exports.MAIN_STORAGE_OFFSET + storageKey;
    }
    const treeIndex = position / BigInt(exports.VERKLE_NODE_WIDTH);
    const subIndex = Number(position % BigInt(exports.VERKLE_NODE_WIDTH));
    return { treeIndex, subIndex };
}
exports.getTreeIndexesForStorageSlot = getTreeIndexesForStorageSlot;
function getTreeIndicesForCodeChunk(chunkId) {
    const treeIndex = Math.floor((exports.CODE_OFFSET + chunkId) / exports.VERKLE_NODE_WIDTH);
    const subIndex = (exports.CODE_OFFSET + chunkId) % exports.VERKLE_NODE_WIDTH;
    return { treeIndex, subIndex };
}
exports.getTreeIndicesForCodeChunk = getTreeIndicesForCodeChunk;
function decodeAccessedState(treeIndex, chunkIndex) {
    const position = BigInt(treeIndex) * BigInt(exports.VERKLE_NODE_WIDTH) + BigInt(chunkIndex);
    switch (position) {
        case BigInt(0):
            return { type: AccessedStateType.Version };
        case BigInt(1):
            return { type: AccessedStateType.Balance };
        case BigInt(2):
            return { type: AccessedStateType.Nonce };
        case BigInt(3):
            return { type: AccessedStateType.CodeHash };
        case BigInt(4):
            return { type: AccessedStateType.CodeSize };
        default:
            if (position < exports.HEADER_STORAGE_OFFSET) {
                throw Error(`No attribute yet stored >=5 and <${exports.HEADER_STORAGE_OFFSET}`);
            }
            if (position >= exports.HEADER_STORAGE_OFFSET && position < exports.CODE_OFFSET) {
                const slot = position - BigInt(exports.HEADER_STORAGE_OFFSET);
                return { type: AccessedStateType.Storage, slot };
            }
            else if (position >= exports.CODE_OFFSET && position < exports.MAIN_STORAGE_OFFSET) {
                const codeChunkIdx = Number(position) - exports.CODE_OFFSET;
                return { type: AccessedStateType.Code, codeOffset: codeChunkIdx * 31 };
            }
            else if (position >= exports.MAIN_STORAGE_OFFSET) {
                const slot = BigInt(position - exports.MAIN_STORAGE_OFFSET);
                return { type: AccessedStateType.Storage, slot };
            }
            else {
                throw Error(`Invalid treeIndex=${treeIndex} chunkIndex=${chunkIndex} for verkle tree access`);
            }
    }
}
exports.decodeAccessedState = decodeAccessedState;
function decodeValue(type, value) {
    if (value === null) {
        return '';
    }
    switch (type) {
        case AccessedStateType.Version:
        case AccessedStateType.Balance:
        case AccessedStateType.Nonce:
        case AccessedStateType.CodeSize: {
            const decodedValue = (0, util_1.bytesToBigInt)((0, util_1.hexToBytes)(value), true);
            return `${decodedValue}`;
        }
        case AccessedStateType.CodeHash:
        case AccessedStateType.Code:
        case AccessedStateType.Storage: {
            return value;
        }
    }
}
exports.decodeValue = decodeValue;
//# sourceMappingURL=accessWitness.js.map