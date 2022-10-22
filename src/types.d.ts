import dataTypeConversion from './defaults';

// const { dataTypeConversion } = dataTypeConversion;

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
};

export type MigrationFileObj = {
    fullpath: string;
    name: string;
    ts: number;
    title: string;
};

export type ActionType = 'up' | 'down' | 'create' | 'redo';
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
        dataType: keyof typeof dataTypeConversion.dataTypeConversion;
        isNullable: 'YES' | 'NO';
    }>;
};
