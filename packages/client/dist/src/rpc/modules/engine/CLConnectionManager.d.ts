import type { Config } from '../../../config';
import type { ExecutionPayloadV1, ExecutionPayloadV2, ExecutionPayloadV3, ForkchoiceResponseV1, ForkchoiceStateV1, PayloadStatusV1 } from './types';
import type { Block } from '@ethereumjs/block';
export declare enum ConnectionStatus {
    Connected = "connected",
    Disconnected = "disconnected",
    Uncertain = "uncertain"
}
declare type CLConnectionManagerOpts = {
    config: Config;
    inActivityCb?: () => void;
};
declare type NewPayload = {
    payload: ExecutionPayloadV1 | ExecutionPayloadV2 | ExecutionPayloadV3;
    response?: PayloadStatusV1;
};
declare type ForkchoiceUpdate = {
    state: ForkchoiceStateV1;
    response?: ForkchoiceResponseV1;
    headBlock?: Block;
    error?: string;
};
export declare class CLConnectionManager {
    private config;
    private numberFormatter;
    /** Default connection check interval (in ms) */
    private DEFAULT_CONNECTION_CHECK_INTERVAL;
    /** Default payload log interval (in ms) */
    private DEFAULT_PAYLOAD_LOG_INTERVAL;
    /** Default forkchoice log interval (in ms) */
    private DEFAULT_FORKCHOICE_LOG_INTERVAL;
    /** Threshold for a disconnected status decision */
    private DISCONNECTED_THRESHOLD;
    /** Wait for a minute to log disconnected again*/
    private LOG_DISCONNECTED_EVERY_N_CHECKS;
    private disconnectedCheckIndex;
    /** Threshold for an uncertain status decision */
    private UNCERTAIN_THRESHOLD;
    /** Track ethereumjs client shutdown status */
    private _clientShutdown;
    private _connectionCheckInterval?;
    private _payloadLogInterval?;
    private _forkchoiceLogInterval?;
    private connectionStatus;
    private oneTimeMergeCLConnectionCheck;
    private lastRequestTimestamp;
    private _lastPayload?;
    private _payloadToPayloadStats;
    private _lastForkchoiceUpdate?;
    private _initialPayload?;
    private _initialForkchoiceUpdate?;
    private _inActivityCb?;
    get running(): boolean;
    constructor(opts: CLConnectionManagerOpts);
    start(): void;
    stop(): void;
    private _getPayloadLogMsg;
    private _getForkchoiceUpdateLogMsg;
    private compactNum;
    private timeDiffStr;
    lastForkchoiceUpdate(update: ForkchoiceUpdate): void;
    lastNewPayload(payload: NewPayload): void;
    updatePayloadStats(block: Block): void;
    clearPayloadStats(): void;
    /**
     * Updates the Consensus Client connection status on new RPC requests
     */
    updateStatus(): void;
    /**
     * Regularly checks the Consensus Client connection
     */
    private connectionCheck;
    /**
     * Regular payload request logs
     */
    private lastPayloadLog;
    /**
     * Externally triggered payload logs
     */
    newPayloadLog(): void;
    /**
     * Regular forkchoice request logs
     */
    private lastForkchoiceLog;
    /**
     * Externally triggered forkchoice log
     */
    newForkchoiceLog(): void;
}
/**
 * This middleware can wrap a methodFn to process its response for connection manager by
 * specifying an appropriate handler
 */
export declare function middleware(methodFn: (params: any[]) => Promise<any>, handler: (params: any[], response: any, errormsg: any) => void): any;
export {};
//# sourceMappingURL=CLConnectionManager.d.ts.map