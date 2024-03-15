"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptsManager = void 0;
const rlp_1 = require("@ethereumjs/rlp");
const util_1 = require("@ethereumjs/util");
const vm_1 = require("@ethereumjs/vm");
const metaDBManager_1 = require("../util/metaDBManager");
var IndexType;
(function (IndexType) {
    IndexType[IndexType["TxHash"] = 0] = "TxHash";
})(IndexType || (IndexType = {}));
var IndexOperation;
(function (IndexOperation) {
    IndexOperation[IndexOperation["Save"] = 0] = "Save";
    IndexOperation[IndexOperation["Delete"] = 1] = "Delete";
})(IndexOperation || (IndexOperation = {}));
var RlpConvert;
(function (RlpConvert) {
    RlpConvert[RlpConvert["Encode"] = 0] = "Encode";
    RlpConvert[RlpConvert["Decode"] = 1] = "Decode";
})(RlpConvert || (RlpConvert = {}));
var RlpType;
(function (RlpType) {
    RlpType[RlpType["Receipts"] = 0] = "Receipts";
    RlpType[RlpType["Logs"] = 1] = "Logs";
    RlpType[RlpType["TxHash"] = 2] = "TxHash";
})(RlpType || (RlpType = {}));
class ReceiptsManager extends metaDBManager_1.MetaDBManager {
    constructor() {
        super(...arguments);
        /**
         * Limit of logs to return in getLogs
         */
        this.GET_LOGS_LIMIT = 10000;
        /**
         * Size limit for the getLogs response in megabytes
         */
        this.GET_LOGS_LIMIT_MEGABYTES = 150;
        /**
         * Block range limit for getLogs
         */
        this.GET_LOGS_BLOCK_RANGE_LIMIT = 2500;
    }
    /**
     * Saves receipts to db. Also saves tx hash indexes if within txLookupLimit,
     * and removes tx hash indexes for one block past txLookupLimit.
     * @param block the block to save receipts for
     * @param receipts the receipts to save
     */
    async saveReceipts(block, receipts) {
        const encoded = this.rlp(RlpConvert.Encode, RlpType.Receipts, receipts);
        await this.put(metaDBManager_1.DBKey.Receipts, block.hash(), encoded);
        void this.updateIndex(IndexOperation.Save, IndexType.TxHash, block);
    }
    async deleteReceipts(block) {
        await this.delete(metaDBManager_1.DBKey.Receipts, block.hash());
        void this.updateIndex(IndexOperation.Delete, IndexType.TxHash, block);
    }
    async getReceipts(blockHash, calcBloom = false, includeTxType = false) {
        const encoded = await this.get(metaDBManager_1.DBKey.Receipts, blockHash);
        if (!encoded)
            return [];
        let receipts = this.rlp(RlpConvert.Decode, RlpType.Receipts, encoded);
        if (calcBloom) {
            receipts = receipts.map((r) => {
                r.bitvector = this.logsBloom(r.logs).bitvector;
                return r;
            });
        }
        if (includeTxType) {
            const block = await this.chain.getBlock(blockHash);
            receipts = receipts.map((r, i) => {
                r.txType = block.transactions[i].type;
                return r;
            });
        }
        return receipts;
    }
    /**
     * Returns receipt by tx hash with additional metadata for the JSON RPC response, or null if not found
     * @param txHash the tx hash
     */
    async getReceiptByTxHash(txHash) {
        const txHashIndex = await this.getIndex(IndexType.TxHash, txHash);
        if (!txHashIndex)
            return null;
        const [blockHash, txIndex] = txHashIndex;
        const receipts = await this.getReceipts(blockHash);
        if (receipts.length === 0)
            return null;
        let logIndex = 0;
        receipts.slice(0, txIndex).map((r) => (logIndex += r.logs.length));
        const receipt = receipts[txIndex];
        receipt.bitvector = this.logsBloom(receipt.logs).bitvector;
        return [receipt, blockHash, txIndex, logIndex];
    }
    /**
     * Returns logs as specified by the eth_getLogs JSON RPC query parameters
     */
    async getLogs(from, to, addresses, topics = []) {
        const returnedLogs = [];
        let returnedLogsSize = 0;
        for (let i = from.header.number; i <= to.header.number; i++) {
            const block = await this.chain.getBlock(i);
            const receipts = await this.getReceipts(block.hash());
            if (receipts.length === 0)
                continue;
            let logs = [];
            let logIndex = 0;
            for (const [receiptIndex, receipt] of receipts.entries()) {
                logs.push(...receipt.logs.map((log) => ({
                    log,
                    block,
                    tx: block.transactions[receiptIndex],
                    txIndex: receiptIndex,
                    logIndex: logIndex++,
                })));
            }
            if (addresses && addresses.length > 0) {
                logs = logs.filter((l) => addresses.some((a) => (0, util_1.equalsBytes)(a, l.log[0])));
            }
            if (topics.length > 0) {
                // From https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_newfilter/:
                // Topics are order-dependent. A transaction with a log with topics
                // [A, B] will be matched by the following topic filters:
                //  * [] - anything
                //  * [A] - A in first position (and anything after)
                //  * [null, B] - anything in first position AND B in second position (and anything after)
                //  * [A, B] - A in first position AND B in second position (and anything after)
                //  * [[A, B], [A, B]] - (A OR B) in first position AND (A OR B) in second position (and anything after)
                logs = logs.filter((l) => {
                    for (const [i, topic] of topics.entries()) {
                        if (Array.isArray(topic)) {
                            // Can match any items in this array
                            if (!topic.find((t) => (0, util_1.equalsBytes)(t, l.log[1][i])))
                                return false;
                        }
                        else if (!topic) {
                            // If null then can match any
                        }
                        else {
                            // If a value is specified then it must match
                            if (!(0, util_1.equalsBytes)(topic, l.log[1][i]))
                                return false;
                        }
                        return true;
                    }
                });
            }
            returnedLogs.push(...logs);
            returnedLogsSize += (0, util_1.utf8ToBytes)(JSON.stringify(logs)).byteLength;
            if (returnedLogs.length >= this.GET_LOGS_LIMIT ||
                returnedLogsSize >= this.GET_LOGS_LIMIT_MEGABYTES * 1048576) {
                break;
            }
        }
        return returnedLogs;
    }
    async updateIndex(operation, type, value) {
        switch (type) {
            case IndexType.TxHash: {
                const block = value;
                if (operation === IndexOperation.Save) {
                    const withinTxLookupLimit = this.config.txLookupLimit === 0 ||
                        this.chain.headers.height - BigInt(this.config.txLookupLimit) < block.header.number;
                    if (withinTxLookupLimit) {
                        for (const [i, tx] of block.transactions.entries()) {
                            const index = [block.hash(), i];
                            const encoded = this.rlp(RlpConvert.Encode, RlpType.TxHash, index);
                            await this.put(metaDBManager_1.DBKey.TxHash, tx.hash(), encoded);
                        }
                    }
                    if (this.config.txLookupLimit > 0) {
                        // Remove tx hashes for one block past txLookupLimit
                        const limit = this.chain.headers.height - BigInt(this.config.txLookupLimit);
                        if (limit < util_1.BIGINT_0)
                            return;
                        const blockDelIndexes = await this.chain.getBlock(limit);
                        void this.updateIndex(IndexOperation.Delete, IndexType.TxHash, blockDelIndexes);
                    }
                }
                else if (operation === IndexOperation.Delete) {
                    for (const tx of block.transactions) {
                        await this.delete(metaDBManager_1.DBKey.TxHash, tx.hash());
                    }
                }
                break;
            }
            default:
                throw new Error('Unsupported index type');
        }
    }
    async getIndex(type, value) {
        switch (type) {
            case IndexType.TxHash: {
                const encoded = await this.get(metaDBManager_1.DBKey.TxHash, value);
                if (!encoded)
                    return null;
                return this.rlp(RlpConvert.Decode, RlpType.TxHash, encoded);
            }
            default:
                throw new Error('Unsupported index type');
        }
    }
    rlp(conversion, type, value) {
        switch (type) {
            case RlpType.Receipts:
                if (conversion === RlpConvert.Encode) {
                    value = value;
                    return rlp_1.RLP.encode(value.map((r) => [
                        r.stateRoot ??
                            (0, util_1.intToBytes)(r.status),
                        (0, util_1.bigIntToBytes)(r.cumulativeBlockGasUsed),
                        this.rlp(RlpConvert.Encode, RlpType.Logs, r.logs),
                    ]));
                }
                else {
                    const decoded = rlp_1.RLP.decode(value);
                    return decoded.map((r) => {
                        const gasUsed = r[1];
                        const logs = this.rlp(RlpConvert.Decode, RlpType.Logs, r[2]);
                        if (r[0].length === 32) {
                            // Pre-Byzantium Receipt
                            return {
                                stateRoot: r[0],
                                cumulativeBlockGasUsed: (0, util_1.bytesToBigInt)(gasUsed),
                                logs,
                            };
                        }
                        else {
                            // Post-Byzantium Receipt
                            return {
                                status: (0, util_1.bytesToInt)(r[0]),
                                cumulativeBlockGasUsed: (0, util_1.bytesToBigInt)(gasUsed),
                                logs,
                            };
                        }
                    });
                }
            case RlpType.Logs:
                if (conversion === RlpConvert.Encode) {
                    return rlp_1.RLP.encode(value);
                }
                else {
                    return rlp_1.RLP.decode(value);
                }
            case RlpType.TxHash:
                if (conversion === RlpConvert.Encode) {
                    const [blockHash, txIndex] = value;
                    return rlp_1.RLP.encode([blockHash, (0, util_1.intToBytes)(txIndex)]);
                }
                else {
                    const [blockHash, txIndex] = rlp_1.RLP.decode(value);
                    return [blockHash, (0, util_1.bytesToInt)(txIndex)];
                }
            default:
                throw new Error('Unknown rlp conversion');
        }
    }
    /**
     * Returns the logs bloom for a receipt's logs
     * @param logs
     */
    logsBloom(logs) {
        const bloom = new vm_1.Bloom();
        for (let i = 0; i < logs.length; i++) {
            const log = logs[i];
            // add the address
            bloom.add(log[0]);
            // add the topics
            const topics = log[1];
            for (let q = 0; q < topics.length; q++) {
                bloom.add(topics[q]);
            }
        }
        return bloom;
    }
}
exports.ReceiptsManager = ReceiptsManager;
//# sourceMappingURL=receipt.js.map