"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngineError = exports.Status = void 0;
const error_code_1 = require("../../error-code");
var Status;
(function (Status) {
    Status["ACCEPTED"] = "ACCEPTED";
    Status["INVALID"] = "INVALID";
    Status["INVALID_BLOCK_HASH"] = "INVALID_BLOCK_HASH";
    Status["SYNCING"] = "SYNCING";
    Status["VALID"] = "VALID";
})(Status = exports.Status || (exports.Status = {}));
exports.EngineError = {
    UnknownPayload: {
        code: error_code_1.UNKNOWN_PAYLOAD,
        message: 'Unknown payload',
    },
};
//# sourceMappingURL=types.js.map