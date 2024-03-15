import { RLPx as Devp2pRLPx } from '@ethereumjs/devp2p';
import { Peer } from './peer';
import type { Protocol } from '../protocol';
import type { RlpxServer } from '../server';
import type { PeerOptions } from './peer';
import type { Capabilities as Devp2pCapabilities, Peer as Devp2pRlpxPeer } from '@ethereumjs/devp2p';
export interface RlpxPeerOptions extends Omit<PeerOptions, 'address' | 'transport'> {
    host: string;
    port: number;
}
/**
 * Devp2p/RLPx peer
 * @memberof module:net/peer
 * @example
 * ```ts
 * import { RlpxPeer } from './src/net/peer'
 * import { Chain } from './src/blockchain'
 * import { EthProtocol } from './src/net/protocol'
 *
 * const chain = await Chain.create()
 * const protocols = [ new EthProtocol({ chain })]
 * const id = '70180a7fcca96aa013a3609fe7c23cc5c349ba82652c077be6f05b8419040560a622a4fc197a450e5e2f5f28fe6227637ccdbb3f9ba19220d1fb607505ffb455'
 * const host = '192.0.2.1'
 * const port = 12345
 *
 * new RlpxPeer({ id, host, port, protocols })
 *   .on('error', (err) => console.log('Error:', err))
 *   .on('connected', () => console.log('Connected'))
 *   .on('disconnected', (reason) => console.log('Disconnected:', reason))
 *   .connect()
 * ```
 */
export declare class RlpxPeer extends Peer {
    private host;
    private port;
    rlpx: Devp2pRLPx | null;
    rlpxPeer: Devp2pRlpxPeer | null;
    connected: boolean;
    /**
     * Create new devp2p/rlpx peer
     */
    constructor(options: RlpxPeerOptions);
    /**
     * Return devp2p/rlpx capabilities for the specified protocols
     * @param protocols protocol instances
     */
    static capabilities(protocols: Protocol[]): Devp2pCapabilities[];
    /**
     * Initiate peer connection
     */
    connect(): Promise<void>;
    /**
     * Accept new peer connection from an rlpx server
     */
    accept(rlpxPeer: Devp2pRlpxPeer, server: RlpxServer): Promise<void>;
    /**
     * Adds protocols to this peer given an rlpx native peer instance.
     * @param rlpxPeer rlpx native peer
     */
    private bindProtocols;
}
//# sourceMappingURL=rlpxpeer.d.ts.map