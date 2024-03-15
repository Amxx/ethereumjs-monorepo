"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getV8Engine = exports.isBrowser = exports.timeDiff = exports.timeDuration = exports.getClientVersion = exports.short = void 0;
/**
 * @module util
 */
const util_1 = require("@ethereumjs/util");
const os_1 = require("os");
const package_json_1 = require("../../package.json");
__exportStar(require("./parse"), exports);
__exportStar(require("./rpc"), exports);
function short(bytes) {
    if (bytes === null || bytes === undefined || bytes === '')
        return '';
    const bytesString = bytes instanceof Uint8Array ? (0, util_1.bytesToHex)(bytes) : bytes;
    let str = bytesString.substring(0, 6) + '…';
    if (bytesString.length === 66) {
        str += bytesString.substring(62);
    }
    return str;
}
exports.short = short;
function getClientVersion() {
    const { version } = process;
    return `EthereumJS/${package_json_1.version}/${(0, os_1.platform)()}/node${version.substring(1)}`;
}
exports.getClientVersion = getClientVersion;
/**
 * Returns a friendly time duration.
 * @param time the number of seconds
 */
function timeDuration(time) {
    const min = 60;
    const hour = min * 60;
    const day = hour * 24;
    let str = '';
    if (time > day) {
        str = `${Math.floor(time / day)} day`;
    }
    else if (time > hour) {
        str = `${Math.floor(time / hour)} hour`;
    }
    else if (time > min) {
        str = `${Math.floor(time / min)} min`;
    }
    else {
        str = `${Math.floor(time)} sec`;
    }
    if (str.substring(0, 2) !== '1 ') {
        str += 's';
    }
    return str;
}
exports.timeDuration = timeDuration;
/**
 * Returns a friendly time diff string.
 * @param timestamp the timestamp to diff (in seconds) from now
 */
function timeDiff(timestamp) {
    const diff = new Date().getTime() / 1000 - timestamp;
    return timeDuration(diff);
}
exports.timeDiff = timeDiff;
// Dynamically load v8 for tracking mem stats
exports.isBrowser = new Function('try {return this===window;}catch(e){ return false;}');
let v8Engine = null;
async function getV8Engine() {
    if ((0, exports.isBrowser)() === false && v8Engine === null) {
        v8Engine = (await Promise.resolve().then(() => require('node:v8')));
    }
    return v8Engine;
}
exports.getV8Engine = getV8Engine;
//# sourceMappingURL=index.js.map