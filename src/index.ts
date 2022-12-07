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
import type { ActionType, MigrateParams } from './types';

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

export default async function migrate(params: MigrateParams) {
    // Ensure valid action command is provided
    if (
        argv.help ||
        !params.action ||
        !DEFAULTS.commands.includes(params.action)
    ) {
        yargs.showHelp();
        process.exit(1);
    }
    // Ensure root dir is provided
    if (!params.rootDirPath) {
        console.error(chalk.red('A root directory must be provided'));
        process.exit(1);
    }

    // no config required
    if (params.action == 'setup') {
        setupRoot(params.rootDirPath);
        process.exit();
    }

    const config = readConfigFile(params.rootDirPath);

    if (params.action === 'status') {
        const migration = new Migration(config);
        await migration.status();
        process.exit();
    }

    if (params.action === 'create') {
        if (
            params.addArgs.length > 0 &&
            typeof params.addArgs[0] === 'string'
        ) {
            const name = params.addArgs[0];
            createMigrationFile(name, config);
            process.exit();
        } else {
            console.error(
                chalk.red('Must provide a name for the migration file!')
            );
            process.exit(1);
        }
    }

    if (params.action === 'reset') {
        const migration = new Migration(config);
        await migration.reset();
        process.exit();
    }

    // Steps
    let steps = null;
    if (params.addArgs.length > 0) {
        if (!Number.isInteger(params.addArgs[0])) {
            console.error(chalk.red('Steps must be an integer!'));
            process.exit(1);
        } else {
            steps = params.addArgs[0] as number;
        }
    }

    if (params.action === 'redo') {
        const migration = new Migration(config);
        await migration.run('down', steps);
        await migration.run('up', steps);
        process.exit();
    }

    if (params.action === 'up' || action === 'down') {
        const migration = new Migration(config);
        await migration.run(params.action, steps);
        process.exit();
    }
    process.exit();
}

migrate({ rootDirPath, action, loggingEnabled, addArgs: argv._ });
