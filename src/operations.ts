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
    ConfigObj,
    ColumnTypesModel
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
    private listMigrationsFiles(appliedMigrations: string[]) {
        const dirFiles = readdirSync(this.config.migrationDir);

        const migrationFiles: MigrationFileObj[] = [];
        const tsList: Array<number> = [];

        dirFiles.forEach((f) => {
            if (f.endsWith('.sql')) {
                // todo check if filename is correct
                const [ts_, title] = f.split('_');
                const ts = Number.parseInt(ts_);

                // check that migration files have different ts
                if (tsList.includes(ts))
                    throw new Error(
                        'Multiple migration files have the same timestamp!'
                    );
                tsList.push(ts);

                const fullpath = path.join(this.config.migrationDir, f);

                migrationFiles.push({
                    fullpath,
                    name: f,
                    ts,
                    title,
                    applied: appliedMigrations.includes(f),
                    sql: this.readMigrationFile(fullpath)
                });
            }
        });

        return migrationFiles.sort((a, b) => a.ts - b.ts);
    }

    /**
     *
     * @param path path to migration file
     */
    private readMigrationFile(path: string) {
        if (!this.direction)
            throw new Error('Migration direction not specified!');

        const content = readFileSync(path, { encoding: 'utf-8' });

        const m = content.match(
            DEFAULTS.templateDirectionMarkers[this.direction]
        );
        const query = m?.[1].replace(/(?:\r\n|\r|\n)/g, '');
        return (query || '').trim();
    }

    /**
     * Lists filenames in migration table that have been applied.
     */
    private async listAppliedMigrations() {
        const appliedMigrations =
            await this.dbQuery.manyOrNone<MigrationTableModel>(
                queries.dml.list,
                {
                    table: this.config.migrationTable || DEFAULTS.migrationTable
                }
            );

        return appliedMigrations.map((m) => m.filename);
    }

    /**
     * Queries PostgreSQL tables and columns used in your application.
     */
    private async listDataTypes() {
        const columns = await this.dbQuery.manyOrNone<ColumnTypesModel>(
            queries.types.list,
            {
                schemaName:
                    this.config.databaseSchema || DEFAULTS.databaseSchema,
                migrationTable: DEFAULTS.migrationTable
            }
        );
        return columns;
    }

    /**
     * Converts postgres data types to data types for TypeScript
     * @returns types string for TypeScript
     */
    private async parseDataTypes(): Promise<string> {
        const columns = await this.listDataTypes();

        return columns
            .map((col) => {
                const { tableName, columns } = col;
                const colTypes = columns.map((c) => {
                    return `${c.columnName}${
                        c.isNullable === 'YES' ? '?' : ''
                    }: ${
                        DEFAULTS.dataTypeConversion[c.dataType] || 'unknown'
                    };`;
                });

                const type = `export type ${tableName} = { \n${colTypes.join(
                    '\n'
                )} }\n`;
                return type;
            })
            .join('\n');
    }

    /**
     * Creates types.d.ts file with data types from database
     */
    private async createDataTypeFile() {
        const dataTypes = await this.parseDataTypes();
        writeFileSync(this.config.typeFile, dataTypes, {
            encoding: 'utf8'
        });
        return;
    }

    /**
     * Executues migration against database
     * @param direction upwards or down
     * @param steps how many migration files to run
     */
    async run(direction: OperationType = 'up', steps: number | null = null) {
        this.direction = direction;

        // create migration table, if not yet exists
        await this.dbQuery.none(queries.ddl.create, {
            table: this.config.migrationTable || DEFAULTS.migrationTable
        });

        // list all migration that have been applied, from db table
        const appliedMigrationFiles = await this.listAppliedMigrations();

        // get all migration files
        const migrationFiles = this.listMigrationsFiles(appliedMigrationFiles);

        // filter which migration files to apply
        let migrationsToRun = migrationFiles;
        if (this.direction === 'up') {
            // remove all applied ones
            migrationsToRun = migrationsToRun.filter((m) => !m.applied);
            // apply only n steps, only non-empty files should be used
            if (steps) {
                migrationsToRun = migrationsToRun
                    .filter((m) => m.sql !== '')
                    .slice(0, steps);
            }
        }
        if (this.direction === 'down' && steps) {
            // for steps down are only applied migration files relevant and those that contain sql, i.e. are not empty
            migrationsToRun = migrationsToRun
                .filter((m) => m.applied && m.sql !== '')
                .slice(-steps);
        }

        return this.dbQuery
            .tx('run_migrations', async (t) => {
                return Promise.all(
                    migrationsToRun.map(async (m) => {
                        if (m.sql === '') {
                            return {
                                name: m.name,
                                success: false,
                                msg: 'Empty migration file'
                            };
                        }

                        // execute migration
                        await t.none(m.sql);

                        // record migration in _migrations table
                        if (this.direction === 'up') {
                            await t.none(
                                pgp.helpers.insert(
                                    {
                                        filename: m.name,
                                        title: m.title,
                                        createdAt: dayjs(m.ts).toISOString()
                                    },
                                    null,
                                    this.config.migrationTable ||
                                        DEFAULTS.migrationTable
                                )
                            );
                        }
                        if (this.direction === 'down') {
                            await t.none(queries.dml.delete, {
                                filename: m.name,
                                table:
                                    this.config.migrationTable ||
                                    DEFAULTS.migrationTable
                            });
                        }

                        return { name: m.name, success: true };
                    })
                );
            })
            .then(async (r) => {
                const appliedMigrations = r.filter((m) => m.success);
                const notAppliedMigrations = r.filter((m) => !m.success);

                if (appliedMigrationFiles.length > 0 && direction === 'up') {
                    console.log(
                        chalk.blue(
                            `Current migration contains ${appliedMigrationFiles.length} files.\n`
                        )
                    );
                }

                if (appliedMigrations.length === 0) {
                    console.log(
                        chalk.white.bgYellow.bold(
                            `No new migrations files applied [${direction.toUpperCase()}]`
                        )
                    );
                }

                if (appliedMigrations.length > 0) {
                    console.log(
                        chalk.white.bgGreen.bold(
                            `Migration [${direction.toUpperCase()}] successful`
                        )
                    );
                    console.log(
                        `${appliedMigrations
                            .map((m) => `> ${m.name}`)
                            .join('\n')}`
                    );
                }

                if (notAppliedMigrations.length > 0) {
                    console.log(
                        chalk.blue('\nThe following files were skipped:')
                    );
                    notAppliedMigrations.map((m) => {
                        console.log(`> ${m.name} (${m.msg})`);
                    });
                }

                console.log('\n\n');

                await this.createDataTypeFile();
                return;
            })
            .catch((e) => {
                console.log(chalk.white.bgRed.bold('Migration failed'));
                console.log(e);
                return;
            });
    }

    /**
     * Drops all tables in schema.
     */
    async reset() {
        const tables = await this.dbQuery.manyOrNone<{ tablename: string }>(
            queries.ddl.list,
            {
                schemaName:
                    this.config.databaseSchema || DEFAULTS.databaseSchema
            }
        );

        if (tables.length === 0) {
            console.log(chalk.bgWhite.bold('No tables exists'));
            return;
        }

        return this.dbQuery
            .tx('drop_tables', async (t) => {
                return Promise.all(
                    tables.map(async (table) => {
                        t.none(queries.ddl.drop, {
                            tablename: table?.tablename
                        });
                        return table?.tablename;
                    })
                );
            })
            .then(async (r) => {
                console.log(
                    chalk.white.bgGreen.bold('Database Reset successful')
                );
                r.map((table) => {
                    console.log(`> ${table}`);
                });
            });
    }
}

