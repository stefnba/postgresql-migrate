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
    .usage('Usage: $0 [up|down|create|redo|reset] [config]')
    .option('f', {
    alias: 'config-file',
    describe: 'Path to config file, should be .json',
    type: 'string'
})
    .help()
    .version()
    .parseSync();
const action = argv._.shift();
/**
 * VALID COMMANDS
 */
if (argv.help || !defaults_1.default.commands.includes(action)) {
    yargs_1.default.showHelp();
    process.exit(1);
}
/**
 * CONFIG FILE
 */
const configFilePath = argv['f'];
if (!configFilePath || !(typeof configFilePath === 'string')) {
    console.error(chalk_1.default.red('Must provide a path to a config json!'));
    process.exit(1);
}
let config = null;
try {
    config = (0, operations_1.readConfigFile)(configFilePath);
}
catch (e) {
    console.error(chalk_1.default.red("Couldn't find config json!"));
    console.log(e);
    process.exit(1);
}
/**
 * ACTIONS
 */
(() => __awaiter(void 0, void 0, void 0, function* () {
    if (action === 'create') {
        const name = argv._[0];
        if (!name || !(typeof name === 'string')) {
            console.error(chalk_1.default.red('Must provide a name for the migration file!'));
            process.exit(1);
        }
        (0, operations_1.newMigrationFile)(name, config);
        return;
    }
    console.log(chalk_1.default.gray('\n--- Running Migrations ---------------------------\n'));
    if (action === 'reset') {
        const migration = new operations_1.Migration(config);
        yield migration.reset();
        process.exit();
        return;
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
