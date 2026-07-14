"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
const LEVEL_ORDER = { debug: 0, info: 1, warn: 2, error: 3 };
function resolveMinLevel() {
    const raw = typeof process !== 'undefined' ? process.env?.LOG_LEVEL : undefined;
    return raw && raw in LEVEL_ORDER ? raw : 'info';
}
function createLogger(scope) {
    const minLevel = resolveMinLevel();
    const log = (level, message, meta) => {
        if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel])
            return;
        const prefix = `[${new Date().toISOString()}] [${scope}] ${message}`;
        const consoleMethod = level === 'debug' ? 'log' : level;
        if (meta) {
            console[consoleMethod](prefix, meta);
        }
        else {
            console[consoleMethod](prefix);
        }
    };
    return {
        debug: (message, meta) => log('debug', message, meta),
        info: (message, meta) => log('info', message, meta),
        warn: (message, meta) => log('warn', message, meta),
        error: (message, meta) => log('error', message, meta),
    };
}
