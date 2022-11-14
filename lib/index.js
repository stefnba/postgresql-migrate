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
    .help()
    .parseSync();
const action = argv._.shift();
/**
 * VALID COMMANDS
 * If none provided, show help and exit
 */
if (argv.help || !defaults_1.default.commands.includes(action)) {
    yargs_1.default.showHelp();
    process.exit(1);
}
/**
 * ROOT DIRECTORY AND CONFIG FILE
 */
const rootDirPath = argv['d'];
if (!rootDirPath) {
    console.error(chalk_1.default.red('A root directory must be provided'));
    process.exit(1);
}
/**
 * ACTIONS
 */
(() => __awaiter(void 0, void 0, void 0, function* () {
    // no config required
    if (action == 'setup') {
        (0, operations_1.setupRoot)(rootDirPath);
        process.exit();
    }
    const config = (0, operations_1.readConfigFile)(rootDirPath);
    if (action === 'status') {
        const migration = new operations_1.Migration(config);
        yield migration.status();
        process.exit();
    }
    if (action === 'create') {
        const name = argv._[0];
        if (!name || !(typeof name === 'string')) {
            console.error(chalk_1.default.red('Must provide a name for the migration file!'));
            process.exit(1);
        }
        (0, operations_1.createMigrationFile)(name, config);
        return;
    }
    if (action === 'reset') {
        const migration = new operations_1.Migration(config);
        yield migration.reset();
        process.exit();
    }
    const steps = argv._[0] || null;
    if (steps && !Number.isInteger(steps)) {
        console.error(chalk_1.default.red('Steps must be an integer!'));
        process.exit(1);
    }
    if (action === 'redo') {
        const migration = new operations_1.Migration(config);
        yield migration.run('down', steps);
        yield migration.run('up', steps);
    }
    if (action === 'up' || action === 'down') {
        const migration = new operations_1.Migration(config);
        yield migration.run(action, steps);
    }
    process.exit();
}))();
