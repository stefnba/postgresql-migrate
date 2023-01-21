import DEFAULTS from './defaults';

/**
 * Database connection
 */
export type DatabaseConnection = {
    host: string | undefined;
    port: number | undefined;
    user: string;
    password: string;
    database: string;
};

export type ConfigObject = {
    typesFile: string | undefined;
    migrationDir: string;
    database: { schema: string; table: string; connection: DatabaseConnection };
};

/**
 * Config as read from .json file
 */
export type ConfigFile = {
    migrationDir?: string;
    typesFile?: string;
    connection: DatabaseConnection;
    migrationTable?: string;
    migrationSchema?: string;
};

/**
 * Read migration file and adds meta info
 */
export type MigrationFile = {
    fullpath: string;
    filename: string;
    ts: number;
    title: string;
    applied: boolean;
    down: string;
    up: string;
    content: string;
    hash: string;
};

export type ActionType = typeof DEFAULTS.commands[number];
export type OperationType = 'up' | 'down';

export type MigrationTableModel = {
    id: number;
    filename: string;
    title: string;
    createdAt: Date;
    runAt: Date;
    content: string;
    hash: string;
};

export type MigrationRecordData = Omit<MigrationTableModel, 'id' | 'runAt'>;

export type TablesModel = {
    tablename: string;
};

export type ColumnTypesModel = {
    tableName: string;
    columns: Array<{
        columnName: string;
        dataType: keyof typeof DEFAULTS.dataTypeConversion;
        isNullable: 'YES' | 'NO';
    }>;
};

export type WarningObject = {
    name: string;
    hash: string;
    resource: 'DB' | 'FILE';
    msg: 'CONTENT_CHANGED' | 'MISSING' | 'DUPLICATE_HASH';
};

export type ErrorObject = {
    name: string;
    hash: string;
    resource: 'DB' | 'FILE';
    msg: 'DUPLICATE_TS';
};

export type TextWithColor = {
    text: string;
    color?: 'blue' | 'yellow' | 'red' | 'white' | 'green';
    bgColor?: 'bgRed' | 'bgGreen' | 'bgYellow';
};
export type LoggerHeaderParam = string | TextWithColor;
export type LoggerMsgParam = string | TextWithColor;
export type LoggerListParam = string[];
export type LoggerTypeParam = 'WARNING' | 'ERROR';
export type LoggerOptionParam = {
    onlyWithListElements?: boolean;
    type?: LoggerTypeParam;
    newLine?: boolean;
};

/**
 * Main Migration
 */
export interface MigrationParams {
    action: ActionType;
    cliArgs: CliArgs;
}
export type AdditionalArgs = (string | number)[];
export type MigrationStatus = {
    action: ActionType;
    status: undefined | RunStatus;
    info?: Record<string, unknown>;
};

export type RunStatus =
    | 'PENDING'
    | 'FILE_CREATED'
    | 'UP_MIGRATIONS_COMPLETED'
    | 'DOWN_MIGRATIONS_COMPLETED'
    | 'MIGRATIONS_RESET_COMPLETED'
    | 'MIGRATIONS_REDO_COMPLETED';

export type CliArgs = {
    configPath?: string;
    migrationsDir?: string;
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    schema?: string;
    logging?: boolean;
    typesPath?: string;
    table?: string;
};
