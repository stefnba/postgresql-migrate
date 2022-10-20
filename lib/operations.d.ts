import type { MigrationFileObj, OperationType, ConfigObj } from './types';
import { IDatabase } from 'pg-promise';
import pg from 'pg-promise/typescript/pg-subset';
/**
 * Reads all files and selects .sql ones in migration dir
 */
export declare const readMigrationsFiles: (migrationDir: string) => MigrationFileObj[];
export declare const readMigrationFile: (path: string, operationType: OperationType) => string;
export declare const listAppliedMigrations: (dbQuery: IDatabase<{}, pg.IClient>) => Promise<string[]>;
export declare const runMigrations: (operation: OperationType | undefined, steps: number | null | undefined, config: ConfigObj) => Promise<void>;
/**
 * Creates new migration file in migration dir
 * @param name
 */
export declare const newMigrationFile: (name: string, config: ConfigObj) => void;
/**
 * Reads config json and return config object
 * @param path
 * @returns config object
 */
export declare const readConfigFile: (configFilePath: string) => ConfigObj;
