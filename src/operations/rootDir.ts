import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import chalk from 'chalk';

import path from 'path';

import dotenv from 'dotenv';

import DEFAULTS from '../defaults';
import type {
    MigrationFileObj,
    OperationType,
    MigrationTableModel,
    ColumnTypesModel,
    ConfigObject,
    ConfigRawObject
} from '../types';

dotenv.config();

/**
 * Creates dir and copies template config.json to it
 * @param dirPath directory path that holds required files and dirs
 * @param filename name of config file inside dir
 */
const setupRoot = (
    dirPath: string,
    filename: string = DEFAULTS.templates.configFile
) => {
    // root folder
    if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
    }

    const {
        templates: { dir, configFile },
        migrationsDir
    } = DEFAULTS;

    // config file
    const json = readFileSync(path.join(dir, configFile), {
        encoding: 'utf-8'
    });
    writeFileSync(path.join(dirPath, filename), json, { encoding: 'utf-8' });

    // migration dir
    const migrationDirAbsolut = path.join(dirPath, migrationsDir);
    if (!existsSync(migrationDirAbsolut)) {
        mkdirSync(migrationDirAbsolut, { recursive: true });
    }

    console.log(chalk.blue('Migration setup successful'));
};

export default setupRoot;
