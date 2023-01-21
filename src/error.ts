export type LogLevel = 'WARNING' | 'ERROR' | 'INFO' | 'SUCCESS';

export class MigrationError extends Error {
    private level: LogLevel;

    constructor(message: string) {
        super(message);

        this.message = message;
        this.level = 'ERROR';

        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

export class MigrationWarning extends Error {
    private level: LogLevel;

    constructor(message: string) {
        super(message);

        this.message = message;
        this.level = 'WARNING';
    }
}
