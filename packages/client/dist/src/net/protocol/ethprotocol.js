"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthProtocol = void 0;
const block_1 = require("@ethereumjs/block");
const common_1 = require("@ethereumjs/common");
const rlp_1 = require("@ethereumjs/rlp");
const tx_1 = require("@ethereumjs/tx");
const util_1 = require("@ethereumjs/util");
const vm_1 = require("@ethereumjs/vm");
const protocol_1 = require("./protocol");
function exhaustiveTypeGuard(_value, errorMsg) {
    throw new Error(errorMsg);
}
/**
 * Implements eth/66 protocol
 * @memberof module:net/protocol
 */
class EthProtocol extends protocol_1.Protocol {
    /**
     * Create eth protocol
     */
    constructor(options) {
        super(options);
        this.nextReqId = util_1.BIGINT_0;
        /* eslint-disable no-invalid-this */
        this.protocolMessages = [
            {
                name: 'NewBlockHashes',
                code: 0x01,
                encode: (hashes) => hashes.map((hn) => [hn[0], (0, util_1.bigIntToUnpaddedBytes)(hn[1])]),
                decode: (hashes) => hashes.map((hn) => [hn[0], (0, util_1.bytesToBigInt)(hn[1])]),
            },
            {
                name: 'Transactions',
                code: 0x02,
                encode: (txs) => {
                    const serializedTxs = [];
                    for (const tx of txs) {
                        // Don't automatically broadcast blob transactions - they should only be announced using NewPooledTransactionHashes
                        if (tx instanceof tx_1.BlobEIP4844Transaction)
                            continue;
                        serializedTxs.push(tx.serialize());
                    }
                    return serializedTxs;
                },
                decode: (txs) => {
                    if (!this.config.synchronized)
                        return;
                    const common = this.config.chainCommon.copy();
                    common.setHardforkBy({
                        blockNumber: this.chain.headers.latest?.number ?? // Use latest header number if available OR
                            this.config.syncTargetHeight ?? // Use sync target height if available OR
                            common.hardforkBlock(common.hardfork()) ?? // Use current hardfork block number OR
                            util_1.BIGINT_0,
                        timestamp: this.chain.headers.latest?.timestamp ?? Math.floor(Date.now() / 1000),
                    });
                    return txs.map((txData) => tx_1.TransactionFactory.fromSerializedData(txData, { common }));
                },
            },
            {
                name: 'GetBlockHeaders',
                code: 0x03,
                response: 0x04,
                encode: ({ reqId, block, max, skip = 0, reverse = false }) => [
                    (0, util_1.bigIntToUnpaddedBytes)(reqId ?? ++this.nextReqId),
                    [
                        typeof block === 'bigint' ? (0, util_1.bigIntToUnpaddedBytes)(block) : block,
                        (0, util_1.intToUnpaddedBytes)(max),
                        (0, util_1.intToUnpaddedBytes)(skip),
                        (0, util_1.intToUnpaddedBytes)(!reverse ? 0 : 1),
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
                code: 0x04,
                encode: ({ reqId, headers }) => [
                    (0, util_1.bigIntToUnpaddedBytes)(reqId),
                    headers.map((h) => h.raw()),
                ],
                decode: ([reqId, headers]) => [
                    (0, util_1.bytesToBigInt)(reqId),
                    headers.map((h) => {
                        const headerData = (0, block_1.valuesArrayToHeaderData)(h);
                        const difficulty = (0, block_1.getDifficulty)(headerData);
                        const common = this.config.chainCommon;
                        // If this is a post merge block, we can still send chainTTD since it would still lead
                        // to correct hardfork choice
                        const header = block_1.BlockHeader.fromValuesArray(h, difficulty > 0 ? { common, setHardfork: true } : { common, setHardfork: this.chainTTD });
                        return header;
                    }),
                ],
            },
            {
                name: 'GetBlockBodies',
                code: 0x05,
                response: 0x06,
                encode: ({ reqId, hashes }) => [
                    (0, util_1.bigIntToUnpaddedBytes)(reqId ?? ++this.nextReqId),
                    hashes,
                ],
                decode: ([reqId, hashes]) => ({
                    reqId: (0, util_1.bytesToBigInt)(reqId),
                    hashes,
                }),
            },
            {
                name: 'BlockBodies',
                code: 0x06,
                encode: ({ reqId, bodies }) => [
                    (0, util_1.bigIntToUnpaddedBytes)(reqId),
                    bodies,
                ],
                decode: ([reqId, bodies]) => [(0, util_1.bytesToBigInt)(reqId), bodies],
            },
            {
                name: 'NewBlock',
                code: 0x07,
                encode: ([block, td]) => [block.raw(), (0, util_1.bigIntToUnpaddedBytes)(td)],
                decode: ([block, td]) => [
                    block_1.Block.fromValuesArray(block, {
                        common: this.config.chainCommon,
                        setHardfork: true,
                    }),
                    td,
                ],
            },
            {
                name: 'NewPooledTransactionHashes',
                code: 0x08,
                // If eth protocol is eth/68, the parameter list for `NewPooledTransactionHashes` changes from
                // `hashes: Uint8Array[]` to an tuple of arrays of `types, sizes, hashes`, where types corresponds to the
                // transaction type, sizes is the size of each encoded transaction in bytes, and the transaction hashes
                encode: (params) => {
                    if (params[0] instanceof Uint8Array) {
                        return params;
                    }
                    else {
                        const tupleParams = params;
                        const encodedData = [
                            (0, util_1.bytesToHex)(new Uint8Array(tupleParams[0])),
                            tupleParams[1],
                            tupleParams[2],
                        ];
                        return encodedData;
                    }
                },
                decode: (params) => {
                    if (params[0] instanceof Uint8Array) {
                        return params;
                    }
                    else {
                        const tupleParams = params;
                        const decodedData = [
                            (0, util_1.hexToBytes)(tupleParams[0]),
                            tupleParams[1].map((size) => BigInt(size)),
                            tupleParams[2],
                        ];
                        return decodedData;
                    }
                },
            },
            {
                name: 'GetPooledTransactions',
                code: 0x09,
                response: 0x0a,
                encode: ({ reqId, hashes }) => [
                    (0, util_1.bigIntToUnpaddedBytes)(reqId ?? ++this.nextReqId),
                    hashes,
                ],
                decode: ([reqId, hashes]) => ({
                    reqId: (0, util_1.bytesToBigInt)(reqId),
                    hashes,
                }),
            },
            {
                name: 'PooledTransactions',
                code: 0x0a,
                encode: ({ reqId, txs }) => {
                    const serializedTxs = [];
                    for (const tx of txs) {
                        // serialize txs as per type
                        if ((0, tx_1.isBlobEIP4844Tx)(tx)) {
                            serializedTxs.push(tx.serializeNetworkWrapper());
                        }
                        else if ((0, tx_1.isAccessListEIP2930Tx)(tx) ||
                            (0, tx_1.isFeeMarketEIP1559Tx)(tx) ||
                            (0, tx_1.isDelegateEIP5806Tx)(tx)) {
                            serializedTxs.push(tx.serialize());
                        }
                        else if ((0, tx_1.isLegacyTx)(tx)) {
                            serializedTxs.push(tx.raw());
                        }
                        else {
                            // Dual use for this typeguard:
                            // 1. to enable typescript to throw build errors if any tx is missing above
                            // 2. to throw error in runtime if some corruption happens
                            exhaustiveTypeGuard(tx, `Invalid transaction type=${tx.type}`);
                        }
                    }
                    return [(0, util_1.bigIntToUnpaddedBytes)(reqId), serializedTxs];
                },
                decode: ([reqId, txs]) => {
                    const common = this.config.chainCommon.copy();
                    common.setHardforkBy({
                        blockNumber: this.chain.headers.latest?.number ?? // Use latest header number if available OR
                            this.config.syncTargetHeight ?? // Use sync target height if available OR
                            common.hardforkBlock(common.hardfork()) ?? // Use current hardfork block number OR
                            util_1.BIGINT_0,
                        timestamp: this.chain.headers.latest?.timestamp ?? Math.floor(Date.now() / 1000),
                    });
                    return [
                        (0, util_1.bytesToBigInt)(reqId),
                        txs.map((txData) => {
                            // Blob transactions are deserialized with network wrapper
                            if (txData[0] === 3) {
                                return tx_1.BlobEIP4844Transaction.fromSerializedBlobTxNetworkWrapper(txData, { common });
                            }
                            else {
                                return tx_1.TransactionFactory.fromBlockBodyData(txData, { common });
                            }
                        }),
                    ];
                },
            },
            {
                name: 'GetReceipts',
                code: 0x0f,
                response: 0x10,
                encode: ({ reqId, hashes }) => [
                    (0, util_1.bigIntToUnpaddedBytes)(reqId ?? ++this.nextReqId),
                    hashes,
                ],
                decode: ([reqId, hashes]) => ({
                    reqId: (0, util_1.bytesToBigInt)(reqId),
                    hashes,
                }),
            },
            {
                name: 'Receipts',
                code: 0x10,
                encode: ({ reqId, receipts }) => {
                    const serializedReceipts = [];
                    for (const receipt of receipts) {
                        const encodedReceipt = (0, vm_1.encodeReceipt)(receipt, receipt.txType);
                        serializedReceipts.push(encodedReceipt);
                    }
                    return [(0, util_1.bigIntToUnpaddedBytes)(reqId), serializedReceipts];
                },
                decode: ([reqId, receipts]) => [
                    (0, util_1.bytesToBigInt)(reqId),
                    receipts.map((r) => {
                        // Legacy receipt if r[0] >= 0xc0, otherwise typed receipt with first byte as TransactionType
                        const decoded = rlp_1.RLP.decode(r[0] >= 0xc0 ? r : r.subarray(1));
                        const [stateRootOrStatus, cumulativeGasUsed, logsBloom, logs] = decoded;
                        const receipt = {
                            cumulativeBlockGasUsed: (0, util_1.bytesToBigInt)(cumulativeGasUsed),
                            bitvector: logsBloom,
                            logs,
                        };
                        if (stateRootOrStatus.length === 32) {
                            ;
                            receipt.stateRoot = stateRootOrStatus;
                        }
                        else {
                            ;
                            receipt.status = (0, util_1.bytesToInt)(stateRootOrStatus);
                        }
                        return receipt;
                    }),
                ],
            },
        ];
        this.chain = options.chain;
        const chainTTD = this.config.chainCommon.hardforkTTD(common_1.Hardfork.Paris);
        if (chainTTD !== null && chainTTD !== undefined) {
            this.chainTTD = chainTTD;
        }
    }
    /**
     * Name of protocol
     */
    get name() {
        return 'eth';
    }
    /**
     * Protocol versions supported
     */
    get versions() {
        return [66, 67, 68];
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
     * Encodes status into ETH status message payload
     */
    encodeStatus() {
        return {
            networkId: (0, util_1.bigIntToUnpaddedBytes)(this.chain.networkId),
            td: (0, util_1.bigIntToUnpaddedBytes)(this.chain.blocks.td),
            bestHash: this.chain.blocks.latest.hash(),
            genesisHash: this.chain.genesis.hash(),
            latestBlock: (0, util_1.bigIntToUnpaddedBytes)(this.chain.blocks.latest.header.number),
        };
    }
    /**
     * Decodes ETH status message payload into a status object
     * @param status status message payload
     */
    decodeStatus(status) {
        return {
            networkId: (0, util_1.bytesToBigInt)(status.networkId),
            td: (0, util_1.bytesToBigInt)(status.td),
            bestHash: status.bestHash,
            genesisHash: status.genesisHash,
        };
    }
}
exports.EthProtocol = EthProtocol;
//# sourceMappingURL=ethprotocol.js.map