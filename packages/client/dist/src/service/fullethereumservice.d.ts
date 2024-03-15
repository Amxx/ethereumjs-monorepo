import { VMExecution } from '../execution';
import { Miner } from '../miner';
import { BeaconSynchronizer, FullSynchronizer, SnapSynchronizer } from '../sync';
import { Service, type ServiceOptions } from './service';
import { Skeleton } from './skeleton';
import { TxPool } from './txpool';
import type { Peer } from '../net/peer/peer';
import type { Protocol } from '../net/protocol';
interface FullEthereumServiceOptions extends ServiceOptions {
    /** Serve LES requests (default: false) */
    lightserv?: boolean;
}
/**
 * Full Ethereum service
 * @memberof module:service
 */
export declare class FullEthereumService extends Service {
    synchronizer?: BeaconSynchronizer | FullSynchronizer;
    lightserv: boolean;
    miner: Miner | undefined;
    txPool: TxPool;
    skeleton?: Skeleton;
    snapsync?: SnapSynchronizer;
    execution: VMExecution;
    /** building head state via snapsync or vmexecution */
    private building;
    /**
     * Create new ETH service
     */
    constructor(options: FullEthereumServiceOptions);
    /**
     * Public accessor for {@link BeaconSynchronizer}. Returns undefined if unavailable.
     */
    get beaconSync(): BeaconSynchronizer | undefined;
    /**
     * Helper to switch to {@link BeaconSynchronizer}
     */
    switchToBeaconSync(skipOpen?: boolean): Promise<void>;
    open(): Promise<boolean>;
    /**
     * Start service
     */
    start(): Promise<boolean>;
    /**
     * if the vm head is not recent enough, trigger building a recent state by snapsync or by running
     * vm execution
     */
    buildHeadState(): Promise<void>;
    /**
     * Stop service
     */
    stop(): Promise<boolean>;
    /**
     * Close service
     */
    close(): Promise<void>;
    /**
     * Returns all protocols required by this service
     */
    get protocols(): Protocol[];
    /**
     * Handles incoming message from connected peer
     * @param message message object
     * @param protocol protocol name
     * @param peer peer
     */
    handle(message: any, protocol: string, peer: Peer): Promise<any>;
    /**
     * Handles incoming ETH message from connected peer
     * @param message message object
     * @param peer peer
     */
    handleEth(message: any, peer: Peer): Promise<void>;
    /**
     * Handles incoming LES message from connected peer
     * @param message message object
     * @param peer peer
     */
    handleLes(message: any, peer: Peer): Promise<void>;
}
export {};
//# sourceMappingURL=fullethereumservice.d.ts.map