"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Debug = void 0;
const util_1 = require("@ethereumjs/util");
const error_code_1 = require("../error-code");
const helpers_1 = require("../helpers");
const validation_1 = require("../validation");
/**
 * Validate tracer opts to ensure only supports opts are provided
 * @param opts a dictionary of {@link tracerOpts}
 * @returns a dictionary of valid {@link tracerOpts}
 * @throws if invalid tracer options are provided
 */
const validateTracerConfig = (opts) => {
    if (opts.tracerConfig !== undefined) {
        throw {
            code: error_code_1.INVALID_PARAMS,
            message: 'custom tracers and tracer configurations are not implemented',
        };
    }
    if (opts.tracer !== undefined) {
        throw {
            code: error_code_1.INVALID_PARAMS,
            message: 'custom tracers not implemented',
        };
    }
    if (opts.timeout !== undefined) {
        throw {
            code: error_code_1.INVALID_PARAMS,
            message: 'custom tracer timeouts not implemented',
        };
    }
    if (opts.enableReturnData === true) {
        throw {
            code: error_code_1.INVALID_PARAMS,
            message: 'enabling return data not implemented',
        };
    }
    return {
        ...{ disableStack: false, disableStorage: false, enableMemory: false, enableReturnData: false },
        ...opts,
    };
};
/**
 * debug_* RPC module
 * @memberof module:rpc/modules
 */
