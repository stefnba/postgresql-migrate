import { readdirSync, readFileSync, writeFileSync } from 'fs';
import chalk from 'chalk';
import path from 'path';
import dayjs from 'dayjs';

import { queries, pgp } from './db';
import DEFAULTS from './defaults';
import type {
    MigrationFileObj,
    OperationType,
    MigrationTableModel,
    ConfigObj
} from './types';
import { IDatabase } from 'pg-promise';
import pg from 'pg-promise/typescript/pg-subset';

/**
 * Reads all files and selects .sql ones in migration dir
 */
export const readMigrationsFiles = (migrationDir: string) => {
    const dirFiles = readdirSync(migrationDir);

    const migrationFiles: MigrationFileObj[] = [];

    dirFiles.forEach((f) => {
        if (f.endsWith('.sql')) {
            // todo check if filename is correct
            const [ts, title] = f.split('_');

            migrationFiles.push({
                fullpath: path.join(migrationDir, f),
                name: f,
                ts: Number.parseInt(ts),
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
        up: {
            begin: '/* BEGIN_UP */',
            end: '/* END_UP */'
        },
        down: {
            begin: '/* BEGIN_DOWN */',
            end: '/* END_DOWN */'
        }
    };

    return content.substring(
        content.indexOf(operationStrings[operationType]?.begin),
        content.lastIndexOf(operationStrings[operationType]?.end)
    );
};

export const listAppliedMigrations = async (
    // eslint-disable-next-line @typescript-eslint/ban-types
    dbQuery: IDatabase<{}, pg.IClient>
) => {
    const appliedMigrations = await dbQuery.manyOrNone<MigrationTableModel>(
        queries.dml.list,
        {
            table: DEFAULTS.migrationTable
        }
    );

    return appliedMigrations.map((m) => m.filename);
};

export const runMigrations = async (
    operation: OperationType = 'up',
    steps: number | null = null,
    config: ConfigObj
) => {
    // get all migration files
    const migrations = readMigrationsFiles(config.migrationDir);

    const dbQuery = pgp(config.database);

    // create migration table, if not yet exists
    await dbQuery.none(queries.ddl.create, {
        table: DEFAULTS.migrationTable
    });

    // list all migration that have been run, from db table
    const appliedMigrations = await listAppliedMigrations(dbQuery);

    return dbQuery
        .tx('run_migrations', async (t) => {
            return Promise.all(
                migrations.map(async (m) => {
                    // if migration has already been applied, only for up
                    if (
                        appliedMigrations.includes(m.name) &&
                        operation === 'up'
                    )
                        return;

                    const sql = readMigrationFile(m?.fullpath, operation);

                    // execute migration
                    await t.none(sql);

                    // record migration in _migrations table
                    if (operation === 'up') {
                        await t.none(
                            pgp.helpers.insert(
                                {
                                    filename: m.name,
                                    title: m.title,
                                    createdAt: dayjs(m.ts).toISOString(),
                                    runAt: new Date()
                                },
                                null,
                                DEFAULTS.migrationTable
                            )
                        );
                        console.info(`> UP ${m.name} executed`);
                    }
                    if (operation === 'down') {
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
export const newMigrationFile = (name: string, config: ConfigObj) => {
    // todo replace chars in name string
    console.log(DEFAULTS.templateFile);
    console.log(path.join(path.dirname(__dirname), DEFAULTS.templateFile));
    const template = readFileSync(
        path.join(path.dirname(__dirname), DEFAULTS.templateFile),
        { encoding: 'utf-8' }
    );

    const filename = `${dayjs().valueOf()}_${name}.sql`;
    // const filename = `${dayjs().format('YYYYMMDD-HHmmssSSS')}_${name}.sql`;
    const fullpath = path.join(config.migrationDir, filename);
    writeFileSync(fullpath, template, { encoding: 'utf-8' });
};

/**
 * Reads config json and return config object
 * @param path
 * @returns config object
 */
export const readConfigFile = (configFilePath: string) => {
    try {
        const configFile = readFileSync(configFilePath, { encoding: 'utf8' });
        const config = JSON.parse(configFile) as ConfigObj;

        // make migrationDir absolut, as it should be provided relative to config path in json
        const absolutPath = path.join(
            path.dirname(configFilePath),
            config.migrationDir
        );
        config['migrationDir'] = absolutPath;
        return config;
    } catch (e) {
        console.log(e);
        throw new Error('A valid path to a config file must be provided.');
    }
};
