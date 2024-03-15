"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DNS = void 0;
const debug_1 = require("debug");
const dns = require("dns");
const enr_js_1 = require("./enr.js");
const { debug: createDebugLogger } = debug_1.default;
const debug = createDebugLogger('devp2p:dns:dns');
class DNS {
    constructor(options = {}) {
        this._errorTolerance = 10;
        this._DNSTreeCache = {};
        if (typeof options.dnsServerAddress === 'string') {
            dns.promises.setServers([options.dnsServerAddress]);
        }
        this._common = options.common;
        this.DEBUG =
            typeof window === 'undefined' ? process?.env?.DEBUG?.includes('ethjs') ?? false : false;
    }
    /**
     * Returns a list of verified peers listed in an EIP-1459 DNS tree. Method may
     * return fewer peers than requested if `maxQuantity` is larger than the number
     * of ENR records or the number of errors/duplicate peers encountered by randomized
     * search exceeds `maxQuantity` plus the `errorTolerance` factor.
     *
     * @param {number}        maxQuantity  max number to get
     * @param {string[]}        dnsNetworks enrTree strings (See EIP-1459 for format)
     * @return {PeerInfo}
     */
    async getPeers(maxQuantity, dnsNetworks) {
        let totalSearches = 0;
        const peers = [];
        const networkIndex = Math.floor(Math.random() * dnsNetworks.length);
        const { publicKey, domain } = enr_js_1.ENR.parseTree(dnsNetworks[networkIndex]);
        while (peers.length < maxQuantity && totalSearches < maxQuantity + this._errorTolerance) {
            const context = {
                domain,
                publicKey,
                visits: {},
            };
            const peer = await this._search(domain, context);
            if (this._isNewPeer(peer, peers)) {
                peers.push(peer);
                if (this.DEBUG) {
                    debug(`got new peer candidate from DNS address=${peer.address}`);
                }
            }
            totalSearches++;
        }
        return peers;
    }
    /**
     * Runs a recursive, randomized descent of the DNS tree to retrieve a single
     * ENR record as a PeerInfo object. Returns null if parsing or DNS resolution fails.
     *
     * @param  {string}        subdomain
     * @param  {SearchContext} context
     * @return {PeerInfo | null}
     */
    async _search(subdomain, context) {
        const entry = await this._getTXTRecord(subdomain, context);
        context.visits[subdomain] = true;
        let next;
        let branches;
        try {
            switch (this._getEntryType(entry)) {
                case enr_js_1.ENR.ROOT_PREFIX:
                    next = enr_js_1.ENR.parseAndVerifyRoot(entry, context.publicKey, this._common);
                    return await this._search(next, context);
                case enr_js_1.ENR.BRANCH_PREFIX:
                    branches = enr_js_1.ENR.parseBranch(entry);
                    next = this._selectRandomPath(branches, context);
                    return await this._search(next, context);
                case enr_js_1.ENR.RECORD_PREFIX:
                    return enr_js_1.ENR.parseAndVerifyRecord(entry, this._common);
                default:
                    return null;
            }
        }
        catch (error) {
            if (this.DEBUG) {
                debug(`Errored searching DNS tree at subdomain ${subdomain}: ${error}`);
            }
            return null;
        }
    }
    _getEntryType(entry) {
        if (entry.startsWith(enr_js_1.ENR.ROOT_PREFIX))
            return enr_js_1.ENR.ROOT_PREFIX;
        if (entry.startsWith(enr_js_1.ENR.BRANCH_PREFIX))
            return enr_js_1.ENR.BRANCH_PREFIX;
        if (entry.startsWith(enr_js_1.ENR.RECORD_PREFIX))
            return enr_js_1.ENR.RECORD_PREFIX;
        return '';
    }
    /**
     * Returns a randomly selected subdomain string from the list provided by a branch
     * entry record.
     *
     * The client must track subdomains which are already resolved to avoid
     * going into an infinite loop b/c branch entries can contain
     * circular references. It’s in the client’s best interest to traverse the
     * tree in random order.
     *
     * @param {string[]}      branches
     * @param {SearchContext} context
     * @return {String}       subdomian
     */
    _selectRandomPath(branches, context) {
        // Identify domains already visited in this traversal of the DNS tree.
        // Then filter against them to prevent cycles.
        const circularRefs = {};
        for (const [idx, subdomain] of branches.entries()) {
            if (context.visits[subdomain]) {
                circularRefs[idx] = true;
            }
        }
        // If all possible paths are circular...
        if (Object.keys(circularRefs).length === branches.length) {
            throw new Error('Unresolvable circular path detected');
        }
        // Randomly select a viable path
        let index;
        do {
            index = Math.floor(Math.random() * branches.length);
        } while (circularRefs[index]);
        return branches[index];
    }
    /**
     * Retrieves the TXT record stored at a location from either
     * this DNS tree cache or via Node's DNS api
     *
     * @param  {string}             subdomain
     * @param  {SearchContext = {}} context
     * @return {string}
     */
    async _getTXTRecord(subdomain, context) {
        if (this._DNSTreeCache[subdomain]) {
            return this._DNSTreeCache[subdomain];
        }
        // Location is either the top level tree entry host or a subdomain of it.
        const location = subdomain !== context.domain ? `${subdomain}.${context.domain}` : context.domain;
        const response = await dns.promises.resolve(location, 'TXT');
        if (response.length === 0)
            throw new Error('Received empty result array while fetching TXT record');
        if (response[0].length === 0)
            throw new Error('Received empty TXT record');
        // Branch entries can be an array of strings of comma delimited subdomains, with
        // some subdomain strings split across the array elements
        // (e.g btw end of arr[0] and beginning of arr[1])
        const result = response[0].length > 1 ? response[0].join('') : response[0][0];
        this._DNSTreeCache[subdomain] = result;
        return result;
    }
    /**
     * Returns false if candidate peer already exists in the
     * current collection of peers.
     * Returns true otherwise.
     * Also acts as a typeguard for peer
     *
     * @param  {PeerInfo}   peer
     * @param  {PeerInfo[]} peers
     * @return {boolean}
     */
    _isNewPeer(peer, peers) {
        if (peer === null || peer.address === undefined)
            return false;
        for (const existingPeer of peers) {
            if (peer.address === existingPeer.address) {
                return false;
            }
        }
        return true;
    }
    /**
     * Only used for testing. A stopgap to enable successful
     * TestDouble mocking of the native `dns` module.
     * @param {any} mock TestDouble fn
     */
    __setNativeDNSModuleResolve(mock) {
        dns.promises.resolve = mock.resolve;
    }
}
exports.DNS = DNS;
//# sourceMappingURL=dns.js.map