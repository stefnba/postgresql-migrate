import type { MigrationFileObj, OperationType, MigrationTableModel, ConfigObject } from '../types';
export default class Migration {
    private config;
    private direction;
    private dbQuery;
    private errors;
    private warnings;
    constructor(config: ConfigObject);
    /**
     * Reads all files and returns .sql files from migration dir with additional infos
     */
    private listMigrationsFiles;
    /**
     *
     * @param path absolute path to migration file
     */
    private readMigrationFile;
    /**
     * Lists filenames in migration table that have been applied.
     */
    private listAppliedMigrations;
    /**
     * Provides warnings to user in case migration are applied against db but the
     * content of the migration file has changed (based on hash) or migration file does not exist
     * @param migrationFiles
     * @param appliedMigrations
     * @param log whether to console.log
     * @returns true or false (indicates if process can continue or should exit)
     */
    private compareFilesWithDbMigrations;
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
     * Creates types.d.ts file with data types from database, only when path is provided in config.json
     */
    private createDataTypeFile;
    /**
     * Executues migration against database
     * @param direction upwards or down
     * @param steps how many migration files to run
     */
    run(direction?: OperationType, steps?: number | null): Promise<void>;
    /**
     * Hashes sql query file content for checking if changes were made
     * @param sql query file content
     * @returns
     */
    private hashSql;
    /**
     * Drops all tables in schema.
     */
    reset(): Promise<void>;
    /**
     * Displays status of current migrations
     */
    status(appliedMigrations?: MigrationTableModel[] | null, migrationFiles?: MigrationFileObj[] | null, showDetails?: boolean): Promise<void>;
}