/**
 * Creates new migration file in migration dir
 * @param name
 */
export const newMigrationFile = (name: string, config: ConfigObj) => {
    const template = readFileSync(
        path.join(path.dirname(__dirname), DEFAULTS.templateFile),
        { encoding: 'utf-8' }
    );

    const filename = `${dayjs().valueOf()}_${name.replace(
        /_|\s|\.|\\,/g,
        '-'
    )}.sql`;
    const fullpath = path.join(config.migrationDir, filename);
    writeFileSync(fullpath, template, { encoding: 'utf-8' });

    console.log(chalk.blue(`${filename} created`));
};

/**
 * Reads config json and return config object
 * @param configFilePath path to .json file
 * @returns config object
 */
export const readConfigFile = (configFilePath: string) => {
    try {
        const configFile = readFileSync(configFilePath, { encoding: 'utf8' });
        const config = JSON.parse(configFile) as ConfigObj;

        // edit config object
        // make migrationDir absolut, as it should be provided relative to config path in json
        const absolutPath = path.join(
            path.dirname(configFilePath),
            config.migrationDir || DEFAULTS.migrationDir
        );
        config['migrationDir'] = absolutPath;

        // make typeFile absolut
        const absolutTypeFile = path.join(
            path.dirname(configFilePath),
            config.typeFile || DEFAULTS.typeFile
        );
        config['typeFile'] = absolutTypeFile;

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
