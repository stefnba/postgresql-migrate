import { writeFileSync, readFileSync } from 'fs';
import chalk from 'chalk';

import path from 'path';
import dayjs from 'dayjs';

import DEFAULTS from '../defaults';
import type { ConfigObject } from '../types';

/**
 * Creates new migration file in migration dir
 * @param name
 */
const createMigrationFile = (name: string, config: ConfigObject) => {
    try {
        const template = readFileSync(
            path.join(DEFAULTS.templates.dir, DEFAULTS.templates.migrationSql),
            { encoding: 'utf-8' }
        );

        const filename = `${dayjs().valueOf()}_${name.replace(
            /_|\s|\.|\\,/g,
            '-'
        )}.sql`;
        const fullpath = path.join(config.migrationsDir, filename); // config.migrationsDir is already correct absolute path
        writeFileSync(fullpath, template, { encoding: 'utf-8' });

        const r = `${filename} created`;
        console.log(chalk.blue(r));
        return r;
    } catch (err) {
        return;
    }
};

export default createMigrationFile;
