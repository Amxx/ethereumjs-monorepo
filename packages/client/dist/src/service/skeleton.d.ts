import { Block } from '@ethereumjs/block';
import { MetaDBManager } from '../util/metaDBManager';
import type { SnapFetcherDoneFlags } from '../sync/fetcher/types';
import type { MetaDBManagerOptions } from '../util/metaDBManager';
import type { BlockHeader } from '@ethereumjs/block';
import type { Hardfork } from '@ethereumjs/common';
export declare enum PutStatus {
    VALID = "VALID",
    INVALID = "INVALID"
}
declare type FillStatus = {
    status: PutStatus;
    height: bigint;
    hash: Uint8Array;
    validationError?: string;
};
/**
 * Contiguous header chain segment that is backed by the database,
 * but may not be linked to the live chain. The skeleton downloader may produce
 * a new one of these every time it is restarted until the subchain grows large
 * enough to connect with a previous subchain.
 */
declare type SkeletonSubchain = {
    head: bigint; /** Block number of the newest header in the subchain */
    tail: bigint; /** Block number of the oldest header in the subchain */
    next: Uint8Array; /** Block hash of the next oldest header in the subchain */
};
/**
 * errSyncReorged is an internal helper error to signal that the head chain of
 * the current sync cycle was (partially) reorged, thus the skeleton syncer
 * should abort and restart with the new state.
 */
export declare const errSyncReorged: Error;
/**
 * errReorgDenied is returned if an attempt is made to extend the beacon chain
 * with a new header, but it does not link up to the existing sync.
 */
export declare const errReorgDenied: Error;
/**
 * errSyncMerged is an internal helper error to signal that the current sync
 * cycle merged with a previously aborted subchain, thus the skeleton syncer
 * should abort and restart with the new state.
 */
