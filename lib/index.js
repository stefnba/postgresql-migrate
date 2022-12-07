#!/usr/bin/env node
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
const yargs_1 = __importDefault(require("yargs"));
const chalk_1 = __importDefault(require("chalk"));
const operations_1 = require("./operations");
const defaults_1 = __importDefault(require("./defaults"));
process.on('uncaughtException', (err) => {
    console.error(err);
    process.exit(1);
});
const argv = yargs_1.default
    .usage('Usage: $0 [up|down|create|redo|reset|setup|status] [config]')
    .option('d', {
    alias: 'root-dir',
    describe: 'Path to root directory that contains config file',
    type: 'string'
})
    .option('p', {
    alias: 'port',
    describe: 'Port of database connection',
    type: 'number'
})
    .option('h', {
    alias: 'host',
    describe: 'Host of database connection',
    type: 'string'
})
    .option('n', {
    alias: 'db-name',
    describe: 'Database name of database connection',
    type: 'string'
})
    .option('s', {
    alias: 'schema',
    describe: 'Database schema of database connection',
    type: 'string'
})
    .option('w', {
    alias: 'password',
    describe: 'Password of database connection',
    type: 'string'
})
    .option('u', {
    alias: 'user',
    describe: 'User of database connection',
    type: 'string'
})
    .option('l', {
    alias: 'logging',
    describe: 'Enable logging',
    type: 'string'
})
    .help()
    .parseSync();
const action = argv._.shift(); // argument w/o option flag
const rootDirPath = argv.d;
const loggingEnabled = argv.l ? true : false;
const cliConnection = {
    host: argv.h,
    port: argv.p,
    user: argv.u,
    password: argv.w,
    database: argv.n,
    schema: argv.s
};
function migrate(params) {
    return __awaiter(this, void 0, void 0, function* () {
        // Ensure valid action command is provided
        if (argv.help ||
            !params.action ||
            !defaults_1.default.commands.includes(params.action)) {
            yargs_1.default.showHelp();
            process.exit(1);
        }
        // Ensure root dir is provided
        if (!params.rootDirPath) {
            console.error(chalk_1.default.red('A root directory must be provided'));
            process.exit(1);
        }
        // no config required
        if (params.action == 'setup') {
            (0, operations_1.setupRoot)(params.rootDirPath);
            process.exit();
        }
        const config = (0, operations_1.readConfigFile)(params.rootDirPath);
        if (params.action === 'status') {
            const migration = new operations_1.Migration(config);
            yield migration.status();
            process.exit();
        }
        if (params.action === 'create') {
            if (params.addArgs.length > 0 &&
                typeof params.addArgs[0] === 'string') {
                const name = params.addArgs[0];
                (0, operations_1.createMigrationFile)(name, config);
                process.exit();
            }
            else {
                console.error(chalk_1.default.red('Must provide a name for the migration file!'));
                process.exit(1);
            }
        }
        if (params.action === 'reset') {
            const migration = new operations_1.Migration(config);
            yield migration.reset();
            process.exit();
        }
        // Steps
        let steps = null;
        if (params.addArgs.length > 0) {
            if (!Number.isInteger(params.addArgs[0])) {
                console.error(chalk_1.default.red('Steps must be an integer!'));
                process.exit(1);
            }
            else {
                steps = params.addArgs[0];
            }
        }
        if (params.action === 'redo') {
            const migration = new operations_1.Migration(config);
            yield migration.run('down', steps);
            yield migration.run('up', steps);
            process.exit();
        }
        if (params.action === 'up' || action === 'down') {
            const migration = new operations_1.Migration(config);
            yield migration.run(params.action, steps);
            process.exit();
        }
        process.exit();
    });
}
exports.default = migrate;
migrate({ rootDirPath, action, loggingEnabled, addArgs: argv._ });
