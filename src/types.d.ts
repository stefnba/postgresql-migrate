export type ConfigObj = {
    migrationDir: string;
    migrationTable: string;
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
    ts: string;
    title: string;
};

export type ActionType = 'up' | 'down' | 'create';
export type OperationType = 'up' | 'down';

export type MigrationTableModel = {
    id: number;
    filename: string;
    title: string;
    createdAt: Date;
    runAt: Date;
};
