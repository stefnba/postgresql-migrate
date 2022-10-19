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
exports.runMigrations = exports.listAppliedMigrations = exports.readMigrationFile = exports.readMigrationsFiles = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const db_1 = require("./db");
const index_1 = require("./index");
/**
 * Reads all files and selects .sql ones in migration dir
 */
const readMigrationsFiles = () => {
    // todo list files only sql
    const migrationDir = path_1.default.join(path_1.default.dirname(index_1.CONFIG_FILE), index_1.CONFIG.dir);
    const dirFiles = (0, fs_1.readdirSync)(migrationDir);
    const migrationFiles = [];
    dirFiles.forEach((f) => {
        if (f.endsWith('.sql')) {
            // todo check if filename is correct
            const [ts, title] = f.split('_');
            migrationFiles.push({
                fullpath: path_1.default.join(migrationDir, f),
                name: f,
                ts,
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
        UP: {
            begin: '/* BEGIN_UP */',
            end: '/* END_UP */'
        },
        DOWN: {
            begin: '/* BEGIN_DOWN */',
            end: '/* END_DOWN */'
        }
    };
    return content.substring(content.indexOf((_a = operationStrings[operationType]) === null || _a === void 0 ? void 0 : _a.begin), content.lastIndexOf((_b = operationStrings[operationType]) === null || _b === void 0 ? void 0 : _b.end));
};
exports.readMigrationFile = readMigrationFile;
const listAppliedMigrations = () => __awaiter(void 0, void 0, void 0, function* () {
    const appliedMigrations = yield db_1.dbQuery.manyOrNone(db_1.queries.dml.list, {
        table: index_1.DEFAULTS.migrationTable
    });
    console.log(appliedMigrations);
    return appliedMigrations;
});
exports.listAppliedMigrations = listAppliedMigrations;
const runMigrations = (operation = 'UP') => __awaiter(void 0, void 0, void 0, function* () {
    // get all migration files
    const migrations = (0, exports.readMigrationsFiles)();
    // create migration table, if not yet exists
    yield db_1.dbQuery.none(db_1.queries.ddl.create, {
        table: index_1.DEFAULTS.migrationTable
    });
    // list all migration that have been run, from db table
    const appliedMigrations = yield (0, exports.listAppliedMigrations)();
    // return;
    return db_1.dbQuery
        .tx('run_migrations', (t) => __awaiter(void 0, void 0, void 0, function* () {
        return Promise.all(migrations.map((m) => __awaiter(void 0, void 0, void 0, function* () {
            const sql = (0, exports.readMigrationFile)(m === null || m === void 0 ? void 0 : m.fullpath, operation);
            // execute migration
            yield t.none(sql);
            // record migration in _migrations table
            if (operation === 'UP') {
                yield t.none(db_1.pgp.helpers.insert({
                    filename: m.name,
                    title: m.title,
                    createdAt: m.ts,
                    runAt: new Date()
                }, null, index_1.DEFAULTS.migrationTable));
                console.info(`Migration UP ${m.name} executed`);
            }
            if (operation === 'DOWN') {
                yield t.none(db_1.queries.dml.delete, {
                    filename: m.name,
                    table: index_1.DEFAULTS.migrationTable
                });
                console.info(`Migration DOWN ${m.name} executed`);
            }
            return;
        })));
    }))
        .then(() => {
        console.log('Migrations successful!');
        return;
    })
        .catch(() => {
        console.log('Migrations failed!');
        return;
    });
});
exports.runMigrations = runMigrations;
//# sourceMappingURL=operations.js.map