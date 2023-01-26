import chalk, { Chalk } from 'chalk';

import type { LogMessage, LogStyle, Bullets } from './types';

const log = console.log;

export default class Logger {
    constructor(message: LogMessage, style: LogStyle) {
        this.log(message, style);
    }

    /**
     * Main logging handler
     * @param message
     * @param style
     * @returns
     */
    private log(message: LogMessage, style: LogStyle) {
        if (typeof message === 'string') {
            this.logMessage(message, style.title);
            return;
        }

        // title
        this.logMessage(
            `${this.messageWithStyle(
                message?.title,
                style.title
            )}${this.spaceCond(message?.title)}${this.messageWithStyle(
                message?.message,
                style.message
            )}`
        );
        // info
        this.logMessage(message?.info, style?.info);

        // data
        this.logMessage(message?.data);

        // bullets
        this.bullets(message?.bullets, style);

        // new line
        if (style.endWithNewLine) {
            log('\n');
        }
    }

    /**
     * Styles a text and returns it
     * @param message
     * @param style
     * @returns
     * Styled text that can be logged
     */
    private messageWithStyle(message: string | undefined, style?: Chalk) {
        if (!message || message.trim().length === 0) return '';
        if (style) return style(message);
        return message;
    }

    /**
     * Logs a text to console if not undefined
     * @param message
     * @param style
     * @returns
     */
    private logMessage(message: string | undefined | object, style?: Chalk) {
        if (!message) return;
        if (!style || typeof message !== 'string') return log(message);
        log(this.messageWithStyle(message, style));
    }

    /**
     * Inserts a space if text is present, i.e. not undefined
     * @param text
     * @returns
     */
    private spaceCond(text: string | undefined) {
        if (text) return ' ';
        return '';
    }

    /**
     * Log list of elements in new line with bullet point
     * @param bullets
     * @param style
     * @returns
     */
    private bullets(bullets: Bullets | undefined, style: LogStyle) {
        if (!bullets) return;

        const logBullets = (bullets: string[], sign = '-') => {
            bullets.forEach((b) => {
                log(`${sign} ${b}`);
            });
        };

        if (Array.isArray(bullets)) {
            return logBullets(bullets);
        }
        const { bullets: bulletPoints, title: bulletTitle, sign } = bullets;
        const bulletSign = sign === false ? '' : sign ? '-' : '-';

        // title
        this.logMessage(bulletTitle);

        // bullets
        logBullets(bulletPoints, bulletSign);
    }

    /**
     * Logs a warning to console
     * @param message
     * Message to be logged
     * @param style
     * Optional styling
     */
    static warning(message: LogMessage, style?: LogStyle): void {
        new this(message, {
            title: chalk.bgYellow.bold,
            message: chalk.yellow,
            endWithNewLine: true,
            ...style
        });
    }

    /**
     * Logs a info to console
     * @param message
     * Message to be logged
     * @param style
     * Optional styling
     */
    static info(message: LogMessage, style?: LogStyle): void {
        new this(message, {
            title: chalk.bold,
            ...style
        });
    }

    /**
     * Logs a success to console
     * @param message
     * Message to be logged
     * @param style
     * Optional styling
     */
    static success(message: LogMessage, style?: LogStyle): void {
        new this(message, {
            title: chalk.bgGreen.bold,
            message: chalk.green,
            endWithNewLine: true,
            ...style
        });
    }

    /**
     * Logs an error to console
     * @param message
     * Message to be logged
     * @param style
     * Optional styling
     */
    static error(message: LogMessage, style?: LogStyle): void {
        new this(message, {
            title: chalk.bgRed.bold,
            message: chalk.red,
            endWithNewLine: true,
            ...style
        });
    }
}
