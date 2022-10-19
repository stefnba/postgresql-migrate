import type { MigrationFileObj, OperationType, MigrationTableModel } from './types';
/**
 * Reads all files and selects .sql ones in migration dir
 */
export declare const readMigrationsFiles: () => MigrationFileObj[];
export declare const readMigrationFile: (path: string, operationType: OperationType) => string;
export declare const listAppliedMigrations: () => Promise<MigrationTableModel[]>;
export declare const runMigrations: (operation?: OperationType) => Promise<void>;
