/// <reference types="node" />
import { EventEmitter } from 'events';
import { BoundEthProtocol, BoundLesProtocol, BoundSnapProtocol } from '../protocol';
import type { Config } from '../../config';
import type { BoundProtocol, Protocol, Sender } from '../protocol';
import type { Server } from '../server';
export interface PeerOptions {
    config: Config;
    id?: string;
    address: string;
    transport: string;
    inbound?: boolean;
    protocols?: Protocol[];
    server?: Server;
}
/**
 * Network peer
 * @memberof module:net/peer
 */
export declare abstract class Peer extends EventEmitter {
    config: Config;
    id: string;
    address: string;
    inbound: boolean;
    server: Server | undefined;
    protected transport: string;
    protected protocols: Protocol[];
    protected boundProtocols: BoundProtocol[];
    private _idle;
    eth?: BoundEthProtocol;
    snap?: BoundSnapProtocol;
    les?: BoundLesProtocol;
    pooled: boolean;
    /**
     * Create new peer
     */
    constructor(options: PeerOptions);
    /**
     * Get idle state of peer
     */
    get idle(): boolean;
    /**
     * Set idle state of peer
     */
    set idle(value: boolean);
    abstract connect(): Promise<void>;
    /**
     * Handle unhandled messages along handshake
     */
    handleMessageQueue(): void;
    addProtocol(sender: Sender, protocol: Protocol): Promise<void>;
    toString(withFullId?: boolean): string;
}
//# sourceMappingURL=peer.d.ts.map