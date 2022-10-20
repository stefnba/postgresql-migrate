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
     * @returns
     */
    private readMigrationFile;
    private listAppliedMigrations;
    run(direction?: OperationType, steps?: number | null): Promise<void>;
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
