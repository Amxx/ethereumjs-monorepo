"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageFetcher = void 0;
const statemanager_1 = require("@ethereumjs/statemanager");
const trie_1 = require("@ethereumjs/trie");
const util_1 = require("@ethereumjs/util");
const debug_1 = require("debug");
const keccak_1 = require("ethereum-cryptography/keccak");
const util_2 = require("../../util");
const fetcher_1 = require("./fetcher");
const types_1 = require("./types");
const { debug: createDebugLogger } = debug_1.default;
const TOTAL_RANGE_END = util_1.BIGINT_2 ** util_1.BIGINT_256 - util_1.BIGINT_1;
class StorageFetcher extends fetcher_1.Fetcher {
    /**
     * Create new storage fetcher
     */
    constructor(options) {
        super(options);
        this.fragmentedRequests = [];
        this.root = options.root;
        this.stateManager = options.stateManager ?? new statemanager_1.DefaultStateManager();
        this.fetcherDoneFlags = options.fetcherDoneFlags ?? (0, types_1.getInitFecherDoneFlags)();
        this.storageRequests = options.storageRequests ?? [];
        this.fetcherDoneFlags.storageFetcher.count = BigInt(this.storageRequests.length);
        this.accountToHighestKnownHash = new Map();
        this.debug = createDebugLogger('client:StorageFetcher');
        if (this.storageRequests.length > 0) {
            const fullJob = {
                task: { storageRequests: this.storageRequests },
            };
            const origin = this.getOrigin(fullJob);
            const limit = this.getLimit(fullJob);
            this.debug(`Storage fetcher instantiated with ${fullJob.task.storageRequests.length} accounts requested and root=${(0, util_2.short)(this.root)} origin=${(0, util_2.short)(origin)} limit=${(0, util_2.short)(limit)} destroyWhenDone=${this.destroyWhenDone}`);
        }
        else if (this.storageRequests.length === 0) {
            this.debug('Idle storage fetcher has been instantiated');
        }
    }
    async verifyRangeProof(stateRoot, origin, { slots, proof }) {
        try {
            this.debug(`verifyRangeProof slots:${slots.length} first=${(0, util_2.short)(slots[0].hash)} last=${(0, util_2.short)(slots[slots.length - 1].hash)}`);
            const keys = slots.map((slot) => slot.hash);
            const values = slots.map((slot) => slot.body);
            return await trie_1.Trie.verifyRangeProof(stateRoot, origin, keys[keys.length - 1], keys, values, proof ?? null, {
                common: this.config.chainCommon,
                useKeyHashingFunction: this.config.chainCommon?.customCrypto?.keccak256 ?? keccak_1.keccak256,
            });
        }
        catch (err) {
            this.debug(`verifyRangeProof failure: ${err.stack}`);
            throw Error(err.message);
        }
    }
    /**
     *
     * @param job
     * @returns origin of job is set using either @first property of fetcher or latest hash of partial job
     */
    getOrigin(job) {
        let origin;
        // this try block contains code that is currently susceptible to typing issues and resulting errors
        try {
            const { task, partialResult } = job;
            if (task.multi === true) {
                // peer does not respect origin or limit for multi-account storage fetch
                return (0, util_1.setLengthLeft)((0, util_1.bigIntToBytes)(util_1.BIGINT_0), 32);
            }
            const { first } = task.storageRequests[0];
            if (partialResult) {
                const lastSlotArray = partialResult[partialResult.length - 1];
                const lastSlot = lastSlotArray[lastSlotArray.length - 1];
                // @ts-ignore
                origin = (0, util_1.bigIntToBytes)((0, util_1.bytesToBigInt)(lastSlot[lastSlot.length - 1].hash) + util_1.BIGINT_1);
            }
            else {
                origin = (0, util_1.bigIntToBytes)(first + util_1.BIGINT_1);
            }
            return (0, util_1.setLengthLeft)(origin, 32);
        }
        catch (e) {
            this.debug(e);
        }
        return new Uint8Array(0);
    }
    getLimit(job) {
        const { task } = job;
        if (task.multi === true) {
            // peer does not respect origin or limit for multi-account storage fetch
            return (0, util_1.setLengthLeft)((0, util_1.bigIntToBytes)(TOTAL_RANGE_END), 32);
        }
        const { first, count } = task.storageRequests[0];
        const limit = (0, util_1.bigIntToBytes)(first + BigInt(count));
        return (0, util_1.setLengthLeft)(limit, 32);
    }
    isMissingRightRange(limit, { slots, proof: _proof }) {
        if (slots.length > 0 &&
            slots[0][slots[0].length - 1] !== undefined &&
            (0, util_1.bytesToBigInt)(slots[0][slots[0].length - 1].hash) >= (0, util_1.bytesToBigInt)(limit)) {
            return false;
        }
        else {
            return true;
        }
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
        const origin = this.getOrigin(job);
        const limit = this.getLimit(job);
        this.debug(`requested root: ${(0, util_1.bytesToHex)(this.root)}`);
        this.debug(`requested origin: ${(0, util_1.bytesToHex)(origin)}`);
        this.debug(`requested limit: ${(0, util_1.bytesToHex)(limit)}`);
        this.debug(`requested account hashes: ${task.storageRequests.map((req) => (0, util_1.bytesToHex)(req.accountHash))}`);
        this.debug(`request is multi: ${job.task.multi}`);
        // only single account requests need their highest known hash tracked since multiaccount requests
        // are guaranteed to not have any known hashes until they have been filled and switched over to a
        // fragmented request
        if (task.multi === false) {
            const highestKnownHash = this.accountToHighestKnownHash.get((0, util_1.bytesToHex)(task.storageRequests[0].accountHash));
            if (highestKnownHash && (0, util_1.compareBytes)(limit, highestKnownHash) < 0) {
                // skip this job and don't rerequest it if it's limit is lower than the highest known key hash
                this.debug(`skipping request with limit lower than highest known hash`);
                return Object.assign([], [{ skipped: true }], { completed: true });
            }
        }
        const rangeResult = await peer.snap.getStorageRanges({
            root: this.root,
            accounts: task.storageRequests.map((req) => req.accountHash),
            origin,
            limit,
            bytes: BigInt(this.config.maxRangeBytes),
        });
        // Reject the response if the hash sets and slot sets don't match
        if (rangeResult === undefined || task.storageRequests.length < rangeResult.slots.length) {
            this.debug(`Slot set is larger than hash set: slotset ${rangeResult?.slots !== undefined ? rangeResult.slots.length : 0} hashset ${task.storageRequests.length} proofset ${rangeResult?.proof !== undefined ? rangeResult.proof.length : 0} `);
            return undefined;
        }
        // Response is valid, but check if peer is signalling that it does not have
        // the requested data. For storage range queries that means the state being
        // retrieved was either already pruned remotely, or the peer is not yet
        // synced to our head.
        if (rangeResult.slots.length === 0) {
            // zero-element proof
            if (rangeResult.proof.length > 0) {
                try {
                    const isMissingRightRange = await trie_1.Trie.verifyRangeProof(task.storageRequests[0].storageRoot, origin, null, [], [], rangeResult.proof, { useKeyHashingFunction: keccak_1.keccak256 });
                    // if proof is false, reject corrupt peer
                    if (isMissingRightRange !== false)
                        return undefined;
                }
                catch (e) {
                    this.debug(e);
                    // if proof is false, reject corrupt peer
                    return undefined;
                }
                this.debug(`Empty range was requested - Terminating task`);
                // response contains empty object so that task can be terminated in store phase and not reenqueued
                return Object.assign([], [Object.create(null)], { completed: true });
            }
            this.debug(`Peer rejected storage request`);
            return undefined;
        }
        this.debug(`number of slot arrays returned: ${rangeResult.slots.length}`);
        for (let i = 0; i < rangeResult.slots.length; i++) {
            this.debug(`number of slots in slot array ${i}: ${rangeResult.slots[i].length}`);
        }
        this.debug(`length of proof array: ${rangeResult.proof.length}`);
        const peerInfo = `id=${peer?.id.slice(0, 8)} address=${peer?.address}`;
        // verify data
        try {
            let completed;
            for (let i = 0; i < rangeResult.slots.length; i++) {
                const accountSlots = rangeResult.slots[i];
                const root = task.storageRequests[i].storageRoot;
                const highestReceivedhash = accountSlots[accountSlots.length - 1].hash;
                for (let i = 0; i < accountSlots.length - 1; i++) {
                    // ensure the range is monotonically increasing
                    if ((0, util_1.bytesToBigInt)(accountSlots[i].hash) > (0, util_1.bytesToBigInt)(accountSlots[i + 1].hash)) {
                        throw Error(`Account hashes not monotonically increasing: ${i} ${accountSlots[i].hash} vs ${i + 1} ${accountSlots[i + 1].hash}`);
                    }
                }
                // all but the last returned slot array must include all slots for the requested account
                const proof = i === rangeResult.slots.length - 1 ? rangeResult.proof : undefined;
                if (proof === undefined || proof.length === 0) {
                    // all-elements proof verification
                    await trie_1.Trie.verifyRangeProof(root, null, null, accountSlots.map((s) => s.hash), accountSlots.map((s) => s.body), null, {
                        common: this.config.chainCommon,
                        useKeyHashingFunction: this.config.chainCommon?.customCrypto?.keccak256 ?? keccak_1.keccak256,
                    });
                    if (proof?.length === 0)
                        return Object.assign([], [rangeResult.slots], { completed: true });
                }
                else {
                    // last returned slot array is for fragmented account that must be
                    // verified and requeued to be fetched as single account request
                    const hasRightElement = await this.verifyRangeProof(root, origin, {
                        slots: accountSlots,
                        proof,
                    });
                    // single account requests should check if task range is satisfied since origin and limit
                    // are being respected
                    if (task.multi === false) {
                        if (!hasRightElement) {
                            // all data has been fetched for account storage trie
                            completed = true;
                        }
                        else {
                            if (this.isMissingRightRange(limit, rangeResult)) {
                                this.debug(`Peer ${peerInfo} returned missing right range Slot=${(0, util_1.bytesToHex)(rangeResult.slots[0][rangeResult.slots.length - 1].hash)} limit=${(0, util_1.bytesToHex)(limit)}`);
                                completed = false;
                            }
                            else {
                                completed = true;
                            }
                        }
                        return Object.assign([], [rangeResult.slots], { completed });
                    }
                    if (hasRightElement) {
                        this.debug(`Account fragmented at ${(0, util_1.bytesToHex)(highestReceivedhash)} as part of multiaccount fetch`);
                        this.fragmentedRequests.unshift({
                            ...task.storageRequests[i],
                            // start fetching from next hash after last slot hash of last account received
                            first: (0, util_1.bytesToBigInt)(highestReceivedhash),
                            count: TOTAL_RANGE_END - (0, util_1.bytesToBigInt)(highestReceivedhash),
                        });
                    }
                    // finally, we have to requeue account requests after fragmented account that were ignored
                    // due to response limit
                    const ignoredRequests = task.storageRequests.slice(i + 1);
                    if (ignoredRequests.length > 0) {
                        this.debug(`Number of ignored account requests due to fragmentation: ${ignoredRequests.length}`);
                        this.storageRequests.push(...ignoredRequests);
                    }
                }
            }
            return Object.assign([], [rangeResult.slots], { completed: true });
        }
        catch (err) {
            throw Error(`InvalidStorageRange: ${err}`);
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
        const accountSlots = result[0][0];
        const highestReceivedhash = accountSlots[accountSlots.length - 1].hash;
        let updateHighestReceivedHash = false;
        const request = job.task.storageRequests[0];
        if (job.task.multi === false) {
            updateHighestReceivedHash = true;
        }
        let fullResult = undefined;
        if (job.partialResult) {
            fullResult = [job.partialResult[0].concat(result[0])];
        }
        else {
            fullResult = [result[0]];
        }
        job.partialResult = undefined;
        if (result.completed === true) {
            if (updateHighestReceivedHash) {
                this.accountToHighestKnownHash.delete((0, util_1.bytesToHex)(request.accountHash));
            }
            return Object.assign([], fullResult, { requests: job.task.storageRequests }, { multi: job.task.multi });
        }
        else {
            if (updateHighestReceivedHash && highestReceivedhash !== undefined) {
                this.accountToHighestKnownHash.set((0, util_1.bytesToHex)(request.accountHash), highestReceivedhash);
            }
            // Save partial result to re-request missing items.
            job.partialResult = fullResult;
        }
    }
    /**
     * Store fetch result. Resolves once store operation is complete.
     * @param result fetch result
     */
    async store(result) {
        try {
            if (JSON.stringify(result[0]) === JSON.stringify({ skipped: true })) {
                // return without storing to skip this task
                return;
            }
            if (JSON.stringify(result[0]) === JSON.stringify(Object.create(null))) {
                this.debug('Empty result detected - Associated range requested was empty with no elements remaining to the right');
                return;
            }
            let slotCount = 0;
            const storagePromises = [];
            result[0].map((slotArray, i) => {
                let accountHash;
                if (result.multi) {
                    accountHash = result.requests[i].accountHash;
                }
                else {
                    accountHash = result.requests[0].accountHash;
                }
                const storageTrie = this.stateManager['_getStorageTrie'](accountHash);
                for (const slot of slotArray) {
                    slotCount++;
                    // what we have is hashed account and not its pre-image, so we skipKeyTransform
                    storagePromises.push(storageTrie.put(slot.hash, slot.body, true));
                }
            });
            await Promise.all(storagePromises);
            this.fetcherDoneFlags.storageFetcher.first += BigInt(result[0].length);
            this.fetcherDoneFlags.storageFetcher.count =
                this.fetcherDoneFlags.storageFetcher.first + BigInt(this.storageRequests.length);
            this.debug(`Stored ${slotCount} slot(s)`);
        }
        catch (err) {
            this.debug(err);
            throw err;
        }
    }
    /**
     * Create new tasks based on a provided list of block numbers.
     *
     * If numbers are sequential the request is created as bulk request.
     *
     * If there are no tasks in the fetcher and `min` is behind head,
     * inserts the requests for the missing blocks first.
     *
     * @param numberList List of block numbers
     * @param min Start block number
     */
    enqueueByStorageRequestList(storageRequestList) {
        this.storageRequests.push(...storageRequestList);
        this.fetcherDoneFlags.storageFetcher.count =
            this.fetcherDoneFlags.storageFetcher.first + BigInt(this.storageRequests.length);
        this.debug(`Number of storage fetch requests added to fetcher queue: ${storageRequestList.length}`);
        this.nextTasks();
    }
    /**
     * Generate list of tasks to fetch. Modifies `first` and `count` to indicate
     * remaining items apart from the tasks it pushes in the queue
     *
     * Divides the full 256-bit range of hashes into @maxStorageRange ranges
     * and turns each range into a task for the fetcher
     */
    tasks(first = util_1.BIGINT_0, count = TOTAL_RANGE_END, maxTasks = this.config.maxFetcherJobs) {
        const tasks = [];
        let storageRequest = undefined;
        let whereFirstwas = first;
        let startedWith = first;
        let myFirst = first;
        let myCount = count;
        if (this.storageRequests.length > 0) {
            this.debug(`Number of accounts requested as a part of a multi-account request: ${this.storageRequests.length}`);
            tasks.unshift({
                storageRequests: this.storageRequests,
                multi: true,
            });
            this.storageRequests = []; // greedilly request as many account slots by requesting all known ones
            return tasks;
        }
        else if (this.fragmentedRequests.length > 0) {
            this.debug('Single account request is being initiated');
            storageRequest = this.fragmentedRequests.shift();
            whereFirstwas = storageRequest.first;
            startedWith = storageRequest.first;
            myFirst = storageRequest.first;
            myCount = storageRequest.count;
        }
        // single account fetch with moving origin and limit
        const max = this.config.maxStorageRange;
        let debugStr = `origin=${(0, util_2.short)((0, util_1.setLengthLeft)((0, util_1.bigIntToBytes)(myFirst), 32))}`;
        let pushedCount = util_1.BIGINT_0;
        while (myCount >= BigInt(max) && tasks.length < maxTasks) {
            const task = {
                storageRequests: [
                    {
                        accountHash: storageRequest.accountHash,
                        storageRoot: storageRequest.storageRoot,
                        first: myFirst,
                        count: max,
                    },
                ],
                first: myFirst,
                count: max,
                multi: false,
            };
            tasks.push(task);
            myFirst += BigInt(max);
            myCount -= BigInt(max);
            pushedCount += BigInt(max);
        }
        if (myCount > util_1.BIGINT_0 && tasks.length < maxTasks) {
            const task = {
                storageRequests: [
                    {
                        accountHash: storageRequest.accountHash,
                        storageRoot: storageRequest.storageRoot,
                        first: myFirst,
                        count: myCount,
                    },
                ],
                first: myFirst,
                count: myCount,
                multi: false,
            };
            tasks.push(task);
            myFirst += BigInt(myCount);
            pushedCount += myCount;
            myCount = util_1.BIGINT_0;
        }
        // If we started with where this.first was, i.e. there are no gaps and hence
        // we can move this.first to where its now, and reduce count by pushedCount
        if (myCount !== util_1.BIGINT_0 && startedWith === whereFirstwas) {
            // create new fragmented request to keep track of where to start building the next set of tasks for fetching the same account
            this.fragmentedRequests.unshift({
                accountHash: storageRequest.accountHash,
                storageRoot: storageRequest.storageRoot,
                first: myFirst,
                count: storageRequest.count - pushedCount,
            });
        }
        debugStr += ` limit=${(0, util_2.short)((0, util_1.setLengthLeft)((0, util_1.bigIntToBytes)(startedWith + pushedCount), 32))}`;
        this.debug(`Created new tasks num=${tasks.length} ${debugStr}`);
        return tasks;
    }
    nextTasks() {
        this.debug(`Entering nextTasks with primary queue length of ${this.storageRequests.length} and secondary queue length of ${this.fragmentedRequests.length}`);
        this.debug('Storage requests in primary queue:');
        for (const r of this.storageRequests) {
            this.debug(`\tAccount hash: ${(0, util_1.bytesToHex)(r.accountHash)}`);
            this.debug(`\tFirst: ${(0, util_1.bigIntToHex)(r.first)}`);
            this.debug(`\tCount: ${(0, util_1.bigIntToHex)(r.count)}`);
            this.debug('\t---');
        }
        this.debug('Storage requests in secondary queue:');
        for (const r of this.fragmentedRequests) {
            this.debug(`\tAccount hash: ${(0, util_1.bytesToHex)(r.accountHash)}`);
            this.debug(`\tFirst: ${(0, util_1.bigIntToHex)(r.first)}`);
            this.debug(`\tCount: ${(0, util_1.bigIntToHex)(r.count)}`);
            this.debug('\t---');
        }
        // this strategy is open to change, but currently, multi-account requests are greedily prioritized over fragmented requests
        try {
            if (this.in.length === 0) {
                let fullJob = undefined;
                if (this.storageRequests.length > 0) {
                    fullJob = {
                        task: { storageRequests: this.storageRequests, multi: true },
                    };
                }
                else if (this.fragmentedRequests.length > 0) {
                    fullJob = {
                        task: {
                            storageRequests: [this.fragmentedRequests[0]],
                            multi: false,
                        },
                    };
                }
                else {
                    this.debug('No requests left to queue');
                    return;
                }
                const origin = this.getOrigin(fullJob);
                const limit = this.getLimit(fullJob);
                const tasks = this.tasks();
                for (const task of tasks) {
                    this.enqueueTask(task, true);
                }
                this.debug(`Fetcher pending with ${fullJob.task.storageRequests.length} accounts requested and origin=${(0, util_2.short)(origin)} limit=${(0, util_2.short)(limit)}`);
            }
        }
        catch (err) {
            this.debug(err);
        }
    }
    /**
     * Returns an idle peer that can process a next job.
     */
    peer() {
        return this.pool.idle((peer) => 'snap' in peer);
    }
    processStoreError(error, _task) {
        const stepBack = util_1.BIGINT_0;
        const destroyFetcher = !error.message.includes(`InvalidRangeProof`) && !error.message.includes(`InvalidStorageRange`);
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
        const origin = this.getOrigin(job);
        const limit = this.getLimit(job);
        let partialResult;
        if (job.partialResult) {
            partialResult = ` partialResults=${job.partialResult.length}`;
        }
        else {
            partialResult = '';
        }
        str += `origin=${(0, util_2.short)(origin)} limit=${(0, util_2.short)(limit)}${partialResult}`;
        return str;
    }
}
exports.StorageFetcher = StorageFetcher;
//# sourceMappingURL=storagefetcher.js.map