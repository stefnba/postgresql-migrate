#!/usr/bin/env node
import yargs from 'yargs';
import chalk from 'chalk';
import path from 'path';

import {
    Migration,
    createMigrationFile,
    readConfigFile,
    setupRoot
} from './operations';
import DEFAULTS from './defaults';
import type { ActionType } from './types';

process.on('uncaughtException', (err) => {
    console.error(err);
    process.exit(1);
});

const argv = yargs
    .usage('Usage: $0 [up|down|create|redo|reset|setup|status] [config]')
    .option('d', {
        alias: 'root-dir',
        describe:
            'Path to root directory that contains config file migration directory',
        type: 'string'
    })
    .help()
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
 */
const d = argv['d'] as string;
const rootDirPath = d.startsWith('/') ? d.slice(1) : d;

if (!rootDirPath) {
    console.error(chalk.red('A root directory must be provided'));
    process.exit(1);
}

/**
 * ACTIONS
 */
(async () => {
    // no config required
    if (action == 'setup') {
        setupRoot(rootDirPath);
        process.exit();
    }

    const config = readConfigFile(
        path.join(rootDirPath, DEFAULTS.templates.configFile),
        rootDirPath
    );

    if (action === 'status') {
        const migration = new Migration(config);
        await migration.status();
        process.exit();
    }

    if (action === 'create') {
        const name = argv._[0];
        if (!name || !(typeof name === 'string')) {
            console.error(
                chalk.red('Must provide a name for the migration file!')
            );
            process.exit(1);
        }
        createMigrationFile(name, config);
        return;
    }

    if (action === 'reset') {
        const migration = new Migration(config);
        await migration.reset();
        process.exit();
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
