"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validators = exports.middleware = void 0;
const error_code_1 = require("./error-code");
/**
 * middleware for parameters validation
 * @memberof module:rpc
 * @param method function to add middleware
 * @param requiredParamsCount required parameters count
 * @param validators array of validators
 */
function middleware(method, requiredParamsCount, validators = [], names = []) {
    return function (params = []) {
        return new Promise((resolve, reject) => {
            if (params.length < requiredParamsCount) {
                const error = {
                    code: error_code_1.INVALID_PARAMS,
                    message: `missing value for required argument ${names[params.length] ?? params.length}`,
                };
                return reject(error);
            }
            for (let i = 0; i < validators.length; i++) {
                if (validators[i] !== undefined) {
                    for (let j = 0; j < validators[i].length; j++) {
                        // Only apply validators if params[i] is a required parameter or exists
                        if (i < requiredParamsCount || params[i] !== undefined) {
                            const error = validators[i][j](params, i);
                            if (error !== undefined) {
                                return reject(error);
                            }
                        }
                    }
                }
            }
            resolve(method(params));
        });
    };
}
exports.middleware = middleware;
function bytes(bytes, params, index) {
    if (typeof params[index] !== 'string') {
        return {
            code: error_code_1.INVALID_PARAMS,
            message: `invalid argument ${index}: argument must be a hex string`,
        };
    }
    if (params[index].substr(0, 2) !== '0x') {
        return {
            code: error_code_1.INVALID_PARAMS,
            message: `invalid argument ${index}: hex string without 0x prefix`,
        };
    }
    if (params[index].length > 2 && !/^[0-9a-fA-F]+$/.test(params[index].substr(2))) {
        return {
            code: error_code_1.INVALID_PARAMS,
            message: `invalid argument ${index}: argument must be a hex string`,
        };
    }
    if (params[index].substr(2).length > bytes * 2) {
        return {
            code: error_code_1.INVALID_PARAMS,
            message: `invalid argument ${index}: expected ${bytes} byte value`,
        };
    }
}
function uint(uint, params, index) {
    if (uint % 8 !== 0) {
        // Sanity check
        throw new Error(`Uint should be a multiple of 8, got: ${uint}`);
    }
    if (typeof params[index] !== 'string') {
        return {
            code: error_code_1.INVALID_PARAMS,
            message: `invalid argument ${index}: argument must be a hex string`,
        };
    }
    if (params[index].substr(0, 2) !== '0x') {
        return {
            code: error_code_1.INVALID_PARAMS,
            message: `invalid argument ${index}: hex string without 0x prefix`,
        };
    }
    if (params[index].length > 2 && !/^[0-9a-fA-F]+$/.test(params[index].substr(2))) {
        return {
            code: error_code_1.INVALID_PARAMS,
            message: `invalid argument ${index}: argument must be a hex string`,
        };
    }
    if (params[index].substr(2).length > (uint / 8) * 2) {
        return {
            code: error_code_1.INVALID_PARAMS,
            message: `invalid argument ${index}: expected ${uint} bit value`,
        };
    }
}
/**
 * @memberof module:rpc
 */
