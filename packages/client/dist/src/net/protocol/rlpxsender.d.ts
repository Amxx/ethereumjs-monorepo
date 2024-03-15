import { Sender } from './sender';
import type { ETH as Devp2pETH, LES as Devp2pLES, SNAP as Devp2pSNAP } from '@ethereumjs/devp2p';
/**
 * DevP2P/RLPx protocol sender
 * @emits message
 * @emits status
 * @memberof module:net/protocol
 */
export declare class RlpxSender extends Sender {
    private sender;
    /**
     * Creates a new DevP2P/Rlpx protocol sender
     * @param rlpxProtocol protocol object from @ethereumjs/devp2p
     */
    constructor(rlpxProtocol: Devp2pETH | Devp2pLES | Devp2pSNAP);
    /**
     * Send a status to peer
     * @param status
     */
    sendStatus(status: any): void;
    /**
     * Send a message to peer
     * @param code message code
     * @param data message payload
     */
    sendMessage(code: number, data: any): void;
}
//# sourceMappingURL=rlpxsender.d.ts.map