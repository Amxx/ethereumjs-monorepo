/// <reference types="node" />
import { EventEmitter } from 'events';
import type { Contact, KBucketOptions, PeerInfo } from '../types.js';
declare type KBucketNode = {
    contacts: Contact[] | null;
    dontSplit: boolean;
    left: KBucketNode | null;
    right: KBucketNode | null;
};
/**
 * Implementation of a Kademlia DHT k-bucket used for storing
 * contact (peer node) information.
 *
 * @extends EventEmitter
 */
export declare class KBucket {
    events: EventEmitter;
    protected _localNodeId: Uint8Array;
    protected _numberOfNodesPerKBucket: number;
    protected _numberOfNodesToPing: number;
    distance: (firstId: Uint8Array, secondId: Uint8Array) => number;
    arbiter: (incumbent: Contact, candidate: Contact) => Contact;
    protected _metadata: object;
    protected _root: KBucketNode;
    /**
     *
     * @param {KBucketOptions} options
     */
    constructor(options?: KBucketOptions);
    /**
     * Default arbiter function for contacts with the same id. Uses
     * contact.vectorClock to select which contact to update the k-bucket with.
     * Contact with larger vectorClock field will be selected. If vectorClock is
     * the same, candidate will be selected.
     *
     * @param  {Contact} incumbent Contact currently stored in the k-bucket.
     * @param  {Contact} candidate Contact being added to the k-bucket.
     * @return {Contact}           Contact to updated the k-bucket with.
     */
    static arbiter(incumbent: Contact, candidate: Contact): Contact;
    /**
     * Default distance function. Finds the XOR
     * distance between firstId and secondId.
     *
     * @param  {Uint8Array} firstId  Uint8Array containing first id.
     * @param  {Uint8Array} secondId Uint8Array containing second id.
     * @return {number}              Integer The XOR distance between firstId
     *                               and secondId.
     */
    static distance(firstId: Uint8Array, secondId: Uint8Array): number;
    /**
     * Adds a contact to the k-bucket.
     *
     * @param {PeerInfo} contact the contact object to add
     */
    add(contact: PeerInfo): KBucket;
    /**
     * Get the n closest contacts to the provided node id. "Closest" here means:
     * closest according to the XOR metric of the contact node id.
     *
     * @param  {Uint8Array} id  Contact node id
     * @param  {number} n      Integer (Default: Infinity) The maximum number of closest contacts to return
     * @return {Contact[]}          Array Maximum of n closest contacts to the node id
     */
    closest(id: Uint8Array, n?: number | undefined): Contact[];
    /**
     * Counts the total number of contacts in the tree.
     *
     * @return {number} The number of contacts held in the tree
     */
    count(): number;
    /**
     * Determines whether the id at the bitIndex is 0 or 1.
     * Return left leaf if `id` at `bitIndex` is 0, right leaf otherwise
     *
     * @param  {KBucketNode} node     internal object that has 2 leafs: left and right
     * @param  {Uint8Array} id   Id to compare _localNodeId with.
     * @param  {Number} bitIndex Integer (Default: 0) The bit index to which bit
     *                           to check in the id Uint8Array.
     * @return {KBucketNode}          left leaf if id at bitIndex is 0, right leaf otherwise.
     */
    _determineNode(node: KBucketNode, id: Uint8Array, bitIndex: number): KBucketNode;
    /**
     * Get a contact by its exact ID.
     * If this is a leaf, loop through the bucket contents and return the correct
     * contact if we have it or null if not. If this is an inner node, determine
     * which branch of the tree to traverse and repeat.
     *
     * @param  {Uint8Array} id The ID of the contact to fetch.
     * @return {Contact|null}   The contact if available, otherwise null
     */
    get(id: Uint8Array): Contact | null;
    /**
     * Returns the index of the contact with provided
     * id if it exists, returns -1 otherwise.
     *
     * @param  {KBucketNode} node    internal object that has 2 leafs: left and right
     * @param  {Uint8Array} id  Contact node id.
     * @return {number}         Integer Index of contact with provided id if it
     *                          exists, -1 otherwise.
     */
    _indexOf(node: KBucketNode, id: Uint8Array): number;
    /**
     * Removes contact with the provided id.
     *
     * @param  {Uint8Array} id The ID of the contact to remove.
     * @return {KBucket}        The k-bucket itself.
     */
    remove(id: Uint8Array): KBucket;
    /**
     * Splits the node, redistributes contacts to the new nodes, and marks the
     * node that was split as an inner node of the binary tree of nodes by
     * setting this._root.contacts = null
     *
     * @param  {object} node     node for splitting
     * @param  {number} bitIndex the bitIndex to which byte to check in the
     *                           Uint8Array for navigating the binary tree
     */
    _split(node: KBucketNode, bitIndex: number): void;
    /**
     * Returns all the contacts contained in the tree as an array.
     * If this is a leaf, return a copy of the bucket. If this is not a leaf,
     * return the union of the low and high branches (themselves also as arrays).
     *
     * @return {Contact[]} All of the contacts in the tree, as an array
     */
    toArray(): Contact[];
    /**
     * Similar to `toArray()` but instead of buffering everything up into an
     * array before returning it, yields contacts as they are encountered while
     * walking the tree.
     *
     * @return {Contact} All of the contacts in the tree, as an iterable
     */
    toIterable(): Iterable<Contact>;
    /**
     * Updates the contact selected by the arbiter.
     * If the selection is our old contact and the candidate is some new contact
     * then the new contact is abandoned (not added).
     * If the selection is our old contact and the candidate is our old contact
     * then we are refreshing the contact and it is marked as most recently
     * contacted (by being moved to the right/end of the bucket array).
     * If the selection is our new contact, the old contact is removed and the new
     * contact is marked as most recently contacted.
     *
     * @param  {KBucketNode} node    internal object that has 2 leafs: left and right
     * @param  {number} index   the index in the bucket where contact exists
     *                          (index has already been computed in a previous
     *                          calculation)
     * @param  {Contact} contact The contact object to update.
     */
    _update(node: KBucketNode, index: number, contact: Contact): void;
}
export {};
//# sourceMappingURL=kbucket.d.ts.map