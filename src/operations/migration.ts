import { readdirSync, readFileSync, writeFileSync } from 'fs';
import chalk from 'chalk';
import crypto from 'crypto';
import path from 'path';
import dayjs from 'dayjs';
import dotenv from 'dotenv';

import { queries, pgp } from '../db';
import DEFAULTS from '../defaults';
import type {
    MigrationFileObj,
    OperationType,
    MigrationTableModel,
    ColumnTypesModel,
    ConfigObject
} from '../types';
import { IDatabase } from 'pg-promise';
import pg from 'pg-promise/typescript/pg-subset';

dotenv.config();

export default class Migration {
    private config: ConfigObject;
    private direction: OperationType;
    private dbQuery: IDatabase<Record<string, unknown>, pg.IClient>;

    constructor(config: ConfigObject) {
        this.config = config;
        this.direction = 'up';
        this.dbQuery = pgp(this.config.connection);
    }

    /**
     * Reads all files and returns .sql files from migration dir with additional infos
     */
    private listMigrationsFiles(appliedMigrations: MigrationTableModel[]) {
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

                const fileContent = this.readMigrationFile(fullpath);
                const hash = this.hashSql(fileContent.content);

                migrationFiles.push({
                    fullpath,
                    name: f,
                    ts,
                    title,
                    applied: appliedMigrations
                        .map((f) => f.filename)
                        .includes(f),
                    sql: fileContent[this.direction],
                    content: fileContent.content,
                    hash
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

        const replacString = (s: string | undefined) => {
            if (!s) return '';
            return s.replace(/(?:\r\n|\r|\n)/g, '').trim();
        };

        const downMatch = content.match(DEFAULTS.templates.markers.down);
        const upMatch = content.match(DEFAULTS.templates.markers.up);

        return {
            down: replacString(downMatch?.[1]) || '',
            up: replacString(upMatch?.[1]) || '',
            content: content
        };
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
        return appliedMigrations;
    }

    /**
     * Provides warnings to user in case migration are applied against db but the
     * content of the migration file has changed (based on hash) or migration file does not exist
     * @param migrationFiles
     * @param appliedMigrations
     * @returns
     */
    private async compareFilesWithDbMigrations(
        migrationFiles: MigrationFileObj[],
        appliedMigrations: MigrationTableModel[]
    ) {
        const warningsFileChange: string[] = [];
        const warningsNoFile: string[] = [];
        const warningsDuplicate: string[] = [];

        const hashes: string[] = [];

        appliedMigrations.forEach((m) => {
            const { hash, filename } = m;

            if (hashes.includes(hash)) {
                warningsDuplicate.push(filename);
            } else {
                hashes.push(hash);
            }

            // same filename exists, but content of file isn't identical => content has
            if (
                !migrationFiles.map((f) => f.hash).includes(hash) &&
                migrationFiles.map((f) => f.name).includes(filename)
            ) {
                warningsFileChange.push(m.filename);
            }

            // same hash exists but file is missing
            if (
                migrationFiles.map((f) => f.hash).includes(hash) &&
                !migrationFiles.map((f) => f.name).includes(filename)
            ) {
                warningsNoFile.push(m.filename);
            }

            // hash and file doesn't exists
            if (
                !migrationFiles.map((f) => f.hash).includes(hash) &&
                !migrationFiles.map((f) => f.name).includes(filename)
            ) {
                warningsNoFile.push(m.filename);
            }
        });

        if (warningsFileChange.length > 0) {
            console.log(
                chalk.blue(
                    `${chalk.bold(
                        '[WARNING]'
                    )} The following files have already been applied but the file content seems to have changed:`
                )
            );
            warningsFileChange.map((f) => {
                console.log(`- ${f}`);
            });
            console.log('\n');
        }
        if (warningsNoFile.length > 0) {
            console.log(
                chalk.blue(
                    `${chalk.bold(
                        '[WARNING]'
                    )} The following migration steps have been applied but don't exist as a migration file:`
                )
            );
            warningsNoFile.map((f) => {
                console.log(`- ${f}`);
            });
            console.log('\n');
        }
        if (warningsDuplicate.length > 0) {
            console.log(
                chalk.blue(
                    `${chalk.bold(
                        '[WARNING]'
                    )} The following migration steps contain the same sql content:`
                )
            );
            warningsDuplicate.map((f) => {
                console.log(`- ${f}`);
            });
            console.log('\n');
        }

        return [];
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

        const appliedMigrations = await this.listAppliedMigrations();

        if (appliedMigrations.length > 0 && direction === 'up') {
            console.log(
                chalk.blue(
                    `${appliedMigrations.length} migration steps are already applied.\n`
                )
            );
        }

        if (direction === 'down' && appliedMigrations.length === 0) {
            console.log(
                chalk.white.bgYellow(
                    '[DOWN] not possible. No migrations have been applied.'
                )
            );
            return;
        }

        // get all migration files
        const migrationFiles = this.listMigrationsFiles(appliedMigrations);

        // check if migrations have been applied for which no file exists
        this.compareFilesWithDbMigrations(migrationFiles, appliedMigrations);

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
                                        content: m.content,
                                        hash: m.hash
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
                const appliedM = r.filter((m) => m.success);
                const notAppliedM = r.filter((m) => !m.success);

                if (appliedM.length === 0) {
                    console.log(
                        chalk.white.bgYellow.bold(
                            `No new migrations files applied [${direction.toUpperCase()}]`
                        )
                    );
                }

                if (appliedM.length > 0) {
                    console.log(
                        chalk.white.bgGreen.bold(
                            `Migration [${direction.toUpperCase()}] successful`
                        )
                    );
                    console.log(
                        `${appliedM.map((m) => `> ${m.name}`).join('\n')}`
                    );
                }

                if (notAppliedM.length > 0) {
                    console.log(
                        chalk.blue('\nThe following files were skipped:')
                    );
                    notAppliedM.map((m) => {
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
     * Hashes sql query file content for checking if changes were made
     * @param sql query file content
     * @returns
     */
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

    /**
     * Displays status of current migrations
     */
    async status(showDetails = true) {
        console.log(chalk.bgWhite('Migration Status:\n'));

        const appliedMigrations = await this.listAppliedMigrations();
        console.log(
            chalk.blue(`Steps already applied: ${appliedMigrations.length} `)
        );

        if (showDetails && appliedMigrations.length > 0) {
            appliedMigrations.forEach((m) => {
                console.log(`- ${m.filename}`);
            });
        }

        const migrationFiles = this.listMigrationsFiles(appliedMigrations);
        const migrationFilesApplied = migrationFiles.filter((f) => !f.applied);
        console.log(
            chalk.blue(`\nFiles pending: ${migrationFilesApplied.length}`)
        );
        if (showDetails && migrationFilesApplied.length > 0) {
            migrationFilesApplied.forEach((f) => {
                console.log(`- ${f.name}`);
            });
        }
        console.log('\n');

        this.compareFilesWithDbMigrations(migrationFiles, appliedMigrations);
    }
}
