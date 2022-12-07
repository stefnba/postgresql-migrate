import type { TextWithColor, LoggerHeaderParam, LoggerListParam, LoggerMsgParam, LoggerOptionParam } from './types';
export declare class Logger {
    logWithColor(log: string | TextWithColor): string;
    log_(msg: LoggerMsgParam, header?: LoggerHeaderParam | null, list?: LoggerListParam | null, options?: LoggerOptionParam): void;
    static warning(msg: string, list?: LoggerListParam, options?: LoggerOptionParam): void;
    static success(msg: string, list?: LoggerListParam, options?: LoggerOptionParam): void;
    static error(msg: string, list?: LoggerListParam, options?: LoggerOptionParam): void;
    static info(msg: string, list?: LoggerListParam, options?: LoggerOptionParam): void;
    static log(msg: LoggerMsgParam, header?: LoggerHeaderParam | null, list?: LoggerListParam, options?: LoggerOptionParam): void;
}
