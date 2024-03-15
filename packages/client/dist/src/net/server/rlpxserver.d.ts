import { DPT as Devp2pDPT, RLPx as Devp2pRLPx } from '@ethereumjs/devp2p';
import { Server } from './server';
import type { ServerOptions } from './server';
export interface RlpxServerOptions extends ServerOptions {
    clientFilter?: string[];
}
/**
 * DevP2P/RLPx server
 * @memberof module:net/server
 */
export declare class RlpxServer extends Server {
    private peers;
    discovery: boolean;
    private clientFilter;
    rlpx: Devp2pRLPx | null;
    dpt: Devp2pDPT | null;
    ip: string;
    /**
     * Create new DevP2P/RLPx server
     */
    constructor(options: RlpxServerOptions);
    /**
     * Server name
     */
    get name(): string;
    /**
     * Return Rlpx info
     */
    getRlpxInfo(): {
        enode: undefined;
        id: undefined;
        ip: string;
        listenAddr: string;
        ports: {
            discovery: number | undefined;
            listener: number | undefined;
        };
    } | {
        enode: string;
        id: string;
        ip: string;
        listenAddr: string;
        ports: {
            discovery: number | undefined;
            listener: number | undefined;
        };
    };
    /**
     * Start Devp2p/RLPx server.
     * Returns a promise that resolves once server has been started.
     * @returns true if server successfully started
     */
    start(): Promise<boolean>;
    /**
     * Bootstrap bootnode and DNS mapped peers from the network
     */
    bootstrap(): Promise<void>;
    /**
     * Stop Devp2p/RLPx server. Returns a promise that resolves once server has been stopped.
     */
    stop(): Promise<boolean>;
    /**
     * Ban peer for a specified time
     * @param peerId id of peer
     * @param maxAge how long to ban peer in ms
     * @returns true if ban was successfully executed
     */
    ban(peerId: string, maxAge?: number): boolean;
    /**
     * Handles errors from server and peers
     * @param error
     * @emits {@link Event.SERVER_ERROR}
     */
    private error;
    /**
     * Initializes DPT for peer discovery
     */
    private initDpt;
    /**
     * Initializes RLPx instance for peer management
     */
    private initRlpx;
}
//# sourceMappingURL=rlpxserver.d.ts.map