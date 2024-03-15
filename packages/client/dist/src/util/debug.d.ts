import type { VMExecution } from '../execution';
import type { Block } from '@ethereumjs/block';
/**
 * Generates a code snippet which can be used to replay an erroneous block
 * locally in the VM
 *
 * @param block
 */
export declare function debugCodeReplayBlock(execution: VMExecution, block: Block): Promise<void>;
//# sourceMappingURL=debug.d.ts.map