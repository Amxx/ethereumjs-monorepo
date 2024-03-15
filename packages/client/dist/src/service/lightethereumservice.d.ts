import { LesProtocol } from '../net/protocol/lesprotocol';
import { LightSynchronizer } from '../sync/lightsync';
import { Service } from './service';
import type { Peer } from '../net/peer/peer';
import type { ServiceOptions } from './service';
/**
 * Light Ethereum service
 * @memberof module:service
 */
export declare class LightEthereumService extends Service {
    synchronizer: LightSynchronizer;
    /**
     * Create new LES service
     */
    constructor(options: ServiceOptions);
    /**
     * Returns all protocols required by this service
     */
    get protocols(): LesProtocol[];
    /**
     * Handles incoming message from connected peer
     * @param message message object
     * @param protocol protocol name
     * @param peer peer
     */
    handle(_message: any, _protocol: string, _peer: Peer): Promise<void>;
    /**
     * Stop service
     */
    stop(): Promise<boolean>;
}
//# sourceMappingURL=lightethereumservice.d.ts.map