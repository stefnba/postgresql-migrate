import type { OperationType, ConfigObj } from './types';
export declare class Migration {
    private config;
    private direction;
    private dbQuery;
    constructor(config: ConfigObj);
    /**
     * Reads all files and selects .sql ones in migration dir
     */
    private listMigrationsFiles;
    /**
     *
     * @param path path to migration file
     */
    private readMigrationFile;
    /**
     * Lists records in migration table.
     */
    private listAppliedMigrations;
    /**
     * Queries PostgreSQL tables and columns used in your application.
     */
    private listDataTypes;
    /**
     * Converts postgres data types to data types for TypeScript
     * @returns types string for TypeScript
     */
    private parseDataTypes;
    /**
     * Creates types.d.ts file with data types from database
     */
    private createDataTypeFile;
    /**
     * Executues migration against database
     * @param direction upwards or down
     * @param steps how many migration files to run
     */
    run(direction?: OperationType, steps?: number | null): Promise<void>;
    /**
     * Drops all tables in schema.
     */
    reset(): Promise<void>;
}
/**
 * Creates new migration file in migration dir
 * @param name
 */
export declare const newMigrationFile: (name: string, config: ConfigObj) => void;
/**
 * Reads config json and return config object
 * @param configFilePath path to .json file
 * @returns config object
 */
export declare const readConfigFile: (configFilePath: string) => ConfigObj;