exports.validators = {
    /**
     * address validator to ensure has `0x` prefix and 20 bytes length
     * @param params parameters of method
     * @param index index of parameter
     */
    get address() {
        return (params, index) => {
            if (typeof params[index] !== 'string') {
                return {
                    code: error_code_1.INVALID_PARAMS,
                    message: `invalid argument ${index}: argument must be a hex string`,
                };
            }
            if (params[index].substr(0, 2) !== '0x') {
                return {
                    code: error_code_1.INVALID_PARAMS,
                    message: `invalid argument ${index}: missing 0x prefix`,
                };
            }
            const address = params[index].substr(2);
            if (!/^[0-9a-fA-F]+$/.test(address) || address.length !== 40) {
                return {
                    code: error_code_1.INVALID_PARAMS,
                    message: `invalid argument ${index}: invalid address`,
                };
            }
        };
    },
    /**
     * hex validator to ensure has `0x` prefix
     * @param params parameters of method
     * @param index index of parameter
     */
    get hex() {
        return (params, index) => {
            if (typeof params[index] !== 'string') {
                return {
                    code: error_code_1.INVALID_PARAMS,
                    message: `invalid argument ${index}: argument must be a hex string`,
                };
            }
            if (params[index].substr(0, 2) !== '0x') {
                return {
                    code: error_code_1.INVALID_PARAMS,
                    message: `invalid argument ${index}: hex string without 0x prefix`,
                };
            }
        };
    },
    get bytes8() {
        return (params, index) => bytes(8, params, index);
    },
    get bytes16() {
        return (params, index) => bytes(16, params, index);
    },
    get bytes20() {
        return (params, index) => bytes(20, params, index);
    },
    get bytes32() {
        return (params, index) => bytes(32, params, index);
    },
    get variableBytes32() {
        return (params, index) => bytes(32, params, index);
    },
    get bytes48() {
        return (params, index) => bytes(48, params, index);
    },
    get bytes256() {
        return (params, index) => bytes(256, params, index);
    },
    get uint64() {
        return (params, index) => uint(64, params, index);
    },
    get uint256() {
        return (params, index) => uint(256, params, index);
    },
    get blob() {
        // "each blob is FIELD_ELEMENTS_PER_BLOB * BYTES_PER_FIELD_ELEMENT = 4096 * 32 = 131072"
        // See: https://github.com/ethereum/execution-apis/blob/b7c5d3420e00648f456744d121ffbd929862924d/src/engine/experimental/blob-extension.md
        return (params, index) => bytes(131072, params, index);
    },
    /**
     * Validator to ensure a valid integer [0, Number.MAX_SAFE_INTEGER], represented as a `number`.
     * @returns A validator function with parameters:
     *   - @param params Parameters of the method.
     *   - @param index The index of the parameter.
     */
    get unsignedInteger() {
        return (params, index) => {
            // This check guards against non-number types, decimal numbers,
            // numbers that are too large (or small) to be represented exactly,
            // NaN, null, and undefined.
            if (!Number.isSafeInteger(params[index])) {
                return {
                    code: error_code_1.INVALID_PARAMS,
                    message: `invalid argument ${index}: argument must be an integer`,
                };
            }
            if (params[index] < 0) {
                return {
                    code: error_code_1.INVALID_PARAMS,
                    message: `invalid argument ${index}: argument must be larger than 0`,
                };
            }
        };
    },
    /**
     * hex validator to validate block hash
     * @param params parameters of method
     * @param index index of parameter
     */
    get blockHash() {
        return (params, index) => {
            if (typeof params[index] !== 'string') {
                return {
                    code: error_code_1.INVALID_PARAMS,
                    message: `invalid argument ${index}: argument must be a hex string`,
                };
            }
            if (params[index].substr(0, 2) !== '0x') {
                return {
                    code: error_code_1.INVALID_PARAMS,
                    message: `invalid argument ${index}: hex string without 0x prefix`,
                };
            }
            const blockHash = params[index].substring(2);
            if (!/^[0-9a-fA-F]+$/.test(blockHash) || blockHash.length !== 64) {
                return {
                    code: error_code_1.INVALID_PARAMS,
                    message: `invalid argument ${index}: invalid block hash`,
                };
            }
        };
    },
    /**
     * validator to ensure valid block integer or hash, or string option ["latest", "earliest", "pending"]
     * @param params parameters of method
     * @param index index of parameter
     */
    get blockOption() {
        return (params, index) => {
            if (typeof params[index] !== 'string') {
                return {
                    code: error_code_1.INVALID_PARAMS,
                    message: `invalid argument ${index}: argument must be a string`,
                };
            }
            const blockOption = params[index];
            if (!['latest', 'finalized', 'safe', 'earliest', 'pending'].includes(blockOption)) {
                if (blockOption.substr(0, 2) === '0x') {
                    const hash = this.blockHash([blockOption], 0);
                    // todo: make integer validator?
                    const integer = this.hex([blockOption], 0);
                    // valid if undefined
                    if (hash === undefined || integer === undefined) {
                        // valid
                        return;
                    }
                }
                return {
                    code: error_code_1.INVALID_PARAMS,
                    message: `invalid argument ${index}: block option must be a valid 0x-prefixed block hash or hex integer, or "latest", "earliest" or "pending"`,
                };
            }
        };
    },
    /**
     * bool validator to check if type is boolean
     * @param params parameters of method
     * @param index index of parameter
     */
    get bool() {
        return (params, index) => {
            if (typeof params[index] !== 'boolean') {
                return {
                    code: error_code_1.INVALID_PARAMS,
                    message: `invalid argument ${index}: argument is not boolean`,
                };
            }
        };
    },
    /**
     * number validator to check if type is integer
     * @param params parameters of method
     * @param index index of parameter
     */
    get integer() {
        return (params, index) => {
            if (!Number.isInteger(params[index])) {
                return {
                    code: error_code_1.INVALID_PARAMS,
                    message: `invalid argument ${index}: argument is not an integer`,
                };
            }
        };
    },
    /**
     * validator to ensure required transaction fields are present, and checks for valid address and hex values.
     * @param requiredFields array of required fields
     * @returns validator function with params:
     *   - @param params parameters of method
     *   - @param index index of parameter
     */
    get transaction() {
        return (requiredFields = []) => {
            return (params, index) => {
                if (typeof params[index] !== 'object') {
                    return {
                        code: error_code_1.INVALID_PARAMS,
                        message: `invalid argument ${index}: argument must be an object`,
                    };
                }
                const tx = params[index];
                for (const field of requiredFields) {
                    if (tx[field] === undefined) {
                        return {
                            code: error_code_1.INVALID_PARAMS,
                            message: `invalid argument ${index}: required field ${field}`,
                        };
                    }
                }
                const validate = (field, validator) => {
                    if (field === undefined)
                        return;
                    const v = validator([field], 0);
                    if (v !== undefined)
                        return v;
                };
                // validate addresses
                for (const field of [tx.to, tx.from]) {
                    const v = validate(field, this.address);
                    if (v !== undefined)
                        return v;
                }
                // validate hex
                const hexFields = { gas: tx.gas, gasPrice: tx.gasPrice, value: tx.value, data: tx.data };
                for (const field of Object.entries(hexFields)) {
                    const v = validate(field[1], this.hex);
                    if (v !== undefined) {
                        return {
                            code: error_code_1.INVALID_PARAMS,
                            message: `invalid argument ${field[0]}:${v.message.split(':')[1]}`,
                        };
                    }
                }
            };
        };
    },
    /**
     * validator to ensure required withdawal fields are present, and checks for valid address and hex values
     * for the other quantity based fields
     * @param requiredFields array of required fields
     * @returns validator function with params:
     *   - @param params parameters of method
     *   - @param index index of parameter
     */
    get withdrawal() {
        return (requiredFields = ['index', 'validatorIndex', 'address', 'amount']) => {
            return (params, index) => {
                if (typeof params[index] !== 'object') {
                    return {
                        code: error_code_1.INVALID_PARAMS,
                        message: `invalid argument ${index}: argument must be an object`,
                    };
                }
                const wt = params[index];
                for (const field of requiredFields) {
                    if (wt[field] === undefined) {
                        return {
                            code: error_code_1.INVALID_PARAMS,
                            message: `invalid argument ${index}: required field ${field}`,
                        };
                    }
                }
                const validate = (field, validator) => {
                    if (field === undefined)
                        return;
                    const v = validator([field], 0);
                    if (v !== undefined)
                        return v;
                };
                // validate addresses
                for (const field of [wt.address]) {
                    const v = validate(field, this.address);
                    if (v !== undefined)
                        return v;
                }
                // validate hex
                for (const field of [wt.index, wt.validatorIndex, wt.amount]) {
                    const v = validate(field, this.hex);
                    if (v !== undefined)
                        return v;
                }
            };
        };
    },
    /**
     * object validator to check if type is object with
     * required keys and expected validation of values
     * @param form object with keys and values of validators
     * @returns validator function with params:
     *   - @param params parameters of method
     *   - @param index index of parameter
     */
    get object() {
        return (form) => {
            return (params, index) => {
                if (typeof params[index] !== 'object') {
                    return {
                        code: error_code_1.INVALID_PARAMS,
                        message: `invalid argument ${index}: argument is not object`,
                    };
                }
                for (const [key, validator] of Object.entries(form)) {
                    const value = params[index][key];
                    const result = validator([value], 0);
                    if (result !== undefined) {
                        // add key to message for context
                        const originalMessage = result.message.split(':');
                        const message = `invalid argument ${index} for key '${key}':${originalMessage[1]}`;
                        return { ...result, message };
                    }
                }
            };
        };
    },
    /**
     * array validator to check if each element
     * of the array passes the passed-in validator
     * @param validator validator to check against the elements of the array
     * @returns validator function with params:
     *   - @param params parameters of method
     *   - @param index index of parameter
     */
    get array() {
        return (validator) => {
            return (params, index) => {
                if (!Array.isArray(params[index])) {
                    return {
                        code: error_code_1.INVALID_PARAMS,
                        message: `invalid argument ${index}: argument is not array`,
                    };
                }
                for (const value of params[index]) {
                    const result = validator([value], 0);
                    if (result !== undefined)
                        return result;
                }
            };
        };
    },
    /**
     * Verification of rewardPercentile value
     *
     * description: Floating point value between 0 and 100.
     * type: number
     *
     */
    get rewardPercentile() {
        return (params, i) => {
            const ratio = params[i];
            if (typeof ratio !== 'number') {
                return {
                    code: error_code_1.INVALID_PARAMS,
                    message: `entry at ${i} is not a number`,
                };
            }
            if (ratio < 0) {
                return {
                    code: error_code_1.INVALID_PARAMS,
                    message: `entry at ${i} is lower than 0`,
                };
            }
            if (ratio > 100) {
                return {
                    code: error_code_1.INVALID_PARAMS,
                    message: `entry at ${i} is higher than 100`,
                };
            }
            return ratio;
        };
    },
    /**
     * Verification of rewardPercentiles array
     *
     *  description: A monotonically increasing list of percentile values. For each block in the requested range, the transactions will be sorted in ascending order by effective tip per gas and the coresponding effective tip for the percentile will be determined, accounting for gas consumed.
     *  type: array
     *    items: rewardPercentile value
     *
     */
    get rewardPercentiles() {
        return (params, index) => {
            const field = params[index];
            if (!Array.isArray(field)) {
                return {
                    code: error_code_1.INVALID_PARAMS,
                    message: `invalid argument ${index}: argument is not array`,
                };
            }
            let low = -1;
            for (let i = 0; i < field.length; i++) {
                const ratio = this.rewardPercentile(field, i);
                if (typeof ratio === 'object') {
                    return {
                        code: error_code_1.INVALID_PARAMS,
                        message: `invalid argument ${index}: ${ratio.message}`,
                    };
                }
                if (ratio <= low) {
                    return {
                        code: error_code_1.INVALID_PARAMS,
                        message: `invalid argument ${index}: array is not monotonically increasing`,
                    };
                }
                low = ratio;
            }
        };
    },
    /**
     * validator to ensure that contains one of the string values
     * @param values array of possible values
     * @returns validator function with params:
     *   - @param params parameters of method
     *   - @param index index of parameter
     */
    get values() {
        return (values) => {
            return (params, index) => {
                if (!values.includes(params[index])) {
                    const valueOptions = '[' + values.map((v) => `"${v}"`).join(', ') + ']';
                    return {
                        code: error_code_1.INVALID_PARAMS,
                        message: `invalid argument ${index}: argument is not one of ${valueOptions}`,
                    };
                }
            };
        };
    },
    /**
     * Validator to allow validation of an optional value
     * @param validator validator to check against the value
     * @returns validator function with params:
     *   - @param params parameters of method
     *   - @param index index of parameter
     */
    get optional() {
        return (validator) => {
            return (params, index) => {
                if (params[index] === undefined || params[index] === '' || params[index] === null) {
                    return;
                }
                return validator(params, index);
            };
        };
    },
    /**
     * Validator that passes if any of the specified validators pass
     * @param validator validator to check against the value
     * @returns validator function with params:
     *   - @param params parameters of method
     *   - @param index index of parameter
     */
    get either() {
        return (...validators) => {
            return (params, index) => {
                if (params[index] === undefined) {
                    return;
                }
                const results = validators.map((v) => v(params, index));
                const numPassed = results.filter((r) => r === undefined).length;
                return numPassed > 0 ? undefined : results[0];
            };
        };
    },
};
//# sourceMappingURL=validation.js.map