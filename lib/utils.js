"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const chalk_1 = __importDefault(require("chalk"));
class Logger {
    logWithColor(log) {
        if (typeof log === 'string') {
            return log;
        }
        const { text, bgColor, color } = log;
        if (bgColor && color)
            return chalk_1.default[color][bgColor](text);
        return chalk_1.default[color || bgColor || 'reset'](text);
    }
    log_(msg, header = null, list = null, options = { newLine: false }) {
        // don't log if list is empty
        if (list &&
            Array.isArray(list) &&
            (list === null || list === void 0 ? void 0 : list.length) === 0 &&
            (options === null || options === void 0 ? void 0 : options.onlyWithListElements)) {
            return;
        }
        // start logging
        if (header && msg) {
            console.log(`${chalk_1.default.bold(this.logWithColor(header))} ${this.logWithColor(msg)}`);
        }
        else {
            if (msg) {
                console.log(`${this.logWithColor(msg)}`);
            }
            else if (header) {
                console.log(`${this.logWithColor(header)}`);
            }
        }
        // list
        if (list) {
            list.forEach((e) => {
                console.log(`- ${e}`);
            });
        }
        if (options.newLine)
            console.log('\n');
        return;
    }
    static warning(msg, list = [], options = {}) {
        const logger = new Logger();
        logger.log_({ text: msg, color: 'yellow' }, { text: ' WARNING ', bgColor: 'bgYellow' }, list, Object.assign({ newLine: true }, options));
    }
    static success(msg, list = [], options = {}) {
        const logger = new Logger();
        logger.log_({ text: msg, color: 'green' }, { text: ' SUCCESS ', bgColor: 'bgGreen', color: 'white' }, list, Object.assign({ newLine: true }, options));
    }
    static error(msg, list = [], options = {}) {
        const logger = new Logger();
        logger.log_({ text: msg, color: 'red' }, { text: ' ERROR ', bgColor: 'bgRed' }, list, Object.assign(Object.assign({}, options), { newLine: true }));
    }
    static info(msg, list = [], options = {}) {
        const logger = new Logger();
        logger.log_({ text: msg, color: 'blue' }, null, list, options);
    }
    static log(msg, header = null, list = [], options = {}) {
        const logger = new Logger();
        logger.log_(msg, header, list, options);
    }
}
exports.Logger = Logger;