export declare const errSyncMerged: Error;
export declare class Skeleton extends MetaDBManager {
    private _lock;
    private status;
    fillStatus: FillStatus | null;
    private started; /** Timestamp when the skeleton syncer was created */
    private syncedchain;
    private pulled; /** Number of headers downloaded in this run */
    private filling; /** Whether we are actively filling the canonical chain */
    private lastfilledAt;
    private lastfilled;
    private lastexecutedAt;
    private lastexecuted;
    private lastfetchedAt;
    private lastfetched;
    private lastvalid;
    private lastFcuTime;
    private lastsyncedAt;
    private STATUS_LOG_INTERVAL; /** How often to log sync status (in ms) */
    /**
     * safeBlock as indicated by engine api, set
     */
    safeBlock?: Block;
    finalizedBlock?: Block;
    synchronized: boolean;
    private lastsyncronized;
    private lastSyncDate;
    constructor(opts: MetaDBManagerOptions);
    /**
     * Run a function after acquiring a lock. It is implied that we have already
     * initialized the module (or we are calling this from the init function, like
     * `_setCanonicalGenesisBlock`)
     * @param action - function to run after acquiring a lock
     * @hidden
     */
    private runWithLock;
    open(): Promise<void>;
    close(): Promise<void>;
    reset(): Promise<void>;
    /**
     * Returns true if the skeleton chain is linked to canonical
     */
    private checkLinked;
    isLinked(): boolean;
    isStarted(): boolean;
    isLastAnnoucement(): Promise<boolean>;
    /**
     * Try fast forwarding the chain head to the number
     */
    private fastForwardHead;
    /**
     * processNewHead does the internal shuffling for a new head marker and either
     * accepts and integrates it into the skeleton or requests a reorg. Upon reorg,
     * the syncer will tear itself down and restart with a fresh head. It is simpler
     * to reconstruct the sync state than to mutate it.
     *
     * @returns true if the chain was reorged
     */
    private processNewHead;
    /**
     * Announce and integrate a new head.
     * @params head - The block being attempted as a new head
     * @params force - Flag to indicate if this is just a check of worthiness or a actually new head
     * @params init - Flag this is the first time since the beacon sync start to perform additional tasks
     * @params reorgthrow - Flag to indicate if we would actually like to throw if there is a reorg
     *         instead of just returning the boolean
     *
     * @returns True if the head (will) cause a reorg in the canonical skeleton subchain
     */
    setHead(head: Block, force?: boolean, init?: boolean, reorgthrow?: boolean): Promise<boolean>;
    /**
     * Updates if the skeleton/cl seems synced to the head
     * copied over from config, could be DRY-ied
     * @param option latest to update the sync state with
     */
    updateSynchronizedState(latest?: BlockHeader | null): void;
    forkchoiceUpdate(headBlock: Block, { safeBlockHash, finalizedBlockHash, }?: {
        safeBlockHash?: Uint8Array;
        finalizedBlockHash?: Uint8Array;
    }): Promise<{
        reorged: boolean;
        safeBlock?: Block;
        finalizedBlock?: Block;
    }>;
    setVmHead(snapStatus: {
        syncedHash: Uint8Array;
        syncedHeight: bigint;
    }): Promise<boolean>;
    /**
     * Setup the skeleton to init sync with head
     * @params head - The block with which we want to init the skeleton head
     * @params reorgthrow - If we would like the function to throw instead of silently
     *         return if there is reorg of the skeleton head
     *
     * @returns True if the skeleton was reorged trying to init else false
     */
    initSync(head: Block, reorgthrow?: boolean): Promise<boolean>;
    /**
     * Bounds returns the current head and tail tracked by the skeleton syncer.
     */
    bounds(): SkeletonSubchain;
    headHash(): Promise<Uint8Array | undefined>;
    private trySubChainsMerge;
    /**
     * Writes skeleton blocks to the db by number
     * @returns number of blocks saved
     */
    putBlocks(blocks: Block[], skipForwardFill?: boolean): Promise<number>;
    private backStep;
    /**
     * fill the canonical chain from skeleton if there is only a small segment to fill
     */
    blockingFillWithCutoff(cutoffLen: number): Promise<void>;
    getUnfinalizedParentsForBackfill(maxItems: number): Promise<Block[]>;
    /**
     * lookup and try backfill if skeleton already has blocks previously filled
     */
    tryTailBackfill(): Promise<void>;
    /**
     *
     */
    blockingTailBackfillWithCutoff(maxItems: number): Promise<void>;
    /**
     * Inserts skeleton blocks into canonical chain and runs execution.
     */
    fillCanonicalChain(): Promise<void>;
    serialize({ hardfork, blockRLP, }: {
        hardfork: Hardfork | string;
        blockRLP: Uint8Array;
    }): Uint8Array;
    deserialize(rlp: Uint8Array): {
        hardfork: Hardfork | string;
        blockRLP: Uint8Array;
    };
    /**
     * Writes a skeleton block to the db by number
     */
    private putBlock;
    skeletonBlockRlpToBlock(skeletonBlockRlp: Uint8Array): Block;
    /**
     * Gets a block from the skeleton or canonical db by number.
     */
    getBlock(number: bigint, onlyCanonical?: boolean): Promise<Block | undefined>;
    /**
     * Gets a skeleton block from the db by hash
     */
    getBlockByHash(hash: Uint8Array, onlyCanonical?: boolean): Promise<Block | undefined>;
    getUnfinalizedBlock(hash: Uint8Array): Promise<Block | undefined>;
    /**
     * Deletes a skeleton block from the db by number
     */
    deleteBlock(block: Block): Promise<boolean>;
    /**
     *
     * TODO: complete the impl of pruning of blocks which got finalized and were non
     * canonical. canonical blocks anyway get deleted in deleteBlock
     */
    pruneFinalizedNonCanonicalBlocks(): Promise<void>;
    logSyncStatus(logPrefix: string, { forceShowInfo, lastStatus, vmexecution, fetching, snapsync, peers, }?: {
        forceShowInfo?: boolean;
        lastStatus?: string;
        vmexecution?: {
            running: boolean;
            started: boolean;
        };
        fetching?: boolean;
        snapsync?: SnapFetcherDoneFlags;
        peers?: number | string;
    }): string;
    /**
     * Writes the {@link SkeletonStatus} to db
     */
    private writeSyncStatus;
    /**
     * Reads the {@link SkeletonStatus} from db
     */
    private getSyncStatus;
    /**
     * Encodes a {@link SkeletonStatus} to RLP for saving to the db
     */
    private statusToRLP;
    /**
     * Decodes an RLP encoded {@link SkeletonStatus}
     */
    private statusRLPtoObject;
}
export {};
//# sourceMappingURL=skeleton.d.ts.map