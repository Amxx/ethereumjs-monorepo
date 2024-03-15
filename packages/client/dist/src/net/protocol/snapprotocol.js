"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnapProtocol = void 0;
const util_1 = require("@ethereumjs/util");
const protocol_1 = require("./protocol");
/**
 * Implements snap/1 protocol
 * @memberof module:net/protocol
 */
class SnapProtocol extends protocol_1.Protocol {
    /**
     * Create snap protocol
     */
    constructor(options) {
        super(options);
        this.nextReqId = util_1.BIGINT_0;
        /* eslint-disable no-invalid-this */
        this.protocolMessages = [
            {
                name: 'GetAccountRange',
                code: 0x00,
                response: 0x01,
                // [reqID: P, rootHash: B_32, startingHash: B_32, limitHash: B_32, responseBytes: P]
                encode: ({ reqId, root, origin, limit, bytes }) => {
                    return [
                        (0, util_1.bigIntToUnpaddedBytes)(reqId ?? ++this.nextReqId),
                        (0, util_1.setLengthLeft)(root, 32),
                        (0, util_1.setLengthLeft)(origin, 32),
                        (0, util_1.setLengthLeft)(limit, 32),
                        (0, util_1.bigIntToUnpaddedBytes)(bytes),
                    ];
                },
                decode: ([reqId, root, origin, limit, bytes]) => {
                    return {
                        reqId: (0, util_1.bytesToBigInt)(reqId),
                        root,
                        origin,
                        limit,
                        bytes: (0, util_1.bytesToBigInt)(bytes),
                    };
                },
            },
            {
                name: 'AccountRange',
                code: 0x01,
                // [reqID: P, accounts: [[accHash: B_32, accBody: B], ...], proof: [node_1: B, node_2, ...]]
                encode: ({ reqId, accounts, proof, }) => {
                    return [
                        (0, util_1.bigIntToUnpaddedBytes)(reqId ?? ++this.nextReqId),
                        accounts.map((account) => [
                            (0, util_1.setLengthLeft)(account.hash, 32),
                            (0, util_1.accountBodyToSlim)(account.body),
                        ]),
                        proof,
                    ];
                },
                decode: ([reqId, accounts, proof]) => {
                    return {
                        reqId: (0, util_1.bytesToBigInt)(reqId),
                        accounts: accounts.map(([hash, body]) => ({
                            hash,
                            body: this.convertSlimBody === true ? (0, util_1.accountBodyFromSlim)(body) : body,
                        })),
                        proof,
                    };
                },
            },
            {
                name: 'GetStorageRanges',
                code: 0x02,
                response: 0x03,
                // [reqID: P, rootHash: B_32, accountHashes: [B_32], startingHash: B, limitHash: B, responseBytes: P]
                encode: ({ reqId, root, accounts, origin, limit, bytes }) => {
                    return [
                        (0, util_1.bigIntToUnpaddedBytes)(reqId ?? ++this.nextReqId),
                        (0, util_1.setLengthLeft)(root, 32),
                        accounts.map((acc) => (0, util_1.setLengthLeft)(acc, 32)),
                        origin,
                        limit,
                        (0, util_1.bigIntToUnpaddedBytes)(bytes),
                    ];
                },
                decode: ([reqId, root, accounts, origin, limit, bytes]) => {
                    return {
                        reqId: (0, util_1.bytesToBigInt)(reqId),
                        root,
                        accounts,
                        origin,
                        limit,
                        bytes: (0, util_1.bytesToBigInt)(bytes),
                    };
                },
            },
            {
                name: 'StorageRanges',
                code: 0x03,
                // [reqID: P, slots: [[[slotHash: B_32, slotData: B], ...], ...], proof: [node_1: B, node_2, ...]]
                encode: ({ reqId, slots, proof, }) => {
                    return [
                        (0, util_1.bigIntToUnpaddedBytes)(reqId ?? ++this.nextReqId),
                        slots.map((accSlots) => accSlots.map((slotData) => [(0, util_1.setLengthLeft)(slotData.hash, 32), slotData.body])),
                        proof,
                    ];
                },
                decode: ([reqId, slots, proof]) => {
                    return {
                        reqId: (0, util_1.bytesToBigInt)(reqId),
                        slots: slots.map((accSlots) => accSlots.map(([hash, body]) => ({ hash, body }))),
                        proof,
                    };
                },
            },
            {
                name: 'GetByteCodes',
                code: 0x04,
                response: 0x05,
                // [reqID: P, hashes: [hash1: B_32, hash2: B_32, ...], bytes: P]
                encode: ({ reqId, hashes, bytes }) => {
                    return [
                        (0, util_1.bigIntToUnpaddedBytes)(reqId ?? ++this.nextReqId),
                        hashes.map((hash) => (0, util_1.setLengthLeft)(hash, 32)),
                        (0, util_1.bigIntToUnpaddedBytes)(bytes),
                    ];
                },
                decode: ([reqId, hashes, bytes]) => {
                    return {
                        reqId: (0, util_1.bytesToBigInt)(reqId),
                        hashes,
                        bytes: (0, util_1.bytesToBigInt)(bytes),
                    };
                },
            },
            {
                name: 'ByteCodes',
                code: 0x05,
                // [reqID: P, codes: [code1: B, code2: B, ...]]
                encode: ({ reqId, codes }) => {
                    return [(0, util_1.bigIntToUnpaddedBytes)(reqId ?? ++this.nextReqId), codes];
                },
                decode: ([reqId, codes]) => {
                    return {
                        reqId: (0, util_1.bytesToBigInt)(reqId),
                        codes,
                    };
                },
            },
            {
                name: 'GetTrieNodes',
                code: 0x06,
                response: 0x07,
                // [reqID: P, rootHash: B_32, paths: [[accPath: B, slotPath1: B, slotPath2: B, ...]...], bytes: P]
                encode: ({ reqId, root, paths, bytes }) => {
                    return [
                        (0, util_1.bigIntToUnpaddedBytes)(reqId ?? ++this.nextReqId),
                        (0, util_1.setLengthLeft)(root, 32),
                        paths,
                        (0, util_1.bigIntToUnpaddedBytes)(bytes),
                    ];
                },
                decode: ([reqId, root, paths, bytes]) => {
                    return {
                        reqId: (0, util_1.bytesToBigInt)(reqId),
                        root,
                        paths,
                        bytes: (0, util_1.bytesToBigInt)(bytes),
                    };
                },
            },
            {
                name: 'TrieNodes',
                code: 0x07,
                // [reqID: P, nodes: [node1: B, node2: B, ...]]
                encode: ({ reqId, nodes }) => {
                    return [(0, util_1.bigIntToUnpaddedBytes)(reqId ?? ++this.nextReqId), nodes];
                },
                decode: ([reqId, nodes]) => {
                    return {
                        reqId: (0, util_1.bytesToBigInt)(reqId),
                        nodes,
                    };
                },
            },
        ];
        this.chain = options.chain;
        this.convertSlimBody = options.convertSlimBody;
    }
    /**
     * Name of protocol
     */
    get name() {
        return 'snap';
    }
    /**
     * Protocol versions supported
     */
    get versions() {
        return [1];
    }
    /**
     * Messages defined by this protocol
     */
    get messages() {
        return this.protocolMessages;
    }
    /**
     * Opens protocol and any associated dependencies
     */
    async open() {
        if (this.opened) {
            return false;
        }
        await this.chain.open();
        this.opened = true;
    }
}
exports.SnapProtocol = SnapProtocol;
//# sourceMappingURL=snapprotocol.js.map