import chalk from 'chalk';
import dotenv from 'dotenv';
import { join } from 'path';

import type {
    TextWithColor,
    LoggerHeaderParam,
    LoggerListParam,
    LoggerMsgParam,
    LoggerOptionParam
} from './types';

export class Logger {
    logWithColor(log: string | TextWithColor) {
        if (typeof log === 'string') {
            return log;
        }
        const { text, bgColor, color } = log;

        if (bgColor && color) return chalk[color][bgColor](text);
        return chalk[color || bgColor || 'reset'](text);
    }

    log_(
        msg: LoggerMsgParam,
        header: LoggerHeaderParam | null = null,
        list: LoggerListParam | null = null,
        options: LoggerOptionParam = { newLine: false }
    ) {
        // don't log if list is empty
        if (
            list &&
            Array.isArray(list) &&
            list?.length === 0 &&
            options?.onlyWithListElements
        ) {
            return;
        }

        // start logging
        if (header && msg) {
            console.log(
                `${chalk.bold(this.logWithColor(header))} ${this.logWithColor(
                    msg
                )}`
            );
        } else {
            if (msg) {
                console.log(`${this.logWithColor(msg)}`);
            } else if (header) {
                console.log(`${this.logWithColor(header)}`);
            }
        }
        // list
        if (list) {
            list.forEach((e) => {
                console.log(`- ${e}`);
            });
        }

        if (options.newLine) console.log('\n');
        return;
    }

    static warning(
        msg: string,
        list: LoggerListParam = [],
        options: LoggerOptionParam = {}
    ) {
        const logger = new Logger();
        logger.log_(
            { text: msg, color: 'yellow' },
            { text: ' WARNING ', bgColor: 'bgYellow' },
            list,
            { newLine: true, ...options }
        );
    }

    static success(
        msg: string,
        list: LoggerListParam = [],
        options: LoggerOptionParam = {}
    ) {
        const logger = new Logger();
        logger.log_(
            { text: msg, color: 'green' },
            { text: ' SUCCESS ', bgColor: 'bgGreen', color: 'white' },
            list,
            { newLine: true, ...options }
        );
    }

    static error(
        msg: string,
        list: LoggerListParam = [],
        options: LoggerOptionParam = {}
    ) {
        const logger = new Logger();
        logger.log_(
            { text: msg, color: 'red' },
            { text: ' ERROR ', bgColor: 'bgRed' },
            list,
            { ...options, newLine: true }
        );
    }

    static info(
        msg: string,
        list: LoggerListParam = [],
        options: LoggerOptionParam = {}
    ) {
        const logger = new Logger();
        logger.log_({ text: msg, color: 'blue' }, null, list, options);
    }

    static log(
        msg: LoggerMsgParam,
        header: LoggerHeaderParam | null = null,
        list: LoggerListParam = [],
        options: LoggerOptionParam = {}
    ) {
        const logger = new Logger();
        logger.log_(msg, header, list, options);
    }
}

dotenv.config();

export const replaceEnvVar = <T extends string | number | undefined>(
    variable: T
): T | undefined => {
    if (!variable) return undefined;

    const envMarker = 'env:';

    if (typeof variable === 'string' && variable.startsWith(envMarker)) {
        const value = process.env[variable.replace(envMarker, '')];
        return value as T;
    }
    return variable;
};

export const setFilePath = <T extends string | undefined>(
    path: T,
    basePath?: string
) => {
    if (typeof path === 'string') {
        if (path.startsWith('/')) {
            return join(process.cwd(), path);
        }
        return join(basePath || process.cwd(), path);
    }
    return path;
};
