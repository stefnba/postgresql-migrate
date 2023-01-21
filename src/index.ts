#!/usr/bin/env node
import yargs from 'yargs';

import DEFAULTS from './defaults';
import PostgresMigration from './migration';
import type { ActionType, CliArgs } from './types';

process.on('uncaughtException', (err) => {
    console.error(err);
    process.exit(1);
});

const argv = yargs
    .usage('Usage: $0 [up|down|create|redo|reset|setup|status] [config]')
    .option('c', {
        alias: 'config',
        describe: 'Path to config file',
        type: 'string'
    })
    .option('m', {
        alias: 'migrations',
        describe: 'Path to migrations directory',
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
    .option('d', {
        alias: 'database',
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
    .option('dt', {
        alias: 'typesFile',
        describe: 'Path for file that contains model types',
        type: 'string'
    })
    .option('t', {
        alias: 'table',
        describe: 'Database table name for migration records',
        type: 'string'
    })
    .help()
    .parseSync();

const action = argv._.shift() as ActionType; // argument w/o option flag
const cliArgs: CliArgs = {
    configPath: argv.c,
    migrationsDir: argv.m,
    host: argv.h,
    port: argv.p,
    user: argv.u,
    password: argv.w,
    database: argv.d,
    schema: argv.s,
    typesPath: argv.dt,
    table: argv.t,
    logging: argv.l ? true : false
};

const main = async () => {
    // Ensure valid action command is provided
    if (argv.help || !action || !DEFAULTS.commands.includes(action)) {
        yargs.showHelp();
        return {
            error: ''
        };
    }

    const migration = new PostgresMigration({
        action,
        cliArgs
    });
    await migration.run(argv._);

    console.log(migration.status());

    process.exit();
};

main();
