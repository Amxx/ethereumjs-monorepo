"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Eth = void 0;
const common_1 = require("@ethereumjs/common");
const tx_1 = require("@ethereumjs/tx");
const util_1 = require("@ethereumjs/util");
const error_code_1 = require("../error-code");
const helpers_1 = require("../helpers");
const validation_1 = require("../validation");
const EMPTY_SLOT = `0x${'00'.repeat(32)}`;
/**
 * Returns block formatted to the standard JSON-RPC fields
 */
const jsonRpcBlock = async (block, chain, includeTransactions) => {
    const json = block.toJSON();
    const header = json.header;
    const transactions = block.transactions.map((tx, txIndex) => includeTransactions ? (0, helpers_1.jsonRpcTx)(tx, block, txIndex) : (0, util_1.bytesToHex)(tx.hash()));
    const withdrawalsAttr = header.withdrawalsRoot !== undefined
        ? {
            withdrawalsRoot: header.withdrawalsRoot,
            withdrawals: json.withdrawals,
        }
        : {};
    const td = await chain.getTd(block.hash(), block.header.number);
    return {
        number: header.number,
        hash: (0, util_1.bytesToHex)(block.hash()),
        parentHash: header.parentHash,
        mixHash: header.mixHash,
        nonce: header.nonce,
        sha3Uncles: header.uncleHash,
        logsBloom: header.logsBloom,
        transactionsRoot: header.transactionsTrie,
        stateRoot: header.stateRoot,
        receiptsRoot: header.receiptTrie,
        miner: header.coinbase,
        difficulty: header.difficulty,
        totalDifficulty: (0, util_1.bigIntToHex)(td),
        extraData: header.extraData,
        size: (0, util_1.intToHex)((0, util_1.utf8ToBytes)(JSON.stringify(json)).byteLength),
        gasLimit: header.gasLimit,
        gasUsed: header.gasUsed,
        timestamp: header.timestamp,
        transactions,
        uncles: block.uncleHeaders.map((uh) => (0, util_1.bytesToHex)(uh.hash())),
        baseFeePerGas: header.baseFeePerGas,
        ...withdrawalsAttr,
        blobGasUsed: header.blobGasUsed,
        excessBlobGas: header.excessBlobGas,
        parentBeaconBlockRoot: header.parentBeaconBlockRoot,
    };
};
/**
 * Returns log formatted to the standard JSON-RPC fields
 */
const jsonRpcLog = async (log, block, tx, txIndex, logIndex) => ({
    removed: false,
    logIndex: logIndex !== undefined ? (0, util_1.intToHex)(logIndex) : null,
    transactionIndex: txIndex !== undefined ? (0, util_1.intToHex)(txIndex) : null,
    transactionHash: tx !== undefined ? (0, util_1.bytesToHex)(tx.hash()) : null,
    blockHash: block ? (0, util_1.bytesToHex)(block.hash()) : null,
    blockNumber: block ? (0, util_1.bigIntToHex)(block.header.number) : null,
    address: (0, util_1.bytesToHex)(log[0]),
    topics: log[1].map(util_1.bytesToHex),
    data: (0, util_1.bytesToHex)(log[2]),
});
/**
 * Returns receipt formatted to the standard JSON-RPC fields
 */
