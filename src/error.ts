import { ConnectionEventFailParams } from 'postgresql-node/lib/types';
import { QueryExecutionError } from 'postgresql-node/lib/error';

export class MigrationError extends Error {
    query?: string;
    filename: string;
    cause: QueryExecutionError;

    constructor(message: string, filename: string, cause: QueryExecutionError) {
        super(message);

        this.message = message;
        this.cause = cause;
        this.filename = filename;
        this.query = cause.query;

        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

export class DatabaseConnectionError extends Error {
    connection: ConnectionEventFailParams['connection'];

    constructor(connection: ConnectionEventFailParams) {
        super(connection.error?.message);

        this.connection = connection.connection;
    }
}
