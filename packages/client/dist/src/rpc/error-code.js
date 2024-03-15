"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INVALID_BLOCK = exports.validEngineCodes = exports.UNKNOWN_PAYLOAD = exports.UNSUPPORTED_FORK = exports.TOO_LARGE_REQUEST = exports.INTERNAL_ERROR = exports.INVALID_PARAMS = exports.METHOD_NOT_FOUND = exports.INVALID_REQUEST = exports.PARSE_ERROR = void 0;
//  Error code from JSON-RPC 2.0 spec
//  reference: http://www.jsonrpc.org/specification#error_object
exports.PARSE_ERROR = -32700;
exports.INVALID_REQUEST = -32600;
exports.METHOD_NOT_FOUND = -32601;
exports.INVALID_PARAMS = -32602;
exports.INTERNAL_ERROR = -32603;
exports.TOO_LARGE_REQUEST = -38004;
exports.UNSUPPORTED_FORK = -38005;
exports.UNKNOWN_PAYLOAD = -32001;
exports.validEngineCodes = [
    exports.PARSE_ERROR,
    exports.INVALID_REQUEST,
    exports.METHOD_NOT_FOUND,
    exports.INVALID_PARAMS,
    exports.INTERNAL_ERROR,
    exports.TOO_LARGE_REQUEST,
    exports.UNSUPPORTED_FORK,
    exports.UNKNOWN_PAYLOAD,
];
// Errors for the ETH protocol
exports.INVALID_BLOCK = -39001;
//# sourceMappingURL=error-code.js.map