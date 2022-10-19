import type { MigrationFileObj, OperationType } from './types';
/**
 * Reads all files and selects .sql ones in migration dir
 */
export declare const readMigrationsFiles: () => MigrationFileObj[];
export declare const readMigrationFile: (path: string, operationType: OperationType) => string;
export declare const listAppliedMigrations: () => Promise<string[]>;
export declare const runMigrations: (operation?: OperationType) => Promise<void>;
/**
 * Creates new migration file in migration dir
 * @param name
 */
export declare const newMigrationFile: (name: string) => void;
