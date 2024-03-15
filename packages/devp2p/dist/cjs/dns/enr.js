"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENR = void 0;
const rlp_1 = require("@ethereumjs/rlp");
const util_1 = require("@ethereumjs/util");
const base_1 = require("@scure/base");
const keccak_js_1 = require("ethereum-cryptography/keccak.js");
const secp256k1_compat_js_1 = require("ethereum-cryptography/secp256k1-compat.js");
const multiaddr_1 = require("multiaddr");
const convert_js_1 = require("multiaddr/src/convert.js");
const scanf_1 = require("scanf");
const util_js_1 = require("../util.js");
class ENR {
    /**
     * Converts an Ethereum Name Record (EIP-778) string into a PeerInfo object after validating
     * its signature component with the public key encoded in the record itself.
     *
     * The record components are:
     * > signature: cryptographic signature of record contents
     * > seq: The sequence number, a 64-bit unsigned integer which increases whenever
     *        the record changes and is republished.
     * > A set of arbitrary key/value pairs
     *
     * @param  {string}   enr
     * @return {PeerInfo}
     */
    static parseAndVerifyRecord(enr, common) {
        if (!enr.startsWith(this.RECORD_PREFIX))
            throw new Error(`String encoded ENR must start with '${this.RECORD_PREFIX}'`);
        // ENRs are RLP encoded and written to DNS TXT entries as base64 url-safe strings respectively
        // RawURLEncoding, which is the unpadded alternate base64 encoding defined in RFC 4648
        // Records need to prepared like the following: replace - wth +, replace _ with / and add padding
        let enrMod = enr.slice(this.RECORD_PREFIX.length);
        enr = enrMod.replace('-', '+').replace('_', '/');
        while (enrMod.length % 4 !== 0) {
            enrMod = enrMod + '=';
        }
        const base64BytesEnr = base_1.base64url.decode(enrMod);
        const decoded = rlp_1.RLP.decode(base64BytesEnr);
        const [signature, seq, ...kvs] = decoded;
        // Convert ENR key/value pairs to object
        const obj = {};
        for (let i = 0; i < kvs.length; i += 2) {
            obj[(0, util_1.bytesToUtf8)(kvs[i])] = kvs[i + 1];
        }
        // Validate sig
        const isVerified = (0, secp256k1_compat_js_1.ecdsaVerify)(signature, (common?.customCrypto.keccak256 ?? keccak_js_1.keccak256)(rlp_1.RLP.encode([seq, ...kvs])), obj.secp256k1);
        if (!isVerified)
            throw new Error('Unable to verify ENR signature');
        const { ipCode, tcpCode, udpCode } = this._getIpProtocolConversionCodes(obj.id);
        const peerInfo = {
            address: convert_js_1.default.toString(ipCode, obj.ip),
            tcpPort: Number(convert_js_1.default.toString(tcpCode, (0, util_js_1.toNewUint8Array)(obj.tcp))),
            udpPort: Number(convert_js_1.default.toString(udpCode, (0, util_js_1.toNewUint8Array)(obj.udp))),
        };
        return peerInfo;
    }
    /**
     * Extracts the branch subdomain referenced by a DNS tree root string after verifying
     * the root record signature with its base32 compressed public key. Geth's top level DNS
     * domains and their public key can be found in: go-ethereum/params/bootnodes
     *
     * @param  {string} root  (See EIP-1459 for encoding details)
     * @return {string} subdomain subdomain to retrieve branch records from.
     */
    static parseAndVerifyRoot(root, publicKey, common) {
        if (!root.startsWith(this.ROOT_PREFIX))
            throw new Error(`ENR root entry must start with '${this.ROOT_PREFIX}'`);
        const rootVals = (0, scanf_1.sscanf)(root, `${this.ROOT_PREFIX}v1 e=%s l=%s seq=%d sig=%s`, 'eRoot', 'lRoot', 'seq', 'signature');
        if (!rootVals.eRoot)
            throw new Error("Could not parse 'e' value from ENR root entry");
        if (!rootVals.lRoot)
            throw new Error("Could not parse 'l' value from ENR root entry");
        if (!rootVals.seq)
            throw new Error("Could not parse 'seq' value from ENR root entry");
        if (!rootVals.signature)
            throw new Error("Could not parse 'sig' value from ENR root entry");
        const decodedPublicKey = [...base_1.base32.decode(publicKey + '===').values()];
        // The signature is a 65-byte secp256k1 over the keccak256 hash
        // of the record content, excluding the `sig=` part, encoded as URL-safe base64 string
        // (Trailing recovery bit must be trimmed to pass `ecdsaVerify` method)
        const signedComponent = root.split(' sig')[0];
        const signedComponentBytes = (0, util_1.utf8ToBytes)(signedComponent);
        const signatureBytes = Uint8Array.from([...base_1.base64url.decode(rootVals.signature + '=').values()].slice(0, 64));
        const keyBytes = Uint8Array.from(decodedPublicKey);
        const isVerified = (0, secp256k1_compat_js_1.ecdsaVerify)(signatureBytes, (common?.customCrypto.keccak256 ?? keccak_js_1.keccak256)(signedComponentBytes), keyBytes);
        if (!isVerified)
            throw new Error('Unable to verify ENR root signature');
        return rootVals.eRoot;
    }
    /**
     * Returns the public key and top level domain of an ENR tree entry.
     * The domain is the starting point for traversing a set of linked DNS TXT records
     * and the public key is used to verify the root entry record
     *
     * @param  {string}        tree (See EIP-1459 )
     * @return {ENRTreeValues}
     */
    static parseTree(tree) {
        if (!tree.startsWith(this.TREE_PREFIX))
            throw new Error(`ENR tree entry must start with '${this.TREE_PREFIX}'`);
        const treeVals = (0, scanf_1.sscanf)(tree, `${this.TREE_PREFIX}//%s@%s`, 'publicKey', 'domain');
        if (!treeVals.publicKey)
            throw new Error('Could not parse public key from ENR tree entry');
        if (!treeVals.domain)
            throw new Error('Could not parse domain from ENR tree entry');
        return treeVals;
    }
    /**
     * Returns subdomains listed in an ENR branch entry. These in turn lead to
     * either further branch entries or ENR records.
     * @param  {string}   branch
     * @return {string[]}
     */
    static parseBranch(branch) {
        if (!branch.startsWith(this.BRANCH_PREFIX))
            throw new Error(`ENR branch entry must start with '${this.BRANCH_PREFIX}'`);
        return branch.split(this.BRANCH_PREFIX)[1].split(',');
    }
    /**
     * Gets relevant multiaddr conversion codes for ipv4, ipv6 and tcp, udp formats
     * @param  {Uint8Array}        protocolId
     * @return {ProtocolCodes}
     */
    static _getIpProtocolConversionCodes(protocolId) {
        let ipCode;
        switch ((0, util_1.bytesToUtf8)(protocolId)) {
            case 'v4':
                ipCode = (0, multiaddr_1.protocols)(4).code;
                break;
            case 'v6':
                ipCode = (0, multiaddr_1.protocols)(41).code;
                break;
            default:
                throw new Error("IP protocol must be 'v4' or 'v6'");
        }
        return {
            ipCode,
            tcpCode: (0, multiaddr_1.protocols)('tcp').code,
            udpCode: (0, multiaddr_1.protocols)('udp').code,
        };
    }
}
exports.ENR = ENR;
ENR.RECORD_PREFIX = 'enr:';
ENR.TREE_PREFIX = 'enrtree:';
ENR.BRANCH_PREFIX = 'enrtree-branch:';
ENR.ROOT_PREFIX = 'enrtree-root:';
//# sourceMappingURL=enr.js.map