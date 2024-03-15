import type { Config } from '../config';
import type { FullEthereumService } from '../service';
export interface MinerOptions {
    config: Config;
    service: FullEthereumService;
    skipHardForkValidation?: boolean;
}
/**
 * @module miner
 */
/**
 * Implements Ethereum block creation and mining.
 * @memberof module:miner
 */
export declare class Miner {
    private DEFAULT_PERIOD;
    private _nextAssemblyTimeoutId;
    private _boundChainUpdatedHandler;
    private config;
    private service;
    private execution;
    private assembling;
    private period;
    private ethash;
    private ethashMiner;
    private nextSolution;
    private skipHardForkValidation?;
    running: boolean;
    /**
     * Create miner
     * @param options constructor parameters
     */
    constructor(options: MinerOptions);
    /**
     * Convenience alias to return the latest block in the blockchain
     */
    private latestBlockHeader;
    /**
     * Sets the timeout for the next block assembly
     */
    private queueNextAssembly;
    /**
     * Finds the next PoW solution.
     */
    private findNextSolution;
    /**
     * Sets the next block assembly to latestBlock.timestamp + period
     */
    private chainUpdated;
    /**
     * Start miner
     */
    start(): boolean;
    /**
     * Assembles a block from txs in the TxPool and adds it to the chain.
     * If a new block is received while assembling it will abort.
     */
    assembleBlock(): Promise<void>;
    /**
     * Stop miner execution
     */
    stop(): boolean;
}
//# sourceMappingURL=miner.d.ts.map