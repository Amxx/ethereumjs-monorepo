"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Engine = void 0;
const common_1 = require("@ethereumjs/common");
const util_1 = require("@ethereumjs/util");
const execution_1 = require("../../../execution");
const miner_1 = require("../../../miner");
const sync_1 = require("../../../sync");
const util_2 = require("../../../util");
const error_code_1 = require("../../error-code");
const helpers_1 = require("../../helpers");
const validation_1 = require("../../validation");
const CLConnectionManager_1 = require("./CLConnectionManager");
const types_1 = require("./types");
const util_3 = require("./util");
const validators_1 = require("./validators");
const zeroBlockHash = (0, util_1.zeros)(32);
/**
 * engine_* RPC module
 * @memberof module:rpc/modules
 */
class Engine {
    /**
     * Create engine_* RPC module
     * @param client Client to which the module binds
     */
    constructor(client, rpcDebug) {
        this.lastNewPayloadHF = '';
        this.lastForkchoiceUpdatedHF = '';
        this.lastAnnouncementTime = Date.now();
        this.lastAnnouncementStatus = '';
        /**
         * Log EL sync status
         */
        this.logELStatus = () => {
            const forceShowInfo = Date.now() - this.lastAnnouncementTime > 6000;
            if (forceShowInfo) {
                this.lastAnnouncementTime = Date.now();
            }
            const fetcher = this.service.beaconSync?.fetcher;
            this.lastAnnouncementStatus = this.skeleton.logSyncStatus('[ EL ]', {
                forceShowInfo,
                lastStatus: this.lastAnnouncementStatus,
                vmexecution: { started: this.execution.started, running: this.execution.running },
                fetching: fetcher !== undefined && fetcher !== null && fetcher.syncErrored === undefined,
                snapsync: this.service.snapsync?.fetcherDoneFlags,
                peers: this.service.beaconSync?.pool.size,
            });
        };
        this.client = client;
        this.service = client.services.find((s) => s.name === 'eth');
        this.chain = this.service.chain;
        this.config = this.chain.config;
        this._rpcDebug = rpcDebug;
        if (this.service.execution === undefined) {
            throw Error('execution required for engine module');
        }
        this.execution = this.service.execution;
        this.vm = this.execution.vm;
        if (this.service.skeleton === undefined) {
            throw Error('skeleton required for engine module');
        }
        this.skeleton = this.service.skeleton;
        this.connectionManager = new CLConnectionManager_1.CLConnectionManager({
            config: this.chain.config,
            inActivityCb: this.logELStatus,
        });
        this.pendingBlock = new miner_1.PendingBlock({ config: this.config, txPool: this.service.txPool });
        // refactor to move entire chainCache to chain itself including skeleton
        this.remoteBlocks = this.chain.blockCache.remoteBlocks;
        this.executedBlocks = this.chain.blockCache.executedBlocks;
        this.invalidBlocks = this.chain.blockCache.invalidBlocks;
        this.chainCache = {
            remoteBlocks: this.remoteBlocks,
            executedBlocks: this.executedBlocks,
            invalidBlocks: this.invalidBlocks,
            skeleton: this.skeleton,
        };
        this.initValidators();
    }
    /**
     * Configuration and initialization of custom Engine API call validators
     */
    initValidators() {
        /**
         * newPayload
         */
        this.newPayloadV1 = (0, CLConnectionManager_1.middleware)((0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.newPayloadV1.bind(this), this._rpcDebug), 1, [
            [validation_1.validators.object(validators_1.executionPayloadV1FieldValidators)],
        ]), ([payload], response) => this.connectionManager.lastNewPayload({ payload, response }));
        this.newPayloadV2 = (0, CLConnectionManager_1.middleware)((0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.newPayloadV2.bind(this), this._rpcDebug), 1, [
            [
                validation_1.validators.either(validation_1.validators.object(validators_1.executionPayloadV1FieldValidators), validation_1.validators.object(validators_1.executionPayloadV2FieldValidators)),
            ],
        ]), ([payload], response) => this.connectionManager.lastNewPayload({ payload, response }));
        this.newPayloadV3 = (0, CLConnectionManager_1.middleware)((0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.newPayloadV3.bind(this), this._rpcDebug), 3, [
            [validation_1.validators.object(validators_1.executionPayloadV3FieldValidators)],
            [validation_1.validators.array(validation_1.validators.bytes32)],
            [validation_1.validators.bytes32],
        ], ['executionPayload', 'blobVersionedHashes', 'parentBeaconBlockRoot']), ([payload], response) => this.connectionManager.lastNewPayload({ payload, response }));
        /**
         * forkchoiceUpdated
         */
        const forkchoiceUpdatedResponseCMHandler = ([state], response, error) => {
            this.connectionManager.lastForkchoiceUpdate({
                state,
                response,
                headBlock: response?.headBlock,
                error,
            });
            this.logELStatus();
            delete response?.headBlock;
        };
        this.forkchoiceUpdatedV1 = (0, CLConnectionManager_1.middleware)((0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.forkchoiceUpdatedV1.bind(this), this._rpcDebug), 1, [
            [validation_1.validators.object(validators_1.forkchoiceFieldValidators)],
            [validation_1.validators.optional(validation_1.validators.object(validators_1.payloadAttributesFieldValidatorsV1))],
        ]), forkchoiceUpdatedResponseCMHandler);
        this.forkchoiceUpdatedV2 = (0, CLConnectionManager_1.middleware)((0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.forkchoiceUpdatedV2.bind(this), this._rpcDebug), 1, [
            [validation_1.validators.object(validators_1.forkchoiceFieldValidators)],
            [validation_1.validators.optional(validation_1.validators.object(validators_1.payloadAttributesFieldValidatorsV2))],
        ]), forkchoiceUpdatedResponseCMHandler);
        this.forkchoiceUpdatedV3 = (0, CLConnectionManager_1.middleware)((0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.forkchoiceUpdatedV3.bind(this), this._rpcDebug), 1, [
            [validation_1.validators.object(validators_1.forkchoiceFieldValidators)],
            [validation_1.validators.optional(validation_1.validators.object(validators_1.payloadAttributesFieldValidatorsV3))],
        ]), forkchoiceUpdatedResponseCMHandler);
        /**
         * getPayload
         */
        this.getPayloadV1 = (0, CLConnectionManager_1.middleware)((0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.getPayloadV1.bind(this), this._rpcDebug), 1, [
            [validation_1.validators.bytes8],
        ]), () => this.connectionManager.updateStatus());
        this.getPayloadV2 = (0, CLConnectionManager_1.middleware)((0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.getPayloadV2.bind(this), this._rpcDebug), 1, [
            [validation_1.validators.bytes8],
        ]), () => this.connectionManager.updateStatus());
        this.getPayloadV3 = (0, CLConnectionManager_1.middleware)((0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.getPayloadV3.bind(this), this._rpcDebug), 1, [
            [validation_1.validators.bytes8],
        ]), () => this.connectionManager.updateStatus());
        /**
         * exchangeTransitionConfiguration
         */
        this.exchangeTransitionConfigurationV1 = (0, CLConnectionManager_1.middleware)((0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.exchangeTransitionConfigurationV1.bind(this), this._rpcDebug), 1, [
            [
                validation_1.validators.object({
                    terminalTotalDifficulty: validation_1.validators.uint256,
                    terminalBlockHash: validation_1.validators.bytes32,
                    terminalBlockNumber: validation_1.validators.uint64,
                }),
            ],
        ]), () => this.connectionManager.updateStatus());
        /**
         * exchangeCapabilities
         */
        this.exchangeCapabilities = (0, CLConnectionManager_1.middleware)((0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.exchangeCapabilities.bind(this), this._rpcDebug), 0, []), () => this.connectionManager.updateStatus());
        /**
         * getPayloadBodiesByHash
         */
        this.getPayloadBodiesByHashV1 = (0, CLConnectionManager_1.middleware)((0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.getPayloadBodiesByHashV1.bind(this), this._rpcDebug), 1, [
            [validation_1.validators.array(validation_1.validators.bytes32)],
        ]), () => this.connectionManager.updateStatus());
        /**
         * getPayloadBodiesByRange
         */
        this.getPayloadBodiesByRangeV1 = (0, CLConnectionManager_1.middleware)((0, validation_1.middleware)((0, helpers_1.callWithStackTrace)(this.getPayloadBodiesByRangeV1.bind(this), this._rpcDebug), 2, [
            [validation_1.validators.bytes8],
            [validation_1.validators.bytes8],
        ]), () => this.connectionManager.updateStatus());
    }
    /**
     * Verifies the payload according to the execution environment
     * rule set (EIP-3675) and returns the status of the verification.
     *
     * @param params An array of one parameter:
     *   1. An object as an instance of {@link ExecutionPayloadV1}
     * @returns An object of shape {@link PayloadStatusV1}:
     *   1. status: String - the result of the payload execution
     *        VALID - given payload is valid
     *        INVALID - given payload is invalid
     *        SYNCING - sync process is in progress
     *        ACCEPTED - blockHash is valid, doesn't extend the canonical chain, hasn't been fully validated
     *        INVALID_BLOCK_HASH - blockHash validation failed
     *   2. latestValidHash: DATA|null - the hash of the most recent
     *      valid block in the branch defined by payload and its ancestors
     *   3. validationError: String|null - validation error message
     */
    async newPayload(params) {
        const [payload, blobVersionedHashes, parentBeaconBlockRoot] = params;
        if (this.config.synchronized) {
            this.connectionManager.newPayloadLog();
        }
        const { parentHash, blockHash } = payload;
        // we can be strict and return with invalid if this block was previous invalidated in
        // invalidBlocks cache, but to have a more robust behavior instead:
        //
        // we remove this block from invalidBlocks for it to be evaluated again against the
        // new data/corrections the CL might be calling newPayload with
        this.invalidBlocks.delete(blockHash.slice(2));
        /**
         * See if block can be assembled from payload
         */
        // newpayloadv3 comes with parentBeaconBlockRoot out of the payload
        const { block: headBlock, error } = await (0, util_3.assembleBlock)({
            ...payload,
            // ExecutionPayload only handles undefined
            parentBeaconBlockRoot: parentBeaconBlockRoot ?? undefined,
        }, this.chain, this.chainCache);
        if (headBlock === undefined || error !== undefined) {
            let response = error;
            if (!response) {
                const validationError = `Error assembling block from payload during initialization`;
                this.config.logger.debug(validationError);
                const latestValidHash = await (0, util_3.validHash)((0, util_1.hexToBytes)(parentHash), this.chain, this.chainCache);
                response = { status: types_1.Status.INVALID, latestValidHash, validationError };
            }
            // skip marking the block invalid as this is more of a data issue from CL
            return response;
        }
        /**
         * Validate blob versioned hashes in the context of EIP-4844 blob transactions
         */
        if (headBlock.common.isActivatedEIP(4844)) {
            let validationError = null;
            if (blobVersionedHashes === undefined || blobVersionedHashes === null) {
                validationError = `Error verifying blobVersionedHashes: received none`;
            }
            else {
                validationError = (0, util_3.validate4844BlobVersionedHashes)(headBlock, blobVersionedHashes);
            }
            // if there was a validation error return invalid
            if (validationError !== null) {
                this.config.logger.debug(validationError);
                const latestValidHash = await (0, util_3.validHash)((0, util_1.hexToBytes)(parentHash), this.chain, this.chainCache);
                const response = { status: types_1.Status.INVALID, latestValidHash, validationError };
                // skip marking the block invalid as this is more of a data issue from CL
                return response;
            }
        }
        else if (blobVersionedHashes !== undefined && blobVersionedHashes !== null) {
            const validationError = `Invalid blobVersionedHashes before EIP-4844 is activated`;
            const latestValidHash = await (0, util_3.validHash)((0, util_1.hexToBytes)(parentHash), this.chain, this.chainCache);
            const response = { status: types_1.Status.INVALID, latestValidHash, validationError };
            // skip marking the block invalid as this is more of a data issue from CL
            return response;
        }
        /**
         * Stats and hardfork updates
         */
        this.connectionManager.updatePayloadStats(headBlock);
        const hardfork = headBlock.common.hardfork();
        if (hardfork !== this.lastNewPayloadHF && this.lastNewPayloadHF !== '') {
            this.config.logger.info(`Hardfork change along new payload block number=${headBlock.header.number} hash=${(0, util_2.short)(headBlock.hash())} old=${this.lastNewPayloadHF} new=${hardfork}`);
        }
        this.lastNewPayloadHF = hardfork;
        try {
            /**
             * get the parent from beacon skeleton or from remoteBlocks cache or from the chain
             * to run basic validations based on parent
             */
            const parent = (await this.skeleton.getBlockByHash((0, util_1.hexToBytes)(parentHash), true)) ??
                this.remoteBlocks.get(parentHash.slice(2)) ??
                (await this.chain.getBlock((0, util_1.hexToBytes)(parentHash)));
            // Validations with parent
            if (!parent.common.gteHardfork(common_1.Hardfork.Paris)) {
                const validTerminalBlock = await (0, util_3.validateTerminalBlock)(parent, this.chain);
                if (!validTerminalBlock) {
                    const response = {
                        status: types_1.Status.INVALID,
                        validationError: null,
                        latestValidHash: (0, util_1.bytesToHex)((0, util_1.zeros)(32)),
                    };
                    this.invalidBlocks.set(blockHash.slice(2), new Error(response.validationError ?? 'Terminal block validation failed'));
                    return response;
                }
            }
            /**
             * validate 4844 transactions and fields as these validations generally happen on putBlocks
             * when parent is confirmed to be in the chain. But we can do it here early
             */
            if (headBlock.common.isActivatedEIP(4844)) {
                try {
                    headBlock.validateBlobTransactions(parent.header);
                }
                catch (error) {
                    const validationError = `Invalid 4844 transactions: ${error}`;
                    const latestValidHash = await (0, util_3.validHash)((0, util_1.hexToBytes)(parentHash), this.chain, this.chainCache);
                    const response = { status: types_1.Status.INVALID, latestValidHash, validationError };
                    // skip marking the block invalid as this is more of a data issue from CL
                    return response;
                }
            }
            /**
             * Check for executed parent
             */
            const executedParentExists = this.executedBlocks.get(parentHash.slice(2)) ??
                (await (0, util_3.validExecutedChainBlock)((0, util_1.hexToBytes)(parentHash), this.chain));
            // If the parent is not executed throw an error, it will be caught and return SYNCING or ACCEPTED.
            if (!executedParentExists) {
                throw new Error(`Parent block not yet executed number=${parent.header.number}`);
            }
        }
        catch (error) {
            // Stash the block for a potential forced forkchoice update to it later.
            this.remoteBlocks.set((0, util_1.bytesToUnprefixedHex)(headBlock.hash()), headBlock);
            const optimisticLookup = !(await this.skeleton.setHead(headBlock, false));
            /**
             * Invalid skeleton PUT
             */
            if (this.skeleton.fillStatus?.status === sync_1.PutStatus.INVALID &&
                optimisticLookup &&
                headBlock.header.number >= this.skeleton.fillStatus.height) {
                const latestValidHash = this.chain.blocks.latest !== null
                    ? await (0, util_3.validHash)(this.chain.blocks.latest.hash(), this.chain, this.chainCache)
                    : (0, util_1.bytesToHex)((0, util_1.zeros)(32));
                const response = {
                    status: types_1.Status.INVALID,
                    validationError: this.skeleton.fillStatus.validationError ?? '',
                    latestValidHash,
                };
                return response;
            }
            /**
             * Invalid execution
             */
            if (this.execution.chainStatus?.status === execution_1.ExecStatus.INVALID &&
                optimisticLookup &&
                headBlock.header.number >= this.execution.chainStatus.height) {
                // if the invalid block is canonical along the current chain return invalid
                const invalidBlock = await this.skeleton.getBlockByHash(this.execution.chainStatus.hash, true);
                if (invalidBlock !== undefined) {
                    // hard luck: block along canonical chain is invalid
                    const latestValidHash = await (0, util_3.validHash)(invalidBlock.header.parentHash, this.chain, this.chainCache);
                    const validationError = `Block number=${invalidBlock.header.number} hash=${(0, util_2.short)(invalidBlock.hash())} root=${(0, util_2.short)(invalidBlock.header.stateRoot)} along the canonical chain is invalid`;
                    const response = {
                        status: types_1.Status.INVALID,
                        latestValidHash,
                        validationError,
                    };
                    return response;
                }
            }
            const status = 
            // If the transitioned to beacon sync and this block can extend beacon chain then
            optimisticLookup === true ? types_1.Status.SYNCING : types_1.Status.ACCEPTED;
            const response = { status, validationError: null, latestValidHash: null };
            return response;
        }
        // This optimistic lookup keeps skeleton updated even if for e.g. beacon sync might not have
        // been initialized here but a batch of blocks new payloads arrive, most likely during sync
        // We still can't switch to beacon sync here especially if the chain is pre merge and there
        // is pow block which this client would like to mint and attempt proposing it
        //
        // Call skeleton.setHead without forcing head change to return if the block is reorged or not
        // Do optimistic lookup if not reorged
        //
        // TODO: Determine if this optimistic lookup can be combined with the optimistic lookup above
        // from within the catch clause (by skipping the code from the catch clause), code looks
        // identical, same for executedBlockExists code below ??
        const optimisticLookup = !(await this.skeleton.setHead(headBlock, false));
        if (this.skeleton.fillStatus?.status === sync_1.PutStatus.INVALID &&
            optimisticLookup &&
            headBlock.header.number >= this.skeleton.fillStatus.height) {
            const latestValidHash = this.chain.blocks.latest !== null
                ? await (0, util_3.validHash)(this.chain.blocks.latest.hash(), this.chain, this.chainCache)
                : (0, util_1.bytesToHex)((0, util_1.zeros)(32));
            const response = {
                status: types_1.Status.INVALID,
                validationError: this.skeleton.fillStatus.validationError ?? '',
                latestValidHash,
            };
            return response;
        }
        this.remoteBlocks.set((0, util_1.bytesToUnprefixedHex)(headBlock.hash()), headBlock);
        // we should check if the block exists executed in remoteBlocks or in chain as a check since stateroot
        // exists in statemanager is not sufficient because an invalid crafted block with valid block hash with
        // some pre-executed stateroot can be sent
        const executedBlockExists = this.executedBlocks.get(blockHash.slice(2)) ??
            (await (0, util_3.validExecutedChainBlock)((0, util_1.hexToBytes)(blockHash), this.chain));
        if (executedBlockExists) {
            const response = {
                status: types_1.Status.VALID,
                latestValidHash: blockHash,
                validationError: null,
            };
            return response;
        }
        if (this.execution.chainStatus?.status === execution_1.ExecStatus.INVALID &&
            optimisticLookup &&
            headBlock.header.number >= this.execution.chainStatus.height) {
            // if the invalid block is canonical along the current chain return invalid
            const invalidBlock = await this.skeleton.getBlockByHash(this.execution.chainStatus.hash, true);
            if (invalidBlock !== undefined) {
                // hard luck: block along canonical chain is invalid
                const latestValidHash = await (0, util_3.validHash)(invalidBlock.header.parentHash, this.chain, this.chainCache);
                const validationError = `Block number=${invalidBlock.header.number} hash=${(0, util_2.short)(invalidBlock.hash())} root=${(0, util_2.short)(invalidBlock.header.stateRoot)} along the canonical chain is invalid`;
                const response = {
                    status: types_1.Status.INVALID,
                    latestValidHash,
                    validationError,
                };
                return response;
            }
        }
        /**
         * 1. Determine non-executed blocks from beyond vmHead to headBlock
         * 2. Iterate through non-executed blocks
         * 3. Determine if block should be executed by some extra conditions
         * 4. Execute block with this.execution.runWithoutSetHead()
         */
        const vmHead = this.chainCache.executedBlocks.get(parentHash.slice(2)) ??
            (await this.chain.blockchain.getIteratorHead());
        let blocks;
        try {
            // find parents till vmHead but limit lookups till engineParentLookupMaxDepth
            blocks = await (0, util_3.recursivelyFindParents)(vmHead.hash(), headBlock.header.parentHash, this.chain);
        }
        catch (error) {
            const response = { status: types_1.Status.SYNCING, latestValidHash: null, validationError: null };
            return response;
        }
        blocks.push(headBlock);
        let lastBlock;
        try {
            for (const [i, block] of blocks.entries()) {
                lastBlock = block;
                const bHash = block.hash();
                const isBlockExecuted = (this.executedBlocks.get((0, util_1.bytesToUnprefixedHex)(bHash)) ??
                    (await (0, util_3.validExecutedChainBlock)(bHash, this.chain))) !== null;
                if (!isBlockExecuted) {
                    // Only execute
                    //   i) if number of blocks pending to be executed are within limit
                    //   ii) Txs to execute in blocking call is within the supported limit
                    // else return SYNCING/ACCEPTED and let skeleton led chain execution catch up
                    const shouldExecuteBlock = blocks.length - i <= this.chain.config.engineNewpayloadMaxExecute &&
                        block.transactions.length <= this.chain.config.engineNewpayloadMaxTxsExecute;
                    const executed = shouldExecuteBlock &&
                        (await (async () => {
                            // just keeping its name different from the parentBlock to not confuse the context even
                            // though scope rules will not let it conflict with the parent of the new payload block
                            const blockParent = i > 0
                                ? blocks[i - 1]
                                : this.chainCache.remoteBlocks.get((0, util_1.bytesToHex)(block.header.parentHash).slice(2)) ?? (await this.chain.getBlock(block.header.parentHash));
                            const blockExecuted = await this.execution.runWithoutSetHead({
                                block,
                                root: blockParent.header.stateRoot,
                                setHardfork: this.chain.headers.td,
                                parentBlock: blockParent,
                            });
                            return blockExecuted;
                        })());
                    // if can't be executed then return syncing/accepted
                    if (!executed) {
                        this.config.logger.debug(`Skipping block(s) execution for headBlock=${headBlock.header.number} hash=${(0, util_2.short)(headBlock.hash())} : pendingBlocks=${blocks.length - i}(limit=${this.chain.config.engineNewpayloadMaxExecute}) transactions=${block.transactions.length}(limit=${this.chain.config.engineNewpayloadMaxTxsExecute}) executionBusy=${this.execution.running}`);
                        // determind status to be returned depending on if block could extend chain or not
                        const status = optimisticLookup === true ? types_1.Status.SYNCING : types_1.Status.ACCEPTED;
                        const response = { status, latestValidHash: null, validationError: null };
                        return response;
                    }
                    else {
                        this.executedBlocks.set((0, util_1.bytesToUnprefixedHex)(block.hash()), block);
                    }
                }
            }
        }
        catch (error) {
            const latestValidHash = await (0, util_3.validHash)(headBlock.header.parentHash, this.chain, this.chainCache);
            const errorMsg = `${error}`.toLowerCase();
            if (errorMsg.includes('block') && errorMsg.includes('not found')) {
                if (blocks.length > 1) {
                    // this error can come if the block tries to load a previous block yet not in the chain via BLOCKHASH
                    // opcode.
                    //
                    // i)  error coding of the evm errors should be a better way to handle this OR
                    // ii) figure out a way to pass let the evm access the above blocks which is what connects this
                    //     chain to vmhead. to be handled in skeleton refactoring to blockchain class
                    const response = { status: types_1.Status.SYNCING, latestValidHash, validationError: null };
                    return response;
                }
                else {
                    throw {
                        code: error_code_1.INTERNAL_ERROR,
                        message: errorMsg,
                    };
                }
            }
            const validationError = `Error verifying block while running: ${errorMsg}`;
            this.config.logger.error(validationError);
            const response = { status: types_1.Status.INVALID, latestValidHash, validationError };
            this.invalidBlocks.set(blockHash.slice(2), error);
            this.remoteBlocks.delete(blockHash.slice(2));
            try {
                await this.chain.blockchain.delBlock(lastBlock.hash());
                // eslint-disable-next-line no-empty
            }
            catch { }
            try {
                await this.skeleton.deleteBlock(lastBlock);
                // eslint-disable-next-line no-empty
            }
            catch { }
            return response;
        }
        const response = {
            status: types_1.Status.VALID,
            latestValidHash: (0, util_1.bytesToHex)(headBlock.hash()),
            validationError: null,
        };
        return response;
    }
    /**
     * V1 (Paris HF), see:
     * https://github.com/ethereum/execution-apis/blob/main/src/engine/paris.md#engine_newpayloadv1
     * @param params V1 payload
     * @returns
     */
    async newPayloadV1(params) {
        const shanghaiTimestamp = this.chain.config.chainCommon.hardforkTimestamp(common_1.Hardfork.Shanghai);
        const ts = parseInt(params[0].timestamp);
        if (shanghaiTimestamp !== null && ts >= shanghaiTimestamp) {
            throw {
                code: error_code_1.INVALID_PARAMS,
                message: 'NewPayloadV2 MUST be used after Shanghai is activated',
            };
        }
        return this.newPayload(params);
    }
    /**
     * V2 (Shanghai HF) including withdrawals, see:
     * https://github.com/ethereum/execution-apis/blob/main/src/engine/shanghai.md#executionpayloadv2
     * @param params V1 or V2 payload
     * @returns
     */
    async newPayloadV2(params) {
        const shanghaiTimestamp = this.chain.config.chainCommon.hardforkTimestamp(common_1.Hardfork.Shanghai);
        const eip4844Timestamp = this.chain.config.chainCommon.hardforkTimestamp(common_1.Hardfork.Cancun);
        const ts = parseInt(params[0].timestamp);
        const withdrawals = params[0].withdrawals;
        if (eip4844Timestamp !== null && ts >= eip4844Timestamp) {
            throw {
                code: error_code_1.INVALID_PARAMS,
                message: 'NewPayloadV3 MUST be used after Cancun is activated',
            };
        }
        else if (shanghaiTimestamp === null || parseInt(params[0].timestamp) < shanghaiTimestamp) {
            if (withdrawals !== undefined && withdrawals !== null) {
                throw {
                    code: error_code_1.INVALID_PARAMS,
                    message: 'ExecutionPayloadV1 MUST be used before Shanghai is activated',
                };
            }
        }
        else if (parseInt(params[0].timestamp) >= shanghaiTimestamp) {
            if (withdrawals === undefined || withdrawals === null) {
                throw {
                    code: error_code_1.INVALID_PARAMS,
                    message: 'ExecutionPayloadV2 MUST be used after Shanghai is activated',
                };
            }
            const payloadAsV3 = params[0];
            const { excessBlobGas, blobGasUsed } = payloadAsV3;
            if (excessBlobGas !== undefined && excessBlobGas !== null) {
                throw {
                    code: error_code_1.INVALID_PARAMS,
                    message: 'Invalid PayloadV2: excessBlobGas is defined',
                };
            }
            if (blobGasUsed !== undefined && blobGasUsed !== null) {
                throw {
                    code: error_code_1.INVALID_PARAMS,
                    message: 'Invalid PayloadV2: blobGasUsed is defined',
                };
            }
        }
        const newPayloadRes = await this.newPayload(params);
        if (newPayloadRes.status === types_1.Status.INVALID_BLOCK_HASH) {
            newPayloadRes.status = types_1.Status.INVALID;
            newPayloadRes.latestValidHash = null;
        }
        return newPayloadRes;
    }
    /**
     * V3 (Cancun HF) including blob versioned hashes + parent beacon block root, see:
     * https://github.com/ethereum/execution-apis/blob/main/src/engine/cancun.md#engine_newpayloadv3
     * @param params V3 payload, expectedBlobVersionedHashes, parentBeaconBlockRoot
     * @returns
     */
    async newPayloadV3(params) {
        const eip4844Timestamp = this.chain.config.chainCommon.hardforkTimestamp(common_1.Hardfork.Cancun);
        const ts = parseInt(params[0].timestamp);
        if (eip4844Timestamp === null || ts < eip4844Timestamp) {
            throw {
                code: error_code_1.UNSUPPORTED_FORK,
                message: 'NewPayloadV{1|2} MUST be used before Cancun is activated',
            };
        }
        const newPayloadRes = await this.newPayload(params);
        if (newPayloadRes.status === types_1.Status.INVALID_BLOCK_HASH) {
            newPayloadRes.status = types_1.Status.INVALID;
            newPayloadRes.latestValidHash = null;
        }
        return newPayloadRes;
    }
    /**
     * Propagates the change in the fork choice to the execution client.
     *
     * @param params An array of one parameter:
     *   1. An object - The state of the fork choice:
     *        headBlockHash - block hash of the head of the canonical chain
     *        safeBlockHash - the "safe" block hash of the canonical chain under certain synchrony
     *         and honesty assumptions. This value MUST be either equal to or an ancestor of headBlockHash
     *        finalizedBlockHash - block hash of the most recent finalized block
     *   2. An object or null - instance of {@link PayloadAttributesV1}
     * @returns An object:
     *   1. payloadStatus: {@link PayloadStatusV1}; values of the `status` field in the context of this method are restricted to the following subset::
     *        VALID
     *        INVALID
     *        SYNCING
     *   2. payloadId: DATA|null - 8 Bytes - identifier of the payload build process or `null`
     *   3. headBlock: Block|undefined - Block corresponding to headBlockHash if found
     */
    async forkchoiceUpdated(params) {
        const { headBlockHash, finalizedBlockHash, safeBlockHash } = params[0];
        const payloadAttributes = params[1];
        const safe = (0, util_1.toBytes)(safeBlockHash);
        const finalized = (0, util_1.toBytes)(finalizedBlockHash);
        if (!(0, util_1.equalsBytes)(finalized, zeroBlockHash) && (0, util_1.equalsBytes)(safe, zeroBlockHash)) {
            throw {
                code: error_code_1.INVALID_PARAMS,
                message: 'safe block can not be zero if finalized block is not zero',
            };
        }
        if (this.config.synchronized) {
            this.connectionManager.newForkchoiceLog();
        }
        // It is possible that newPayload didn't start beacon sync as the payload it was asked to
        // evaluate didn't require syncing beacon. This can happen if the EL<>CL starts and CL
        // starts from a bit behind like how lodestar does
        if (!this.service.beaconSync) {
            await this.service.switchToBeaconSync();
        }
        /**
         * Block previously marked INVALID
         */
        const prevError = this.invalidBlocks.get(headBlockHash.slice(2));
        if (prevError !== undefined) {
            const validationError = `Received block previously marked INVALID: ${prevError.message}`;
            this.config.logger.debug(validationError);
            const latestValidHash = null;
            const payloadStatus = { status: types_1.Status.INVALID, latestValidHash, validationError };
            const response = { payloadStatus, payloadId: null };
            return response;
        }
        /**
         * Forkchoice head block announced not known (neither in remote blocks, skeleton or chain)
         * by EL
         */
        let headBlock;
        try {
            const head = (0, util_1.toBytes)(headBlockHash);
            headBlock =
                this.remoteBlocks.get(headBlockHash.slice(2)) ??
                    (await this.skeleton.getBlockByHash(head, true)) ??
                    (await this.chain.getBlock(head));
        }
        catch (error) {
            this.config.logger.debug(`Forkchoice announced head block unknown to EL hash=${(0, util_2.short)(headBlockHash)}`);
            const payloadStatus = {
                status: types_1.Status.SYNCING,
                latestValidHash: null,
                validationError: null,
            };
            const response = { payloadStatus, payloadId: null };
            return response;
        }
        /**
         * Hardfork Update
         */
        const hardfork = headBlock.common.hardfork();
        if (hardfork !== this.lastForkchoiceUpdatedHF && this.lastForkchoiceUpdatedHF !== '') {
            this.config.logger.info(`Hardfork change along forkchoice head block update number=${headBlock.header.number} hash=${(0, util_2.short)(headBlock.hash())} old=${this.lastForkchoiceUpdatedHF} new=${hardfork}`);
        }
        this.lastForkchoiceUpdatedHF = hardfork;
        // Always keep beaconSync skeleton updated so that it stays updated with any skeleton sync
        // requirements that might come later because of reorg or CL restarts
        this.config.logger.debug(`Forkchoice requested update to new head number=${headBlock.header.number} hash=${(0, util_2.short)(headBlock.hash())}`);
        /**
         * call skeleton sethead with force head change and reset beacon sync if reorg
         */
        const { reorged, safeBlock, finalizedBlock } = await this.skeleton.forkchoiceUpdate(headBlock, {
            safeBlockHash: safe,
            finalizedBlockHash: finalized,
        });
        if (this.skeleton.fillStatus?.status === sync_1.PutStatus.INVALID) {
            const latestValidHash = this.chain.blocks.latest !== null
                ? await (0, util_3.validHash)(this.chain.blocks.latest.hash(), this.chain, this.chainCache)
                : (0, util_1.bytesToHex)((0, util_1.zeros)(32));
            const response = {
                payloadStatus: {
                    status: types_1.Status.INVALID,
                    validationError: this.skeleton.fillStatus.validationError ?? '',
                    latestValidHash,
                },
                payloadId: null,
            };
            return response;
        }
        if (reorged)
            await this.service.beaconSync?.reorged(headBlock);
        /**
         * Terminal block validation
         */
        // Only validate this as terminal block if this block's difficulty is non-zero,
        // else this is a PoS block but its hardfork could be indeterminable if the skeleton
        // is not yet connected.
        if (!headBlock.common.gteHardfork(common_1.Hardfork.Paris) && headBlock.header.difficulty > util_1.BIGINT_0) {
            const validTerminalBlock = await (0, util_3.validateTerminalBlock)(headBlock, this.chain);
            if (!validTerminalBlock) {
                const response = {
                    payloadStatus: {
                        status: types_1.Status.INVALID,
                        validationError: 'Invalid terminal block',
                        latestValidHash: (0, util_1.bytesToHex)((0, util_1.zeros)(32)),
                    },
                    payloadId: null,
                };
                return response;
            }
        }
        /**
         * Check execution status
         */
        const isHeadExecuted = (this.executedBlocks.get(headBlockHash.slice(2)) ??
            (await (0, util_3.validExecutedChainBlock)(headBlock, this.chain))) !== null;
        if (!isHeadExecuted) {
            if (this.execution.chainStatus?.status === execution_1.ExecStatus.INVALID) {
                // see if the invalid block is canonical along the current skeleton/chain return invalid
                const invalidBlock = await this.skeleton.getBlockByHash(this.execution.chainStatus.hash, true);
                if (invalidBlock !== undefined) {
                    // hard luck: block along canonical chain is invalid
                    const latestValidHash = await (0, util_3.validHash)(invalidBlock.header.parentHash, this.chain, this.chainCache);
                    const validationError = `Block number=${invalidBlock.header.number} hash=${(0, util_2.short)(invalidBlock.hash())} root=${(0, util_2.short)(invalidBlock.header.stateRoot)} along the canonical chain is invalid`;
                    const payloadStatus = {
                        status: types_1.Status.INVALID,
                        latestValidHash,
                        validationError,
                    };
                    const response = { payloadStatus, payloadId: null };
                    return response;
                }
            }
            // Trigger the statebuild here since we have finalized and safeblock available
            void this.service.buildHeadState();
            /**
             * execution has not yet caught up, so lets just return sync
             */
            const payloadStatus = {
                status: types_1.Status.SYNCING,
                latestValidHash: null,
                validationError: null,
            };
            const response = { payloadStatus, payloadId: null };
            return response;
        }
        /**
         * It is confirmed here that the head block has been executed and
         * we can therefore safely call `this.execution.setHead()` (below)
         */
        const vmHeadHash = (await this.chain.blockchain.getIteratorHead()).hash();
        if (!(0, util_1.equalsBytes)(vmHeadHash, headBlock.hash())) {
            let parentBlocks = [];
            if (this.chain.headers.latest && this.chain.headers.latest.number < headBlock.header.number) {
                try {
                    parentBlocks = await (0, util_3.recursivelyFindParents)(vmHeadHash, headBlock.header.parentHash, this.chain);
                }
                catch (error) {
                    const payloadStatus = {
                        status: types_1.Status.SYNCING,
                        latestValidHash: null,
                        validationError: null,
                    };
                    const response = { payloadStatus, payloadId: null };
                    return response;
                }
            }
            const blocks = [...parentBlocks, headBlock];
            try {
                const completed = await this.execution.setHead(blocks, { safeBlock, finalizedBlock });
                if (!completed) {
                    const latestValidHash = await (0, util_3.validHash)(headBlock.hash(), this.chain, this.chainCache);
                    const payloadStatus = {
                        status: types_1.Status.SYNCING,
                        latestValidHash,
                        validationError: null,
                    };
                    const response = { payloadStatus, payloadId: null };
                    return response;
                }
            }
            catch (error) {
                throw {
                    message: error.message,
                    code: error_code_1.INVALID_PARAMS,
                };
            }
            this.service.txPool.removeNewBlockTxs(blocks);
        }
        else if (!headBlock.isGenesis()) {
            // even if the vmHead is same still validations need to be done regarding the correctness
            // of the sequence and canonical-ity
            try {
                await this.execution.setHead([headBlock], { safeBlock, finalizedBlock });
            }
            catch (e) {
                throw {
                    message: e.message,
                    code: error_code_1.INVALID_PARAMS,
                };
            }
        }
        /**
         * Synchronized and tx pool update
         */
        this.config.updateSynchronizedState(headBlock.header);
        if (this.chain.config.synchronized) {
            this.service.txPool.checkRunState();
        }
        /**
         * Start building the block and
         * prepare valid response
         */
        let validResponse;
        // If payloadAttributes is present, start building block and return payloadId
        if (payloadAttributes) {
            const { timestamp, prevRandao, suggestedFeeRecipient, withdrawals, parentBeaconBlockRoot } = payloadAttributes;
            const timestampBigInt = BigInt(timestamp);
            if (timestampBigInt <= headBlock.header.timestamp) {
                throw {
                    message: `invalid timestamp in payloadAttributes, got ${timestampBigInt}, need at least ${headBlock.header.timestamp + util_1.BIGINT_1}`,
                    code: error_code_1.INVALID_PARAMS,
                };
            }
            // TODO: rename pendingBlock.start() to something more expressive
            const payloadId = await this.pendingBlock.start(await this.vm.shallowCopy(), headBlock, {
                timestamp,
                mixHash: prevRandao,
                coinbase: suggestedFeeRecipient,
                parentBeaconBlockRoot,
            }, withdrawals);
            const latestValidHash = await (0, util_3.validHash)(headBlock.hash(), this.chain, this.chainCache);
            const payloadStatus = { status: types_1.Status.VALID, latestValidHash, validationError: null };
            validResponse = { payloadStatus, payloadId: (0, util_1.bytesToHex)(payloadId), headBlock };
        }
        else {
            const latestValidHash = await (0, util_3.validHash)(headBlock.hash(), this.chain, this.chainCache);
            const payloadStatus = { status: types_1.Status.VALID, latestValidHash, validationError: null };
            validResponse = { payloadStatus, payloadId: null, headBlock };
        }
        /**
         * Before returning response prune cached blocks based on finalized and vmHead
         */
        if (this.chain.config.pruneEngineCache) {
            (0, util_3.pruneCachedBlocks)(this.chain, this.chainCache);
        }
        return validResponse;
    }
    /**
     * V1 (Paris HF), see:
     * https://github.com/ethereum/execution-apis/blob/main/src/engine/paris.md#engine_forkchoiceupdatedv1
     * @param params V1 forkchoice state (block hashes) + optional payload V1 attributes (timestamp,...)
     * @returns
     */
    async forkchoiceUpdatedV1(params) {
        const payloadAttributes = params[1];
        if (payloadAttributes !== undefined && payloadAttributes !== null) {
            if (Object.values(payloadAttributes).filter((attr) => attr !== null && attr !== undefined)
                .length > 3) {
                throw {
                    code: error_code_1.INVALID_PARAMS,
                    message: 'PayloadAttributesV1 MUST be used for forkchoiceUpdatedV2',
                };
            }
            (0, util_3.validateHardforkRange)(this.chain.config.chainCommon, 1, null, common_1.Hardfork.Paris, BigInt(payloadAttributes.timestamp));
        }
        return this.forkchoiceUpdated(params);
    }
    /**
     * V2 (Shanghai HF), see:
     * https://github.com/ethereum/execution-apis/blob/main/src/engine/shanghai.md#engine_forkchoiceupdatedv2
     * @param params V1 forkchoice state (block hashes) + optional payload V1 or V2 attributes (+ withdrawals)
     * @returns
     */
    async forkchoiceUpdatedV2(params) {
        const payloadAttributes = params[1];
        if (payloadAttributes !== undefined && payloadAttributes !== null) {
            if (Object.values(payloadAttributes).filter((attr) => attr !== null && attr !== undefined)
                .length > 4) {
                throw {
                    code: error_code_1.INVALID_PARAMS,
                    message: 'PayloadAttributesV{1|2} MUST be used for forkchoiceUpdatedV2',
                };
            }
            (0, util_3.validateHardforkRange)(this.chain.config.chainCommon, 2, null, common_1.Hardfork.Shanghai, BigInt(payloadAttributes.timestamp));
            const shanghaiTimestamp = this.chain.config.chainCommon.hardforkTimestamp(common_1.Hardfork.Shanghai);
            const ts = BigInt(payloadAttributes.timestamp);
            const withdrawals = payloadAttributes.withdrawals;
            if (withdrawals !== undefined && withdrawals !== null) {
                if (ts < shanghaiTimestamp) {
                    throw {
                        code: error_code_1.INVALID_PARAMS,
                        message: 'PayloadAttributesV1 MUST be used before Shanghai is activated',
                    };
                }
            }
            else {
                if (ts >= shanghaiTimestamp) {
                    throw {
                        code: error_code_1.INVALID_PARAMS,
                        message: 'PayloadAttributesV2 MUST be used after Shanghai is activated',
                    };
                }
            }
            const parentBeaconBlockRoot = payloadAttributes.parentBeaconBlockRoot;
            if (parentBeaconBlockRoot !== undefined && parentBeaconBlockRoot !== null) {
                throw {
                    code: error_code_1.INVALID_PARAMS,
                    message: 'Invalid PayloadAttributesV{1|2}: parentBlockBeaconRoot defined',
                };
            }
        }
        return this.forkchoiceUpdated(params);
    }
    /**
     * V3 (Cancun HF), see:
     * https://github.com/ethereum/execution-apis/blob/main/src/engine/cancun.md#engine_forkchoiceupdatedv3
     * @param params V1 forkchoice state (block hashes) + optional payload V3 attributes (withdrawals + parentBeaconBlockRoot)
     * @returns
     */
    async forkchoiceUpdatedV3(params) {
        const payloadAttributes = params[1];
        if (payloadAttributes !== undefined && payloadAttributes !== null) {
            if (Object.values(payloadAttributes).filter((attr) => attr !== null && attr !== undefined)
                .length > 5) {
                throw {
                    code: error_code_1.INVALID_PARAMS,
                    message: 'PayloadAttributesV3 MUST be used for forkchoiceUpdatedV3',
                };
            }
            (0, util_3.validateHardforkRange)(this.chain.config.chainCommon, 3, common_1.Hardfork.Cancun, 
            // this could be valid post cancun as well, if not then update the valid till hf here
            null, BigInt(payloadAttributes.timestamp));
        }
        return this.forkchoiceUpdated(params);
    }
    /**
     * Given payloadId, returns the most recent version of an execution payload
     * that is available by the time of the call or responds with an error.
     *
     * @param params An array of one parameter:
     *   1. payloadId: DATA, 8 bytes - identifier of the payload building process
     * @returns Instance of {@link ExecutionPayloadV1} or an error
     */
    async getPayload(params, payloadVersion) {
        const payloadId = params[0];
        try {
            /**
             * Build the pending block
             */
            const built = await this.pendingBlock.build(payloadId);
            if (!built) {
                throw types_1.EngineError.UnknownPayload;
            }
            // The third arg returned is the minerValue which we will use to
            // value the block
            const [block, receipts, value, blobs] = built;
            // do a blocking call even if execution might be busy for the moment and skip putting
            // it into chain till CL confirms with full data via new payload like versioned hashes
            // parent beacon block root
            const executed = await this.execution.runWithoutSetHead({ block }, receipts, true, true);
            if (!executed) {
                throw Error(`runWithoutSetHead did not execute the block for payload=${payloadId}`);
            }
            this.executedBlocks.set((0, util_1.bytesToUnprefixedHex)(block.hash()), block);
            /**
             * Creates the payload in ExecutionPayloadV1 format to be returned
             */
            const executionPayload = (0, util_3.blockToExecutionPayload)(block, value, blobs);
            let checkNotBeforeHf;
            let checkNotAfterHf;
            switch (payloadVersion) {
                case 3:
                    checkNotBeforeHf = common_1.Hardfork.Cancun;
                    checkNotAfterHf = common_1.Hardfork.Cancun;
                    break;
                case 2:
                    // no checks to be done for before as valid till paris
                    checkNotBeforeHf = null;
                    checkNotAfterHf = common_1.Hardfork.Shanghai;
                    break;
                case 1:
                    checkNotBeforeHf = null;
                    checkNotAfterHf = common_1.Hardfork.Paris;
                    break;
                default:
                    throw Error(`Invalid payloadVersion=${payloadVersion}`);
            }
            (0, util_3.validateHardforkRange)(this.chain.config.chainCommon, payloadVersion, checkNotBeforeHf, checkNotAfterHf, BigInt(executionPayload.executionPayload.timestamp));
            return executionPayload;
        }
        catch (error) {
            if (error_code_1.validEngineCodes.includes(error.code))
                throw error;
            throw {
                code: error_code_1.INTERNAL_ERROR,
                message: error.message ?? error,
            };
        }
    }
    /**
     * V1 (Paris HF), see:
     * https://github.com/ethereum/execution-apis/blob/main/src/engine/paris.md#engine_getpayloadv1
     * @param params Identifier of the payload build process
     * @returns
     */
    async getPayloadV1(params) {
        const { executionPayload } = await this.getPayload(params, 1);
        return executionPayload;
    }
    /**
     * V2 (Shanghai HF), see:
     * https://github.com/ethereum/execution-apis/blob/main/src/engine/shanghai.md#engine_getpayloadv2
     * @param params Identifier of the payload build process
     * @returns
     */
    async getPayloadV2(params) {
        const { executionPayload, blockValue } = await this.getPayload(params, 2);
        return { executionPayload, blockValue };
    }
    /**
     * V3 (Cancun HF), see:
     * https://github.com/ethereum/execution-apis/blob/main/src/engine/cancun.md#engine_getpayloadv3
     * @param params Identifier of the payload build process
     * @returns
     */
    async getPayloadV3(params) {
        return this.getPayload(params, 3);
    }
    /**
     * Compare transition configuration parameters.
     *
     * V1 (Paris HF), see:
     * https://github.com/ethereum/execution-apis/blob/main/src/engine/paris.md#engine_exchangetransitionconfigurationv1
     *
     * Note: This method is deprecated starting with the Cancun HF
     *
     * @param params An array of one parameter:
     *   1. transitionConfiguration: Object - instance of {@link TransitionConfigurationV1}
     * @returns Instance of {@link TransitionConfigurationV1} or an error
     */
    async exchangeTransitionConfigurationV1(params) {
        const { terminalTotalDifficulty, terminalBlockHash, terminalBlockNumber } = params[0];
        const ttd = this.chain.config.chainCommon.hardforkTTD(common_1.Hardfork.Paris);
        if (ttd === undefined || ttd === null) {
            throw {
                code: error_code_1.INTERNAL_ERROR,
                message: 'terminalTotalDifficulty not set internally',
            };
        }
        if (ttd !== BigInt(terminalTotalDifficulty)) {
            throw {
                code: error_code_1.INVALID_PARAMS,
                message: `terminalTotalDifficulty set to ${ttd}, received ${parseInt(terminalTotalDifficulty)}`,
            };
        }
        // Note: our client does not yet support block whitelisting (terminalBlockHash/terminalBlockNumber)
        // since we are not yet fast enough to run along tip-of-chain mainnet execution
        return { terminalTotalDifficulty, terminalBlockHash, terminalBlockNumber };
    }
    /**
     * Returns a list of engine API endpoints supported by the client
     *
     * See:
     * https://github.com/ethereum/execution-apis/blob/main/src/engine/common.md#engine_exchangecapabilities
     */
    exchangeCapabilities(_params) {
        const caps = Object.getOwnPropertyNames(Engine.prototype);
        const engineMethods = caps.filter((el) => el !== 'constructor' && el !== 'exchangeCapabilities');
        return engineMethods.map((el) => 'engine_' + el);
    }
    /**
     * V1 (Shanghai HF), see:
     * https://github.com/ethereum/execution-apis/blob/main/src/engine/shanghai.md#engine_getpayloadbodiesbyhashv1
     *
     * @param params a list of block hashes as hex prefixed strings
     * @returns an array of ExecutionPayloadBodyV1 objects or null if a given execution payload isn't stored locally
     */
    async getPayloadBodiesByHashV1(params) {
        if (params[0].length > 32) {
            throw {
                code: error_code_1.TOO_LARGE_REQUEST,
                message: 'More than 32 execution payload bodies requested',
            };
        }
        const hashes = params[0].map(util_1.hexToBytes);
        const blocks = [];
        for (const hash of hashes) {
            try {
                const block = await this.chain.getBlock(hash);
                const payloadBody = (0, util_3.getPayloadBody)(block);
                blocks.push(payloadBody);
            }
            catch {
                blocks.push(null);
            }
        }
        return blocks;
    }
    /**
     * V1 (Shanghai HF), see:
     * https://github.com/ethereum/execution-apis/blob/main/src/engine/shanghai.md#engine_getpayloadbodiesbyrangev1
     *
     * @param params an array of 2 parameters
     *    1.  start: Bytes8 - the first block in the range
     *    2.  count: Bytes8 - the number of blocks requested
     * @returns an array of ExecutionPayloadBodyV1 objects or null if a given execution payload isn't stored locally
     */
    async getPayloadBodiesByRangeV1(params) {
        const start = BigInt(params[0]);
        let count = BigInt(params[1]);
        if (count > BigInt(32)) {
            throw {
                code: error_code_1.TOO_LARGE_REQUEST,
                message: 'More than 32 execution payload bodies requested',
            };
        }
        if (count < util_1.BIGINT_1 || start < util_1.BIGINT_1) {
            throw {
                code: error_code_1.INVALID_PARAMS,
                message: 'Start and Count parameters cannot be less than 1',
            };
        }
        const currentChainHeight = this.chain.headers.height;
        if (start > currentChainHeight) {
            return [];
        }
        if (start + count > currentChainHeight) {
            count = currentChainHeight - start + util_1.BIGINT_1;
        }
        const blocks = await this.chain.getBlocks(start, Number(count));
        const payloads = [];
        for (const block of blocks) {
            try {
                const payloadBody = (0, util_3.getPayloadBody)(block);
                payloads.push(payloadBody);
            }
            catch {
                payloads.push(null);
            }
        }
        return payloads;
    }
}
exports.Engine = Engine;
//# sourceMappingURL=engine.js.map