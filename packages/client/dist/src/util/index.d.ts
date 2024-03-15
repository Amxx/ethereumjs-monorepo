export * from './parse';
export * from './rpc';
export declare function short(bytes: Uint8Array | string): string;
export declare function getClientVersion(): string;
/**
 * Returns a friendly time duration.
 * @param time the number of seconds
 */
export declare function timeDuration(time: number): string;
/**
 * Returns a friendly time diff string.
 * @param timestamp the timestamp to diff (in seconds) from now
 */
export declare function timeDiff(timestamp: number): string;
export declare const isBrowser: Function;
export declare type V8Engine = {
    getHeapStatistics: () => {
        heap_size_limit: number;
        used_heap_size: number;
    };
};
export declare function getV8Engine(): Promise<V8Engine | null>;
//# sourceMappingURL=index.d.ts.map