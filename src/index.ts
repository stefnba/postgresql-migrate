#!/usr/bin/env node
import yargs from 'yargs';
import chalk from 'chalk';
import path from 'path';

import {
    Migration,
    newMigrationFile,
    readConfigFile,
    setupRoot
} from './operations';
import DEFAULTS from './defaults';
import type { ActionType } from './types';
import { existsSync } from 'fs';

process.on('uncaughtException', (err) => {
    console.error(err);
    process.exit(1);
});

const argv = yargs
    .usage('Usage: $0 [up|down|create|redo|reset|setup] [config]')
    .option('f', {
        alias: 'config-file-path',
        describe:
            'Name of config file inside root directory, should be a .json file',
        type: 'string'
    })
    .option('d', {
        alias: 'root-dir',
        describe:
            'Path to root directory that contains config file migration directory',
        type: 'string'
    })
    .help()
    .version()
    .parseSync();

const action = argv._.shift() as ActionType;

/**
 * VALID COMMANDS
 * If none provided, show help and exit
 */
if (argv.help || !DEFAULTS.commands.includes(action)) {
    yargs.showHelp();
    process.exit(1);
}

/**
 * ROOT DIRECTORY AND CONFIG FILE
 * Must either provide
 *      - root dir, and optionally name of config file if different than default
 *      - config file (contains everything else)
 */
const configFilePath = argv['f'] as string;
const rootDirPath = argv['d'] as string;
const configFilename = argv['n'] as string;

if (!(configFilePath || rootDirPath)) {
    console.error(
        chalk.red('Either a config-file-path or a root-dir must be provided')
    );
    process.exit(1);
}

/**
 * ACTIONS
 */
(async () => {
    // no config required
    if (action == 'setup') {
        setupRoot(rootDirPath, configFilename);
        process.exit();
    }

    let config = null;
    if (configFilePath) {
        config = readConfigFile(configFilePath);
    } else if (rootDirPath) {
        // dir not exists
        if (!existsSync(rootDirPath)) {
            console.error(
                chalk.red(
                    'Either a config-file-path or a root-dir must be provided'
                )
            );
            process.exit(1);
        }
        {
            config = readConfigFile(
                path.join(
                    rootDirPath,
                    configFilename || DEFAULTS.templates.configFile
                ),
                rootDirPath
            );
        }
    } else {
        process.exit(1);
    }

    if (action === 'create') {
        const name = argv._[0];
        if (!name || !(typeof name === 'string')) {
            console.error(
                chalk.red('Must provide a name for the migration file!')
            );
            process.exit(1);
        }
        newMigrationFile(name, config);
        return;
    }

    console.log(
        chalk.gray('\n--- Running Migrations ---------------------------\n')
    );

    if (action === 'reset') {
        const migration = new Migration(config);
        await migration.reset();
        process.exit();
        return;
    }

    const steps = (argv._[0] as number) || null;
    if (steps && !Number.isInteger(steps)) {
        console.error(chalk.red('Steps must be an integer!'));
        process.exit(1);
    }

    if (action === 'redo') {
        const migration = new Migration(config);
        await migration.run('down', steps);
        await migration.run('up', steps);
    }

    if (action === 'up' || action === 'down') {
        const migration = new Migration(config);
        await migration.run(action, steps);
    }
    process.exit();
})();
