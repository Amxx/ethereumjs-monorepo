import type { Config } from '../../config';
import type { DnsNetwork, KeyLike, MultiaddrLike } from '../../types';
import type { Protocol } from '../protocol/protocol';
import type { Multiaddr } from 'multiaddr';
export interface ServerOptions {
    config: Config;
    refreshInterval?: number;
    key?: KeyLike;
    bootnodes?: MultiaddrLike;
    dnsNetworks?: DnsNetwork[];
}
/**
 * Base class for transport specific server implementations.
 * @memberof module:net/server
 */
export declare class Server {
    config: Config;
    key: Uint8Array;
    bootnodes: Multiaddr[];
    dnsNetworks: DnsNetwork[];
    protected refreshInterval: number;
    protected protocols: Set<Protocol>;
    started: boolean;
    /**
     * Create new server
     */
    constructor(options: ServerOptions);
    get name(): string;
    /**
     * Check if server is running
     */
    get running(): boolean;
    /**
     * Start server.
     * Returns a promise that resolves once server has been started.
     * @returns true if server successfully started
     */
    start(): Promise<boolean>;
    /**
     * Server bootstrap.
     * In Libp2p this is done during server start.
     */
    bootstrap(): Promise<void>;
    /**
     * Stop server. Returns a promise that resolves once server has been stopped.
     */
    stop(): Promise<boolean>;
    /**
     * Specify which protocols the server must support
     * @param protocols protocol classes
     * @returns true if protocol added successfully
     */
    addProtocols(protocols: Protocol[]): boolean;
    /**
     * Ban peer for a specified time
     * @param peerId id of peer
     * @param maxAge how long to ban peer
     */
    ban(_peerId: string, _maxAge: number): void;
    connect(_peerId: string, _stream?: any): Promise<void>;
}
//# sourceMappingURL=server.d.ts.map