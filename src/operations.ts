import { readdirSync, readFileSync, writeFileSync } from 'fs';
import chalk from 'chalk';
import path from 'path';
import dayjs from 'dayjs';
import dotenv from 'dotenv';

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

dotenv.config();

export class Migration {
    private config: ConfigObj;
    private direction: OperationType;
    private dbQuery: IDatabase<Record<string, unknown>, pg.IClient>;

    constructor(config: ConfigObj) {
        this.config = config;
        this.direction = 'up';
        this.dbQuery = pgp(this.config.database);
    }

    /**
     * Reads all files and selects .sql ones in migration dir
     */
    private listMigrationsFiles() {
        const dirFiles = readdirSync(this.config.migrationDir);

        const migrationFiles: MigrationFileObj[] = [];

        dirFiles.forEach((f) => {
            if (f.endsWith('.sql')) {
                // todo check if filename is correct
                const [ts, title] = f.split('_');

                migrationFiles.push({
                    fullpath: path.join(this.config.migrationDir, f),
                    name: f,
                    ts: Number.parseInt(ts),
                    title
                });
            }
        });

        // todo sort files by date

        //
        return migrationFiles;
    }

    /**
     *
     * @param path path to migration file
     * @returns
     */
    private readMigrationFile(path: string) {
        if (!this.direction)
            throw new Error('Migration direction not specified!');

        const content = readFileSync(path, { encoding: 'utf-8' });

        const m = content.match(
            DEFAULTS.templateDirectionMarkers[this.direction]
        );
        const query = m?.[1].replace(/(?:\r\n|\r|\n)/g, '');
        return query;
    }

    private async listAppliedMigrations() {
        const appliedMigrations =
            await this.dbQuery.manyOrNone<MigrationTableModel>(
                queries.dml.list,
                {
                    table: DEFAULTS.migrationTable
                }
            );

        return appliedMigrations.map((m) => m.filename);
    }

    async run(direction: OperationType = 'up', steps: number | null = null) {
        this.direction = direction;

        // get all migration files
        const migrations = this.listMigrationsFiles();

        // create migration table, if not yet exists
        await this.dbQuery.none(queries.ddl.create, {
            table: DEFAULTS.migrationTable
        });

        // list all migration that have been run, from db table
        const appliedMigrations = await this.listAppliedMigrations();

        return this.dbQuery
            .tx('run_migrations', async (t) => {
                return Promise.all(
                    migrations.map(async (m) => {
                        // if migration has already been applied, only for up
                        if (
                            appliedMigrations.includes(m.name) &&
                            this.direction === 'up'
                        )
                            return;

                        const sql = this.readMigrationFile(m?.fullpath);
                        if (!sql || sql.trim() == '') return;

                        // execute migration
                        await t.none(sql);

                        // record migration in _migrations table
                        if (this.direction === 'up') {
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
                        if (this.direction === 'down') {
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
    }
}

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
 * @param configFilePath path to .json file
 * @returns config object
 */
export const readConfigFile = (configFilePath: string) => {
    console.log('test', process.env.TEST);

    try {
        const configFile = readFileSync(configFilePath, { encoding: 'utf8' });
        const config = JSON.parse(configFile) as ConfigObj;

        // edit config object
        // make migrationDir absolut, as it should be provided relative to config path in json
        const absolutPath = path.join(
            path.dirname(configFilePath),
            config.migrationDir
        );
        config['migrationDir'] = absolutPath;

        // integrate env variables for nested database
        const database = config.database;
        config['database'] = Object.entries(database).reduce((prev, curr) => {
            const [key, value] = curr;

            let v = value;

            if (typeof value === 'string' && value.startsWith('env:')) {
                const variable = value.replace('env:', '');
                v = process.env[variable] as string | number;
            }

            return {
                ...prev,
                [key]: v
            };
        }, {}) as ConfigObj['database'];

        return config;
    } catch (e) {
        console.log(e);
        throw new Error('A valid path to a config file must be provided.');
    }
};
