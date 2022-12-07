import DEFAULTS from './defaults';

/**
 * Config as read from .json file
 */
export type ConfigRawObject = {
    migrationsDir?: string;
    typesFile?: string;
    connection: DatabaseConnection;
    database: { schema?: string; migrationsTable?: string };
};

/**
 * Database connection
 */
export type DatabaseConnection = {
    host: string;
    port: number | undefined;
    user: string;
    password: string;
    database: string;
};

export type ConfigObject = Omit<Required<ConfigRawObject>, 'typesFile'> & {
    typesFile: string | undefined;
    connection: {
        port: number;
    };
    database: { schema: string; migrationsTable: string };
};

/**
 * Read migration file and adds meta info
 */
export type MigrationFileObj = {
    fullpath: string;
    name: string;
    ts: number;
    title: string;
    applied: boolean;
    sql: string;
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
 * Main Migrate function
 */
export interface MigrateParams {
    rootDirPath: string | undefined;
    action: ActionType;
    loggingEnabled: boolean;
    addArgs: (string | number)[];
}
