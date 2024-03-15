import type { Logger as WinstonLogger } from 'winston';
export declare type Logger = WinstonLogger;
/**
 * Returns a formatted {@link Logger}
 */
export declare function getLogger(args?: {
    [key: string]: any;
}): WinstonLogger;
//# sourceMappingURL=logging.d.ts.map