const jsonRpcReceipt = async (receipt, gasUsed, effectiveGasPrice, block, tx, txIndex, logIndex, contractAddress, blobGasUsed, blobGasPrice) => ({
    transactionHash: (0, util_1.bytesToHex)(tx.hash()),
    transactionIndex: (0, util_1.intToHex)(txIndex),
    blockHash: (0, util_1.bytesToHex)(block.hash()),
    blockNumber: (0, util_1.bigIntToHex)(block.header.number),
    from: tx.getSenderAddress().toString(),
    to: tx.to?.toString() ?? null,
    cumulativeGasUsed: (0, util_1.bigIntToHex)(receipt.cumulativeBlockGasUsed),
    effectiveGasPrice: (0, util_1.bigIntToHex)(effectiveGasPrice),
    gasUsed: (0, util_1.bigIntToHex)(gasUsed),
    contractAddress: contractAddress?.toString() ?? null,
    logs: await Promise.all(receipt.logs.map((l, i) => jsonRpcLog(l, block, tx, txIndex, logIndex + i))),
    logsBloom: (0, util_1.bytesToHex)(receipt.bitvector),
    root: receipt.stateRoot instanceof Uint8Array
        ? (0, util_1.bytesToHex)(receipt.stateRoot)
        : undefined,
    status: receipt.status instanceof Uint8Array
        ? (0, util_1.intToHex)(receipt.status)
        : undefined,
    blobGasUsed: blobGasUsed !== undefined ? (0, util_1.bigIntToHex)(blobGasUsed) : undefined,
    blobGasPrice: blobGasPrice !== undefined ? (0, util_1.bigIntToHex)(blobGasPrice) : undefined,
});
const calculateRewards = async (block, receiptsManager, priorityFeePercentiles) => {
    if (priorityFeePercentiles.length === 0) {
        return [];
    }
    if (block.transactions.length === 0) {
        return Array.from({ length: priorityFeePercentiles.length }, () => util_1.BIGINT_0);
    }
    const blockRewards = [];
    const txGasUsed = [];
    const baseFee = block.header.baseFeePerGas;
    const receipts = await receiptsManager.getReceipts(block.hash());
    if (receipts.length > 0) {
        txGasUsed.push(receipts[0].cumulativeBlockGasUsed);
        for (let i = 1; i < receipts.length; i++) {
            txGasUsed.push(receipts[i].cumulativeBlockGasUsed - receipts[i - 1].cumulativeBlockGasUsed);
        }
    }
    const txs = block.transactions;
    const txsWithGasUsed = txs.map((tx, i) => ({
        txGasUsed: txGasUsed[i],
        // Can assume baseFee exists, since if EIP1559/EIP4844 txs are included, this is a post-EIP-1559 block.
        effectivePriorityFee: tx.getEffectivePriorityFee(baseFee),
    }));
    // Sort array based upon the effectivePriorityFee
    txsWithGasUsed.sort((a, b) => Number(a.effectivePriorityFee - b.effectivePriorityFee));
    let priorityFeeIndex = 0;
    // Loop over all txs ...
    let targetCumulativeGasUsed = (block.header.gasUsed * BigInt(priorityFeePercentiles[0])) / util_1.BIGINT_100;
    let cumulativeGasUsed = util_1.BIGINT_0;
    for (let txIndex = 0; txIndex < txsWithGasUsed.length; txIndex++) {
        cumulativeGasUsed += txsWithGasUsed[txIndex].txGasUsed;
        while (cumulativeGasUsed >= targetCumulativeGasUsed &&
            priorityFeeIndex < priorityFeePercentiles.length) {
            /*
                  Idea: keep adding the premium fee to the priority fee percentile until we actually get above the threshold
                  For instance, take the priority fees [0,1,2,100]
                  The gas used in the block is 1.05 million
                  The first tx takes 1 million gas with prio fee A, the second the remainder over 0.05M with prio fee B
                  Then it is clear that the priority fees should be [A,A,A,B]
                  -> So A should be added three times
                  Note: in this case A < B so the priority fees were "sorted" by default
                */
            blockRewards.push(txsWithGasUsed[txIndex].effectivePriorityFee);
            priorityFeeIndex++;
            if (priorityFeeIndex >= priorityFeePercentiles.length) {
                // prevent out-of-bounds read
                break;
            }
            const priorityFeePercentile = priorityFeePercentiles[priorityFeeIndex];
            targetCumulativeGasUsed = (block.header.gasUsed * BigInt(priorityFeePercentile)) / util_1.BIGINT_100;
        }
    }
    return blockRewards;
};
/**
 * eth_* RPC module
 * @memberof module:rpc/modules
 */
