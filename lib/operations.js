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
    listMigrationsFiles() {
        const dirFiles = (0, fs_1.readdirSync)(this.config.migrationDir);
        const migrationFiles = [];
        dirFiles.forEach((f) => {
            if (f.endsWith('.sql')) {
                // todo check if filename is correct
                const [ts, title] = f.split('_');
                migrationFiles.push({
                    fullpath: path_1.default.join(this.config.migrationDir, f),
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
    readMigrationFile(path) {
        if (!this.direction)
            throw new Error('Migration direction not specified!');
        const content = (0, fs_1.readFileSync)(path, { encoding: 'utf-8' });
        const m = content.match(defaults_1.default.templateDirectionMarkers[this.direction]);
        const query = m === null || m === void 0 ? void 0 : m[1].replace(/(?:\r\n|\r|\n)/g, '');
        return query;
    }
    listAppliedMigrations() {
        return __awaiter(this, void 0, void 0, function* () {
            const appliedMigrations = yield this.dbQuery.manyOrNone(db_1.queries.dml.list, {
                table: defaults_1.default.migrationTable
            });
            return appliedMigrations.map((m) => m.filename);
        });
    }
    run(direction = 'up', steps = null) {
        return __awaiter(this, void 0, void 0, function* () {
            this.direction = direction;
            // get all migration files
            const migrations = this.listMigrationsFiles();
            // create migration table, if not yet exists
            yield this.dbQuery.none(db_1.queries.ddl.create, {
                table: defaults_1.default.migrationTable
            });
            // list all migration that have been run, from db table
            const appliedMigrations = yield this.listAppliedMigrations();
            return this.dbQuery
                .tx('run_migrations', (t) => __awaiter(this, void 0, void 0, function* () {
                return Promise.all(migrations.map((m) => __awaiter(this, void 0, void 0, function* () {
                    // if migration has already been applied, only for up
                    if (appliedMigrations.includes(m.name) &&
                        this.direction === 'up')
                        return;
                    const sql = this.readMigrationFile(m === null || m === void 0 ? void 0 : m.fullpath);
                    if (!sql || sql.trim() == '')
                        return;
                    // execute migration
                    yield t.none(sql);
                    // record migration in _migrations table
                    if (this.direction === 'up') {
                        yield t.none(db_1.pgp.helpers.insert({
                            filename: m.name,
                            title: m.title,
                            createdAt: (0, dayjs_1.default)(m.ts).toISOString(),
                            runAt: new Date()
                        }, null, defaults_1.default.migrationTable));
                        console.info(`> UP ${m.name} executed`);
                    }
                    if (this.direction === 'down') {
                        yield t.none(db_1.queries.dml.delete, {
                            filename: m.name,
                            table: defaults_1.default.migrationTable
                        });
                        console.info(`> DOWN ${m.name} executed`);
                    }
                    return;
                })));
            }))
                .then(() => {
                console.log(chalk_1.default.white.bgGreen.bold('Migration successful'));
                return;
            })
                .catch((e) => {
                console.log(chalk_1.default.white.bgRed.bold('Migration failed'));
                console.log(e);
                return;
            });
        });
    }
}
exports.Migration = Migration;
/**
 * Creates new migration file in migration dir
 * @param name
 */
const newMigrationFile = (name, config) => {
    // todo replace chars in name string
    console.log(defaults_1.default.templateFile);
    console.log(path_1.default.join(path_1.default.dirname(__dirname), defaults_1.default.templateFile));
    const template = (0, fs_1.readFileSync)(path_1.default.join(path_1.default.dirname(__dirname), defaults_1.default.templateFile), { encoding: 'utf-8' });
    const filename = `${(0, dayjs_1.default)().valueOf()}_${name}.sql`;
    // const filename = `${dayjs().format('YYYYMMDD-HHmmssSSS')}_${name}.sql`;
    const fullpath = path_1.default.join(config.migrationDir, filename);
    (0, fs_1.writeFileSync)(fullpath, template, { encoding: 'utf-8' });
};
exports.newMigrationFile = newMigrationFile;
/**
 * Reads config json and return config object
 * @param configFilePath path to .json file
 * @returns config object
 */
const readConfigFile = (configFilePath) => {
    console.log('test', process.env.TEST);
    try {
        const configFile = (0, fs_1.readFileSync)(configFilePath, { encoding: 'utf8' });
        const config = JSON.parse(configFile);
        // edit config object
        // make migrationDir absolut, as it should be provided relative to config path in json
        const absolutPath = path_1.default.join(path_1.default.dirname(configFilePath), config.migrationDir);
        config['migrationDir'] = absolutPath;
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
