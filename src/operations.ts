import { readdirSync, readFileSync, writeFileSync } from 'fs';
import chalk from 'chalk';
import path from 'path';
import dayjs from 'dayjs';

import { dbQuery, queries, pgp } from './db';
import { DEFAULTS, CONFIG, CONFIG_FILE } from './index';
import type {
    MigrationFileObj,
    OperationType,
    MigrationTableModel
} from './types';

const MIGRRATION_DIR = path.join(path.dirname(CONFIG_FILE), CONFIG.dir);

/**
 * Reads all files and selects .sql ones in migration dir
 */
export const readMigrationsFiles = () => {
    const dirFiles = readdirSync(MIGRRATION_DIR);

    const migrationFiles: MigrationFileObj[] = [];

    dirFiles.forEach((f) => {
        if (f.endsWith('.sql')) {
            // todo check if filename is correct
            const [ts, title] = f.split('_');

            migrationFiles.push({
                fullpath: path.join(MIGRRATION_DIR, f),
                name: f,
                ts,
                title
            });
        }
    });

    // todo sort files by date

    //
    return migrationFiles;
};

export const readMigrationFile = (
    path: string,
    operationType: OperationType
) => {
    const content = readFileSync(path, { encoding: 'utf-8' });

    const operationStrings = {
        UP: {
            begin: '/* BEGIN_UP */',
            end: '/* END_UP */'
        },
        DOWN: {
            begin: '/* BEGIN_DOWN */',
            end: '/* END_DOWN */'
        }
    };

    return content.substring(
        content.indexOf(operationStrings[operationType]?.begin),
        content.lastIndexOf(operationStrings[operationType]?.end)
    );
};

export const listAppliedMigrations = async () => {
    const appliedMigrations = await dbQuery.manyOrNone<MigrationTableModel>(
        queries.dml.list,
        {
            table: DEFAULTS.migrationTable
        }
    );

    return appliedMigrations.map((m) => m.filename);
};

export const runMigrations = async (operation: OperationType = 'UP') => {
    // get all migration files
    const migrations = readMigrationsFiles();

    // create migration table, if not yet exists
    await dbQuery.none(queries.ddl.create, {
        table: DEFAULTS.migrationTable
    });

    // list all migration that have been run, from db table
    const appliedMigrations = await listAppliedMigrations();

    // return;

    return dbQuery
        .tx('run_migrations', async (t) => {
            return Promise.all(
                migrations.map(async (m) => {
                    // if migration has already been applied, only for up
                    if (
                        appliedMigrations.includes(m.name) &&
                        operation === 'UP'
                    )
                        return;

                    const sql = readMigrationFile(m?.fullpath, operation);

                    // execute migration
                    await t.none(sql);

                    // record migration in _migrations table
                    if (operation === 'UP') {
                        await t.none(
                            pgp.helpers.insert(
                                {
                                    filename: m.name,
                                    title: m.title,
                                    createdAt: m.ts,
                                    runAt: new Date()
                                },
                                null,
                                DEFAULTS.migrationTable
                            )
                        );
                        console.info(`> UP ${m.name} executed`);
                    }
                    if (operation === 'DOWN') {
                        await t.none(queries.dml.delete, {
                            filename: m.name,
                            table: DEFAULTS.migrationTable
                        });
                        console.info(`> DOWN ${m.name} executed`);
                    }

                    return;
                })
            );
        })
        .then(() => {
            console.log(chalk.white.bgGreen.bold('Migration successful'));
            return;
        })
        .catch((e) => {
            console.log(chalk.white.bgRed.bold('Migration failed'));
            console.log(e);
            return;
        });
};

/**
 * Creates new migration file in migration dir
 * @param name
 */
export const newMigrationFile = (name: string) => {
    // todo replace chars in name string
    const template = readFileSync(DEFAULTS.templateFile, { encoding: 'utf-8' });

    const filename = `${dayjs().valueOf()}_${name}.sql`;
    // const filename = `${dayjs().format('YYYYMMDD-HHmmssSSS')}_${name}.sql`;
    const fullpath = path.join(MIGRRATION_DIR, filename);
    writeFileSync(fullpath, template, { encoding: 'utf-8' });
};
