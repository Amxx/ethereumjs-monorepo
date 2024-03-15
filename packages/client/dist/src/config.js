"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = exports.SyncMode = exports.DataDirectory = void 0;
const common_1 = require("@ethereumjs/common");
const devp2p_1 = require("@ethereumjs/devp2p");
const util_1 = require("@ethereumjs/util");
const level_1 = require("level");
const logging_1 = require("./logging");
const server_1 = require("./net/server");
const types_1 = require("./types");
const util_2 = require("./util");
var DataDirectory;
(function (DataDirectory) {
    DataDirectory["Chain"] = "chain";
    DataDirectory["State"] = "state";
    DataDirectory["Meta"] = "meta";
})(DataDirectory = exports.DataDirectory || (exports.DataDirectory = {}));
var SyncMode;
(function (SyncMode) {
    SyncMode["Full"] = "full";
    SyncMode["Light"] = "light";
    SyncMode["None"] = "none";
})(SyncMode = exports.SyncMode || (exports.SyncMode = {}));
class Config {
    constructor(options = {}) {
        /** Client is in the process of shutting down */
        this.shutdown = false;
        this.server = undefined;
        this.events = new types_1.EventBus();
        this.syncmode = options.syncmode ?? Config.SYNCMODE_DEFAULT;
        this.vm = options.vm;
        this.lightserv = options.lightserv ?? Config.LIGHTSERV_DEFAULT;
        this.bootnodes = options.bootnodes;
        this.port = options.port ?? Config.PORT_DEFAULT;
        this.extIP = options.extIP;
        this.multiaddrs = options.multiaddrs;
        this.datadir = options.datadir ?? Config.DATADIR_DEFAULT;
        this.key = options.key ?? (0, devp2p_1.genPrivateKey)();
        this.saveReceipts = options.saveReceipts ?? false;
        this.txLookupLimit = options.txLookupLimit ?? 2350000;
        this.maxPerRequest = options.maxPerRequest ?? Config.MAXPERREQUEST_DEFAULT;
        this.maxFetcherJobs = options.maxFetcherJobs ?? Config.MAXFETCHERJOBS_DEFAULT;
        this.maxFetcherRequests = options.maxFetcherRequests ?? Config.MAXFETCHERREQUESTS_DEFAULT;
        this.minPeers = options.minPeers ?? Config.MINPEERS_DEFAULT;
        this.maxPeers = options.maxPeers ?? Config.MAXPEERS_DEFAULT;
        this.dnsAddr = options.dnsAddr ?? Config.DNSADDR_DEFAULT;
        this.execution = options.execution ?? Config.EXECUTION;
        this.numBlocksPerIteration = options.numBlocksPerIteration ?? Config.NUM_BLOCKS_PER_ITERATION;
        this.accountCache = options.accountCache ?? Config.ACCOUNT_CACHE;
        this.storageCache = options.storageCache ?? Config.STORAGE_CACHE;
        this.codeCache = options.codeCache ?? Config.CODE_CACHE;
        this.trieCache = options.trieCache ?? Config.TRIE_CACHE;
        this.debugCode = options.debugCode ?? Config.DEBUGCODE_DEFAULT;
        this.mine = options.mine ?? false;
        this.isSingleNode = options.isSingleNode ?? false;
        this.savePreimages = options.savePreimages ?? false;
        if (options.vmProfileBlocks !== undefined || options.vmProfileTxs !== undefined) {
            this.vmProfilerOpts = {
                reportAfterBlock: options.vmProfileBlocks !== false,
                reportAfterTx: options.vmProfileTxs !== false,
            };
        }
        this.accounts = options.accounts ?? [];
        this.minerCoinbase = options.minerCoinbase;
        this.safeReorgDistance = options.safeReorgDistance ?? Config.SAFE_REORG_DISTANCE;
        this.skeletonFillCanonicalBackStep =
            options.skeletonFillCanonicalBackStep ?? Config.SKELETON_FILL_CANONICAL_BACKSTEP;
        this.skeletonSubchainMergeMinimum =
            options.skeletonSubchainMergeMinimum ?? Config.SKELETON_SUBCHAIN_MERGE_MINIMUM;
        this.maxRangeBytes = options.maxRangeBytes ?? Config.MAX_RANGE_BYTES;
        this.maxAccountRange = options.maxAccountRange ?? Config.MAX_ACCOUNT_RANGE;
        this.maxStorageRange = options.maxStorageRange ?? Config.MAX_STORAGE_RANGE;
        this.maxInvalidBlocksErrorCache =
            options.maxInvalidBlocksErrorCache ?? Config.MAX_INVALID_BLOCKS_ERROR_CACHE;
        this.pruneEngineCache = options.pruneEngineCache ?? Config.PRUNE_ENGINE_CACHE;
        this.syncedStateRemovalPeriod =
            options.syncedStateRemovalPeriod ?? Config.SYNCED_STATE_REMOVAL_PERIOD;
        this.engineParentLookupMaxDepth =
            options.engineParentLookupMaxDepth ?? Config.ENGINE_PARENTLOOKUP_MAX_DEPTH;
        this.engineNewpayloadMaxExecute =
            options.engineNewpayloadMaxExecute ?? Config.ENGINE_NEWPAYLOAD_MAX_EXECUTE;
        this.engineNewpayloadMaxTxsExecute =
            options.engineNewpayloadMaxTxsExecute ?? Config.ENGINE_NEWPAYLOAD_MAX_TXS_EXECUTE;
        this.snapAvailabilityDepth = options.snapAvailabilityDepth ?? Config.SNAP_AVAILABILITY_DEPTH;
        this.snapTransitionSafeDepth =
            options.snapTransitionSafeDepth ?? Config.SNAP_TRANSITION_SAFE_DEPTH;
        this.prefixStorageTrieKeys = options.prefixStorageTrieKeys ?? true;
        this.enableSnapSync = options.enableSnapSync ?? false;
        this.useStringValueTrieDB = options.useStringValueTrieDB ?? false;
        this.statelessVerkle = options.statelessVerkle ?? true;
        // Start it off as synchronized if this is configured to mine or as single node
        this.synchronized = this.isSingleNode ?? this.mine;
        this.lastSyncDate = 0;
        const common = options.common ?? new common_1.Common({ chain: Config.CHAIN_DEFAULT, hardfork: common_1.Hardfork.Chainstart });
        this.chainCommon = common.copy();
        this.execCommon = common.copy();
        this.discDns = this.getDnsDiscovery(options.discDns);
        this.discV4 = options.discV4 ?? true;
        this.logger = options.logger ?? (0, logging_1.getLogger)({ loglevel: 'error' });
        this.logger.info(`Sync Mode ${this.syncmode}`);
        if (this.syncmode !== SyncMode.None) {
            if (options.server !== undefined) {
                this.server = options.server;
            }
            else if ((0, util_2.isBrowser)() !== true) {
                // Otherwise start server
                const bootnodes = this.bootnodes ?? this.chainCommon.bootstrapNodes();
                const dnsNetworks = options.dnsNetworks ?? this.chainCommon.dnsNetworks();
                this.server = new server_1.RlpxServer({ config: this, bootnodes, dnsNetworks });
            }
        }
        this.events.once(types_1.Event.CLIENT_SHUTDOWN, () => {
            this.shutdown = true;
        });
    }
    /**
     * Update the synchronized state of the chain
     * @param option latest to update the sync state with
     * @emits {@link Event.SYNC_SYNCHRONIZED}
     */
    updateSynchronizedState(latest, emitSyncEvent) {
        // If no syncTargetHeight has been discovered from peer and neither the client is set
        // for mining/single run (validator), then sync state can't be updated
        if ((this.syncTargetHeight ?? util_1.BIGINT_0) === util_1.BIGINT_0 && !this.mine && !this.isSingleNode) {
            return;
        }
        if (latest !== null && latest !== undefined) {
            const height = latest.number;
            if (height >= (this.syncTargetHeight ?? util_1.BIGINT_0)) {
                this.syncTargetHeight = height;
                this.lastSyncDate =
                    typeof latest.timestamp === 'bigint' && latest.timestamp > 0n
                        ? Number(latest.timestamp) * 1000
                        : Date.now();
                const diff = Date.now() - this.lastSyncDate;
                // update synchronized
                if (diff < this.syncedStateRemovalPeriod) {
                    if (!this.synchronized) {
                        this.synchronized = true;
                        // Log to console the sync status
                        this.superMsg(`Synchronized blockchain at height=${height} hash=${(0, util_2.short)(latest.hash())} 🎉`);
                    }
                    if (emitSyncEvent === true) {
                        this.events.emit(types_1.Event.SYNC_SYNCHRONIZED, height);
                    }
                }
            }
        }
        else {
            if (this.synchronized && !this.mine && !this.isSingleNode) {
                const diff = Date.now() - this.lastSyncDate;
                if (diff >= this.syncedStateRemovalPeriod) {
                    this.synchronized = false;
                    this.logger.info(`Sync status reset (no chain updates for ${Math.round(diff / 1000)} seconds).`);
                }
            }
        }
        if (this.synchronized !== this.lastsyncronized) {
            this.logger.debug(`Client synchronized=${this.synchronized}${latest !== null && latest !== undefined ? ' height=' + latest.number : ''} syncTargetHeight=${this.syncTargetHeight} lastSyncDate=${(Date.now() - this.lastSyncDate) / 1000} secs ago`);
            this.lastsyncronized = this.synchronized;
        }
    }
    /**
     * Returns the network directory for the chain.
     */
    getNetworkDirectory() {
        const networkDirName = this.chainCommon.chainName();
        return `${this.datadir}/${networkDirName}`;
    }
    /**
     * Returns the location for each {@link DataDirectory}
     */
    getDataDirectory(dir) {
        const networkDir = this.getNetworkDirectory();
        switch (dir) {
            case DataDirectory.Chain: {
                const chainDataDirName = this.syncmode === SyncMode.Light ? 'lightchain' : 'chain';
                return `${networkDir}/${chainDataDirName}`;
            }
            case DataDirectory.State:
                return `${networkDir}/state`;
            case DataDirectory.Meta:
                return `${networkDir}/meta`;
        }
    }
    /**
     * Returns the config level db.
     */
    static getConfigDB(networkDir) {
        return new level_1.Level(`${networkDir}/config`);
    }
    /**
     * Gets the client private key from the config db.
     */
    static async getClientKey(datadir, common) {
        const networkDir = `${datadir}/${common.chainName()}`;
        const db = this.getConfigDB(networkDir);
        const encodingOpts = { keyEncoding: 'utf8', valueEncoding: 'view' };
        const dbKey = 'config:client_key';
        let key;
        try {
            key = await db.get(dbKey, encodingOpts);
        }
        catch (error) {
            if (error.code === 'LEVEL_NOT_FOUND') {
                // generate and save a new key
                key = (0, devp2p_1.genPrivateKey)();
                await db.put(dbKey, key, encodingOpts);
            }
        }
        return key;
    }
    superMsg(msgs, meta) {
        if (typeof msgs === 'string') {
            msgs = [msgs];
        }
        let len = 0;
        for (const msg of msgs) {
            len = msg.length > len ? msg.length : len;
        }
        this.logger.info('-'.repeat(len), meta);
        for (const msg of msgs) {
            this.logger.info(msg, meta);
        }
        this.logger.info('-'.repeat(len), meta);
    }
    /**
     * Returns specified option or the default setting for whether DNS-based peer discovery
     * is enabled based on chainName. `true` for goerli
     */
    getDnsDiscovery(option) {
        if (option !== undefined)
            return option;
        const dnsNets = ['goerli', 'sepolia', 'holesky'];
        return dnsNets.includes(this.chainCommon.chainName());
    }
}
exports.Config = Config;
Config.CHAIN_DEFAULT = 'mainnet';
Config.SYNCMODE_DEFAULT = SyncMode.Full;
Config.LIGHTSERV_DEFAULT = false;
Config.DATADIR_DEFAULT = `./datadir`;
Config.PORT_DEFAULT = 30303;
Config.MAXPERREQUEST_DEFAULT = 100;
Config.MAXFETCHERJOBS_DEFAULT = 100;
Config.MAXFETCHERREQUESTS_DEFAULT = 5;
Config.MINPEERS_DEFAULT = 1;
Config.MAXPEERS_DEFAULT = 25;
Config.DNSADDR_DEFAULT = '8.8.8.8';
Config.EXECUTION = true;
Config.NUM_BLOCKS_PER_ITERATION = 100;
Config.ACCOUNT_CACHE = 400000;
Config.STORAGE_CACHE = 200000;
Config.CODE_CACHE = 200000;
Config.TRIE_CACHE = 200000;
Config.DEBUGCODE_DEFAULT = false;
Config.SAFE_REORG_DISTANCE = 100;
Config.SKELETON_FILL_CANONICAL_BACKSTEP = 100;
Config.SKELETON_SUBCHAIN_MERGE_MINIMUM = 1000;
Config.MAX_RANGE_BYTES = 50000;
// This should get like 100 accounts in this range
Config.MAX_ACCOUNT_RANGE = (util_1.BIGINT_2 ** util_1.BIGINT_256 - util_1.BIGINT_1) / BigInt(1000);
// Larger ranges used for storage slots since assumption is slots should be much sparser than accounts
Config.MAX_STORAGE_RANGE = (util_1.BIGINT_2 ** util_1.BIGINT_256 - util_1.BIGINT_1) / BigInt(10);
Config.MAX_INVALID_BLOCKS_ERROR_CACHE = 128;
Config.PRUNE_ENGINE_CACHE = true;
Config.SYNCED_STATE_REMOVAL_PERIOD = 60000;
// engine new payload calls can come in batch of 64, keeping 128 as the lookup factor
Config.ENGINE_PARENTLOOKUP_MAX_DEPTH = 128;
Config.ENGINE_NEWPAYLOAD_MAX_EXECUTE = 2;
// currently ethereumjs can execute 200 txs in 12 second window so keeping 1/2 target for blocking response
Config.ENGINE_NEWPAYLOAD_MAX_TXS_EXECUTE = 100;
Config.SNAP_AVAILABILITY_DEPTH = BigInt(128);
// distance from head at which we can safely transition from a synced snapstate to vmexecution
// randomly kept it at 5 for fast testing purposes but ideally should be >=32 slots
Config.SNAP_TRANSITION_SAFE_DEPTH = BigInt(5);
//# sourceMappingURL=config.js.map