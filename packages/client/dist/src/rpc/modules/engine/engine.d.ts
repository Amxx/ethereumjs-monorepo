import { type PayloadStatusV1 } from './types';
import type { EthereumClient } from '../../../client';
import type { Bytes32, Bytes8, ExecutionPayloadV1, ExecutionPayloadV2, ExecutionPayloadV3, TransitionConfigurationV1 } from './types';
import type { ExecutionPayload } from '@ethereumjs/block';
/**
 * engine_* RPC module
 * @memberof module:rpc/modules
 */
export declare class Engine {
    private client;
    private execution;
    private skeleton;
    private service;
    private chain;
    private config;
    private vm;
    private _rpcDebug;
    private pendingBlock;
    private connectionManager;
    private lastNewPayloadHF;
    private lastForkchoiceUpdatedHF;
    private remoteBlocks;
    private executedBlocks;
    private invalidBlocks;
    private chainCache;
    private lastAnnouncementTime;
    private lastAnnouncementStatus;
    /**
     * Create engine_* RPC module
     * @param client Client to which the module binds
     */
    constructor(client: EthereumClient, rpcDebug: boolean);
    /**
     * Log EL sync status
     */
    private logELStatus;
    /**
     * Configuration and initialization of custom Engine API call validators
     */
    private initValidators;
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
    private newPayload;
    /**
     * V1 (Paris HF), see:
     * https://github.com/ethereum/execution-apis/blob/main/src/engine/paris.md#engine_newpayloadv1
     * @param params V1 payload
     * @returns
     */
    newPayloadV1(params: [ExecutionPayloadV1]): Promise<PayloadStatusV1>;
    /**
     * V2 (Shanghai HF) including withdrawals, see:
     * https://github.com/ethereum/execution-apis/blob/main/src/engine/shanghai.md#executionpayloadv2
     * @param params V1 or V2 payload
     * @returns
     */
    newPayloadV2(params: [ExecutionPayloadV2 | ExecutionPayloadV1]): Promise<PayloadStatusV1>;
    /**
     * V3 (Cancun HF) including blob versioned hashes + parent beacon block root, see:
     * https://github.com/ethereum/execution-apis/blob/main/src/engine/cancun.md#engine_newpayloadv3
     * @param params V3 payload, expectedBlobVersionedHashes, parentBeaconBlockRoot
     * @returns
     */
    newPayloadV3(params: [ExecutionPayloadV3, Bytes32[], Bytes32]): Promise<PayloadStatusV1>;
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
    private forkchoiceUpdated;
    /**
     * V1 (Paris HF), see:
     * https://github.com/ethereum/execution-apis/blob/main/src/engine/paris.md#engine_forkchoiceupdatedv1
     * @param params V1 forkchoice state (block hashes) + optional payload V1 attributes (timestamp,...)
     * @returns
     */
    private forkchoiceUpdatedV1;
    /**
     * V2 (Shanghai HF), see:
     * https://github.com/ethereum/execution-apis/blob/main/src/engine/shanghai.md#engine_forkchoiceupdatedv2
     * @param params V1 forkchoice state (block hashes) + optional payload V1 or V2 attributes (+ withdrawals)
     * @returns
     */
    private forkchoiceUpdatedV2;
    /**
     * V3 (Cancun HF), see:
     * https://github.com/ethereum/execution-apis/blob/main/src/engine/cancun.md#engine_forkchoiceupdatedv3
     * @param params V1 forkchoice state (block hashes) + optional payload V3 attributes (withdrawals + parentBeaconBlockRoot)
     * @returns
     */
    private forkchoiceUpdatedV3;
    /**
     * Given payloadId, returns the most recent version of an execution payload
     * that is available by the time of the call or responds with an error.
     *
     * @param params An array of one parameter:
     *   1. payloadId: DATA, 8 bytes - identifier of the payload building process
     * @returns Instance of {@link ExecutionPayloadV1} or an error
     */
    private getPayload;
    /**
     * V1 (Paris HF), see:
     * https://github.com/ethereum/execution-apis/blob/main/src/engine/paris.md#engine_getpayloadv1
     * @param params Identifier of the payload build process
     * @returns
     */
    getPayloadV1(params: [Bytes8]): Promise<ExecutionPayload>;
    /**
     * V2 (Shanghai HF), see:
     * https://github.com/ethereum/execution-apis/blob/main/src/engine/shanghai.md#engine_getpayloadv2
     * @param params Identifier of the payload build process
     * @returns
     */
    getPayloadV2(params: [Bytes8]): Promise<{
        executionPayload: ExecutionPayload;
        blockValue: string;
    }>;
    /**
     * V3 (Cancun HF), see:
     * https://github.com/ethereum/execution-apis/blob/main/src/engine/cancun.md#engine_getpayloadv3
     * @param params Identifier of the payload build process
     * @returns
     */
    getPayloadV3(params: [Bytes8]): Promise<{
        executionPayload: ExecutionPayload;
        blockValue: string;
        blobsBundle: import("./types").BlobsBundleV1 | undefined;
        shouldOverrideBuilder: boolean;
    }>;
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
    exchangeTransitionConfigurationV1(params: [TransitionConfigurationV1]): Promise<TransitionConfigurationV1>;
    /**
     * Returns a list of engine API endpoints supported by the client
     *
     * See:
     * https://github.com/ethereum/execution-apis/blob/main/src/engine/common.md#engine_exchangecapabilities
     */
    private exchangeCapabilities;
    /**
     * V1 (Shanghai HF), see:
     * https://github.com/ethereum/execution-apis/blob/main/src/engine/shanghai.md#engine_getpayloadbodiesbyhashv1
     *
     * @param params a list of block hashes as hex prefixed strings
     * @returns an array of ExecutionPayloadBodyV1 objects or null if a given execution payload isn't stored locally
     */
    private getPayloadBodiesByHashV1;
    /**
     * V1 (Shanghai HF), see:
     * https://github.com/ethereum/execution-apis/blob/main/src/engine/shanghai.md#engine_getpayloadbodiesbyrangev1
     *
     * @param params an array of 2 parameters
     *    1.  start: Bytes8 - the first block in the range
     *    2.  count: Bytes8 - the number of blocks requested
     * @returns an array of ExecutionPayloadBodyV1 objects or null if a given execution payload isn't stored locally
     */
    private getPayloadBodiesByRangeV1;
}
//# sourceMappingURL=engine.d.ts.map