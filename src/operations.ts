import {
    readdirSync,
    readFileSync,
    writeFileSync,
    existsSync,
    mkdirSync
} from 'fs';
import chalk from 'chalk';
import crypto from 'crypto';
import path from 'path';
import dayjs from 'dayjs';
import dotenv from 'dotenv';

import { queries, pgp } from './db';
import DEFAULTS from './defaults';
import type {
    MigrationFileObj,
    OperationType,
    MigrationTableModel,
    ColumnTypesModel,
    ConfigObject,
    ConfigRawObject
} from './types';
import { IDatabase } from 'pg-promise';
import pg from 'pg-promise/typescript/pg-subset';

dotenv.config();

export class Migration {
    private config: ConfigObject;
    private direction: OperationType;
    private dbQuery: IDatabase<Record<string, unknown>, pg.IClient>;

    constructor(config: ConfigObject) {
        this.config = config;
        this.direction = 'up';
        this.dbQuery = pgp(this.config.connection);
    }

    /**
     * Reads all files and selects .sql ones in migration dir
     */
    private listMigrationsFiles(appliedMigrations: string[]) {
        const dirFiles = readdirSync(this.config.migrationsDir);

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

                const fullpath = path.join(this.config.migrationsDir, f);

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

        const m = content.match(DEFAULTS.templates.markers[this.direction]);
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
                    table: this.config.database.migrationsTable
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
                schemaName: this.config.database.schema,
                migrationsTable: this.config.database.migrationsTable
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
     * Creates types.d.ts file with data types from database, only when path is provided in config.json
     */
    private async createDataTypeFile() {
        const { typesFile } = this.config;
        if (!typesFile) return;
        const dataTypes = await this.parseDataTypes();
        writeFileSync(typesFile, dataTypes, {
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
            table: this.config.database.migrationsTable
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
                                        createdAt: dayjs(m.ts).toISOString(),
                                        sql: m.sql,
                                        hash: this.hashSql(m.sql)
                                    },
                                    null,
                                    this.config.database.migrationsTable
                                )
                            );
                        }
                        if (this.direction === 'down') {
                            await t.none(queries.dml.delete, {
                                filename: m.name,
                                table: this.config.database.migrationsTable
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

    private hashSql(sql: string) {
        return (
            'sha256-' +
            crypto
                .createHash('sha256')
                .update(sql.replace(/\s{2,}|\n/g, ' '))
                .digest('base64')
        );
    }

    /**
     * Drops all tables in schema.
     */
    async reset() {
        const tables = await this.dbQuery.manyOrNone<{ tablename: string }>(
            queries.ddl.list,
            {
                schemaName: this.config.database.schema
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
export const newMigrationFile = (name: string, config: ConfigObject) => {
    const template = readFileSync(
        path.join(
            path.dirname(__dirname),
            DEFAULTS.templates.dir,
            DEFAULTS.templates.migrationSql
        ),
        { encoding: 'utf-8' }
    );

    const filename = `${dayjs().valueOf()}_${name.replace(
        /_|\s|\.|\\,/g,
        '-'
    )}.sql`;
    const fullpath = path.join(config.migrationsDir, filename);
    writeFileSync(fullpath, template, { encoding: 'utf-8' });

    console.log(chalk.blue(`${filename} created`));
};

/**
 * Reads config json and return config object
 * @param configFilePath path to .json file
 * @returns config object
 */
export const readConfigFile = (
    configFilePath: string,
    rootDirPath = './'
): ConfigObject => {
    try {
        const configFile = readFileSync(configFilePath, { encoding: 'utf8' });
        const configRaw = JSON.parse(configFile) as ConfigRawObject;

        // todo validate json
        if (!configRaw?.connection) {
            console.log(chalk.red('Config.json has wrong schema!'));
            process.exit(1);
        }

        // integrate env variables for nested database
        const connectionWithEnvVars = Object.entries(
            configRaw.connection
        ).reduce((prev, curr) => {
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
        }, {}) as ConfigObject['connection'];

        const config: ConfigObject = {
            connection: connectionWithEnvVars,
            typesFile: configRaw?.typesFile,
            database: {
                migrationsTable:
                    configRaw?.database?.migrationsTable ||
                    DEFAULTS.database.migrationsTable,
                schema: configRaw?.database?.schema || DEFAULTS.database.schema
            },
            migrationsDir:
                configRaw?.migrationsDir ||
                path.join(rootDirPath, DEFAULTS.migrationsDir)
        };
        console.log(config);
        return config;
    } catch (e) {
        console.log(chalk.red('Config file read error!'));
        console.log(e);
        process.exit(1);
    }
};

/**
 * Creates dir and copies template config.json to it
 * @param dirPath directory path that holds required files and dirs
 * @param filename name of config file inside dir
 */
export const setupRoot = (
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
