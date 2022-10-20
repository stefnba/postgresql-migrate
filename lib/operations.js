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
exports.readConfigFile = exports.newMigrationFile = exports.runMigrations = exports.listAppliedMigrations = exports.readMigrationFile = exports.readMigrationsFiles = void 0;
const fs_1 = require("fs");
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const dayjs_1 = __importDefault(require("dayjs"));
const db_1 = require("./db");
const defaults_1 = __importDefault(require("./defaults"));
/**
 * Reads all files and selects .sql ones in migration dir
 */
const readMigrationsFiles = (migrationDir) => {
    const dirFiles = (0, fs_1.readdirSync)(migrationDir);
    const migrationFiles = [];
    dirFiles.forEach((f) => {
        if (f.endsWith('.sql')) {
            // todo check if filename is correct
            const [ts, title] = f.split('_');
            migrationFiles.push({
                fullpath: path_1.default.join(migrationDir, f),
                name: f,
                ts: Number.parseInt(ts),
                title
            });
        }
    });
    // todo sort files by date
    //
    return migrationFiles;
};
exports.readMigrationsFiles = readMigrationsFiles;
const readMigrationFile = (path, operationType) => {
    var _a, _b;
    const content = (0, fs_1.readFileSync)(path, { encoding: 'utf-8' });
    const operationStrings = {
        up: {
            begin: '/* BEGIN_UP */',
            end: '/* END_UP */'
        },
        down: {
            begin: '/* BEGIN_DOWN */',
            end: '/* END_DOWN */'
        }
    };
    return content.substring(content.indexOf((_a = operationStrings[operationType]) === null || _a === void 0 ? void 0 : _a.begin), content.lastIndexOf((_b = operationStrings[operationType]) === null || _b === void 0 ? void 0 : _b.end));
};
exports.readMigrationFile = readMigrationFile;
const listAppliedMigrations = (
// eslint-disable-next-line @typescript-eslint/ban-types
dbQuery) => __awaiter(void 0, void 0, void 0, function* () {
    const appliedMigrations = yield dbQuery.manyOrNone(db_1.queries.dml.list, {
        table: defaults_1.default.migrationTable
    });
    return appliedMigrations.map((m) => m.filename);
});
exports.listAppliedMigrations = listAppliedMigrations;
const runMigrations = (operation = 'up', steps = null, config) => __awaiter(void 0, void 0, void 0, function* () {
    // get all migration files
    const migrations = (0, exports.readMigrationsFiles)(config.migrationDir);
    const dbQuery = (0, db_1.pgp)(config.database);
    // create migration table, if not yet exists
    yield dbQuery.none(db_1.queries.ddl.create, {
        table: defaults_1.default.migrationTable
    });
    // list all migration that have been run, from db table
    const appliedMigrations = yield (0, exports.listAppliedMigrations)(dbQuery);
    return dbQuery
        .tx('run_migrations', (t) => __awaiter(void 0, void 0, void 0, function* () {
        return Promise.all(migrations.map((m) => __awaiter(void 0, void 0, void 0, function* () {
            // if migration has already been applied, only for up
            if (appliedMigrations.includes(m.name) &&
                operation === 'up')
                return;
            const sql = (0, exports.readMigrationFile)(m === null || m === void 0 ? void 0 : m.fullpath, operation);
            // execute migration
            yield t.none(sql);
            // record migration in _migrations table
            if (operation === 'up') {
                yield t.none(db_1.pgp.helpers.insert({
                    filename: m.name,
                    title: m.title,
                    createdAt: (0, dayjs_1.default)(m.ts).toISOString(),
                    runAt: new Date()
                }, null, defaults_1.default.migrationTable));
                console.info(`> UP ${m.name} executed`);
            }
            if (operation === 'down') {
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
exports.runMigrations = runMigrations;
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
 * @param path
 * @returns config object
 */
const readConfigFile = (configFilePath) => {
    try {
        const configFile = (0, fs_1.readFileSync)(configFilePath, { encoding: 'utf8' });
        const config = JSON.parse(configFile);
        // make migrationDir absolut, as it should be provided relative to config path in json
        const absolutPath = path_1.default.join(path_1.default.dirname(configFilePath), config.migrationDir);
        config['migrationDir'] = absolutPath;
        return config;
    }
    catch (e) {
        console.log(e);
        throw new Error('A valid path to a config file must be provided.');
    }
};
exports.readConfigFile = readConfigFile;
