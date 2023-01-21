import { describe } from 'mocha';
import { expect } from 'chai';
import { unlink } from 'fs';

import PostgresMigration from '../src/migration';
import DEFAULTS from '../src/defaults';
import path from 'path';

const configPath = 'testing/app/db/migration/config.json';

const cliArgs = {
    host: 'localhost',
    port: 5410,
    database: 'app_db',
    user: 'admin',
    password: 'password'
};

describe('CONFIG', () => {
    it('Should CREATE CONFIG from .json file', async () => {
        const migration = new PostgresMigration({
            action: 'status',
            cliArgs: { configPath }
        });

        // assert.isFunction(createConfig);
        expect(migration.config).to.have.keys([
            'database',
            'migrationDir',
            'typesFile'
        ]);
        expect(migration.config.database).to.have.keys([
            'connection',
            'table',
            'schema'
        ]);
        expect(migration.config.migrationDir).to.equal(
            path.join(process.cwd(), path.dirname(configPath), './migrations')
        );
        expect(migration.config.typesFile).to.equal(
            path.join(process.cwd(), path.dirname(configPath), './model.d.ts')
        );
    });
    it('Should CREATE CONFIG from .json file but overwrite database name', async () => {
        const db = 'newDatabase';
        const migration = new PostgresMigration({
            action: 'status',
            cliArgs: { configPath, database: db }
        });

        expect(migration.config).to.have.keys([
            'database',
            'migrationDir',
            'typesFile'
        ]);
        expect(migration.config.database).to.have.keys([
            'connection',
            'table',
            'schema'
        ]);
        expect(migration.config.database.connection.database).to.equal(db);
        expect(migration.config.migrationDir).to.equal(
            path.join(process.cwd(), path.dirname(configPath), './migrations')
        );
        expect(migration.config.typesFile).to.equal(
            path.join(process.cwd(), path.dirname(configPath), './model.d.ts')
        );
    });
    it('Should CREATE CONFIG from .json file but overwrite path to types file', async () => {
        const typesPath = './types/data.d.ts';

        const migration = new PostgresMigration({
            action: 'status',
            cliArgs: { configPath, typesPath }
        });

        expect(migration.config).to.have.keys([
            'database',
            'migrationDir',
            'typesFile'
        ]);
        expect(migration.config.database).to.have.keys([
            'connection',
            'table',
            'schema'
        ]);

        expect(migration.config.migrationDir).to.equal(
            path.join(process.cwd(), path.dirname(configPath), './migrations')
        );
        expect(migration.config.typesFile).to.equal(
            path.join(process.cwd(), path.dirname(configPath), typesPath)
        );
    });
    it('Should CREATE CONFIG from cli args', async () => {
        const args = {
            ...cliArgs
        };
        const migration = new PostgresMigration({
            action: 'status',
            cliArgs: args
        });

        expect(migration.config).to.have.keys([
            'database',
            'migrationDir',
            'typesFile'
        ]);
        expect(migration.config.database).to.have.keys([
            'connection',
            'table',
            'schema'
        ]);
        expect(migration.config.database.connection.database).to.equal(
            args.database
        );
        expect(migration.config.database.table).to.equal(
            DEFAULTS.database.migrationsTable
        );
        expect(migration.config.database.schema).to.equal(
            DEFAULTS.database.schema
        );
        expect(migration.config.migrationDir).to.equal(
            path.join(process.cwd(), DEFAULTS.migrationDir)
        );
        expect(migration.config.typesFile).to.equal(undefined);
    });
    it('Should CREATE CONFIG from cli args with different schema', async () => {
        const args = {
            ...cliArgs,
            schema: 'newSchema'
        };
        const migration = new PostgresMigration({
            action: 'status',
            cliArgs: args
        });

        // general
        expect(migration.config).to.have.keys([
            'database',
            'migrationDir',
            'typesFile'
        ]);

        // database
        expect(migration.config.database).to.have.keys([
            'connection',
            'table',
            'schema'
        ]);

        // database.connection
        expect(migration.config.database.connection.database).to.equal(
            args.database
        );

        // database.table
        expect(migration.config.database.table).to.equal(
            DEFAULTS.database.migrationsTable
        );

        // database.schema
        expect(migration.config.database.schema).to.equal(args.schema);

        // migrationDir
        expect(migration.config.migrationDir).to.equal(
            path.join(process.cwd(), DEFAULTS.migrationDir)
        );

        // typesFile
        expect(migration.config.typesFile).to.equal(undefined);
    });
    it('Should CREATE CONFIG from cli args with different migration table', async () => {
        const args = {
            ...cliArgs,
            table: 'differentTable'
        };

        const migration = new PostgresMigration({
            action: 'status',
            cliArgs: args
        });

        expect(migration.config).to.have.keys([
            'database',
            'migrationDir',
            'typesFile'
        ]);
        expect(migration.config.database).to.have.keys([
            'connection',
            'table',
            'schema'
        ]);
        expect(migration.config.database.connection.database).to.equal(
            args.database
        );
        expect(migration.config.database.table).to.equal(args.table);
        expect(migration.config.database.schema).to.equal(
            DEFAULTS.database.schema
        );
        expect(migration.config.migrationDir).to.equal(
            path.join(process.cwd(), DEFAULTS.migrationDir)
        );
        expect(migration.config.typesFile).to.equal(undefined);
    });
});

describe('MIGRATION FILE', () => {
    it('SHOULD CREATE migration file', async () => {
        const migration = new PostgresMigration({
            action: 'create',
            cliArgs: { configPath }
        });

        await migration.run(['TEST']);

        const status = migration.status();

        expect(status).to.have.keys(['action', 'status', 'info']);
        expect(status.info).to.have.keys(['name', 'path']);

        if (status?.info?.path) {
            const { path } = status.info;
            unlink(path as string, (err) => {
                if (err) throw err;
            });
        }
    });
});

describe('UP', () => {
    it('SHOULD RUN UP migration', async () => {
        const migration = new PostgresMigration({
            action: 'up',
            cliArgs: { configPath }
        });

        await migration.run();
    });
});