class Debug {
    /**
     * Create debug_* RPC module
     * @param client Client to which the module binds
     */
    constructor(client, rpcDebug) {
        this.service = client.services.find((s) => s.name === 'eth');
        this.chain = this.service.chain;
        this.vm = this.service.execution?.vm;
        this._rpcDebug = rpcDebug;
        this.traceTransaction = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.traceTransaction.bind(this), this._rpcDebug), 1, [[validation_1.validators.hex]]);
        this.traceCall = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.traceCall.bind(this), this._rpcDebug), 2, [
            [validation_1.validators.transaction()],
            [validation_1.validators.blockOption],
        ]);
        this.storageRangeAt = (0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.storageRangeAt.bind(this), this._rpcDebug), 5, [
            [validation_1.validators.blockHash],
            [validation_1.validators.unsignedInteger],
            [validation_1.validators.address],
            [validation_1.validators.uint256],
            [validation_1.validators.unsignedInteger],
        ]);
    }
    /**
     * Returns a call trace for the requested transaction or null if not available
     * @param params an array of two parameters:
     *     1. string representing the transaction hash
     *     2. an optional tracer options object
     */
    async traceTransaction(params) {
        const [txHash, config] = params;
        // Validate configuration and parameters
        if (!this.service.execution.receiptsManager) {
            throw {
                message: 'missing receiptsManager',
                code: error_code_1.INTERNAL_ERROR,
            };
        }
        const opts = validateTracerConfig(config);
        const result = await this.service.execution.receiptsManager.getReceiptByTxHash((0, util_1.hexToBytes)(txHash));
        if (!result)
            return null;
        const [_, blockHash, txIndex] = result;
        const block = await this.service.chain.getBlock(blockHash);
        const parentBlock = await this.service.chain.getBlock(block.header.parentHash);
        const tx = block.transactions[txIndex];
        // Copy VM so as to not modify state when running transactions being traced
        const vmCopy = await this.service.execution.vm.shallowCopy();
        await vmCopy.stateManager.setStateRoot(parentBlock.header.stateRoot);
        for (let x = 0; x < txIndex; x++) {
            // Run all txns in the block prior to the traced transaction
            await vmCopy.runTx({ tx: block.transactions[x], block });
        }
        const trace = {
            gas: '',
            returnValue: '',
            failed: false,
            structLogs: [],
        };
        vmCopy.evm.events?.on('step', async (step, next) => {
            const memory = [];
            let storage = {};
            if (opts.disableStorage === false) {
                storage = await vmCopy.stateManager.dumpStorage(step.address);
            }
            if (opts.enableMemory === true) {
                for (let x = 0; x < step.memoryWordCount; x++) {
                    const word = (0, util_1.bytesToHex)(step.memory.slice(x * 32, 32));
                    memory.push(word);
                }
            }
            const log = {
                pc: step.pc,
                op: step.opcode.name,
                gasCost: step.opcode.fee + Number(step.opcode.dynamicFee),
                gas: Number(step.gasLeft),
                depth: step.depth,
                error: null,
                stack: opts.disableStack !== true ? step.stack.map(util_1.bigIntToHex) : undefined,
                storage,
                memory,
                returnData: undefined,
            };
            trace.structLogs.push(log);
            next?.();
        });
        vmCopy.evm.events?.on('afterMessage', (data, next) => {
            if (data.execResult.exceptionError !== undefined && trace.structLogs.length > 0) {
                // Mark last opcode trace as error if exception occurs
                trace.structLogs[trace.structLogs.length - 1].error = true;
            }
            next?.();
        });
        const res = await vmCopy.runTx({ tx, block });
        trace.gas = (0, util_1.bigIntToHex)(res.totalGasSpent);
        trace.failed = res.execResult.exceptionError !== undefined;
        trace.returnValue = (0, util_1.bytesToHex)(res.execResult.returnValue);
        return trace;
    }
    /**
     * Returns a trace of an eth_call within the context of the given block execution using the final state of the parent block
     * @param params an array of 3 parameters:
     *    1. an {@link RpcTx} object that mirrors the eth_call parameters object
     *    2. A block hash or number formatted as a hex prefixed string
     *    3. An optional tracer options object
     * @returns an execution trace of an {@link eth_call} in the context of a given block execution
     * mirroring the output from {@link traceTransaction}
     */
    async traceCall(params) {
        const [callArgs, blockOpt, tracerOpts] = params;
        // Validate configuration and parameters
        if (!this.service.execution.receiptsManager) {
            throw {
                message: 'missing receiptsManager',
                code: error_code_1.INTERNAL_ERROR,
            };
        }
        if (this.vm === undefined) {
            throw new Error('missing vm');
        }
        const opts = validateTracerConfig(tracerOpts);
        const block = await (0, helpers_1.getBlockByOption)(blockOpt, this.chain);
        const parentBlock = await this.service.chain.getBlock(block.header.parentHash);
        const vm = await this.vm.shallowCopy();
        await vm.stateManager.setStateRoot(parentBlock.header.stateRoot);
        const { from, to, gas: gasLimit, gasPrice, value, data } = callArgs;
        const trace = {
            gas: '',
            returnValue: '',
            failed: false,
            structLogs: [],
        };
        vm.evm.events?.on('step', async (step, next) => {
            const memory = [];
            let storage = {};
            if (opts.disableStorage === false) {
                storage = await vm.stateManager.dumpStorage(step.address);
            }
            if (opts.enableMemory === true) {
                for (let x = 0; x < step.memoryWordCount; x++) {
                    const word = (0, util_1.bytesToHex)(step.memory.slice(x * 32, 32));
                    memory.push(word);
                }
            }
            const log = {
                pc: step.pc,
                op: step.opcode.name,
                gasCost: step.opcode.fee + Number(step.opcode.dynamicFee),
                gas: Number(step.gasLeft),
                depth: step.depth,
                error: null,
                stack: opts.disableStack !== true ? step.stack.map(util_1.bigIntToHex) : undefined,
                storage,
                memory,
                returnData: undefined,
            };
            trace.structLogs.push(log);
            next?.();
        });
        vm.evm.events?.on('afterMessage', (data, next) => {
            if (data.execResult.exceptionError !== undefined && trace.structLogs.length > 0) {
                // Mark last opcode trace as error if exception occurs
                trace.structLogs[trace.structLogs.length - 1].error = true;
            }
            next?.();
        });
        const runCallOpts = {
            caller: from !== undefined ? util_1.Address.fromString(from) : undefined,
            to: to !== undefined ? util_1.Address.fromString(to) : undefined,
            gasLimit: (0, util_1.toType)(gasLimit, util_1.TypeOutput.BigInt),
            gasPrice: (0, util_1.toType)(gasPrice, util_1.TypeOutput.BigInt),
            value: (0, util_1.toType)(value, util_1.TypeOutput.BigInt),
            data: data !== undefined ? (0, util_1.hexToBytes)(data) : undefined,
        };
        const res = await vm.evm.runCall(runCallOpts);
        trace.gas = (0, util_1.bigIntToHex)(res.execResult.executionGasUsed);
        trace.failed = res.execResult.exceptionError !== undefined;
        trace.returnValue = (0, util_1.bytesToHex)(res.execResult.returnValue);
        return trace;
    }
    /**
     * Returns a limited set of storage keys belonging to an account.
     * @param params An array of 5 parameters:
     *    1. The hash of the block at which to get storage from the state.
     *    2. The transaction index of the requested block post which to get the storage.
     *    3. The address of the account.
     *    4. The starting (hashed) key from which storage will be returned. To include the entire range, pass '0x00'.
     *    5. The maximum number of storage values that could be returned.
     * @returns A {@link StorageRange} object that will contain at most `limit` entries in its `storage` field.
     * The object will also contain `nextKey`, the next (hashed) storage key after the range included in `storage`.
     */
    async storageRangeAt(params) {
        const [blockHash, txIndex, account, startKey, limit] = params;
        if (this.vm === undefined) {
            throw new Error('Missing VM.');
        }
        let block;
        try {
            // Validator already verified that `blockHash` is properly formatted.
            block = await this.chain.getBlock((0, util_1.hexToBytes)(blockHash));
        }
        catch (err) {
            throw {
                code: error_code_1.INTERNAL_ERROR,
                message: 'Could not get requested block hash.',
            };
        }
        if (txIndex >= block.transactions.length) {
            throw {
                code: error_code_1.INTERNAL_ERROR,
                message: 'txIndex cannot be larger than the number of transactions in the block.',
            };
        }
        const parentBlock = await this.chain.getBlock(block.header.parentHash);
        // Copy the VM and run transactions including the relevant transaction.
        const vmCopy = await this.vm.shallowCopy();
        await vmCopy.stateManager.setStateRoot(parentBlock.header.stateRoot);
        for (let i = 0; i <= txIndex; i++) {
            await vmCopy.runTx({ tx: block.transactions[i], block });
        }
        // await here so that any error can be handled in the catch below for proper response
        return vmCopy.stateManager.dumpStorageRange(
        // Validator already verified that `account` and `startKey` are properly formatted.
        util_1.Address.fromString(account), BigInt(startKey), limit);
    }
}
exports.Debug = Debug;
//# sourceMappingURL=debug.js.map