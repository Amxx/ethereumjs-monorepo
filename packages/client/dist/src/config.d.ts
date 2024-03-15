import { Common } from '@ethereumjs/common';
import { type Address } from '@ethereumjs/util';
import { Level } from 'level';
import { RlpxServer } from './net/server';
import type { Logger } from './logging';
import type { EventBusType } from './types';
import type { BlockHeader } from '@ethereumjs/block';
import type { VM, VMProfilerOpts } from '@ethereumjs/vm';
import type { Multiaddr } from 'multiaddr';
export declare enum DataDirectory {
    Chain = "chain",
    State = "state",
    Meta = "meta"
}
export declare enum SyncMode {
    Full = "full",
    Light = "light",
    None = "none"
}
export interface ConfigOptions {
    /**
     * Specify the chain by providing a {@link Common} instance,
     * the common instance will not be modified by client
     *
     * Default: 'mainnet' Common
     */
    common?: Common;
    /**
     * Synchronization mode ('full', 'light', 'none')
     *
     * Default: 'full'
     */
    syncmode?: SyncMode;
    /**
     * Whether to enable and run snapSync, currently experimental
     *
     * Default: false
     */
    enableSnapSync?: boolean;
    /**
     * A temporary option to offer backward compatibility with already-synced databases that are
     * using non-prefixed keys for storage tries
     *
     * Default: true
     */
    prefixStorageTrieKeys?: boolean;
    /**
     * A temporary option to offer backward compatibility with already-synced databases that stores
     * trie items as `string`, instead of the more performant `Uint8Array`
     */
    useStringValueTrieDB?: boolean;
    /**
     * Provide a custom VM instance to process blocks
     *
     * Default: VM instance created by client
     */
    vm?: VM;
    /**
     * Serve light peer requests
     *
     * Default: `false`
     */
    lightserv?: boolean;
    /**
     * Root data directory for the blockchain
     */
    datadir?: string;
    /**
     * Private key for the client.
     * Use return value of {@link Config.getClientKey}.
     * If left blank, a random key will be generated and used.
     */
    key?: Uint8Array;
    /**
     * Network bootnodes
     * (e.g. abc@18.138.108.67 or /ip4/127.0.0.1/tcp/50505/p2p/QmABC)
     */
    bootnodes?: Multiaddr[];
    /**
     * RLPx listening port
     *
     * Default: `30303`
     */
    port?: number;
    /**
     * RLPx external IP
     */
    extIP?: string;
    /**
     * Network multiaddrs for libp2p
     * (e.g. /ip4/127.0.0.1/tcp/50505/p2p/QmABC)
     */
    multiaddrs?: Multiaddr[];
    /**
     * Transport servers (RLPx)
     * Only used for testing purposes
     */
    server?: RlpxServer;
    /**
     * Save tx receipts and logs in the meta db (default: false)
     */
    saveReceipts?: boolean;
    /**
     * Number of recent blocks to maintain transactions index for
     * (default = 2350000 = about one year, 0 = entire chain)
     */
    txLookupLimit?: number;
    /**
     * A custom winston logger can be provided
     * if setting logging verbosity is not sufficient
     *
     * Default: Logger with loglevel 'info'
     */
    logger?: Logger;
    /**
     * Max items per block or header request
     *
     * Default: `100`
     */
    maxPerRequest?: number;
    /**
     * Max jobs to be enqueued in the fetcher at any given time
     *
     * Default: `100`
     */
    maxFetcherJobs?: number;
    /**
     * Max outgoing multi-peer requests by the fetcher at any given time
     */
    maxFetcherRequests?: number;
    /**
     * Number of peers needed before syncing
     *
     * Default: `1`
     */
    minPeers?: number;
    /**
     * Maximum peers allowed
     *
     * Default: `25`
     */
    maxPeers?: number;
    /**
     * DNS server to query DNS TXT records from for peer discovery
     *
     * Default `8.8.8.8` (Google)
     */
    dnsAddr?: string;
    /**
     * EIP-1459 ENR Tree urls to query via DNS for peer discovery
     */
    dnsNetworks?: string[];
    /**
     * Start continuous VM execution (pre-Merge setting)
     */
    execution?: boolean;
    /**
     * Number of blocks to execute in batch mode and logged to console
     */
    numBlocksPerIteration?: number;
    /**
     * Size for the account cache (max number of accounts)
     */
    accountCache?: number;
    /**
     * Size for the storage cache (max number of contracts)
     */
    storageCache?: number;
    /**
     * Size for the code cache (max number of contracts)
     */
    codeCache?: number;
    /**
     * Size for the trie cache (max number of trie nodes)
     */
    trieCache?: number;
    /**
     * Generate code for local debugging, currently providing a
     * code snippet which can be used to run blocks on the
     * EthereumJS VM on execution errors
     *
     * (meant to be used internally for the most part)
     */
    debugCode?: boolean;
    /**
     * Query EIP-1459 DNS TXT records for peer discovery
     *
     * Default: `true` for testnets, false for mainnet
     */
    discDns?: boolean;
    /**
     * Use v4 ("findneighbour" node requests) for peer discovery
     *
     * Default: `false` for testnets, true for mainnet
     */
    discV4?: boolean;
    /**
     * Enable mining
     *
     * Default: `false`
     */
    mine?: boolean;
    /**
     * Is a single node and doesn't need peers for synchronization
     *
     * Default: `false`
     */
    isSingleNode?: boolean;
    /**
     * Whether to profile VM blocks
     */
    vmProfileBlocks?: boolean;
    /**
     * Whether to profile VM txs
     */
    vmProfileTxs?: boolean;
    /**
     * Unlocked accounts of form [address, privateKey]
     * Currently only the first account is used to seal mined PoA blocks
     *
     * Default: []
     */
    accounts?: [address: Address, privKey: Uint8Array][];
    /**
     * Address for mining rewards (etherbase)
     * If not provided, defaults to the primary account.
     */
    minerCoinbase?: Address;
    /**
     * If there is a reorg, this is a safe distance from which
     * to try to refetch and refeed the blocks.
     */
    safeReorgDistance?: number;
    /**
     * If there is a skeleton fillCanonicalChain block lookup errors
     * because of closing chain conditions, this allows skeleton
     * to backstep and fill again using reverse block fetcher.
     */
    skeletonFillCanonicalBackStep?: number;
    /**
     * If skeleton subchains can be merged, what is the minimum tail
     * gain, as subchain merge will lead to the ReverseBlockFetcher
     * reset
     */
    skeletonSubchainMergeMinimum?: number;
    maxRangeBytes?: number;
    maxAccountRange?: bigint;
    /**
     * The time after which synced state is downgraded to unsynced
     */
    syncedStateRemovalPeriod?: number;
    /**
     * Max depth for parent lookups in engine's newPayload and forkchoiceUpdated
     */
    engineParentLookupMaxDepth?: number;
    /**
     * Max blocks including unexecuted parents to be executed in engine's newPayload
     */
    engineNewpayloadMaxExecute?: number;
    /**
     * Limit max transactions per block to execute in engine's newPayload for responsive engine api
     */
    engineNewpayloadMaxTxsExecute?: number;
    maxStorageRange?: bigint;
    /**
     * Cache size of invalid block hashes and their errors
     */
    maxInvalidBlocksErrorCache?: number;
    pruneEngineCache?: boolean;
    snapAvailabilityDepth?: bigint;
    snapTransitionSafeDepth?: bigint;
    /**
     * Save account keys preimages in the meta db (default: false)
     */
    savePreimages?: boolean;
    /**
     * Enables stateless verkle block execution (default: false)
     */
    statelessVerkle?: boolean;
}
export declare class Config {
    /**
     * Central event bus for events emitted by the different
     * components of the client
     */
    readonly events: EventBusType;
    static readonly CHAIN_DEFAULT = "mainnet";
    static readonly SYNCMODE_DEFAULT = SyncMode.Full;
    static readonly LIGHTSERV_DEFAULT = false;
    static readonly DATADIR_DEFAULT = "./datadir";
    static readonly PORT_DEFAULT = 30303;
    static readonly MAXPERREQUEST_DEFAULT = 100;
    static readonly MAXFETCHERJOBS_DEFAULT = 100;
    static readonly MAXFETCHERREQUESTS_DEFAULT = 5;
    static readonly MINPEERS_DEFAULT = 1;
    static readonly MAXPEERS_DEFAULT = 25;
    static readonly DNSADDR_DEFAULT = "8.8.8.8";
    static readonly EXECUTION = true;
    static readonly NUM_BLOCKS_PER_ITERATION = 100;
    static readonly ACCOUNT_CACHE = 400000;
    static readonly STORAGE_CACHE = 200000;
    static readonly CODE_CACHE = 200000;
    static readonly TRIE_CACHE = 200000;
    static readonly DEBUGCODE_DEFAULT = false;
    static readonly SAFE_REORG_DISTANCE = 100;
    static readonly SKELETON_FILL_CANONICAL_BACKSTEP = 100;
    static readonly SKELETON_SUBCHAIN_MERGE_MINIMUM = 1000;
    static readonly MAX_RANGE_BYTES = 50000;
    static readonly MAX_ACCOUNT_RANGE: bigint;
    static readonly MAX_STORAGE_RANGE: bigint;
    static readonly MAX_INVALID_BLOCKS_ERROR_CACHE = 128;
    static readonly PRUNE_ENGINE_CACHE = true;
    static readonly SYNCED_STATE_REMOVAL_PERIOD = 60000;
    static readonly ENGINE_PARENTLOOKUP_MAX_DEPTH = 128;
    static readonly ENGINE_NEWPAYLOAD_MAX_EXECUTE = 2;
    static readonly ENGINE_NEWPAYLOAD_MAX_TXS_EXECUTE = 100;
    static readonly SNAP_AVAILABILITY_DEPTH: bigint;
    static readonly SNAP_TRANSITION_SAFE_DEPTH: bigint;
    readonly logger: Logger;
    readonly syncmode: SyncMode;
    readonly vm?: VM;
    readonly lightserv: boolean;
    readonly datadir: string;
    readonly key: Uint8Array;
    readonly bootnodes?: Multiaddr[];
    readonly port?: number;
    readonly extIP?: string;
    readonly multiaddrs?: Multiaddr[];
    readonly saveReceipts: boolean;
    readonly txLookupLimit: number;
    readonly maxPerRequest: number;
    readonly maxFetcherJobs: number;
    readonly maxFetcherRequests: number;
    readonly minPeers: number;
    readonly maxPeers: number;
    readonly dnsAddr: string;
    readonly execution: boolean;
    readonly numBlocksPerIteration: number;
    readonly accountCache: number;
    readonly storageCache: number;
    readonly codeCache: number;
    readonly trieCache: number;
    readonly debugCode: boolean;
    readonly discDns: boolean;
    readonly discV4: boolean;
    readonly mine: boolean;
    readonly isSingleNode: boolean;
    readonly accounts: [address: Address, privKey: Uint8Array][];
    readonly minerCoinbase?: Address;
    readonly vmProfilerOpts?: VMProfilerOpts;
    readonly safeReorgDistance: number;
    readonly skeletonFillCanonicalBackStep: number;
    readonly skeletonSubchainMergeMinimum: number;
    readonly maxRangeBytes: number;
    readonly maxAccountRange: bigint;
    readonly maxStorageRange: bigint;
    readonly maxInvalidBlocksErrorCache: number;
    readonly pruneEngineCache: boolean;
    readonly syncedStateRemovalPeriod: number;
    readonly engineParentLookupMaxDepth: number;
    readonly engineNewpayloadMaxExecute: number;
    readonly engineNewpayloadMaxTxsExecute: number;
    readonly snapAvailabilityDepth: bigint;
    readonly snapTransitionSafeDepth: bigint;
    readonly prefixStorageTrieKeys: boolean;
    readonly enableSnapSync: boolean;
    readonly useStringValueTrieDB: boolean;
    readonly savePreimages: boolean;
    readonly statelessVerkle: boolean;
    synchronized: boolean;
    lastsyncronized?: boolean;
    /** lastSyncDate in ms */
    lastSyncDate: number;
    /** Best known block height */
    syncTargetHeight?: bigint;
    /** Client is in the process of shutting down */
    shutdown: boolean;
    readonly chainCommon: Common;
    readonly execCommon: Common;
    readonly server: RlpxServer | undefined;
    constructor(options?: ConfigOptions);
    /**
     * Update the synchronized state of the chain
     * @param option latest to update the sync state with
     * @emits {@link Event.SYNC_SYNCHRONIZED}
     */
    updateSynchronizedState(latest?: BlockHeader | null, emitSyncEvent?: boolean): void;
    /**
     * Returns the network directory for the chain.
     */
    getNetworkDirectory(): string;
    /**
     * Returns the location for each {@link DataDirectory}
     */
    getDataDirectory(dir: DataDirectory): string;
    /**
     * Returns the config level db.
     */
    static getConfigDB(networkDir: string): Level<string | Uint8Array, Uint8Array>;
    /**
     * Gets the client private key from the config db.
     */
    static getClientKey(datadir: string, common: Common): Promise<Uint8Array | undefined>;
    superMsg(msgs: string | string[], meta?: any): void;
    /**
     * Returns specified option or the default setting for whether DNS-based peer discovery
     * is enabled based on chainName. `true` for goerli
     */
    getDnsDiscovery(option: boolean | undefined): boolean;
}
//# sourceMappingURL=config.d.ts.map