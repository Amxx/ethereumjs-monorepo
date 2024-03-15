import { Protocol } from './protocol.js';
import type { Peer } from '../rlpx/peer.js';
import type { SendMethod } from '../types.js';
export declare class SNAP extends Protocol {
    private DEBUG;
    constructor(version: number, peer: Peer, send: SendMethod);
    static snap: {
        name: string;
        version: number;
        length: number;
        constructor: typeof SNAP;
    };
    _handleMessage(code: SNAP.MESSAGE_CODES, data: Uint8Array): void;
    sendStatus(): void;
    /**
     *
     * @param code Message code
     * @param payload Payload (including reqId, e.g. `[1, [437000, 1, 0, 0]]`)
     */
    sendMessage(code: SNAP.MESSAGE_CODES, payload: any): void;
    getMsgPrefix(msgCode: SNAP.MESSAGE_CODES): string;
    getVersion(): number;
}
export declare namespace SNAP {
    enum MESSAGE_CODES {
        GET_ACCOUNT_RANGE = 0,
        ACCOUNT_RANGE = 1,
        GET_STORAGE_RANGES = 2,
        STORAGE_RANGES = 3,
        GET_BYTE_CODES = 4,
        BYTE_CODES = 5,
        GET_TRIE_NODES = 6,
        TRIE_NODES = 7
    }
}
//# sourceMappingURL=snap.d.ts.map