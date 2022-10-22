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
exports.readConfigFile = exports.newMigrationFile = exports.Migration = void 0;
const fs_1 = require("fs");
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const dayjs_1 = __importDefault(require("dayjs"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./db");
const defaults_1 = __importDefault(require("./defaults"));
dotenv_1.default.config();
class Migration {
    constructor(config) {
        this.config = config;
        this.direction = 'up';
        this.dbQuery = (0, db_1.pgp)(this.config.database);
    }
    /**
     * Reads all files and selects .sql ones in migration dir
     */
    listMigrationsFiles(appliedMigrations) {
        const dirFiles = (0, fs_1.readdirSync)(this.config.migrationDir);
        const migrationFiles = [];
        const tsList = [];
        dirFiles.forEach((f) => {
            if (f.endsWith('.sql')) {
                // todo check if filename is correct
                const [ts_, title] = f.split('_');
                const ts = Number.parseInt(ts_);
                // check that migration files have different ts
                if (tsList.includes(ts))
                    throw new Error('Multiple migration files have the same timestamp!');
                tsList.push(ts);
                const fullpath = path_1.default.join(this.config.migrationDir, f);
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
    readMigrationFile(path) {
        if (!this.direction)
            throw new Error('Migration direction not specified!');
        const content = (0, fs_1.readFileSync)(path, { encoding: 'utf-8' });
        const m = content.match(defaults_1.default.templateDirectionMarkers[this.direction]);
        const query = m === null || m === void 0 ? void 0 : m[1].replace(/(?:\r\n|\r|\n)/g, '');
        return (query || '').trim();
    }
    /**
     * Lists records in migration table.
     */
    listAppliedMigrations() {
        return __awaiter(this, void 0, void 0, function* () {
            const appliedMigrations = yield this.dbQuery.manyOrNone(db_1.queries.dml.list, {
                table: this.config.migrationTable || defaults_1.default.migrationTable
            });
            return appliedMigrations.map((m) => m.filename);
        });
    }
    /**
     * Queries PostgreSQL tables and columns used in your application.
     */
    listDataTypes() {
        return __awaiter(this, void 0, void 0, function* () {
            const columns = yield this.dbQuery.manyOrNone(db_1.queries.types.list, {
                schemaName: this.config.databaseSchema || defaults_1.default.databaseSchema,
                migrationTable: defaults_1.default.migrationTable
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
     * Creates types.d.ts file with data types from database
     */
    createDataTypeFile() {
        return __awaiter(this, void 0, void 0, function* () {
            const dataTypes = yield this.parseDataTypes();
            (0, fs_1.writeFileSync)(this.config.typeFile, dataTypes, {
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
                table: this.config.migrationTable || defaults_1.default.migrationTable
            });
            // list all migration that have been applied, from db table
            const appliedMigrations = yield this.listAppliedMigrations();
            // get all migration files
            const migrationFiles = this.listMigrationsFiles(appliedMigrations);
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
                            createdAt: (0, dayjs_1.default)(m.ts).toISOString()
                        }, null, this.config.migrationTable ||
                            defaults_1.default.migrationTable));
                    }
                    if (this.direction === 'down') {
                        yield t.none(db_1.queries.dml.delete, {
                            filename: m.name,
                            table: this.config.migrationTable ||
                                defaults_1.default.migrationTable
                        });
                    }
                    return { name: m.name, success: true };
                })));
            }))
                .then((r) => __awaiter(this, void 0, void 0, function* () {
                const appliedMigrations = r.filter((m) => m.success);
                const notAppliedMigrations = r.filter((m) => !m.success);
                if (appliedMigrations.length === 0) {
                    console.log(chalk_1.default.white.bgYellow.bold(`No Migrations applied [${direction.toUpperCase()}]`));
                }
                if (appliedMigrations.length > 0) {
                    console.log(chalk_1.default.white.bgGreen.bold(`Migration [${direction.toUpperCase()}] successful`));
                    console.log(`${appliedMigrations
                        .map((m) => `> ${m.name}`)
                        .join('\n')}`);
                }
                if (notAppliedMigrations.length > 0) {
                    console.log(chalk_1.default.blue('\nThe following files were skipped:'));
                    notAppliedMigrations.map((m) => {
                        console.log(`> ${m.name} (${m.msg})`);
                    });
                    console.log('\n\n');
                }
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
     * Drops all tables in schema.
     */
    reset() {
        return __awaiter(this, void 0, void 0, function* () {
            const tables = yield this.dbQuery.manyOrNone(db_1.queries.ddl.list, {
                schemaName: this.config.databaseSchema || defaults_1.default.databaseSchema
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
}
exports.Migration = Migration;
/**
 * Creates new migration file in migration dir
 * @param name
 */
const newMigrationFile = (name, config) => {
    const template = (0, fs_1.readFileSync)(path_1.default.join(path_1.default.dirname(__dirname), defaults_1.default.templateFile), { encoding: 'utf-8' });
    const filename = `${(0, dayjs_1.default)().valueOf()}_${name.replace(/_|\s|\.|\\,/g, '-')}.sql`;
    const fullpath = path_1.default.join(config.migrationDir, filename);
    (0, fs_1.writeFileSync)(fullpath, template, { encoding: 'utf-8' });
    console.log(chalk_1.default.blue(`${filename} created`));
};
exports.newMigrationFile = newMigrationFile;
/**
 * Reads config json and return config object
 * @param configFilePath path to .json file
 * @returns config object
 */
const readConfigFile = (configFilePath) => {
    try {
        const configFile = (0, fs_1.readFileSync)(configFilePath, { encoding: 'utf8' });
        const config = JSON.parse(configFile);
        // edit config object
        // make migrationDir absolut, as it should be provided relative to config path in json
        const absolutPath = path_1.default.join(path_1.default.dirname(configFilePath), config.migrationDir || defaults_1.default.migrationDir);
        config['migrationDir'] = absolutPath;
        // make typeFile absolut
        const absolutTypeFile = path_1.default.join(path_1.default.dirname(configFilePath), config.typeFile || defaults_1.default.typeFile);
        config['typeFile'] = absolutTypeFile;
        // integrate env variables for nested database
        const database = config.database;
        config['database'] = Object.entries(database).reduce((prev, curr) => {
            const [key, value] = curr;
            let v = value;
            if (typeof value === 'string' && value.startsWith('env:')) {
                const variable = value.replace('env:', '');
                v = process.env[variable];
            }
            return Object.assign(Object.assign({}, prev), { [key]: v });
        }, {});
        return config;
    }
    catch (e) {
        console.log(e);
        throw new Error('A valid path to a config file must be provided.');
    }
};
exports.readConfigFile = readConfigFile;
