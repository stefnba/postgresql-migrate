import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import chalk from 'chalk';
import path from 'path';

import DEFAULTS from '../defaults';

/**
 * Creates dir and copies template config.json to it
 * @param dirPath directory path that holds required files and dirs
 * @param filename name of config file inside dir
 */
const setupRoot = (
    dirPath: string,
    filename: string = DEFAULTS.templates.configFile
) => {
    const { templates, migrationsDir } = DEFAULTS;
    const dirPathAbsolute = path.join(process.cwd(), dirPath);

    // create root folder
    if (!existsSync(dirPathAbsolute)) {
        mkdirSync(dirPathAbsolute, { recursive: true });
    }

    // create config file
    const json = readFileSync(
        path.join(__dirname, '../', templates.dir, templates.configFile),
        {
            encoding: 'utf-8'
        }
    );
    writeFileSync(path.join(dirPathAbsolute, filename), json, {
        encoding: 'utf-8'
    });

    // create dir for migration files
    const migrationsDirAbsolut = path.join(dirPathAbsolute, migrationsDir);
    if (!existsSync(migrationsDirAbsolut)) {
        mkdirSync(migrationsDirAbsolut, { recursive: true });
    }

    console.log(chalk.blue('Setup successful'));
};

export default setupRoot;
