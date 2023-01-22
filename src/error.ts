import { ConnectionEventFailParams } from 'postgresql-node/lib/types';

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

export class DatabaseConnectionError extends Error {
    connection: ConnectionEventFailParams['connection'];

    constructor(connection: ConnectionEventFailParams) {
        super(connection.error?.message);

        this.connection = connection.connection;
    }
}
