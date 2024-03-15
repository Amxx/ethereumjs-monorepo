import { BaseTransaction } from './baseTransaction.js';
import { TransactionType } from './types.js';
import type { AccessList, AccessListBytes, TxData as AllTypesTxData, TxValuesArray as AllTypesTxValuesArray, JsonTx, TxOptions } from './types.js';
import type { Common } from '@nomicfoundation/ethereumjs-common';
declare type TxData = AllTypesTxData[TransactionType.DelegateEIP5806];
declare type TxValuesArray = AllTypesTxValuesArray[TransactionType.DelegateEIP5806];
/**
 * Typed transaction with a new gas fee market mechanism
 *
 * - TransactionType: 4
 * - EIP: [EIP-5806](https://eips.ethereum.org/EIPS/eip-5806)
 */
export declare class DelegateEIP5806Transaction extends BaseTransaction<TransactionType.DelegateEIP5806> {
    readonly value = 0n;
    readonly chainId: bigint;
    readonly accessList: AccessListBytes;
    readonly AccessListJSON: AccessList;
    readonly maxPriorityFeePerGas: bigint;
    readonly maxFeePerGas: bigint;
    readonly common: Common;
    /**
     * Instantiate a transaction from a data dictionary.
     *
     * Format: { chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, data,
     * accessList, v, r, s }
     *
     * Notes:
     * - `chainId` will be set automatically if not provided
     * - All parameters are optional and have some basic default values
     */
    static fromTxData(txData: TxData, opts?: TxOptions): DelegateEIP5806Transaction;
    /**
     * Instantiate a transaction from the serialized tx.
     *
     * Format: `0x04 || rlp([chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, data,
     * accessList, signatureYParity, signatureR, signatureS])`
     */
    static fromSerializedTx(serialized: Uint8Array, opts?: TxOptions): DelegateEIP5806Transaction;
    /**
     * Create a transaction from a values array.
     *
     * Format: `[chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, data,
     * accessList, signatureYParity, signatureR, signatureS]`
     */
    static fromValuesArray(values: TxValuesArray, opts?: TxOptions): DelegateEIP5806Transaction;
    /**
     * This constructor takes the values, validates them, assigns them and freezes the object.
     *
     * It is not recommended to use this constructor directly. Instead use
     * the static factory methods to assist in creating a Transaction object from
     * varying data types.
     */
    constructor(txData: TxData, opts?: TxOptions);
    /**
     * The amount of gas paid for the data in this tx
     */
    getDataFee(): bigint;
    /**
     * The up front amount that an account must have for this transaction to be valid
     * @param baseFee The base fee of the block (will be set to 0 if not provided)
     */
    getUpfrontCost(baseFee?: bigint): bigint;
    /**
     * Returns a Uint8Array Array of the raw Bytes of the EIP-5806 transaction, in order.
     *
     * Format: `[chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, data,
     * accessList, signatureYParity, signatureR, signatureS]`
     *
     * Use {@link DelegateEIP5806Transaction.serialize} to add a transaction to a block
     * with {@link Block.fromValuesArray}.
     *
     * For an unsigned tx this method uses the empty Bytes values for the
     * signature parameters `v`, `r` and `s` for encoding. For an EIP-155 compliant
     * representation for external signing use {@link DelegateEIP5806Transaction.getMessageToSign}.
     */
    raw(): TxValuesArray;
    /**
     * Returns the serialized encoding of the EIP-5806 transaction.
     *
     * Format: `0x02 || rlp([chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, data,
     * accessList, signatureYParity, signatureR, signatureS])`
     *
     * Note that in contrast to the legacy tx serialization format this is not
     * valid RLP any more due to the raw tx type preceding and concatenated to
     * the RLP encoding of the values.
     */
    serialize(): Uint8Array;
    /**
     * Returns the raw serialized unsigned tx, which can be used
     * to sign the transaction (e.g. for sending to a hardware wallet).
     *
     * Note: in contrast to the legacy tx the raw message format is already
     * serialized and doesn't need to be RLP encoded any more.
     *
     * ```javascript
     * const serializedMessage = tx.getMessageToSign() // use this for the HW wallet input
     * ```
     */
    getMessageToSign(): Uint8Array;
    /**
     * Returns the hashed serialized unsigned tx, which can be used
     * to sign the transaction (e.g. for sending to a hardware wallet).
     *
     * Note: in contrast to the legacy tx the raw message format is already
     * serialized and doesn't need to be RLP encoded any more.
     */
    getHashedMessageToSign(): Uint8Array;
    /**
     * Computes a sha3-256 hash of the serialized tx.
     *
     * This method can only be used for signed txs (it throws otherwise).
     * Use {@link DelegateEIP5806Transaction.getMessageToSign} to get a tx hash for the purpose of signing.
     */
    hash(): Uint8Array;
    /**
     * Computes a sha3-256 hash which can be used to verify the signature
     */
    getMessageToVerifySignature(): Uint8Array;
    /**
     * Returns the public key of the sender
     */
    _getSenderPublicKey(): Uint8Array;
    protected _processSignature(v: bigint, r: Uint8Array, s: Uint8Array): DelegateEIP5806Transaction;
    /**
     * Returns an object with the JSON representation of the transaction
     */
    toJSON(): JsonTx;
    /**
     * Return a compact error string representation of the object
     */
    errorStr(): string;
    /**
     * Internal helper function to create an annotated error message
     *
     * @param msg Base error message
     * @hidden
     */
    protected _errorMsg(msg: string): string;
}
export {};
//# sourceMappingURL=eip5806Transaction.d.ts.map