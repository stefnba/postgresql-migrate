import { readdirSync, readFileSync, writeFileSync } from 'fs';
import chalk from 'chalk';
import crypto from 'crypto';
import path from 'path';
import dayjs from 'dayjs';
import dotenv from 'dotenv';

import {MigrationTable, MigrationRecord} from '../db';
import DEFAULTS from '../defaults';
import type {
    MigrationFileObj,
    OperationType,
    MigrationTableModel,
    ConfigObject,
    ErrorObject,
    WarningObject
} from '../types';
import { Logger } from '../utils';
import MigrationError from '../error';

dotenv.config();

export default class Migration {
    private config: ConfigObject;
    private direction: OperationType;
    private dbQuery: ReturnType<typeof dbClient>;
    appliedMigrations!: MigrationTableModel[];

    constructor(config: ConfigObject) {
        this.config = config;
        this.direction = 'up';
        this.dbQuery = dbClient(
            config.database.connection,
            config.database.table
        );
    }

    



    /**
     * Executues migration against database
     * @param direction upwards or down
     * @param steps how many migration files to run
     */
    async run(direction: OperationType = 'up', steps?: number | undefined) {
        this.direction = direction;


        const appliedMigrations = await this.listAppliedMigrations();

        // down not possible if not migrations are applied
        if (direction === 'down' && appliedMigrations.length === 0) {
            throw new MigrationError(
                '[DOWN] not possible. No migrations have been applied.\n',
                'WARNING'
            );
        }

        // get all migration files
        const migrationFiles = await this.listMigrationsFiles();

        let migrationsToRun = migrationFiles;

        // filter which migration files to apply
        if (this.direction === 'up') {
            // remove all applied ones
            migrationsToRun = migrationsToRun.filter((m) => !m.applied);

            // apply only n steps, only non-empty files should be used
            if (steps) {
                migrationsToRun = migrationsToRun
                    .filter((m) => m.sql !== '')
                    .slice(0, steps);
            }
        }

        if (this.direction === 'down' && steps) {
            // for steps down are only applied migration files relevant and those that contain sql, i.e. are not empty
            migrationsToRun = migrationsToRun
                .filter((m) => m.applied && m.sql !== '')
                .slice(-steps);
        }

        if (migrationsToRun.length === 0) {
            throw new MigrationError(
                `No migrations are pending for [${direction.toUpperCase()}]`,
                'WARNING'
            );
        }

        // todo
        console.log(
            chalk.bgWhite(`Running Migrations [${direction.toUpperCase()}]\n`)
        );

        const migrationWereRun = await Promise.all(
            migrationsToRun.map(async (migration) => {
                const { content, name, ts, hash, title, sql } = migration;

                try {
                    // execute against db
                    console.log('executing', sql);
                }


                // record
                await this.dbQuery.migrationRecord.create({
                    content,
                    title,
                    createdAt: new Date(ts),
                    hash,
                    filename: name
                });
            })
        );

        console.log(migrationWereRun);

        return {
            migrationFiles,
            appliedMigrations,
            migrationsToRun
        };
    }
}