class Eth {
    /**
     * Create eth_* RPC module
     * @param client Client to which the module binds
     */
    constructor(client, rpcDebug) {
        this.client = client;
        this.service = client.services.find((s) => s.name === 'eth');
        this._chain = this.service.chain;
        this._vm = this.service.execution?.vm;
        this.receiptsManager = this.service.execution?.receiptsManager;
        this._rpcDebug = rpcDebug;
        const ethProtocol = this.service.protocols.find((p) => p.name === 'eth');
        this.ethVersion = Math.max(...ethProtocol.versions);
        this.blockNumber = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.blockNumber.bind(this), this._rpcDebug), 0);
        this.call = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.call.bind(this), this._rpcDebug), 2, [
            [validation_1.validators.transaction()],
            [validation_1.validators.blockOption],
        ]);
        this.chainId = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.chainId.bind(this), this._rpcDebug), 0, []);
        this.estimateGas = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.estimateGas.bind(this), this._rpcDebug), 1, [[validation_1.validators.transaction()], [validation_1.validators.blockOption]]);
        this.getBalance = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.getBalance.bind(this), this._rpcDebug), 2, [[validation_1.validators.address], [validation_1.validators.blockOption]]);
        this.coinbase = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.coinbase.bind(this), this._rpcDebug), 0, []);
        this.getBlockByNumber = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.getBlockByNumber.bind(this), this._rpcDebug), 2, [[validation_1.validators.blockOption], [validation_1.validators.bool]]);
        this.getBlockByHash = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.getBlockByHash.bind(this), this._rpcDebug), 2, [[validation_1.validators.hex, validation_1.validators.blockHash], [validation_1.validators.bool]]);
        this.getBlockTransactionCountByHash = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.getBlockTransactionCountByHash.bind(this), this._rpcDebug), 1, [[validation_1.validators.hex, validation_1.validators.blockHash]]);
        this.getCode = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.getCode.bind(this), this._rpcDebug), 2, [
            [validation_1.validators.address],
            [validation_1.validators.blockOption],
        ]);
        this.getUncleCountByBlockNumber = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.getUncleCountByBlockNumber.bind(this), this._rpcDebug), 1, [[validation_1.validators.hex]]);
        this.getStorageAt = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.getStorageAt.bind(this), this._rpcDebug), 3, [[validation_1.validators.address], [validation_1.validators.hex], [validation_1.validators.blockOption]]);
        this.getTransactionByBlockHashAndIndex = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.getTransactionByBlockHashAndIndex.bind(this), this._rpcDebug), 2, [[validation_1.validators.hex, validation_1.validators.blockHash], [validation_1.validators.hex]]);
        this.getTransactionByHash = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.getTransactionByHash.bind(this), this._rpcDebug), 1, [[validation_1.validators.hex]]);
        this.getTransactionCount = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.getTransactionCount.bind(this), this._rpcDebug), 2, [[validation_1.validators.address], [validation_1.validators.blockOption]]);
        this.getTransactionReceipt = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.getTransactionReceipt.bind(this), this._rpcDebug), 1, [[validation_1.validators.hex]]);
        this.getUncleCountByBlockNumber = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.getUncleCountByBlockNumber.bind(this), this._rpcDebug), 1, [[validation_1.validators.hex]]);
        this.getLogs = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.getLogs.bind(this), this._rpcDebug), 1, [
            [
                validation_1.validators.object({
                    fromBlock: validation_1.validators.optional(validation_1.validators.blockOption),
                    toBlock: validation_1.validators.optional(validation_1.validators.blockOption),
                    address: validation_1.validators.optional(validation_1.validators.either(validation_1.validators.array(validation_1.validators.address), validation_1.validators.address)),
                    topics: validation_1.validators.optional(validation_1.validators.array(validation_1.validators.optional(validation_1.validators.either(validation_1.validators.hex, validation_1.validators.array(validation_1.validators.hex))))),
                    blockHash: validation_1.validators.optional(validation_1.validators.blockHash),
                }),
            ],
        ]);
        this.sendRawTransaction = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.sendRawTransaction.bind(this), this._rpcDebug), 1, [[validation_1.validators.hex]]);
        this.protocolVersion = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.protocolVersion.bind(this), this._rpcDebug), 0, []);
        this.syncing = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.syncing.bind(this), this._rpcDebug), 0, []);
        this.getProof = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.getProof.bind(this), this._rpcDebug), 3, [
            [validation_1.validators.address],
            [validation_1.validators.array(validation_1.validators.hex)],
            [validation_1.validators.blockOption],
        ]);
        this.getBlockTransactionCountByNumber = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.getBlockTransactionCountByNumber.bind(this), this._rpcDebug), 1, [[validation_1.validators.blockOption]]);
        this.gasPrice = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.gasPrice.bind(this), this._rpcDebug), 0, []);
        this.feeHistory = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.feeHistory.bind(this), this._rpcDebug), 2, [
            [validation_1.validators.either(validation_1.validators.hex, validation_1.validators.integer)],
            [validation_1.validators.either(validation_1.validators.hex, validation_1.validators.blockOption)],
            [validation_1.validators.rewardPercentiles],
        ]);
    }
    /**
     * Returns number of the most recent block.
     * @param params An empty array
     */
    async blockNumber(_params = []) {
        return (0, util_1.bigIntToHex)(this._chain.headers.latest?.number ?? util_1.BIGINT_0);
    }
    /**
     * Executes a new message call immediately without creating a transaction on the block chain.
     * @param params An array of two parameters:
     *   1. The transaction object
     *       * from (optional) - The address the transaction is sent from
     *       * to - The address the transaction is directed to
     *       * gas (optional) - Integer of the gas provided for the transaction execution
     *       * gasPrice (optional) - Integer of the gasPrice used for each paid gas
     *       * value (optional) - Integer of the value sent with this transaction
     *       * data (optional) - Hash of the method signature and encoded parameters.
     *   2. integer block number, or the string "latest", "earliest" or "pending"
     * @returns The return value of the executed contract.
     */
    async call(params) {
        const [transaction, blockOpt] = params;
        const block = await (0, helpers_1.getBlockByOption)(blockOpt, this._chain);
        if (this._vm === undefined) {
            throw new Error('missing vm');
        }
        const vm = await this._vm.shallowCopy();
        await vm.stateManager.setStateRoot(block.header.stateRoot);
        const { from, to, gas: gasLimit, gasPrice, value, data } = transaction;
        const runCallOpts = {
            caller: from !== undefined ? util_1.Address.fromString(from) : undefined,
            to: to !== undefined ? util_1.Address.fromString(to) : undefined,
            gasLimit: (0, util_1.toType)(gasLimit, util_1.TypeOutput.BigInt),
            gasPrice: (0, util_1.toType)(gasPrice, util_1.TypeOutput.BigInt),
            value: (0, util_1.toType)(value, util_1.TypeOutput.BigInt),
            data: data !== undefined ? (0, util_1.hexToBytes)(data) : undefined,
        };
        const { execResult } = await vm.evm.runCall(runCallOpts);
        return (0, util_1.bytesToHex)(execResult.returnValue);
    }
    /**
     * Returns the currently configured chain id, a value used in replay-protected transaction signing as introduced by EIP-155.
     * @param _params An empty array
     * @returns The chain ID.
     */
    async chainId(_params = []) {
        const chainId = this._chain.config.chainCommon.chainId();
        return (0, util_1.bigIntToHex)(chainId);
    }
    /**
     * Generates and returns an estimate of how much gas is necessary to allow the transaction to complete.
     * The transaction will not be added to the blockchain.
     * Note that the estimate may be significantly more than the amount of gas actually used by the transaction,
     * for a variety of reasons including EVM mechanics and node performance.
     * @param params An array of two parameters:
     *   1. The transaction object
     *       * from (optional) - The address the transaction is sent from
     *       * to - The address the transaction is directed to
     *       * gas (optional) - Integer of the gas provided for the transaction execution
     *       * gasPrice (optional) - Integer of the gasPrice used for each paid gas
     *       * value (optional) - Integer of the value sent with this transaction
     *       * data (optional) - Hash of the method signature and encoded parameters.
     *   2. integer block number, or the string "latest", "earliest" or "pending" (optional)
     * @returns The amount of gas used.
     */
    async estimateGas(params) {
        const [transaction, blockOpt] = params;
        const block = await (0, helpers_1.getBlockByOption)(blockOpt ?? 'latest', this._chain);
        if (this._vm === undefined) {
            throw new Error('missing vm');
        }
        const vm = await this._vm.shallowCopy();
        await vm.stateManager.setStateRoot(block.header.stateRoot);
        if (transaction.gas === undefined) {
            // If no gas limit is specified use the last block gas limit as an upper bound.
            const latest = await this._chain.getCanonicalHeadHeader();
            transaction.gas = latest.gasLimit;
        }
        if (transaction.gasPrice === undefined && transaction.maxFeePerGas === undefined) {
            // If no gas price or maxFeePerGas provided, use current block base fee for gas estimates
            if (transaction.type !== undefined && parseInt(transaction.type) === 2) {
                transaction.maxFeePerGas = '0x' + block.header.baseFeePerGas?.toString(16);
            }
            else if (block.header.baseFeePerGas !== undefined) {
                transaction.gasPrice = '0x' + block.header.baseFeePerGas?.toString(16);
            }
        }
        const txData = {
            ...transaction,
            gasLimit: transaction.gas,
        };
        const tx = tx_1.TransactionFactory.fromTxData(txData, { common: vm.common, freeze: false });
        // set from address
        const from = transaction.from !== undefined ? util_1.Address.fromString(transaction.from) : util_1.Address.zero();
        tx.getSenderAddress = () => {
            return from;
        };
        const { totalGasSpent } = await vm.runTx({
            tx,
            skipNonce: true,
            skipBalance: true,
            skipBlockGasLimitValidation: true,
            block,
        });
        return `0x${totalGasSpent.toString(16)}`;
    }
    /**
     * Returns the balance of the account at the given address.
     * @param params An array of two parameters:
     *   1. address of the account
     *   2. integer block number, or the string "latest", "earliest" or "pending"
     */
    async getBalance(params) {
        const [addressHex, blockOpt] = params;
        const address = util_1.Address.fromString(addressHex);
        const block = await (0, helpers_1.getBlockByOption)(blockOpt, this._chain);
        if (this._vm === undefined) {
            throw new Error('missing vm');
        }
        const vm = await this._vm.shallowCopy();
        await vm.stateManager.setStateRoot(block.header.stateRoot);
        const account = await vm.stateManager.getAccount(address);
        if (account === undefined) {
            return '0x0';
        }
        return (0, util_1.bigIntToHex)(account.balance);
    }
    /**
     * Returns the currently configured coinbase address.
     * @param _params An empty array
     * @returns The chain ID.
     */
    async coinbase(_params = []) {
        const cb = this.client.config.minerCoinbase;
        if (cb === undefined) {
            throw {
                code: error_code_1.INTERNAL_ERROR,
                message: 'Coinbase must be explicitly specified',
            };
        }
        return cb.toString();
    }
    /**
     * Returns information about a block by hash.
     * @param params An array of two parameters:
     *   1. a block hash
     *   2. boolean - if true returns the full transaction objects, if false only the hashes of the transactions.
     */
    async getBlockByHash(params) {
        const [blockHash, includeTransactions] = params;
        try {
            const block = await this._chain.getBlock((0, util_1.hexToBytes)(blockHash));
            return await jsonRpcBlock(block, this._chain, includeTransactions);
        }
        catch (error) {
            throw {
                code: error_code_1.INVALID_PARAMS,
                message: 'Unknown block',
            };
        }
    }
    /**
     * Returns information about a block by block number.
     * @param params An array of two parameters:
     *   1. integer of a block number, or the string "latest", "earliest" or "pending"
     *   2. boolean - if true returns the full transaction objects, if false only the hashes of the transactions.
     */
    async getBlockByNumber(params) {
        const [blockOpt, includeTransactions] = params;
        const block = await (0, helpers_1.getBlockByOption)(blockOpt, this._chain);
        return jsonRpcBlock(block, this._chain, includeTransactions);
    }
    /**
     * Returns the transaction count for a block given by the block hash.
     * @param params An array of one parameter: A block hash
     */
    async getBlockTransactionCountByHash(params) {
        const [blockHash] = params;
        try {
            const block = await this._chain.getBlock((0, util_1.hexToBytes)(blockHash));
            return (0, util_1.intToHex)(block.transactions.length);
        }
        catch (error) {
            throw {
                code: error_code_1.INVALID_PARAMS,
                message: 'Unknown block',
            };
        }
    }
    /**
     * Returns code of the account at the given address.
     * @param params An array of two parameters:
     *   1. address of the account
     *   2. integer block number, or the string "latest", "earliest" or "pending"
     */
    async getCode(params) {
        const [addressHex, blockOpt] = params;
        const block = await (0, helpers_1.getBlockByOption)(blockOpt, this._chain);
        if (this._vm === undefined) {
            throw new Error('missing vm');
        }
        const vm = await this._vm.shallowCopy();
        await vm.stateManager.setStateRoot(block.header.stateRoot);
        const address = util_1.Address.fromString(addressHex);
        const code = await vm.stateManager.getContractCode(address);
        return (0, util_1.bytesToHex)(code);
    }
    /**
     * Returns the value from a storage position at a given address.
     * @param params An array of three parameters:
     *   1. address of the storage
     *   2. integer of the position in the storage
     *   3. integer block number, or the string "latest", "earliest" or "pending"
     */
    async getStorageAt(params) {
        const [addressHex, keyHex, blockOpt] = params;
        if (blockOpt === 'pending') {
            throw {
                code: error_code_1.INVALID_PARAMS,
                message: '"pending" is not yet supported',
            };
        }
        if (this._vm === undefined) {
            throw new Error('missing vm');
        }
        const vm = await this._vm.shallowCopy();
        // TODO: this needs more thought, keep on latest for now
        const block = await (0, helpers_1.getBlockByOption)(blockOpt, this._chain);
        await vm.stateManager.setStateRoot(block.header.stateRoot);
        const address = util_1.Address.fromString(addressHex);
        const account = await vm.stateManager.getAccount(address);
        if (account === undefined) {
            return EMPTY_SLOT;
        }
        const key = (0, util_1.setLengthLeft)((0, util_1.hexToBytes)(keyHex), 32);
        const storage = await vm.stateManager.getContractStorage(address, key);
        return storage !== null && storage !== undefined
            ? (0, util_1.bytesToHex)((0, util_1.setLengthLeft)(Uint8Array.from(storage), 32))
            : EMPTY_SLOT;
    }
    /**
     * Returns information about a transaction given a block hash and a transaction's index position.
     * @param params An array of two parameter:
     *   1. a block hash
     *   2. an integer of the transaction index position encoded as a hexadecimal.
     */
    async getTransactionByBlockHashAndIndex(params) {
        try {
            const [blockHash, txIndexHex] = params;
            const txIndex = parseInt(txIndexHex, 16);
            const block = await this._chain.getBlock((0, util_1.hexToBytes)(blockHash));
            if (block.transactions.length <= txIndex) {
                return null;
            }
            const tx = block.transactions[txIndex];
            return (0, helpers_1.jsonRpcTx)(tx, block, txIndex);
        }
        catch (error) {
            throw {
                code: error_code_1.INVALID_PARAMS,
                message: error.message.toString(),
            };
        }
    }
    /**
     * Returns the transaction by hash when available within `--txLookupLimit`
     * @param params An array of one parameter:
     *   1. hash of the transaction
     */
    async getTransactionByHash(params) {
        const [txHash] = params;
        if (!this.receiptsManager)
            throw new Error('missing receiptsManager');
        const result = await this.receiptsManager.getReceiptByTxHash((0, util_1.hexToBytes)(txHash));
        if (!result)
            return null;
        const [_receipt, blockHash, txIndex] = result;
        const block = await this._chain.getBlock(blockHash);
        const tx = block.transactions[txIndex];
        return (0, helpers_1.jsonRpcTx)(tx, block, txIndex);
    }
    /**
     * Returns the number of transactions sent from an address.
     * @param params An array of two parameters:
     *   1. address of the account
     *   2. integer block number, or the string "latest", "earliest" or "pending"
     */
    async getTransactionCount(params) {
        const [addressHex, blockOpt] = params;
        const block = await (0, helpers_1.getBlockByOption)(blockOpt, this._chain);
        if (this._vm === undefined) {
            throw new Error('missing vm');
        }
        const vm = await this._vm.shallowCopy();
        await vm.stateManager.setStateRoot(block.header.stateRoot);
        const address = util_1.Address.fromString(addressHex);
        const account = await vm.stateManager.getAccount(address);
        if (account === undefined) {
            return '0x0';
        }
        return (0, util_1.bigIntToHex)(account.nonce);
    }
    /**
     * Returns the current ethereum protocol version as a hex-encoded string
     * @param params An empty array
     */
    protocolVersion(_params = []) {
        return (0, util_1.intToHex)(this.ethVersion);
    }
    /**
     * Returns the number of uncles in a block from a block matching the given block number
     * @param params An array of one parameter:
     *   1: hexadecimal representation of a block number
     */
    async getUncleCountByBlockNumber(params) {
        const [blockNumberHex] = params;
        const blockNumber = BigInt(blockNumberHex);
        const latest = this._chain.headers.latest?.number ?? (await this._chain.getCanonicalHeadHeader()).number;
        if (blockNumber > latest) {
            throw {
                code: error_code_1.INVALID_PARAMS,
                message: 'specified block greater than current height',
            };
        }
        const block = await this._chain.getBlock(blockNumber);
        return block.uncleHeaders.length;
    }
    /**
     * Returns the receipt of a transaction by transaction hash.
     * *Note* That the receipt is not available for pending transactions.
     * Only available with `--saveReceipts` enabled
     * Will return empty if tx is past set `--txLookupLimit`
     * (default = 2350000 = about one year, 0 = entire chain)
     * @param params An array of one parameter:
     *  1: Transaction hash
     */
    async getTransactionReceipt(params) {
        const [txHash] = params;
        if (!this.receiptsManager)
            throw new Error('missing receiptsManager');
        const result = await this.receiptsManager.getReceiptByTxHash((0, util_1.hexToBytes)(txHash));
        if (!result)
            return null;
        const [receipt, blockHash, txIndex, logIndex] = result;
        const block = await this._chain.getBlock(blockHash);
        // Check if block is in canonical chain
        const blockByNumber = await this._chain.getBlock(block.header.number);
        if (!(0, util_1.equalsBytes)(blockByNumber.hash(), block.hash())) {
            return null;
        }
        const parentBlock = await this._chain.getBlock(block.header.parentHash);
        const tx = block.transactions[txIndex];
        const effectiveGasPrice = tx.supports(tx_1.Capability.EIP1559FeeMarket)
            ? tx.maxPriorityFeePerGas <
                tx.maxFeePerGas - block.header.baseFeePerGas
                ? tx.maxPriorityFeePerGas
                : tx.maxFeePerGas -
                    block.header.baseFeePerGas +
                    block.header.baseFeePerGas
            : tx.gasPrice;
        const vmCopy = await this._vm.shallowCopy();
        vmCopy.common.setHardfork(tx.common.hardfork());
        // Run tx through copied vm to get tx gasUsed and createdAddress
        const runBlockResult = await vmCopy.runBlock({
            block,
            root: parentBlock.header.stateRoot,
            skipBlockValidation: true,
        });
        const { totalGasSpent, createdAddress } = runBlockResult.results[txIndex];
        const { blobGasPrice, blobGasUsed } = runBlockResult.receipts[txIndex];
        return jsonRpcReceipt(receipt, totalGasSpent, effectiveGasPrice, block, tx, txIndex, logIndex, createdAddress, blobGasUsed, blobGasPrice);
    }
    /**
     * Returns an array of all logs matching a given filter object.
     * Only available with `--saveReceipts` enabled
     * @param params An object of the filter options {@link GetLogsParams}
     */
    async getLogs(params) {
        const { fromBlock, toBlock, blockHash, address, topics } = params[0];
        if (!this.receiptsManager)
            throw new Error('missing receiptsManager');
        if (blockHash !== undefined && (fromBlock !== undefined || toBlock !== undefined)) {
            throw {
                code: error_code_1.INVALID_PARAMS,
                message: `Can only specify a blockHash if fromBlock or toBlock are not provided`,
            };
        }
        let from, to;
        if (blockHash !== undefined) {
            try {
                from = to = await this._chain.getBlock((0, util_1.hexToBytes)(blockHash));
            }
            catch (error) {
                throw {
                    code: error_code_1.INVALID_PARAMS,
                    message: 'unknown blockHash',
                };
            }
        }
        else {
            if (fromBlock === 'earliest') {
                from = await this._chain.getBlock(util_1.BIGINT_0);
            }
            else if (fromBlock === 'latest' || fromBlock === undefined) {
                from = this._chain.blocks.latest;
            }
            else {
                const blockNum = BigInt(fromBlock);
                if (blockNum > this._chain.headers.height) {
                    throw {
                        code: error_code_1.INVALID_PARAMS,
                        message: 'specified `fromBlock` greater than current height',
                    };
                }
                from = await this._chain.getBlock(blockNum);
            }
            if (toBlock === fromBlock) {
                to = from;
            }
            else if (toBlock === 'latest' || toBlock === undefined) {
                to = this._chain.blocks.latest;
            }
            else {
                const blockNum = BigInt(toBlock);
                if (blockNum > this._chain.headers.height) {
                    throw {
                        code: error_code_1.INVALID_PARAMS,
                        message: 'specified `toBlock` greater than current height',
                    };
                }
                to = await this._chain.getBlock(blockNum);
            }
        }
        if (to.header.number - from.header.number >
            BigInt(this.receiptsManager.GET_LOGS_BLOCK_RANGE_LIMIT)) {
            throw {
                code: error_code_1.INVALID_PARAMS,
                message: `block range limit is ${this.receiptsManager.GET_LOGS_BLOCK_RANGE_LIMIT} blocks`,
            };
        }
        const formattedTopics = topics?.map((t) => {
            if (t === null) {
                return null;
            }
            else if (Array.isArray(t)) {
                return t.map((x) => (0, util_1.hexToBytes)(x));
            }
            else {
                return (0, util_1.hexToBytes)(t);
            }
        });
        let addrs;
        if (address !== undefined) {
            if (Array.isArray(address)) {
                addrs = address.map((a) => (0, util_1.hexToBytes)(a));
            }
            else {
                addrs = [(0, util_1.hexToBytes)(address)];
            }
        }
        const logs = await this.receiptsManager.getLogs(from, to, addrs, formattedTopics);
        return Promise.all(logs.map(({ log, block, tx, txIndex, logIndex }) => jsonRpcLog(log, block, tx, txIndex, logIndex)));
    }
    /**
     * Creates new message call transaction or a contract creation for signed transactions.
     * @param params An array of one parameter:
     *   1. the signed transaction data
     * @returns a 32-byte tx hash or the zero hash if the tx is not yet available.
     */
    async sendRawTransaction(params) {
        const [serializedTx] = params;
        const { syncTargetHeight } = this.client.config;
        if (!this.client.config.synchronized) {
            throw {
                code: error_code_1.INTERNAL_ERROR,
                message: `client is not aware of the current chain height yet (give sync some more time)`,
            };
        }
        const common = this.client.config.chainCommon.copy();
        const chainHeight = this.client.chain.headers.height;
        let txTargetHeight = syncTargetHeight ?? util_1.BIGINT_0;
        // Following step makes sure txTargetHeight > 0
        if (txTargetHeight <= chainHeight) {
            txTargetHeight = chainHeight + util_1.BIGINT_1;
        }
        common.setHardforkBy({
            blockNumber: txTargetHeight,
            timestamp: Math.floor(Date.now() / 1000),
        });
        let tx;
        try {
            const txBuf = (0, util_1.hexToBytes)(serializedTx);
            if (txBuf[0] === 0x03) {
                // Blob Transactions sent over RPC are expected to be in Network Wrapper format
                tx = tx_1.BlobEIP4844Transaction.fromSerializedBlobTxNetworkWrapper(txBuf, { common });
                const blobGasLimit = common.param('gasConfig', 'maxblobGasPerBlock');
                const blobGasPerBlob = common.param('gasConfig', 'blobGasPerBlob');
                if (BigInt((tx.blobs ?? []).length) * blobGasPerBlob > blobGasLimit) {
                    throw Error(`tx blobs=${(tx.blobs ?? []).length} exceeds block limit=${blobGasLimit / blobGasPerBlob}`);
                }
            }
            else {
                tx = tx_1.TransactionFactory.fromSerializedData(txBuf, { common });
            }
        }
        catch (e) {
            throw {
                code: error_code_1.PARSE_ERROR,
                message: `serialized tx data could not be parsed (${e.message})`,
            };
        }
        if (!tx.isSigned()) {
            throw {
                code: error_code_1.INVALID_PARAMS,
                message: `tx needs to be signed`,
            };
        }
        // Add the tx to own tx pool
        const { txPool, pool } = this.service;
        try {
            await txPool.add(tx, true);
            txPool.sendNewTxHashes([[tx.type], [tx.serialize().byteLength], [tx.hash()]], pool.peers);
        }
        catch (error) {
            throw {
                code: error_code_1.INVALID_PARAMS,
                message: error.message ?? error.toString(),
            };
        }
        const peerPool = this.service.pool;
        if (peerPool.peers.length === 0 &&
            !this.client.config.mine &&
            this.client.config.isSingleNode === false) {
            throw {
                code: error_code_1.INTERNAL_ERROR,
                message: `no peer connection available`,
            };
        }
        txPool.sendTransactions([tx], peerPool.peers);
        return (0, util_1.bytesToHex)(tx.hash());
    }
    /**
     * Returns an account object along with data about the proof.
     * @param params An array of three parameters:
     *   1. address of the account
     *   2. array of storage keys which should be proofed and included
     *   3. integer block number, or the string "latest" or "earliest"
     * @returns The {@link Proof}
     */
    async getProof(params) {
        const [addressHex, slotsHex, blockOpt] = params;
        const block = await (0, helpers_1.getBlockByOption)(blockOpt, this._chain);
        if (this._vm === undefined) {
            throw new Error('missing vm');
        }
        const vm = await this._vm.shallowCopy();
        if (!('getProof' in vm.stateManager)) {
            throw new Error('getProof RPC method not supported with the StateManager provided');
        }
        await vm.stateManager.setStateRoot(block.header.stateRoot);
        const address = util_1.Address.fromString(addressHex);
        const slots = slotsHex.map((slotHex) => (0, util_1.setLengthLeft)((0, util_1.hexToBytes)(slotHex), 32));
        const proof = await vm.stateManager.getProof(address, slots);
        return proof;
    }
    /**
     * Returns an object with data about the sync status or false.
     * @param params An empty array
     * @returns An object with sync status data or false (when not syncing)
     *   * startingBlock - The block at which the import started (will only be reset after the sync reached his head)
     *   * currentBlock - The current block, same as eth_blockNumber
     *   * highestBlock - The estimated highest block
     */
    async syncing(_params = []) {
        if (this.client.config.synchronized) {
            return false;
        }
        const currentBlockHeader = this._chain.headers?.latest ?? (await this._chain.getCanonicalHeadHeader());
        const currentBlock = (0, util_1.bigIntToHex)(currentBlockHeader.number);
        const synchronizer = this.client.services[0].synchronizer;
        if (!synchronizer) {
            return false;
        }
        const { syncTargetHeight } = this.client.config;
        const startingBlock = (0, util_1.bigIntToHex)(synchronizer.startingBlock);
        let highestBlock;
        if (typeof syncTargetHeight === 'bigint' && syncTargetHeight !== util_1.BIGINT_0) {
            highestBlock = (0, util_1.bigIntToHex)(syncTargetHeight);
        }
        else {
            const bestPeer = await synchronizer.best();
            if (!bestPeer) {
                throw {
                    code: error_code_1.INTERNAL_ERROR,
                    message: `no peer available for synchronization`,
                };
            }
            const highestBlockHeader = await synchronizer.latest(bestPeer);
            if (!highestBlockHeader) {
                throw {
                    code: error_code_1.INTERNAL_ERROR,
                    message: `highest block header unavailable`,
                };
            }
            highestBlock = (0, util_1.bigIntToHex)(highestBlockHeader.number);
        }
        return { startingBlock, currentBlock, highestBlock };
    }
    /**
     * Returns the transaction count for a block given by the block number.
     * @param params An array of one parameter:
     *  1. integer of a block number, or the string "latest", "earliest" or "pending"
     */
    async getBlockTransactionCountByNumber(params) {
        const [blockOpt] = params;
        const block = await (0, helpers_1.getBlockByOption)(blockOpt, this._chain);
        return (0, util_1.intToHex)(block.transactions.length);
    }
    /**
     * Gas price oracle.
     *
     * Returns a suggested gas price.
     * @returns a hex code of an integer representing the suggested gas price in wei.
     */
    async gasPrice() {
        const minGasPrice = this._chain.config.chainCommon.param('gasConfig', 'minPrice');
        let gasPrice = util_1.BIGINT_0;
        const latest = await this._chain.getCanonicalHeadHeader();
        if (this._vm !== undefined && this._vm.common.isActivatedEIP(1559)) {
            const baseFee = latest.calcNextBaseFee();
            let priorityFee = util_1.BIGINT_0;
            const block = await this._chain.getBlock(latest.number);
            for (const tx of block.transactions) {
                const maxPriorityFeePerGas = tx.maxPriorityFeePerGas;
                priorityFee += maxPriorityFeePerGas;
            }
            priorityFee =
                priorityFee !== util_1.BIGINT_0 ? priorityFee / BigInt(block.transactions.length) : util_1.BIGINT_1;
            gasPrice = baseFee + priorityFee > minGasPrice ? baseFee + priorityFee : minGasPrice;
        }
        else {
            // For chains that don't support EIP-1559 we iterate over the last 20
            // blocks to get an average gas price.
            const blockIterations = 20 < latest.number ? 20 : latest.number;
            let txCount = util_1.BIGINT_0;
            for (let i = 0; i < blockIterations; i++) {
                const block = await this._chain.getBlock(latest.number - BigInt(i));
                if (block.transactions.length === 0) {
                    continue;
                }
                for (const tx of block.transactions) {
                    const txGasPrice = tx.gasPrice;
                    gasPrice += txGasPrice;
                    txCount++;
                }
            }
            if (txCount > 0) {
                const avgGasPrice = gasPrice / txCount;
                gasPrice = avgGasPrice > minGasPrice ? avgGasPrice : minGasPrice;
            }
            else {
                gasPrice = minGasPrice;
            }
        }
        return (0, util_1.bigIntToHex)(gasPrice);
    }
    async feeHistory(params) {
        const blockCount = BigInt(params[0]);
        const [, lastBlockRequested, priorityFeePercentiles] = params;
        if (blockCount < 1 || blockCount > 1024) {
            throw {
                code: error_code_1.INVALID_PARAMS,
                message: 'invalid block count',
            };
        }
        const { number: lastRequestedBlockNumber } = (await (0, helpers_1.getBlockByOption)(lastBlockRequested, this._chain)).header;
        const oldestBlockNumber = (0, util_1.bigIntMax)(lastRequestedBlockNumber - blockCount + util_1.BIGINT_1, util_1.BIGINT_0);
        const requestedBlockNumbers = Array.from({ length: Number(blockCount) }, (_, i) => oldestBlockNumber + BigInt(i));
        const requestedBlocks = await Promise.all(requestedBlockNumbers.map((n) => (0, helpers_1.getBlockByOption)(n.toString(), this._chain)));
        const [baseFees, gasUsedRatios, baseFeePerBlobGas, blobGasUsedRatio] = requestedBlocks.reduce((v, b) => {
            const [prevBaseFees, prevGasUsedRatios, prevBaseFeesPerBlobGas, prevBlobGasUsedRatio] = v;
            const { baseFeePerGas, gasUsed, gasLimit, blobGasUsed } = b.header;
            let baseFeePerBlobGas = util_1.BIGINT_0;
            let blobGasUsedRatio = 0;
            if (b.header.excessBlobGas !== undefined) {
                baseFeePerBlobGas = b.header.getBlobGasPrice();
                const max = b.common.param('gasConfig', 'maxblobGasPerBlock');
                blobGasUsedRatio = Number(blobGasUsed) / Number(max);
            }
            prevBaseFees.push(baseFeePerGas ?? util_1.BIGINT_0);
            prevGasUsedRatios.push(Number(gasUsed) / Number(gasLimit));
            prevBaseFeesPerBlobGas.push(baseFeePerBlobGas);
            prevBlobGasUsedRatio.push(blobGasUsedRatio);
            return [prevBaseFees, prevGasUsedRatios, prevBaseFeesPerBlobGas, prevBlobGasUsedRatio];
        }, [[], [], [], []]);
        const londonHardforkBlockNumber = this._chain.blockchain.common.hardforkBlock(common_1.Hardfork.London);
        const nextBaseFee = lastRequestedBlockNumber - londonHardforkBlockNumber >= util_1.BIGINT_NEG1
            ? requestedBlocks[requestedBlocks.length - 1].header.calcNextBaseFee()
            : util_1.BIGINT_0;
        baseFees.push(nextBaseFee);
        if (this._chain.blockchain.common.isActivatedEIP(4844)) {
            baseFeePerBlobGas.push(requestedBlocks[requestedBlocks.length - 1].header.calcNextBlobGasPrice());
        }
        else {
            // TODO (?): known bug
            // If the next block is the first block where 4844 is returned, then
            // BIGINT_1 should be pushed, not BIGINT_0
            baseFeePerBlobGas.push(util_1.BIGINT_0);
        }
        let rewards = [];
        if (this.receiptsManager && priorityFeePercentiles) {
            rewards = await Promise.all(requestedBlocks.map((b) => calculateRewards(b, this.receiptsManager, priorityFeePercentiles)));
        }
        return {
            baseFeePerGas: baseFees.map(util_1.bigIntToHex),
            gasUsedRatio: gasUsedRatios,
            baseFeePerBlobGas: baseFeePerBlobGas.map(util_1.bigIntToHex),
            blobGasUsedRatio,
            oldestBlock: (0, util_1.bigIntToHex)(oldestBlockNumber),
            reward: rewards.map((r) => r.map(util_1.bigIntToHex)),
        };
    }
}
exports.Eth = Eth;
//# sourceMappingURL=eth.js.map