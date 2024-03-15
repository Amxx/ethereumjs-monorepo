import { Chain } from './blockchain';
import { FullEthereumService, LightEthereumService } from './service';
import type { Config } from './config';
import type { MultiaddrLike } from './types';
import type { Blockchain } from '@ethereumjs/blockchain';
import type { GenesisState } from '@ethereumjs/util';
import type { AbstractLevel } from 'abstract-level';
export interface EthereumClientOptions {
    /** Client configuration */
    config: Config;
    /** Custom blockchain (optional) */
    blockchain?: Blockchain;
    /**
     * Database to store blocks and metadata.
     * Should be an abstract-leveldown compliant store.
     *
     * Default: Database created by the Blockchain class
     */
    chainDB?: AbstractLevel<string | Uint8Array, string | Uint8Array, string | Uint8Array>;
    /**
     * Database to store the state.
     * Should be an abstract-leveldown compliant store.
     *
     * Default: Database created by the Trie class
     */
    stateDB?: AbstractLevel<string | Uint8Array, string | Uint8Array, string | Uint8Array>;
    /**
     * Database to store tx receipts, logs, and indexes.
     * Should be an abstract-leveldown compliant store.
     *
     * Default: Database created in datadir folder
     */
    metaDB?: AbstractLevel<string | Uint8Array, string | Uint8Array, string | Uint8Array>;
    bootnodes?: MultiaddrLike[];
    clientFilter?: string[];
    refreshInterval?: number;
    genesisState?: GenesisState;
    genesisStateRoot?: Uint8Array;
    statelessVerkle?: boolean;
}
/**
 * Represents the top-level ethereum node, and is responsible for managing the
 * lifecycle of included services.
 * @memberof module:node
 */
export declare class EthereumClient {
    config: Config;
    chain: Chain;
    services: (FullEthereumService | LightEthereumService)[];
    opened: boolean;
    started: boolean;
    /**
     * Main entrypoint for client initialization.
     *
     * Safe creation of a Chain object awaiting the initialization
     * of the underlying Blockchain object.
     */
    static create(options: EthereumClientOptions): Promise<EthereumClient>;
    /**
     * Create new node
     */
    protected constructor(chain: Chain, options: EthereumClientOptions);
    /**
     * Open node. Must be called before node is started
     */
    open(): Promise<false | undefined>;
    /**
     * Starts node and all services and network servers.
     */
    start(): Promise<false | undefined>;
    /**
     * Stops node and all services and network servers.
     */
    stop(): Promise<false | undefined>;
    /**
     *
     * @returns the RLPx server (if it exists)
     */
    server(): import("./net/server").RlpxServer | undefined;
    /**
     * Returns the service with the specified name.
     * @param name name of service
     */
    service(name: string): FullEthereumService | LightEthereumService | undefined;
}
//# sourceMappingURL=client.d.ts.map