"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FullEthereumService = void 0;
const common_1 = require("@ethereumjs/common");
const tx_1 = require("@ethereumjs/tx");
const util_1 = require("@ethereumjs/util");
const vm_1 = require("@ethereumjs/vm");
const config_1 = require("../config");
const execution_1 = require("../execution");
const miner_1 = require("../miner");
const ethprotocol_1 = require("../net/protocol/ethprotocol");
const lesprotocol_1 = require("../net/protocol/lesprotocol");
const snapprotocol_1 = require("../net/protocol/snapprotocol");
const sync_1 = require("../sync");
const types_1 = require("../types");
const service_1 = require("./service");
const skeleton_1 = require("./skeleton");
const txpool_1 = require("./txpool");
/**
 * Full Ethereum service
 * @memberof module:service
 */
class FullEthereumService extends service_1.Service {
    /**
     * Create new ETH service
     */
    constructor(options) {
        super(options);
        /** building head state via snapsync or vmexecution */
        this.building = false;
        this.lightserv = options.lightserv ?? false;
        this.config.logger.info('Full sync mode');
        const { metaDB } = options;
        if (metaDB !== undefined) {
            this.skeleton = new skeleton_1.Skeleton({
                config: this.config,
                chain: this.chain,
                metaDB,
            });
        }
        this.execution = new execution_1.VMExecution({
            config: options.config,
            stateDB: options.stateDB,
            metaDB,
            chain: this.chain,
        });
        this.snapsync = this.config.enableSnapSync
            ? new sync_1.SnapSynchronizer({
                config: this.config,
                pool: this.pool,
                chain: this.chain,
                interval: this.interval,
                skeleton: this.skeleton,
                execution: this.execution,
            })
            : undefined;
        this.txPool = new txpool_1.TxPool({
            config: this.config,
            service: this,
        });
        if (this.config.syncmode === config_1.SyncMode.Full) {
            if (this.config.chainCommon.gteHardfork(common_1.Hardfork.Paris) === true) {
                // skip opening the beacon synchronizer before everything else (chain, execution etc)
                // as it resets and messes up the entire chain
                //
                // also with skipOpen this call is a sync call as no async operation is executed
                // as good as creating the synchronizer here
                void this.switchToBeaconSync(true);
                this.config.logger.info(`Post-merge 🐼 client mode: run with CL client.`);
            }
            else {
                this.synchronizer = new sync_1.FullSynchronizer({
                    config: this.config,
                    pool: this.pool,
                    chain: this.chain,
                    txPool: this.txPool,
                    execution: this.execution,
                    interval: this.interval,
                });
                if (this.config.mine) {
                    this.miner = new miner_1.Miner({
                        config: this.config,
                        service: this,
                    });
                }
            }
        }
    }
    /**
     * Public accessor for {@link BeaconSynchronizer}. Returns undefined if unavailable.
     */
    get beaconSync() {
        if (this.synchronizer instanceof sync_1.BeaconSynchronizer) {
            return this.synchronizer;
        }
        return undefined;
    }
    /**
     * Helper to switch to {@link BeaconSynchronizer}
     */
    async switchToBeaconSync(skipOpen = false) {
        if (this.synchronizer instanceof sync_1.FullSynchronizer) {
            await this.synchronizer.stop();
            await this.synchronizer.close();
            this.miner?.stop();
            this.config.superMsg(`Transitioning to beacon sync`);
        }
        if (this.config.syncmode !== config_1.SyncMode.None && this.beaconSync === undefined) {
            this.synchronizer = new sync_1.BeaconSynchronizer({
                config: this.config,
                pool: this.pool,
                chain: this.chain,
                interval: this.interval,
                execution: this.execution,
                skeleton: this.skeleton,
            });
            if (!skipOpen) {
                await this.synchronizer.open();
            }
        }
    }
    async open() {
        if (this.synchronizer !== undefined) {
            this.config.logger.info(`Preparing for sync using FullEthereumService with ${this.synchronizer instanceof sync_1.BeaconSynchronizer
                ? 'BeaconSynchronizer'
                : 'FullSynchronizer'}.`);
        }
        else {
            this.config.logger.info('Starting FullEthereumService with no syncing.');
        }
        // Broadcast pending txs to newly connected peer
        this.config.events.on(types_1.Event.POOL_PEER_ADDED, (peer) => {
            // TODO: Should we do this if the txPool isn't started?
            const txs = [[], [], []];
            for (const addr of this.txPool.pool) {
                for (const tx of addr[1]) {
                    const rawTx = tx.tx;
                    txs[0].push(rawTx.type);
                    if (rawTx.type !== tx_1.TransactionType.BlobEIP4844) {
                        txs[1].push(rawTx.serialize().byteLength);
                    }
                    else {
                        txs[1].push(rawTx.serializeNetworkWrapper().byteLength);
                    }
                    txs[2].push((0, util_1.hexToBytes)('0x' + tx.hash));
                }
            }
            if (txs[0].length > 0)
                this.txPool.sendNewTxHashes(txs, [peer]);
        });
        // skeleton needs to be opened before synchronizers are opened
        // but after chain is opened, which skeleton.open() does internally
        await this.skeleton?.open();
        await super.open();
        // open snapsync instead of execution if instantiated
        // it will open execution when done (or if doesn't need to snap sync)
        if (this.snapsync !== undefined) {
            // set up execution vm to avoid undefined error in syncWithPeer when vm is being passed to accountfetcher
            if (this.execution.config.execCommon.gteHardfork(common_1.Hardfork.Prague)) {
                if (!this.execution.config.statelessVerkle) {
                    throw Error(`Currently stateful verkle execution not supported`);
                }
                this.execution.config.logger.info(`Skipping VM verkle statemanager genesis hardfork=${this.execution.hardfork}`);
                await this.execution.setupVerkleVM();
                this.execution.vm = this.execution.verkleVM;
            }
            else {
                this.execution.config.logger.info(`Initializing VM merkle statemanager genesis hardfork=${this.execution.hardfork}`);
                await this.execution.setupMerkleVM();
                this.execution.vm = this.execution.merkleVM;
            }
            await this.snapsync.open();
        }
        else {
            await this.execution.open();
        }
        this.txPool.open();
        if (this.config.mine) {
            // Start the TxPool immediately if mining
            this.txPool.start();
        }
        return true;
    }
    /**
     * Start service
     */
    async start() {
        if (this.running) {
            return false;
        }
        await super.start();
        this.miner?.start();
        if (this.snapsync === undefined) {
            await this.execution.start();
        }
        void this.buildHeadState();
        return true;
    }
    /**
     * if the vm head is not recent enough, trigger building a recent state by snapsync or by running
     * vm execution
     */
    async buildHeadState() {
        if (this.building)
            return;
        this.building = true;
        try {
            if (this.execution.started && this.synchronizer !== undefined) {
                await this.synchronizer.runExecution();
            }
            else if (this.snapsync !== undefined) {
                if (this.config.synchronized === true || this.skeleton?.synchronized === true) {
                    const syncResult = await this.snapsync.checkAndSync();
                    if (syncResult !== null) {
                        const transition = await this.skeleton?.setVmHead(syncResult);
                        if (transition === true) {
                            this.config.superMsg('Snapsync completed, transitioning to VMExecution');
                            await this.execution.open();
                            await this.execution.start();
                        }
                    }
                }
                else {
                    this.config.logger.debug(`skipping snapsync since cl (skeleton) synchronized=${this.skeleton?.synchronized}`);
                }
            }
            else {
                this.config.logger.warn('skipping building head state as neither execution is started nor snapsync is available');
            }
        }
        catch (error) {
            this.config.logger.error(`Error building headstate error=${error}`);
        }
        finally {
            this.building = false;
        }
    }
    /**
     * Stop service
     */
    async stop() {
        if (!this.running) {
            return false;
        }
        this.txPool.stop();
        this.miner?.stop();
        await this.synchronizer?.stop();
        await this.snapsync?.stop();
        // independently close execution even if it might have been opened by snapsync
        await this.execution.stop();
        await super.stop();
        return true;
    }
    /**
     * Close service
     */
    async close() {
        if (!this.opened)
            return;
        this.txPool.close();
        await super.close();
    }
    /**
     * Returns all protocols required by this service
     */
    get protocols() {
        const protocols = [
            new ethprotocol_1.EthProtocol({
                config: this.config,
                chain: this.chain,
                timeout: this.timeout,
            }),
            new snapprotocol_1.SnapProtocol({
                config: this.config,
                chain: this.chain,
                timeout: this.timeout,
                convertSlimBody: true,
            }),
        ];
        if (this.config.lightserv) {
            protocols.push(new lesprotocol_1.LesProtocol({
                config: this.config,
                chain: this.chain,
                flow: this.flow,
                timeout: this.timeout,
            }));
        }
        return protocols;
    }
    /**
     * Handles incoming message from connected peer
     * @param message message object
     * @param protocol protocol name
     * @param peer peer
     */
    async handle(message, protocol, peer) {
        if (protocol === 'eth') {
            return this.handleEth(message, peer);
        }
        else {
            return this.handleLes(message, peer);
        }
    }
    /**
     * Handles incoming ETH message from connected peer
     * @param message message object
     * @param peer peer
     */
    async handleEth(message, peer) {
        switch (message.name) {
            case 'GetBlockHeaders': {
                const { reqId, block, max, skip, reverse } = message.data;
                if (typeof block === 'bigint') {
                    if ((reverse === true && block > this.chain.headers.height) ||
                        (reverse !== true && block + BigInt(max * skip) > this.chain.headers.height)) {
                        // Respond with an empty list in case the header is higher than the current height
                        // This is to ensure Geth does not disconnect with "useless peer"
                        // TODO: in batch queries filter out the headers we do not have and do not send
                        // the empty list in case one or more headers are not available
                        peer.eth.send('BlockHeaders', { reqId, headers: [] });
                        return;
                    }
                }
                const headers = await this.chain.getHeaders(block, max, skip, reverse);
                peer.eth.send('BlockHeaders', { reqId, headers });
                break;
            }
            case 'GetBlockBodies': {
                const { reqId, hashes } = message.data;
                const blocks = await Promise.all(hashes.map((hash) => this.chain.getBlock(hash)));
                const bodies = blocks.map((block) => block.raw().slice(1));
                peer.eth.send('BlockBodies', { reqId, bodies });
                break;
            }
            case 'NewBlockHashes': {
                if (this.config.chainCommon.gteHardfork(common_1.Hardfork.Paris) === true) {
                    this.config.logger.debug(`Dropping peer ${peer.id} for sending NewBlockHashes after merge (EIP-3675)`);
                    this.pool.ban(peer, 9000000);
                }
                else if (this.synchronizer instanceof sync_1.FullSynchronizer) {
                    this.synchronizer.handleNewBlockHashes(message.data);
                }
                break;
            }
            case 'Transactions': {
                await this.txPool.handleAnnouncedTxs(message.data, peer, this.pool);
                break;
            }
            case 'NewBlock': {
                if (this.config.chainCommon.gteHardfork(common_1.Hardfork.Paris) === true) {
                    this.config.logger.debug(`Dropping peer ${peer.id} for sending NewBlock after merge (EIP-3675)`);
                    this.pool.ban(peer, 9000000);
                }
                else if (this.synchronizer instanceof sync_1.FullSynchronizer) {
                    await this.synchronizer.handleNewBlock(message.data[0], peer);
                }
                break;
            }
            case 'NewPooledTransactionHashes': {
                let hashes = [];
                if (peer.eth['versions'].includes(68)) {
                    // eth/68 message data format - [tx_types: number[], tx_sizes: number[], tx_hashes: uint8array[]]
                    // With eth/68, we can check transaction types and transaction sizes to
                    // decide whether or not to download the transactions announced by this message.  This
                    // can be used to prevent mempool spamming or decide whether or not to filter out certain
                    // transactions - though this is not prescribed in eth/68 (EIP 5793)
                    // https://eips.ethereum.org/EIPS/eip-5793
                    hashes = message.data[2];
                }
                else {
                    hashes = message.data;
                }
                await this.txPool.handleAnnouncedTxHashes(hashes, peer, this.pool);
                break;
            }
            case 'GetPooledTransactions': {
                const { reqId, hashes } = message.data;
                const txs = this.txPool.getByHash(hashes);
                // Always respond, also on an empty list
                peer.eth?.send('PooledTransactions', { reqId, txs });
                break;
            }
            case 'GetReceipts': {
                const [reqId, hashes] = message.data;
                const { receiptsManager } = this.execution;
                if (!receiptsManager)
                    return;
                const receipts = [];
                let receiptsSize = 0;
                for (const hash of hashes) {
                    const blockReceipts = await receiptsManager.getReceipts(hash, true, true);
                    if (blockReceipts === undefined)
                        continue;
                    receipts.push(...blockReceipts);
                    const receiptsBytes = (0, util_1.concatBytes)(...receipts.map((r) => (0, vm_1.encodeReceipt)(r, r.txType)));
                    receiptsSize += receiptsBytes.byteLength;
                    // From spec: The recommended soft limit for Receipts responses is 2 MiB.
                    if (receiptsSize >= 2097152) {
                        break;
                    }
                }
                peer.eth?.send('Receipts', { reqId, receipts });
                break;
            }
        }
    }
    /**
     * Handles incoming LES message from connected peer
     * @param message message object
     * @param peer peer
     */
    async handleLes(message, peer) {
        if (message.name === 'GetBlockHeaders' && this.config.lightserv) {
            const { reqId, block, max, skip, reverse } = message.data;
            const bv = this.flow.handleRequest(peer, message.name, max);
            if (bv < 0) {
                this.pool.ban(peer, 300000);
                this.config.logger.debug(`Dropping peer for violating flow control ${peer}`);
            }
            else {
                if (typeof block === 'bigint') {
                    if ((reverse === true && block > this.chain.headers.height) ||
                        (reverse !== true && block + BigInt(max * skip) > this.chain.headers.height)) {
                        // Don't respond to requests greater than the current height
                        return;
                    }
                }
                const headers = await this.chain.getHeaders(block, max, skip, reverse);
                peer.les.send('BlockHeaders', { reqId, bv, headers });
            }
        }
    }
}
exports.FullEthereumService = FullEthereumService;
//# sourceMappingURL=fullethereumservice.js.map