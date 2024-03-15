import type { Chain } from '../blockchain';
import type { Config } from '../config';
import type { AbstractLevel } from 'abstract-level';
export interface ExecutionOptions {
    config: Config;
    stateDB?: AbstractLevel<string | Uint8Array, string | Uint8Array, string | Uint8Array>;
    metaDB?: AbstractLevel<string | Uint8Array, string | Uint8Array, string | Uint8Array>;
    /** Chain */
    chain: Chain;
}
export declare abstract class Execution {
    config: Config;
    protected stateDB?: AbstractLevel<string | Uint8Array, string | Uint8Array, string | Uint8Array>;
    protected metaDB?: AbstractLevel<string | Uint8Array, string | Uint8Array, string | Uint8Array>;
    protected chain: Chain;
    running: boolean;
    started: boolean;
    /**
     * Create new execution module
     * @memberof module:sync/execution
     */
    constructor(options: ExecutionOptions);
    /**
     * Runs an execution
     *
     * @returns number quantifying execution run
     */
    abstract run(): Promise<number>;
    /**
     * Starts execution
     */
    open(): Promise<void>;
    /**
     * Stop execution. Returns a promise that resolves once stopped.
     */
    stop(): Promise<boolean>;
}
//# sourceMappingURL=execution.d.ts.map