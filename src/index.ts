#!/usr/bin/env node
import yargs from 'yargs';
import chalk from 'chalk';

import { runMigrations, newMigrationFile, readConfigFile } from './operations';
import type { ActionType } from './types';

process.on('uncaughtException', (err) => {
    console.error(err);
    process.exit(1);
});

const argv = yargs
    .usage('Usage: $0 [up|down|create] [config]')
    .option('f', {
        alias: 'config-file',
        describe: 'Path to config file, should be .json',
        type: 'string'
    })
    .help()
    .version()
    .parseSync();

const action = argv._.shift() as ActionType;

/**
 * VALID COMMANDS
 */
if (argv.help || !['up', 'down', 'create'].includes(action)) {
    yargs.showHelp();
    process.exit(1);
}

/**
 * CONFIG FILE
 */
const configFilePath = argv['f'];
if (!configFilePath || !(typeof configFilePath === 'string')) {
    console.error(chalk.red('Must provide a path to a config json!'));
    process.exit(1);
}
let config = null;
try {
    config = readConfigFile(configFilePath);
} catch (e) {
    console.error(chalk.red("Couldn't find config json!"));
    console.log(e);
    process.exit(1);
}

/**
 * ACTIONS
 */
if (action === 'create') {
    const name = argv._[0];
    if (!name || !(typeof name === 'string')) {
        console.error(chalk.red('Must provide a name for the migration file!'));
        process.exit(1);
    }
    newMigrationFile(name, config);
    process.exit(1);
}

if (action === 'up' || action === 'down') {
    const steps = (argv._[0] as number) || null;
    if (steps && !Number.isInteger(steps)) {
        console.error(chalk.red('Steps must be an integer!'));
        process.exit(1);
    }
    runMigrations(action, steps, config);
    process.exit(1);
}
