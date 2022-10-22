import DEFAULTS from './defaults';

// const commands = DEFAULTS.commands as const

export type ConfigObj = {
    migrationDir: string;
    migrationTable: string;
    typeFile: string;
    database: {
        host: string;
        port: number;
        user: string;
        password: string;
        database: string;
    };
    databaseSchema: string;
};

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
};

export type ColumnTypesModel = {
    tableName: string;
    columns: Array<{
        columnName: string;
        dataType: keyof typeof DEFAULTS.dataTypeConversion;
        isNullable: 'YES' | 'NO';
    }>;
};
