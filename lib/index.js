#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const yargs_1 = __importDefault(require("yargs"));
const chalk_1 = __importDefault(require("chalk"));
const operations_1 = require("./operations");
process.on('uncaughtException', (err) => {
    console.error(err);
    process.exit(1);
});
const argv = yargs_1.default
    .usage('Usage: $0 [up|down|create] [config]')
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
if (argv.help || !['up', 'down', 'create'].includes(action)) {
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
if (action === 'create') {
    const name = argv._[0];
    if (!name || !(typeof name === 'string')) {
        console.error(chalk_1.default.red('Must provide a name for the migration file!'));
        process.exit(1);
    }
    (0, operations_1.newMigrationFile)(name, config);
    process.exit(1);
}
if (action === 'up' || action === 'down') {
    const steps = argv._[0] || null;
    if (steps && !Number.isInteger(steps)) {
        console.error(chalk_1.default.red('Steps must be an integer!'));
        process.exit(1);
    }
    (0, operations_1.runMigrations)(action, steps, config);
    process.exit(1);
}
