import { Protocol } from './protocol.js';
import type { Peer } from '../rlpx/peer.js';
import type { SendMethod } from '../types.js';
import type { Input } from '@ethereumjs/rlp';
export declare class ETH extends Protocol {
    protected _status: ETH.StatusMsg | null;
    protected _peerStatus: ETH.StatusMsg | null;
    private DEBUG;
    protected _hardfork: string;
    protected _latestBlock: bigint;
    protected _forkHash: string;
    protected _nextForkBlock: bigint;
    constructor(version: number, peer: Peer, send: SendMethod);
    static eth62: {
        name: string;
        version: number;
        length: number;
        constructor: typeof ETH;
    };
    static eth63: {
        name: string;
        version: number;
        length: number;
        constructor: typeof ETH;
    };
    static eth64: {
        name: string;
        version: number;
        length: number;
        constructor: typeof ETH;
    };
    static eth65: {
        name: string;
        version: number;
        length: number;
        constructor: typeof ETH;
    };
    static eth66: {
        name: string;
        version: number;
        length: number;
        constructor: typeof ETH;
    };
    static eth67: {
        name: string;
        version: number;
        length: number;
        constructor: typeof ETH;
    };
    static eth68: {
        name: string;
        version: number;
        length: number;
        constructor: typeof ETH;
    };
    _handleMessage(code: ETH.MESSAGE_CODES, data: Uint8Array): void;
    /**
     * Eth 64 Fork ID validation (EIP-2124)
     * @param forkId Remote fork ID
     */
    _validateForkId(forkId: Uint8Array[]): void;
    _handleStatus(): void;
    getVersion(): number;
    _forkHashFromForkId(forkId: Uint8Array): string;
    _nextForkFromForkId(forkId: Uint8Array): number;
    _getStatusString(status: ETH.StatusMsg): string;
    sendStatus(status: ETH.StatusOpts): void;
    sendMessage(code: ETH.MESSAGE_CODES, payload: Input): void;
    getMsgPrefix(msgCode: ETH.MESSAGE_CODES): string;
}
export declare namespace ETH {
    interface StatusMsg extends Array<Uint8Array | Uint8Array[]> {
    }
    type StatusOpts = {
        td: Uint8Array;
        bestHash: Uint8Array;
        latestBlock?: Uint8Array;
        genesisHash: Uint8Array;
    };
    enum MESSAGE_CODES {
        STATUS = 0,
        NEW_BLOCK_HASHES = 1,
        TX = 2,
        GET_BLOCK_HEADERS = 3,
        BLOCK_HEADERS = 4,
        GET_BLOCK_BODIES = 5,
        BLOCK_BODIES = 6,
        NEW_BLOCK = 7,
        GET_NODE_DATA = 13,
        NODE_DATA = 14,
        GET_RECEIPTS = 15,
        RECEIPTS = 16,
        NEW_POOLED_TRANSACTION_HASHES = 8,
        GET_POOLED_TRANSACTIONS = 9,
        POOLED_TRANSACTIONS = 10
    }
}
//# sourceMappingURL=eth.d.ts.map