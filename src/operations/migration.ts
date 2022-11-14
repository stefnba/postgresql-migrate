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
    ConfigObject,
    ErrorObject,
    WarningObject
} from '../types';
import { IDatabase } from 'pg-promise';
import pg from 'pg-promise/typescript/pg-subset';
import { Logger } from '../utils';

dotenv.config();

export default class Migration {
    private config: ConfigObject;
    private direction: OperationType;
    private dbQuery: IDatabase<Record<string, unknown>, pg.IClient>;
    private errors: ErrorObject[];
    private warnings: WarningObject[];

    constructor(config: ConfigObject) {
        this.config = config;
        this.direction = 'up';
        this.dbQuery = pgp(this.config.connection);

        this.errors = [];
        this.warnings = [];
    }

    /**
     * Reads all files and returns .sql files from migration dir with additional infos
     */
    private listMigrationsFiles(appliedMigrations: MigrationTableModel[]) {
        const dirFiles = readdirSync(this.config.migrationsDir);

        const migrationFiles: MigrationFileObj[] = [];

        dirFiles.forEach((f) => {
            if (f.endsWith('.sql')) {
                // todo check if filename is correct
                const [ts_, title] = f.split('_');
                const ts = Number.parseInt(ts_);

                const fullpath = path.join(
                    process.cwd(),
                    this.config.migrationsDir,
                    f
                );

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
     * @param path absolute path to migration file
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
     * @param log whether to console.log
     * @returns true or false (indicates if process can continue or should exit)
     */
    private async compareFilesWithDbMigrations(
        migrationFiles: MigrationFileObj[],
        appliedMigrations: MigrationTableModel[],
        log = true
    ) {
        migrationFiles.forEach((f) => {
            // check if migration files have duplicate timestamp, causes error
            const FilesWithSameTs = migrationFiles.filter((r) => r.ts === f.ts);
            if (FilesWithSameTs.length > 1) {
                this.errors.push({
                    name: f.name,
                    hash: f.hash,
                    resource: 'FILE',
                    msg: 'DUPLICATE_TS'
                });
            }

            // check if migration files have same content
            const FilesWithSameHash = migrationFiles.filter(
                (r) => r.hash === f.hash
            );
            if (FilesWithSameHash.length > 1) {
                this.warnings.push({
                    name: f.name,
                    hash: f.hash,
                    resource: 'FILE',
                    msg: 'DUPLICATE_HASH'
                });
            }
        });

        // Migration in db but no file exists
        appliedMigrations.forEach((m) => {
            const fileNames = migrationFiles.map((f) => f.name);
            const fileHashes = migrationFiles.map((f) => f.hash);

            const FileNameFound = fileNames.includes(m.filename);
            const FileHashFound = fileHashes.includes(m.hash);

            // hash from db not found in dir
            if (!FileHashFound) {
                if (FileNameFound) {
                    // but file with same name exists, i.e. file content has changed
                    this.warnings.push({
                        name: m.filename,
                        hash: m.hash,
                        resource: 'FILE',
                        msg: 'CONTENT_CHANGED'
                    });
                } else {
                    // and file with same is missing
                    this.warnings.push({
                        name: m.filename,
                        hash: m.hash,
                        resource: 'FILE',
                        msg: 'MISSING'
                    });
                }
            }
            // hash exists
            else {
                // file with this name not found
                if (!FileNameFound) {
                    this.warnings.push({
                        name: m.filename,
                        hash: m.hash,
                        resource: 'FILE',
                        msg: 'MISSING'
                    });
                }

                const FilesWithSameHash = migrationFiles.filter(
                    (f) => f.hash === m.hash
                );
                // multiple files with same hash
                if (FilesWithSameHash.length > 1) {
                    this.warnings.push({
                        name: m.filename,
                        hash: m.hash,
                        resource: 'FILE',
                        msg: 'DUPLICATE_HASH'
                    });
                }
            }

            // check if multiple db records have same hash
            const DbRecordsWithSamehash = appliedMigrations.filter(
                (r) => r.hash === m.hash
            );
            if (DbRecordsWithSamehash.length > 1) {
                this.warnings.push({
                    name: m.filename,
                    hash: m.hash,
                    resource: 'DB',
                    msg: 'DUPLICATE_HASH'
                });
            }
        });

        if (log) {
            Logger.error(
                'Multiple migration files have the same timestamp. Migration is not possible as this will cause an erorr!',
                this.errors
                    .filter((w) => w.msg === 'DUPLICATE_TS')
                    .map((w) => w.name),
                { onlyWithListElements: true }
            );

            Logger.warning(
                'The following migration steps have been applied but the migration file content seems to have changed:',
                this.warnings
                    .filter((w) => w.msg === 'CONTENT_CHANGED')
                    .map((w) => w.name),
                { onlyWithListElements: true }
            );
            Logger.warning(
                "The following migration steps have been applied but don't exist as a migration file:",
                this.warnings
                    .filter((w) => w.msg === 'MISSING')
                    .map((w) => w.name),
                { onlyWithListElements: true }
            );
            Logger.warning(
                'The following applied migration steps contain the same SQL content:',
                this.warnings
                    .filter(
                        (w) => w.msg === 'DUPLICATE_HASH' && w.resource === 'DB'
                    )
                    .map((w) => w.name),
                { onlyWithListElements: true }
            );
            Logger.warning(
                'The following migration file contain the same sql content:',
                this.warnings
                    .filter(
                        (w) =>
                            w.msg === 'DUPLICATE_HASH' && w.resource === 'FILE'
                    )
                    .map((w) => w.name),
                { onlyWithListElements: true }
            );
        }
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

        if (direction === 'down' && appliedMigrations.length === 0) {
            console.log(
                chalk.white.bgYellow(
                    '[DOWN] not possible. No migrations have been applied.\n'
                )
            );
            return;
        }

        // get all migration files
        const migrationFiles = this.listMigrationsFiles(appliedMigrations);

        // check and display status
        await this.status(appliedMigrations, migrationFiles, false);

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

        if (migrationsToRun.length === 0) {
            Logger.log(
                '',
                {
                    text: `No migrations are pending for [${direction.toUpperCase()}]`,
                    bgColor: 'bgYellow'
                },
                undefined,
                { newLine: true }
            );
            process.exit();
        }

        console.log(
            chalk.bgWhite(`Running Migrations [${direction.toUpperCase()}]\n`)
        );

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

                Logger.success(
                    `Migration completed [${direction.toUpperCase()}]`,
                    appliedM.map((e) => e.name),
                    { onlyWithListElements: true }
                );
                Logger.info(
                    'The following files were skipped:',
                    notAppliedM.map((e) => `${e.name} (${e.msg})`),
                    { onlyWithListElements: true }
                );

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
    async status(
        appliedMigrations: MigrationTableModel[] | null = null,
        migrationFiles: MigrationFileObj[] | null = null,
        showDetails = true
    ) {
        const _appliedMigrations =
            appliedMigrations || (await this.listAppliedMigrations());

        const _migrationFiles =
            migrationFiles || this.listMigrationsFiles(_appliedMigrations);

        if (this.direction === 'up') {
            console.log(chalk.bgWhite('Migration Status:\n'));

            console.log(
                chalk.blue(
                    `Steps already applied: ${_appliedMigrations.length} `
                )
            );

            if (showDetails && _appliedMigrations.length > 0) {
                _appliedMigrations.forEach((m) => {
                    console.log(`- ${m.filename}`);
                });
            }

            const migrationFilesApplied = _migrationFiles.filter(
                (f) => !f.applied
            );
            console.log(
                chalk.blue(`\nFiles pending: ${migrationFilesApplied.length}`)
            );
            if (showDetails && migrationFilesApplied.length > 0) {
                migrationFilesApplied.forEach((f) => {
                    console.log(`- ${f.name}`);
                });
            }
            console.log('\n');
        }

        await this.compareFilesWithDbMigrations(
            _migrationFiles,
            _appliedMigrations,
            this.direction === 'up'
        );

        if (this.errors.length > 0) {
            console.log(chalk.bgRed('Migration aborted'));
            process.exit(1);
        }
    }
}
