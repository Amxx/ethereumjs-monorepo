"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LesProtocol = void 0;
const block_1 = require("@ethereumjs/block");
const util_1 = require("@ethereumjs/util");
const protocol_1 = require("./protocol");
/**
 * Implements les/1 and les/2 protocols
 * @memberof module:net/protocol
 */
class LesProtocol extends protocol_1.Protocol {
    /**
     * Create les protocol
     */
    constructor(options) {
        super(options);
        this.nextReqId = util_1.BIGINT_0;
        /* eslint-disable no-invalid-this */
        this.protocolMessages = [
            {
                name: 'Announce',
                code: 0x01,
                encode: ({ headHash, headNumber, headTd, reorgDepth }) => [
                    // TO DO: handle state changes
                    headHash,
                    (0, util_1.bigIntToUnpaddedBytes)(headNumber),
                    (0, util_1.bigIntToUnpaddedBytes)(headTd),
                    (0, util_1.intToBytes)(reorgDepth),
                ],
                decode: ([headHash, headNumber, headTd, reorgDepth]) => ({
                    // TO DO: handle state changes
                    headHash,
                    headNumber: (0, util_1.bytesToBigInt)(headNumber),
                    headTd: (0, util_1.bytesToBigInt)(headTd),
                    reorgDepth: (0, util_1.bytesToInt)(reorgDepth),
                }),
            },
            {
                name: 'GetBlockHeaders',
                code: 0x02,
                response: 0x03,
                encode: ({ reqId, block, max, skip = 0, reverse = false }) => [
                    (0, util_1.bigIntToUnpaddedBytes)(reqId ?? ++this.nextReqId),
                    [
                        typeof block === 'bigint' ? (0, util_1.bigIntToUnpaddedBytes)(block) : block,
                        (0, util_1.intToBytes)(max),
                        (0, util_1.intToBytes)(skip),
                        (0, util_1.intToBytes)(!reverse ? 0 : 1),
                    ],
                ],
                decode: ([reqId, [block, max, skip, reverse]]) => ({
                    reqId: (0, util_1.bytesToBigInt)(reqId),
                    block: block.length === 32 ? block : (0, util_1.bytesToBigInt)(block),
                    max: (0, util_1.bytesToInt)(max),
                    skip: (0, util_1.bytesToInt)(skip),
                    reverse: (0, util_1.bytesToInt)(reverse) === 0 ? false : true,
                }),
            },
            {
                name: 'BlockHeaders',
                code: 0x03,
                encode: ({ reqId, bv, headers }) => [
                    (0, util_1.bigIntToUnpaddedBytes)(reqId),
                    (0, util_1.bigIntToUnpaddedBytes)(bv),
                    headers.map((h) => h.raw()),
                ],
                decode: ([reqId, bv, headers]) => ({
                    reqId: (0, util_1.bytesToBigInt)(reqId),
                    bv: (0, util_1.bytesToBigInt)(bv),
                    headers: headers.map((h) => block_1.BlockHeader.fromValuesArray(h, {
                        setHardfork: true,
                        common: this.config.chainCommon, // eslint-disable-line no-invalid-this
                    })),
                }),
            },
        ];
        this.chain = options.chain;
        this.flow = options.flow;
        // TODO: "no init value" error was caught by TS compiler. Is `false` the correct default?
        this.isServer = false;
    }
    /**
     * Name of protocol
     */
    get name() {
        return 'les';
    }
    /**
     * Protocol versions supported
     */
    get versions() {
        return [4, 3, 2];
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
    /**
     * Encodes status into LES status message payload
     */
    encodeStatus() {
        let serveOptions = {};
        if (this.flow) {
            serveOptions = {
                serveHeaders: 1,
                serveChainSince: 0,
                serveStateSince: 0,
                // txRelay: 1, TODO: uncomment with client tx pool functionality
                'flowControl/BL': (0, util_1.intToBytes)(this.flow.bl),
                'flowControl/MRR': (0, util_1.intToBytes)(this.flow.mrr),
                'flowControl/MRC': Object.entries(this.flow.mrc).map(([name, { base, req }]) => {
                    const { code } = this.messages.find((m) => m.name === name);
                    return [(0, util_1.intToBytes)(code), (0, util_1.intToBytes)(base), (0, util_1.intToBytes)(req)];
                }),
            };
        }
        const forkHash = this.config.chainCommon.forkHash(this.config.chainCommon.hardfork(), this.chain.genesis.hash());
        const nextFork = this.config.chainCommon.nextHardforkBlockOrTimestamp(this.config.chainCommon.hardfork());
        const forkID = [(0, util_1.hexToBytes)(forkHash), (0, util_1.bigIntToUnpaddedBytes)(nextFork ?? 0n)];
        return {
            networkId: (0, util_1.bigIntToUnpaddedBytes)(this.chain.networkId),
            headTd: (0, util_1.bigIntToUnpaddedBytes)(this.chain.headers.td),
            headHash: this.chain.headers.latest?.hash(),
            headNum: (0, util_1.bigIntToUnpaddedBytes)(this.chain.headers.height),
            genesisHash: this.chain.genesis.hash(),
            forkID,
            recentTxLookup: (0, util_1.intToBytes)(1),
            ...serveOptions,
        };
    }
    /**
     * Decodes ETH status message payload into a status object
     * @param status status message payload
     */
    decodeStatus(status) {
        this.isServer = status.serveHeaders !== undefined && status.serveHeaders !== false;
        const mrc = {};
        if (status['flowControl/MRC'] !== undefined) {
            for (let entry of status['flowControl/MRC']) {
                entry = entry.map((e) => (0, util_1.bytesToInt)(e));
                mrc[entry[0]] = { base: entry[1], req: entry[2] };
                const message = this.messages.find((m) => m.code === entry[0]);
                if (message) {
                    mrc[message.name] = mrc[entry[0]];
                }
            }
        }
        return {
            networkId: (0, util_1.bytesToBigInt)(status.networkId),
            headTd: (0, util_1.bytesToBigInt)(status.headTd),
            headHash: status.headHash,
            headNum: (0, util_1.bytesToBigInt)(status.headNum),
            genesisHash: status.genesisHash,
            forkID: status.forkID,
            recentTxLookup: status.recentTxLookup,
            serveHeaders: this.isServer,
            serveChainSince: status.serveChainSince ?? 0,
            serveStateSince: status.serveStateSince ?? 0,
            txRelay: status.txRelay === true,
            bl: status['flowControl/BL'] !== undefined ? (0, util_1.bytesToInt)(status['flowControl/BL']) : undefined,
            mrr: status['flowControl/MRR'] !== undefined ? (0, util_1.bytesToInt)(status['flowControl/MRR']) : undefined,
            mrc,
        };
    }
}
exports.LesProtocol = LesProtocol;
//# sourceMappingURL=lesprotocol.js.map