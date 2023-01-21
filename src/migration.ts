import chalk from 'chalk';
import { writeFileSync, readFileSync, readdirSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import dayjs from 'dayjs';
import PostgresClient from 'postgresql-node';

import { replaceEnvVar, setFilePath } from './utils';
import { MigrationRecord, MigrationTable } from './db';
import DEFAULTS from './defaults';

import type {
    MigrationParams,
    MigrationStatus,
    ConfigObject,
    CliArgs,
    ConfigFile,
    ActionType,
    AdditionalArgs,
    MigrationTableModel,
    MigrationFile,
    OperationType
} from './types';
import { MigrationError, MigrationWarning } from './error';

export default class PostgresMigration {
    db!: PostgresClient;

    config: ConfigObject;
    private _status: MigrationStatus;
    private action: ActionType;
    private appliedMigrations!: MigrationTableModel[];

    constructor(params: MigrationParams) {
        this.config = this.configure(params.cliArgs);
        this.action = params.action;

        this._status = {
            action: params.action,
            status: 'PENDING'
        };
    }

    /**
     * Establishes and tests connection to database and provides queries
     * @param client PostgresClient
     */
    async dbInit(client?: PostgresClient) {
        if (client) {
            this.db = client;
        } else {
            const client = new PostgresClient(this.config.database.connection, {
                connect: {
                    testOnInit: true
                }
            });
            const db = client.addRepositories({
                migrationRecord: MigrationRecord,
                migrationTable: MigrationTable
            });

            this.db = db;
        }
    }

    /**
     * Reads config json and return config object
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
     *
     * @param args Additional cli arguments
     */
    async run(args?: AdditionalArgs) {
        await this.dbInit();

        if (this.action === 'status') {
            console.log('status');
        }
        if (this.action === 'create') {
            this.createMigrationFile(args);
        }
        if (this.action === 'up') {
            // this.migrationSteps(args);
            await this.applyMigrations('up');
        }
        if (this.action === 'down') {
            // this.migrationSteps(args);
            await this.applyMigrations('down');
        }
    }

    /**
     * Return status of migration process
     */
    status(): MigrationStatus {
        const status = this._status;
        return status;
    }

    /**
     * Applies up or down migrations against selected database
     * @param steps
     * @returns
     */
    private async applyMigrations(direction: OperationType, steps?: number) {
        // todo create migration table, if not yet exists

        const migrationsApplied = await this.listAppliedMigrations();
        const migrationFiles = await this.listMigrationsFiles();
        let migrationsToApply: MigrationFile[] = [];

        if (direction === 'down') {
            if (migrationsApplied.length === 0)
                throw new MigrationError(
                    '[DOWN] migration not possible. No migrations have been applied'
                );
            migrationsToApply = migrationFiles.filter((f) => f.applied);
        }

        if (direction === 'up') {
            migrationsToApply = migrationFiles.filter((f) => !f.applied);
        }

        // filter steps
        if (steps) {
            migrationsToApply = migrationsToApply.slice(steps);
        }

        if (migrationsToApply.length === 0) {
            throw new MigrationWarning(
                `No migrations are pending for [${direction.toUpperCase()}]`
            );
        }

        await this.db.query.transaction(async (t) => {
            await t.run('CREATE TABLE IF NOT EXISTS asdasd(id int)').none();
        });

        // console.log(migrationsToApply);

        return 1;
    }

    /**
     * Get and returns how many migrations steps should be executed
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
    private async listMigrationsFiles() {
        const dirFiles = readdirSync(this.config.migrationDir);
        const appliedMigrations = await this.listAppliedMigrations();

        const migrationFiles: MigrationFile[] = [];

        dirFiles.forEach((f) => {
            if (f.endsWith('.sql')) {
                const [ts_, title] = f.split('_');
                const ts = Number.parseInt(ts_);

                const fullpath = path.join(this.config.migrationDir, f);

                const fileContent = this.readMigrationFile(fullpath);
                const hash = this.hashSql(fileContent.content);

                migrationFiles.push({
                    fullpath,
                    filename: f,
                    ts,
                    title,
                    applied: appliedMigrations
                        .map((f) => f.filename)
                        .includes(f),
                    content: fileContent.content,
                    up: fileContent.up,
                    down: fileContent.down,
                    hash
                });
            }
        });

        return migrationFiles.sort((a, b) => a.ts - b.ts);
    }

    /**
     * Queries migration table in db to get all applied migrations
     * Database only hit if this.appliedMigrations is empty
     * @returns array with list of applied migrations
     */
    private async listAppliedMigrations() {
        if (!this.appliedMigrations || this.appliedMigrations.length === 0) {
            this.appliedMigrations = [];
            // await this.dbQueries.migrationRecord.list();
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
            throw new MigrationError(
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
