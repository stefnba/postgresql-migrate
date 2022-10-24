import DEFAULTS from './defaults';

/**
 * Config as read from .json file
 */
export type ConfigRawObject = {
    migrationsDir?: string;
    typesFile?: string;
    connection: {
        host: string;
        port: number | string;
        user: string;
        password: string;
        database: string;
    };
    database: { schema?: string; migrationsTable?: string };
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
};

export type ActionType = typeof DEFAULTS.commands[number];
export type OperationType = 'up' | 'down';

export type MigrationTableModel = {
    id: number;
    filename: string;
    title: string;
    createdAt: Date;
    runAt: Date;
    sql: string;
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
