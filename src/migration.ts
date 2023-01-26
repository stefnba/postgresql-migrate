import chalk from 'chalk';
import { writeFileSync, readFileSync, readdirSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import dayjs from 'dayjs';
import PostgresClient from 'postgresql-node';
import { DatabaseClientExtended } from 'postgresql-node/lib/types';
import { QueryExecutionError } from 'postgresql-node/lib/error';

import { replaceEnvVar, setFilePath } from './utils';
import { MigrationRecord, MigrationTable } from './db';
import DEFAULTS from './defaults';

import type {
    MigrationQueue,
    MigrationParams,
    MigrationStatus,
    ConfigObject,
    CliArgs,
    ConfigFile,
    ActionType,
    AdditionalArgs,
    MigrationTableModel,
    MigrationFile,
    OperationType,
    MigrationFiles,
    MigrationOptions
} from './types';
import { DatabaseConnectionError, MigrationError } from './error';

import Logger from './logger';

/**
 * Main Migration Class that handles various migration jobs
 */
export default class PostgresMigration {
    db!: DatabaseClientExtended<{
        migrationRecord: typeof MigrationRecord;
        migrationTable: typeof MigrationTable;
    }>;
    config: ConfigObject;
    private _status: MigrationStatus;
    private action: ActionType;
    private appliedMigrations!: MigrationTableModel[];
    private options?: MigrationOptions;

    constructor(params: MigrationParams, options?: MigrationOptions) {
        this.config = this.configure(params.cliArgs);
        this.action = params.action;
        this.options = options;

        this._status = {
            action: params.action,
            status: 'PENDING'
        };
    }

    /**
     * Establishes and tests connection to database and provides queries
     */
    async dbInit() {
        const client = new PostgresClient(this.config.database.connection, {
            connect: {
                log: false,
                testOnInit: true,
                onFailed(connection) {
                    Logger.error({
                        title: 'DB Connection Error',
                        data: connection.connection,
                        message: `${connection.error?.message} (${connection.error?.type})`
                    });

                    throw new DatabaseConnectionError(connection);
                }
            }
        });
        const db = client.addRepositories({
            migrationRecord: MigrationRecord,
            migrationTable: MigrationTable
        });

        this.db = db;
    }

    /**
     * Reads config json and returns config object
     * @returns config object
     */
    private configure(params: CliArgs): ConfigObject {
        let configFilePath: string | undefined = undefined;
        let configFile: ConfigFile | undefined;

        // config file path provided
        if (params.configPath) {
            try {
                configFilePath = path.join(process.cwd(), params.configPath);
                configFile = JSON.parse(
                    readFileSync(configFilePath, {
                        encoding: 'utf-8'
                    })
                );
            } catch (e) {
                console.log(chalk.red('Config file read error!'));
                console.log(e);
                throw Error('s');
            }
        }

        const password = replaceEnvVar(
            params.password || configFile?.connection?.password
        );
        const user = replaceEnvVar(params.user || configFile?.connection.user);
        const host =
            replaceEnvVar(params.host || configFile?.connection?.host) ||
            'localhost';
        const port =
            replaceEnvVar(params.port || configFile?.connection?.port) || 5432;
        const database =
            replaceEnvVar(
                params.database || configFile?.connection?.database
            ) || 'postgres';

        if (!password) throw Error('Password missing');
        if (!user) throw Error('User missing');
        if (!database) throw Error('User missing');

        return {
            database: {
                connection: {
                    host,
                    port,
                    database,
                    user,
                    password
                },
                table:
                    params.table ||
                    configFile?.migrationTable ||
                    DEFAULTS.database.migrationsTable,
                schema: params.schema || DEFAULTS.database.schema
            },
            migrationDir: setFilePath(
                params.migrationsDir ||
                    configFile?.migrationDir ||
                    DEFAULTS.migrationDir,
                configFilePath ? path.dirname(configFilePath) : undefined
            ),
            typesFile: setFilePath(
                params.typesPath || configFile?.typesFile,
                configFilePath ? path.dirname(configFilePath) : undefined
            )
        };
    }

    /**
     * Defines which action will be run
     * @param args Additional cli arguments
     */
    async run(args?: AdditionalArgs) {
        try {
            await this.dbInit();

            if (this.action === 'status') {
                return this.migrationStatus();
            }
            if (this.action === 'create') {
                this.createMigrationFile(args);
            }
            if (
                this.action === 'up' ||
                this.action === 'down'
                // this.action === 'redo'
            ) {
                // this.migrationSteps(args);
                await this.startMigration(this.action);
            }
        } catch (err) {
            if (!this.options?.suppressErrors) {
                throw err;
            } else {
                return;
            }
        }
    }

    private async migrationStatus() {
        Logger.info({ title: 'Migration Status:' }, { endWithNewLine: true });

        const appliedMigrations = await this.listAppliedMigrations();
        const pendingMigrationFiles = (await this.listMigrationsFiles()).filter(
            (f) => !f.applied
        );

        if (appliedMigrations.length > 0) {
            Logger.info(
                {
                    message: `Applied migrations (${appliedMigrations.length}):`,
                    bullets: appliedMigrations.map((f) => f.filename)
                },
                { endWithNewLine: true, message: chalk.blue }
            );
        }

        if (pendingMigrationFiles.length > 0) {
            Logger.info(
                {
                    message: `Pending migrations (${pendingMigrationFiles.length}):`,
                    bullets: pendingMigrationFiles.map((f) => f.filename)
                },
                { endWithNewLine: true, message: chalk.blue }
            );
        }

        this._status.status = 'STATUS_DISPLAYED';
    }

    /**
     * Return status of migration process
     */
    status(): MigrationStatus {
        const status = this._status;
        return status;
    }

    /**
     * Kicks off migration process, fowards down and up migration to respective methods
     */
    private async startMigration(direction: OperationType, steps?: number) {
        Logger.info(`Initiating [${direction.toUpperCase()}] migration...`, {
            endWithNewLine: true
        });

        // create migration table
        await this.db.repos.migrationTable.create(this.config.database.table);

        const migrationFiles = await this.listMigrationsFiles();

        if (direction === 'down') {
            await this.downMigration(migrationFiles, steps);
        }
        if (direction === 'up') {
            await this.upMigration(migrationFiles, steps);
        }
        if (direction === 'redo') {
            await this.downMigration(migrationFiles, steps);
            await this.upMigration(migrationFiles, steps);
        }
    }

    /**
     * Manages up migration process
     * @returns
     */
    private async upMigration(migrationFiles: MigrationFiles, steps?: number) {
        let migrationQueue: MigrationQueue = [];

        // exclude already applied files as well as push sql and filename to queue
        migrationQueue = migrationFiles
            .filter((f) => !f.applied)
            .map((f) => ({
                name: f.filename,
                sql: f['up']
            }));

        // filter steps
        if (steps) {
            migrationQueue = migrationQueue.slice(steps);
        }

        return this.applyMigrationQueue(migrationQueue).then(
            async (migrations) => {
                if (migrations.length > 0) {
                    // consolidate which migration files have been successfully applied
                    const appliedFiles = migrationFiles.filter((f) =>
                        migrations.includes(f.filename)
                    );

                    // register applied migrations in _migrations db table for tracking
                    await this.db.repos.migrationRecord.add(
                        this.config.database.table,
                        appliedFiles
                    );

                    // update status
                    this._status.status = 'UP_MIGRATIONS_COMPLETED';
                    this._status.info = {
                        ...this._status.info,
                        applied: migrations
                    };

                    // logging
                    Logger.success({
                        title: '[UP] Migration successful'
                    });
                }
            }
        );
    }

    /**
     * Manages down migration process
     * @returns
     */
    private async downMigration(
        migrationFiles: MigrationFile[],
        steps?: number
    ) {
        let migrationQueue: MigrationQueue = [];

        if ((await this.listAppliedMigrations()).length === 0) {
            Logger.warning({
                title: '[DOWN] migration not possible',
                message: 'No migrations have been applied'
            });
            return;
        }

        // filter steps
        if (steps) {
            migrationQueue = migrationQueue.slice(steps);
        }

        migrationQueue = migrationFiles
            .filter((f) => f.applied)
            .map((f) => ({
                name: f.filename,
                sql: f['down']
            }));

        return this.applyMigrationQueue(migrationQueue).then(
            async (migrations) => {
                if (migrations.length > 0) {
                    // consolidate which migration files have been successfully applied
                    const appliedFiles = migrationFiles.filter((f) =>
                        migrations.includes(f.filename)
                    );

                    // remove records from in _migrations table
                    await this.db.repos.migrationRecord.remove(
                        this.config.database.table,
                        appliedFiles.map((f) => f.filename)
                    );

                    // status
                    this._status.status = 'DOWN_MIGRATIONS_COMPLETED';
                    this._status.info = {
                        ...this._status.info,
                        applied: migrations
                    };

                    // logging
                    Logger.success({
                        title: '[DOWN] Migration successful'
                    });
                }
            }
        );
    }

    /**
     * Applies up or down migrations against selected database
     * @param migrations
     * @returns
     */
    private async applyMigrationQueue(migrationQueue: MigrationQueue) {
        // empty migration commands
        const emptyCommands = migrationQueue.filter((m) => m.sql.length === 0);
        if (emptyCommands) {
            this._status.info = {
                ...this._status.info,
                skipped: emptyCommands.map((c) => c.name)
            };
        }

        // exclude empty files
        const realQueue = migrationQueue.filter((m) => m.sql.length > 0);

        // no migrations applied
        if (realQueue.length === 0) {
            Logger.warning({ title: 'No migrations are pending' });
            this._status.status = 'NO_MIGRATIONS_APPLIED';
        }

        // apply queue in db transaction
        return this.db.query
            .transaction(async (t) => {
                return Promise.all(
                    realQueue.map(async (m) => {
                        try {
                            await t.run(m.sql).none();
                            return m.name;
                        } catch (err) {
                            // console.log(m);
                            // throw err;
                            return Promise.reject({
                                err,
                                filename: m.name
                            });
                        }
                    })
                );
            })
            .catch((err: { err: QueryExecutionError; filename: string }) => {
                const { err: error, filename } = err;

                const message = `File "${filename}" could not be applied due to "${error.message}"`;

                // status
                this._status.status = 'FAILED';
                this._status.error = { message, code: 'MIGRATION_ERROR' };

                // log
                Logger.error({
                    title: 'Migration Error',
                    message,
                    info: `Query: ${error.query}`
                });

                throw new MigrationError(message, filename, error);
            });
    }

    /**
     * Define how many migrations steps should be executed
     * @param args Additional cli arguments
     * @returns
     */
    private migrationSteps(args?: AdditionalArgs) {
        if (!args || args.length || !Number.isInteger(args[0])) {
            throw new Error('Steps must be an Integer');
        }
        return Number(args[0]);
    }

    /**
     * Reads all files in migration directory and returns .sql files
     */
    private async listMigrationsFiles(): Promise<MigrationFile[]> {
        const dirFiles = readdirSync(this.config.migrationDir);
        const appliedMigrations = await this.listAppliedMigrations();

        return dirFiles
            .filter((f) => f.endsWith('.sql'))
            .map((f) => {
                const [ts, title] = f.split('_');

                const fullpath = path.join(this.config.migrationDir, f);

                const fileContent = this.readMigrationFile(fullpath);
                const hash = this.hashSql(fileContent.content);

                return {
                    fullpath,
                    filename: f,
                    ts: Number.parseInt(ts),
                    title,
                    applied: appliedMigrations
                        .map((f) => f.filename)
                        .includes(f),
                    content: fileContent.content,
                    up: fileContent.up,
                    down: fileContent.down,
                    hash
                };
            })
            .sort((a, b) => a.ts - b.ts);
    }

    /**
     * Queries migration table in db to get all applied migrations
     * Database only hit if this.appliedMigrations is empty
     * @returns array with list of applied migrations
     */
    private async listAppliedMigrations() {
        if (!this.appliedMigrations || this.appliedMigrations.length === 0) {
            this.appliedMigrations = await this.db.repos.migrationRecord.list(
                this.config.database.table
            );
        }
        // return this.appliedMigrations;
        return this.appliedMigrations;
    }

    /**
     * Reads content of one migration file
     * @param path absolute path to migration file
     * @returns object with up and down scripts for migration
     */
    private readMigrationFile(path: string) {
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
     * Creates new migration file in migration dir.
     * @param params
     * Should include string for name of migration file
     */
    private createMigrationFile(params?: AdditionalArgs): void {
        if (!params || params.length === 0 || typeof params[0] !== 'string') {
            throw new Error(
                'A name must be provided to create a migration file'
            );
        }

        const name = params[0];

        try {
            const template = readFileSync(
                path.join(
                    DEFAULTS.templates.dir,
                    DEFAULTS.templates.migrationSql
                ),
                { encoding: 'utf-8' }
            );

            const filename = `${dayjs().valueOf()}_${name.replace(
                /_|\s|\.|\\,/g,
                '-'
            )}.sql`;
            const fullpath = path.join(this.config.migrationDir, filename); // config.migrationsDir is already correct absolute path
            writeFileSync(fullpath, template, { encoding: 'utf-8' });

            this._status.status = 'FILE_CREATED';
            this._status.info = {
                name: filename,
                path: fullpath
            };
        } catch (err) {
            if (err instanceof Error) throw new Error(err.message);
        }
    }

    /**
     * Hashes sql query file content for checking if changes were made
     * @param sql query file content
     * @returns hashed content
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
}
