"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const chalk_1 = __importDefault(require("chalk"));
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const dayjs_1 = __importDefault(require("dayjs"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("../db");
const defaults_1 = __importDefault(require("../defaults"));
const utils_1 = require("../utils");
dotenv_1.default.config();
class Migration {
    constructor(config) {
        this.config = config;
        this.direction = 'up';
        this.dbQuery = (0, db_1.pgp)(this.config.connection);
        this.errors = [];
        this.warnings = [];
    }
    /**
     * Reads all files and returns .sql files from migration dir with additional infos
     */
    listMigrationsFiles(appliedMigrations) {
        const dirFiles = (0, fs_1.readdirSync)(this.config.migrationsDir);
        const migrationFiles = [];
        dirFiles.forEach((f) => {
            if (f.endsWith('.sql')) {
                // todo check if filename is correct
                const [ts_, title] = f.split('_');
                const ts = Number.parseInt(ts_);
                const fullpath = path_1.default.join(this.config.migrationsDir, f);
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
    readMigrationFile(path) {
        if (!this.direction)
            throw new Error('Migration direction not specified!');
        const content = (0, fs_1.readFileSync)(path, { encoding: 'utf-8' });
        const replacString = (s) => {
            if (!s)
                return '';
            return s.replace(/(?:\r\n|\r|\n)/g, '').trim();
        };
        const downMatch = content.match(defaults_1.default.templates.markers.down);
        const upMatch = content.match(defaults_1.default.templates.markers.up);
        return {
            down: replacString(downMatch === null || downMatch === void 0 ? void 0 : downMatch[1]) || '',
            up: replacString(upMatch === null || upMatch === void 0 ? void 0 : upMatch[1]) || '',
            content: content
        };
    }
    /**
     * Lists filenames in migration table that have been applied.
     */
    listAppliedMigrations() {
        return __awaiter(this, void 0, void 0, function* () {
            const appliedMigrations = yield this.dbQuery.manyOrNone(db_1.queries.dml.list, {
                table: this.config.database.migrationsTable
            });
            return appliedMigrations;
        });
    }
    /**
     * Provides warnings to user in case migration are applied against db but the
     * content of the migration file has changed (based on hash) or migration file does not exist
     * @param migrationFiles
     * @param appliedMigrations
     * @param log whether to console.log
     * @returns true or false (indicates if process can continue or should exit)
     */
    compareFilesWithDbMigrations(migrationFiles, appliedMigrations, log = true) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const FilesWithSameHash = migrationFiles.filter((r) => r.hash === f.hash);
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
                    }
                    else {
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
                    const FilesWithSameHash = migrationFiles.filter((f) => f.hash === m.hash);
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
                const DbRecordsWithSamehash = appliedMigrations.filter((r) => r.hash === m.hash);
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
                utils_1.Logger.error('Multiple migration files have the same timestamp. Migration is not possible as this will cause an erorr!', this.errors
                    .filter((w) => w.msg === 'DUPLICATE_TS')
                    .map((w) => w.name), { onlyWithListElements: true });
                utils_1.Logger.warning('The following migration steps have been applied but the migration file content seems to have changed:', this.warnings
                    .filter((w) => w.msg === 'CONTENT_CHANGED')
                    .map((w) => w.name), { onlyWithListElements: true });
                utils_1.Logger.warning("The following migration steps have been applied but don't exist as a migration file:", this.warnings
                    .filter((w) => w.msg === 'MISSING')
                    .map((w) => w.name), { onlyWithListElements: true });
                utils_1.Logger.warning('The following applied migration steps contain the same SQL content:', this.warnings
                    .filter((w) => w.msg === 'DUPLICATE_HASH' && w.resource === 'DB')
                    .map((w) => w.name), { onlyWithListElements: true });
                utils_1.Logger.warning('The following migration file contain the same sql content:', this.warnings
                    .filter((w) => w.msg === 'DUPLICATE_HASH' && w.resource === 'FILE')
                    .map((w) => w.name), { onlyWithListElements: true });
            }
        });
    }
    /**
     * Queries PostgreSQL tables and columns used in your application.
     */
    listDataTypes() {
        return __awaiter(this, void 0, void 0, function* () {
            const columns = yield this.dbQuery.manyOrNone(db_1.queries.types.list, {
                schemaName: this.config.database.schema,
                migrationsTable: this.config.database.migrationsTable
            });
            return columns;
        });
    }
    /**
     * Converts postgres data types to data types for TypeScript
     * @returns types string for TypeScript
     */
    parseDataTypes() {
        return __awaiter(this, void 0, void 0, function* () {
            const columns = yield this.listDataTypes();
            return columns
                .map((col) => {
                const { tableName, columns } = col;
                const colTypes = columns.map((c) => {
                    return `${c.columnName}${c.isNullable === 'YES' ? '?' : ''}: ${defaults_1.default.dataTypeConversion[c.dataType] || 'unknown'};`;
                });
                const type = `export type ${tableName} = { \n${colTypes.join('\n')} }\n`;
                return type;
            })
                .join('\n');
        });
    }
    /**
     * Creates types.d.ts file with data types from database, only when path is provided in config.json
     */
    createDataTypeFile() {
        return __awaiter(this, void 0, void 0, function* () {
            const { typesFile } = this.config;
            if (!typesFile)
                return;
            const dataTypes = yield this.parseDataTypes();
            (0, fs_1.writeFileSync)(typesFile, dataTypes, {
                encoding: 'utf8'
            });
            return;
        });
    }
    /**
     * Executues migration against database
     * @param direction upwards or down
     * @param steps how many migration files to run
     */
    run(direction = 'up', steps = null) {
        return __awaiter(this, void 0, void 0, function* () {
            this.direction = direction;
            // create migration table, if not yet exists
            yield this.dbQuery.none(db_1.queries.ddl.create, {
                table: this.config.database.migrationsTable
            });
            const appliedMigrations = yield this.listAppliedMigrations();
            if (direction === 'down' && appliedMigrations.length === 0) {
                console.log(chalk_1.default.white.bgYellow('[DOWN] not possible. No migrations have been applied.\n'));
                return;
            }
            // get all migration files
            const migrationFiles = this.listMigrationsFiles(appliedMigrations);
            // check and display status
            yield this.status(appliedMigrations, migrationFiles, false);
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
                utils_1.Logger.log('', {
                    text: `No migrations are pending for [${direction.toUpperCase()}]`,
                    bgColor: 'bgYellow'
                }, undefined, { newLine: true });
                process.exit();
            }
            console.log(chalk_1.default.bgWhite(`Running Migrations [${direction.toUpperCase()}]\n`));
            return this.dbQuery
                .tx('run_migrations', (t) => __awaiter(this, void 0, void 0, function* () {
                return Promise.all(migrationsToRun.map((m) => __awaiter(this, void 0, void 0, function* () {
                    if (m.sql === '') {
                        return {
                            name: m.name,
                            success: false,
                            msg: 'Empty migration file'
                        };
                    }
                    // execute migration
                    yield t.none(m.sql);
                    // record migration in _migrations table
                    if (this.direction === 'up') {
                        yield t.none(db_1.pgp.helpers.insert({
                            filename: m.name,
                            title: m.title,
                            createdAt: (0, dayjs_1.default)(m.ts).toISOString(),
                            content: m.content,
                            hash: m.hash
                        }, null, this.config.database.migrationsTable));
                    }
                    if (this.direction === 'down') {
                        yield t.none(db_1.queries.dml.delete, {
                            filename: m.name,
                            table: this.config.database.migrationsTable
                        });
                    }
                    return { name: m.name, success: true };
                })));
            }))
                .then((r) => __awaiter(this, void 0, void 0, function* () {
                const appliedM = r.filter((m) => m.success);
                const notAppliedM = r.filter((m) => !m.success);
                utils_1.Logger.success(`Migration completed [${direction.toUpperCase()}]`, appliedM.map((e) => e.name), { onlyWithListElements: true });
                utils_1.Logger.info('The following files were skipped:', notAppliedM.map((e) => `${e.name} (${e.msg})`), { onlyWithListElements: true });
                yield this.createDataTypeFile();
                return;
            }))
                .catch((e) => {
                console.log(chalk_1.default.white.bgRed.bold('Migration failed'));
                console.log(e);
                return;
            });
        });
    }
    /**
     * Hashes sql query file content for checking if changes were made
     * @param sql query file content
     * @returns
     */
    hashSql(sql) {
        return ('sha256-' +
            crypto_1.default
                .createHash('sha256')
                .update(sql.replace(/\s{2,}|\n/g, ' '))
                .digest('base64'));
    }
    /**
     * Drops all tables in schema.
     */
    reset() {
        return __awaiter(this, void 0, void 0, function* () {
            const tables = yield this.dbQuery.manyOrNone(db_1.queries.ddl.list, {
                schemaName: this.config.database.schema
            });
            if (tables.length === 0) {
                console.log(chalk_1.default.bgWhite.bold('No tables exists'));
                return;
            }
            return this.dbQuery
                .tx('drop_tables', (t) => __awaiter(this, void 0, void 0, function* () {
                return Promise.all(tables.map((table) => __awaiter(this, void 0, void 0, function* () {
                    t.none(db_1.queries.ddl.drop, {
                        tablename: table === null || table === void 0 ? void 0 : table.tablename
                    });
                    return table === null || table === void 0 ? void 0 : table.tablename;
                })));
            }))
                .then((r) => __awaiter(this, void 0, void 0, function* () {
                console.log(chalk_1.default.white.bgGreen.bold('Database Reset successful'));
                r.map((table) => {
                    console.log(`> ${table}`);
                });
            }));
        });
    }
    /**
     * Displays status of current migrations
     */
    status(appliedMigrations = null, migrationFiles = null, showDetails = true) {
        return __awaiter(this, void 0, void 0, function* () {
            const _appliedMigrations = appliedMigrations || (yield this.listAppliedMigrations());
            const _migrationFiles = migrationFiles || this.listMigrationsFiles(_appliedMigrations);
            if (this.direction === 'up') {
                console.log(chalk_1.default.bgWhite('Migration Status:\n'));
                console.log(chalk_1.default.blue(`Steps already applied: ${_appliedMigrations.length} `));
                if (showDetails && _appliedMigrations.length > 0) {
                    _appliedMigrations.forEach((m) => {
                        console.log(`- ${m.filename}`);
                    });
                }
                const migrationFilesApplied = _migrationFiles.filter((f) => !f.applied);
                console.log(chalk_1.default.blue(`\nFiles pending: ${migrationFilesApplied.length}`));
                if (showDetails && migrationFilesApplied.length > 0) {
                    migrationFilesApplied.forEach((f) => {
                        console.log(`- ${f.name}`);
                    });
                }
                console.log('\n');
            }
            yield this.compareFilesWithDbMigrations(_migrationFiles, _appliedMigrations, this.direction === 'up');
            if (this.errors.length > 0) {
                console.log(chalk_1.default.bgRed('Migration aborted'));
                process.exit(1);
            }
        });
    }
}
exports.default = Migration;
