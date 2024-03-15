"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrieNodeFetcher = void 0;
const statemanager_1 = require("@ethereumjs/statemanager");
const trie_1 = require("@ethereumjs/trie");
const util_1 = require("@ethereumjs/util");
const debug_1 = require("debug");
const keccak_1 = require("ethereum-cryptography/keccak");
const utils_1 = require("ethereum-cryptography/utils");
const js_sdsl_1 = require("js-sdsl");
const fetcher_1 = require("./fetcher");
const types_1 = require("./types");
class TrieNodeFetcher extends fetcher_1.Fetcher {
    /**
     * Create new trie node fetcher
     */
    constructor(options) {
        super(options);
        this.root = options.root;
        this.fetcherDoneFlags = options.fetcherDoneFlags ?? (0, types_1.getInitFecherDoneFlags)();
        this.pathToNodeRequestData = new js_sdsl_1.OrderedMap();
        this.requestedNodeToPath = new Map();
        this.fetchedAccountNodes = new Map();
        this.stateManager = options.stateManager ?? new statemanager_1.DefaultStateManager();
        this.accountTrie = this.stateManager['_getAccountTrie']();
        this.codeDB = this.stateManager['_getCodeDB']();
        this.nodeCount = 0;
        this.debug = (0, debug_1.debug)('client:TrieNodeFetcher');
        this.keccakFunction = this.config.chainCommon.customCrypto.keccak256 ?? keccak_1.keccak256;
        // will always start with root node as first set of node requests
        this.pathToNodeRequestData.setElement('', {
            nodeHash: (0, utils_1.bytesToHex)(this.root),
            nodeParentHash: '', // root node does not have a parent
        });
        this.debug(`Trie node fetcher instantiated with ${this.pathToNodeRequestData.size()} node requests destroyWhenDone=${this.destroyWhenDone}`);
    }
    setDestroyWhenDone() {
        this.destroyWhenDone = true;
    }
    /**
     * Request results from peer for the given job.
     * Resolves with the raw result
     * If `undefined` is returned, re-queue the job.
     * @param job
     * @param peer
     */
    async request(job) {
        const { task, peer } = job;
        const { paths, pathStrings } = task;
        const rangeResult = await peer.snap.getTrieNodes({
            root: this.root,
            paths,
            bytes: BigInt(this.config.maxRangeBytes),
        });
        // Response is valid, but check if peer is signalling that it does not have
        // the requested data. For trie node range queries that means the peer is not
        // yet synced.
        const requestedNodeCount = pathStrings.length;
        if (rangeResult === undefined || requestedNodeCount < rangeResult.nodes.length) {
            this.debug(`Peer rejected trienode request`);
            return undefined;
        }
        try {
            // While results are in the same order as requested hashes but there could be gaps/misses in the results
            // if the node doesn't has all of the requested trie nodes. We need an index to move forward through the hashes which are
            // absent in the receieved responses
            const receivedNodes = [];
            for (let i = 0; i < rangeResult.nodes.length; i++) {
                const receivedNode = rangeResult.nodes[i];
                const receivedHash = (0, utils_1.bytesToHex)(this.keccakFunction(receivedNode));
                if (this.requestedNodeToPath.has(receivedHash)) {
                    receivedNodes.push(rangeResult.nodes[i]);
                }
            }
            return Object.assign([], [receivedNodes], { completed: true });
        }
        catch (e) {
            this.debug(e);
        }
    }
    /**
     * Process the reply for the given job.
     * If the reply contains unexpected data, return `undefined`,
     * this re-queues the job.
     * @param job fetch job
     * @param result result data
     */
    process(job, result) {
        const fullResult = (job.partialResult ?? []).concat(result);
        job.partialResult = undefined;
        if (result.completed === true) {
            return fullResult;
        }
        else {
            // Save partial result to re-request missing items.
            job.partialResult = fullResult;
        }
    }
    /**
     * Store fetch result. Resolves once store operation is complete.
     * @param result fetch result
     */
    async store(result) {
        this.debug('At start of store phase');
        try {
            // process received node data and request unknown child nodes
            for (const nodeData of result[0]) {
                const node = (0, trie_1.decodeNode)(nodeData);
                const nodeHash = (0, utils_1.bytesToHex)(this.keccakFunction(nodeData));
                const pathString = this.requestedNodeToPath.get(nodeHash) ?? '';
                const [accountPath, storagePath] = pathString.split('/');
                const nodePath = storagePath ?? accountPath;
                const childNodes = [];
                let unknownChildNodeCount = 0;
                let hasStorageComponent = false;
                // get all children of received node
                if (node instanceof trie_1.BranchNode) {
                    const children = node.getChildren();
                    for (const [i, embeddedNode] of children) {
                        if (embeddedNode !== null) {
                            const newStoragePath = nodePath.concat((0, utils_1.bytesToHex)(Uint8Array.from([i])));
                            const syncPath = storagePath === undefined ? newStoragePath : [accountPath, newStoragePath].join('/');
                            this.debug('branch node found');
                            childNodes.push({
                                nodeHash: embeddedNode,
                                path: syncPath,
                            });
                        }
                    }
                }
                else if (node instanceof trie_1.ExtensionNode) {
                    this.debug('extension node found');
                    const stringPath = (0, utils_1.bytesToHex)((0, trie_1.pathToHexKey)(nodePath, node.key(), 'hex'));
                    const syncPath = storagePath === undefined ? stringPath : [accountPath, stringPath].join('/');
                    const val = {
                        nodeHash: node.value(),
                        path: syncPath,
                    };
                    childNodes.push(val);
                }
                else {
                    this.debug('leaf node found');
                    if (storagePath === undefined) {
                        this.debug('account leaf node found');
                        const account = util_1.Account.fromRlpSerializedAccount(node.value());
                        const storageRoot = account.storageRoot;
                        if ((0, utils_1.equalsBytes)(storageRoot, util_1.KECCAK256_RLP) === false) {
                            this.debug('storage component found');
                            const syncPath = [
                                (0, utils_1.bytesToHex)((0, trie_1.pathToHexKey)(accountPath, node.key(), 'hex')),
                                storagePath,
                            ].join('/');
                            this.pathToNodeRequestData.setElement(syncPath, {
                                nodeHash: (0, utils_1.bytesToHex)(storageRoot),
                                nodeParentHash: nodeHash,
                                parentAccountHash: nodeHash,
                            });
                            hasStorageComponent = true;
                        }
                        const codeHash = account.codeHash;
                        if (!((0, utils_1.equalsBytes)(codeHash, util_1.KECCAK256_NULL) === true)) {
                            // TODO
                        }
                    }
                    else {
                        this.debug('Storage leaf node found');
                    }
                }
                // TODO this for loop and contained logic is not verified - have to set up a sync where we pivot to a new state to see if unknown nodes are correctly identified
                // request unknown child nodes that have been freshly discovered
                for (const childNode of childNodes) {
                    try {
                        if (storagePath !== undefined) {
                            // look up node in storage trie, accountPath is hashed key/applied key
                            // TODO PR: optimized out the conversion from string to bytes?
                            const accountHash = (0, util_1.unprefixedHexToBytes)(accountPath);
                            const storageTrie = this.stateManager['_getStorageTrie'](accountHash);
                            await storageTrie.lookupNode(childNode.nodeHash);
                        }
                        else {
                            // look up node in account trie
                            await this.accountTrie.lookupNode(childNode.nodeHash);
                        }
                    }
                    catch (e) {
                        // if error is thrown, than the node is unknown and should be queued for fetching
                        unknownChildNodeCount++;
                        const { parentAccountHash } = this.pathToNodeRequestData.getElementByKey(pathString);
                        this.pathToNodeRequestData.setElement(childNode.path, {
                            nodeHash: (0, utils_1.bytesToHex)(childNode.nodeHash),
                            nodeParentHash: nodeHash,
                            parentAccountHash,
                        });
                    }
                }
                // record new node for batched storing after all subtrie nodes have been received
                const { nodeParentHash, parentAccountHash } = this.pathToNodeRequestData.getElementByKey(pathString);
                if (storagePath !== undefined) {
                    // if fetched node has a storagePath, it's storage node data and should be stored with
                    // account leaf node data from where it originates
                    const { pathToStorageNode } = this.fetchedAccountNodes.get(parentAccountHash);
                    pathToStorageNode.set(storagePath, nodeData);
                }
                else {
                    this.fetchedAccountNodes.set(nodeHash, {
                        parentHash: nodeParentHash,
                        deps: unknownChildNodeCount,
                        nodeData,
                        path: pathString,
                        pathToStorageNode: hasStorageComponent ? new Map() : undefined,
                    });
                }
                // remove filled requests
                this.requestedNodeToPath.delete(nodeHash);
                this.pathToNodeRequestData.eraseElementByKey(pathString);
            }
            // for an initial implementation, just put nodes into trie and see if root maches stateRoot
            if (this.pathToNodeRequestData.length === 0) {
                this.debug('All requests for current heal phase have been filled');
                const ops = [];
                for (const [_, data] of this.fetchedAccountNodes) {
                    const { nodeData, path, pathToStorageNode } = data;
                    // add account node data to account trie
                    const node = (0, trie_1.decodeNode)(nodeData);
                    if (node instanceof trie_1.LeafNode) {
                        const key = (0, utils_1.bytesToHex)((0, trie_1.pathToHexKey)(path, node.key(), 'keybyte'));
                        ops.push({
                            type: 'put',
                            key: (0, utils_1.hexToBytes)(key),
                            value: node.value(),
                        });
                        // add storage data for account if it has fetched nodes
                        // TODO figure out what the key should be for mapping accounts to storage tries
                        const storageTrie = new trie_1.Trie({ useKeyHashing: true, common: this.config.chainCommon });
                        const storageTrieOps = [];
                        if (pathToStorageNode !== undefined && pathToStorageNode.size > 0) {
                            for (const [path, data] of pathToStorageNode) {
                                const storageNode = (0, trie_1.decodeNode)(data);
                                if (storageNode instanceof trie_1.LeafNode) {
                                    const storageKey = (0, utils_1.bytesToHex)((0, trie_1.pathToHexKey)(path, storageNode.key(), 'keybyte'));
                                    storageTrieOps.push({
                                        type: 'put',
                                        key: (0, utils_1.hexToBytes)(storageKey),
                                        value: storageNode.value(),
                                    });
                                }
                            }
                            await storageTrie.batch(storageTrieOps, true);
                            await storageTrie.persistRoot();
                            const a = util_1.Account.fromRlpSerializedAccount(node.value());
                            this.debug(`Stored storageTrie with root actual=${(0, utils_1.bytesToHex)(storageTrie.root())} expected=${(0, utils_1.bytesToHex)(a.storageRoot)}`);
                        }
                    }
                }
                await this.accountTrie.batch(ops, true);
                await this.accountTrie.persistRoot();
                this.debug(`Stored accountTrie with root actual=${(0, utils_1.bytesToHex)(this.accountTrie.root())} expected=${(0, utils_1.bytesToHex)(this.root)}`);
            }
        }
        catch (e) {
            this.debug(e);
        }
    }
    // TODO take a parameter to indicate how many paths to return and refactor tasks function to use it
    getSortedPathStrings() {
        const pathStrings = [];
        // TODO have to keep track of which requests are in progress, efficiently, or remove them from pathToNodeRequestData
        // so that getSortedPathStrings doesn't return duplicates
        for (const [pathString, _] of this.pathToNodeRequestData) {
            pathStrings.push(pathString);
        }
        return { pathStrings };
    }
    /**
     * Generate list of tasks to fetch. Modifies `first` and `count` to indicate
     * remaining items apart from the tasks it pushes in the queue
     */
    tasks(maxTasks = this.config.maxFetcherJobs) {
        const max = this.config.maxPerRequest;
        const tasks = [];
        try {
            if (this.pathToNodeRequestData.size() > 0) {
                let { pathStrings } = this.getSortedPathStrings(); // TODO pass in number of paths to return
                while (tasks.length < maxTasks && pathStrings.length > 0) {
                    const requestedPathStrings = pathStrings.slice(0, max);
                    pathStrings = pathStrings.slice(max + 1);
                    for (const pathString of requestedPathStrings) {
                        const nodeHash = this.pathToNodeRequestData.getElementByKey(pathString)?.nodeHash; // TODO return node set too from sorted function and avoid lookups here
                        if (nodeHash === undefined)
                            throw Error('Path should exist');
                        this.requestedNodeToPath.set(nodeHash, pathString);
                    }
                    this.debug('At start of mergeAndFormatPaths');
                    const paths = (0, trie_1.mergeAndFormatKeyPaths)(requestedPathStrings);
                    tasks.push({
                        pathStrings: requestedPathStrings,
                        paths,
                    });
                    this.debug(`Created new tasks num=${tasks.length}`);
                }
            }
            this.debug(`Created new tasks num=${tasks.length}`);
        }
        catch (e) {
            this.debug(e);
        }
        return tasks;
    }
    nextTasks() {
        try {
            if (this.in.length === 0) {
                if (this.pathToNodeRequestData.size() > 0) {
                    const tasks = this.tasks();
                    let count = 0;
                    for (const task of tasks) {
                        count += task.pathStrings.length;
                        this.enqueueTask(task, true);
                    }
                    this.debug(`Fetcher pending with ${count} path requested`);
                }
            }
        }
        catch (err) {
            this.debug(err);
        }
    }
    /**
     * Clears all outstanding tasks from the fetcher
     */
    clear() {
        return;
    }
    /**
     * Returns an idle peer that can process a next job.
     */
    peer() {
        return this.pool.idle((peer) => 'snap' in peer);
    }
    processStoreError(error, _task) {
        const stepBack = util_1.BIGINT_0;
        const destroyFetcher = !error.message.includes(`InvalidRangeProof`) &&
            !error.message.includes(`InvalidAccountRange`);
        const banPeer = true;
        return { destroyFetcher, banPeer, stepBack };
    }
    /**
     * Job log format helper.
     * @param job
     * @param withIndex pass true to additionally output job.index
     */
    jobStr(job, withIndex = false) {
        let str = '';
        if (withIndex) {
            str += `index=${job.index} `;
        }
        str += `${job.task.paths.length} node requests`;
        return str;
    }
}
exports.TrieNodeFetcher = TrieNodeFetcher;
//# sourceMappingURL=trienodefetcher.js.map