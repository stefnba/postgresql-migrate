#!/usr/bin/env node
import yargs from 'yargs';
import chalk from 'chalk';

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

const action = argv._.shift() as ActionType; // argument w/o option flag
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

// Ensure valid command is provided
if (argv.help || !DEFAULTS.commands.includes(action)) {
    yargs.showHelp();
    process.exit(1);
}
// Ensure root dir is provided
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

    const config = readConfigFile(rootDirPath);

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
