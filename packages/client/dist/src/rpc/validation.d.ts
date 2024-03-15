/**
 * middleware for parameters validation
 * @memberof module:rpc
 * @param method function to add middleware
 * @param requiredParamsCount required parameters count
 * @param validators array of validators
 */
export declare function middleware(method: any, requiredParamsCount: number, validators?: any[], names?: string[]): any;
/**
 * @memberof module:rpc
 */
export declare const validators: {
    /**
     * address validator to ensure has `0x` prefix and 20 bytes length
     * @param params parameters of method
     * @param index index of parameter
     */
    readonly address: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    /**
     * hex validator to ensure has `0x` prefix
     * @param params parameters of method
     * @param index index of parameter
     */
    readonly hex: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    readonly bytes8: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    readonly bytes16: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    readonly bytes20: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    readonly bytes32: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    readonly variableBytes32: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    readonly bytes48: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    readonly bytes256: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    readonly uint64: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    readonly uint256: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    readonly blob: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    /**
     * Validator to ensure a valid integer [0, Number.MAX_SAFE_INTEGER], represented as a `number`.
     * @returns A validator function with parameters:
     *   - @param params Parameters of the method.
     *   - @param index The index of the parameter.
     */
    readonly unsignedInteger: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    /**
     * hex validator to validate block hash
     * @param params parameters of method
     * @param index index of parameter
     */
    readonly blockHash: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    /**
     * validator to ensure valid block integer or hash, or string option ["latest", "earliest", "pending"]
     * @param params parameters of method
     * @param index index of parameter
     */
    readonly blockOption: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    /**
     * bool validator to check if type is boolean
     * @param params parameters of method
     * @param index index of parameter
     */
    readonly bool: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    /**
     * number validator to check if type is integer
     * @param params parameters of method
     * @param index index of parameter
     */
    readonly integer: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    /**
     * validator to ensure required transaction fields are present, and checks for valid address and hex values.
     * @param requiredFields array of required fields
     * @returns validator function with params:
     *   - @param params parameters of method
     *   - @param index index of parameter
     */
    readonly transaction: (requiredFields?: string[]) => (params: any[], index: number) => any;
    /**
     * validator to ensure required withdawal fields are present, and checks for valid address and hex values
     * for the other quantity based fields
     * @param requiredFields array of required fields
     * @returns validator function with params:
     *   - @param params parameters of method
     *   - @param index index of parameter
     */
    readonly withdrawal: (requiredFields?: string[]) => (params: any[], index: number) => any;
    /**
     * object validator to check if type is object with
     * required keys and expected validation of values
     * @param form object with keys and values of validators
     * @returns validator function with params:
     *   - @param params parameters of method
     *   - @param index index of parameter
     */
    readonly object: (form: {
        [key: string]: Function;
    }) => (params: any[], index: number) => any;
    /**
     * array validator to check if each element
     * of the array passes the passed-in validator
     * @param validator validator to check against the elements of the array
     * @returns validator function with params:
     *   - @param params parameters of method
     *   - @param index index of parameter
     */
    readonly array: (validator: Function) => (params: any[], index: number) => any;
    /**
     * Verification of rewardPercentile value
     *
     * description: Floating point value between 0 and 100.
     * type: number
     *
     */
    readonly rewardPercentile: (params: any[], i: number) => number | {
        code: number;
        message: string;
    };
    /**
     * Verification of rewardPercentiles array
     *
     *  description: A monotonically increasing list of percentile values. For each block in the requested range, the transactions will be sorted in ascending order by effective tip per gas and the coresponding effective tip for the percentile will be determined, accounting for gas consumed.
     *  type: array
     *    items: rewardPercentile value
     *
     */
    readonly rewardPercentiles: (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    /**
     * validator to ensure that contains one of the string values
     * @param values array of possible values
     * @returns validator function with params:
     *   - @param params parameters of method
     *   - @param index index of parameter
     */
    readonly values: (values: string[]) => (params: any[], index: number) => {
        code: number;
        message: string;
    } | undefined;
    /**
     * Validator to allow validation of an optional value
     * @param validator validator to check against the value
     * @returns validator function with params:
     *   - @param params parameters of method
     *   - @param index index of parameter
     */
    readonly optional: (validator: any) => (params: any, index: number) => any;
    /**
     * Validator that passes if any of the specified validators pass
     * @param validator validator to check against the value
     * @returns validator function with params:
     *   - @param params parameters of method
     *   - @param index index of parameter
     */
    readonly either: (...validators: any) => (params: any, index: number) => any;
};
//# sourceMappingURL=validation.d.ts.map