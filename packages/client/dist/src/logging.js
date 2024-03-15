"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogger = void 0;
const chalk = require("chalk");
const winston_1 = require("winston");
const DailyRotateFile = require('winston-daily-rotate-file');
const { combine, timestamp, label, printf } = winston_1.format;
/**
 * Attention API
 *
 * If set string will be displayed on all log messages
 */
let attentionHF = null;
let attentionCL = null;
/**
 * Colors for logger levels
 */
var LevelColors;
(function (LevelColors) {
    LevelColors["error"] = "red";
    LevelColors["warn"] = "yellow";
    LevelColors["info"] = "green";
    LevelColors["debug"] = "white";
})(LevelColors || (LevelColors = {}));
/**
 * Adds stack trace to error message if included
 */
const errorFormat = (0, winston_1.format)((info) => {
    if (info.message instanceof Error && info.message.stack !== undefined) {
        return { ...info, message: info.message.stack };
    }
    if (info instanceof Error && info.stack !== undefined) {
        return { ...info, message: info.stack };
    }
    return info;
});
/**
 * Returns the formatted log output optionally with colors enabled
 *
 * Optional info parameters:
 * `attentionCL`: pass in string to `info.attentionCL` to set and permanently
 * display and `null` to deactivate
 * `attentionHF`: pass in string to `info.attentionHF` to set and permanently
 * display and `null` to deactivate
 *
 */
function logFormat(colors = false) {
    return printf((info) => {
        let level = info.level.toUpperCase();
        if (info.message === undefined)
            info.message = '(empty message)';
        if (colors) {
            const colorLevel = LevelColors[info.level];
            const color = chalk.keyword(colorLevel).bind(chalk);
            level = color(level);
            const regex = /(\w+)=(.+?)(?:\s|$)/g;
            const replaceFn = (_, tag, char) => `${color(tag)}=${char} `;
            info.message = info.message.replace(regex, replaceFn);
            if (typeof info.attentionCL === 'string')
                info.attentionCL = info.attentionCL.replace(regex, replaceFn);
            if (typeof info.attentionHF === 'string')
                info.attentionHF = info.attentionHF.replace(regex, replaceFn);
        }
        if (info.attentionCL !== undefined)
            attentionCL = info.attentionCL;
        if (info.attentionHF !== undefined)
            attentionHF = info.attentionHF;
        const CLLog = attentionCL !== null ? `[ ${attentionCL} ] ` : '';
        const HFLog = attentionHF !== null ? `[ ${attentionHF} ] ` : '';
        const msg = `[${info.timestamp}] ${level} ${CLLog}${HFLog}${info.message}`;
        return msg;
    });
}
/**
 * Returns the complete logger format
 */
function formatConfig(colors = false) {
    return combine(errorFormat(), winston_1.format.splat(), label({ label: 'ethereumjs' }), timestamp({ format: 'MM-DD|HH:mm:ss' }), logFormat(colors));
}
/**
 * Returns a transport with log file saving (rotates if args.logRotate is true)
 */
function logFileTransport(args) {
    let filename = args.logFile;
    const opts = {
        level: args.logLevelFile,
        format: formatConfig(),
    };
    if (args.logRotate !== true) {
        return new winston_1.transports.File({
            ...opts,
            filename,
        });
    }
    else {
        // Insert %DATE% before the last period
        const lastPeriod = filename.lastIndexOf('.');
        filename = `${filename.substring(0, lastPeriod)}.%DATE%${filename.substring(lastPeriod)}`;
        return new DailyRotateFile({
            ...opts,
            filename,
            maxFiles: args.logMaxFiles,
        });
    }
}
/**
 * Returns a formatted {@link Logger}
 */
function getLogger(args = { logLevel: 'info' }) {
    const transports = [
        new winston_1.transports.Console({
            level: args.logLevel,
            silent: args.logLevel === 'off',
            format: formatConfig(true),
        }),
    ];
    if (typeof args.logFile === 'string') {
        transports.push(logFileTransport(args));
    }
    const logger = (0, winston_1.createLogger)({
        transports,
        format: formatConfig(),
        level: args.logLevel,
    });
    return logger;
}
exports.getLogger = getLogger;
//# sourceMappingURL=logging.js.map