import PostgresClient from 'postgresql-node';
import type {
    MigrationTableModel,
    ColumnTypesModel,
    TablesModel
} from '../types';

const db = (connection: any, migrationTable: string) => {
    const client = new PostgresClient(connection);

    const migrationSuite =
        client.newQuerySuite<MigrationTableModel>(migrationTable);

    const migrationCs = migrationSuite.config.columnSets({
        create: ['filename', 'title', 'content', 'createdAt']
    });
    const migrationQueries = migrationSuite.config.querySets(
        {
            createMigrationTable: 'createMigrationTable.sql',
            deleteMigrationRecord: 'deleteMigrationRecord.sql',
            getMigrationHistory: 'getMigrationHistory.sql',
            deleteTables: 'deleteTables.sql',
            getTablesInSchema: 'getTablesInSchema.sql'
        },
        [__dirname, 'sql']
    );

    const typeSuite = client.newQuerySuite<ColumnTypesModel>(
        '"information_schema"."columns"'
    );

    const typeQueries = typeSuite.config.querySets({
        getColumnTypes: 'getColumnTypes.sql'
    });

    return {
        migration: {
            /**
             * Lists applied migrations from migration table
             */
            listAppliedMigrations: () =>
                migrationSuite.query.findMany<MigrationTableModel>({
                    query: migrationQueries.getMigrationHistory,
                    params: { table: migrationTable }
                }),
            /**
             * Deletes a migration record from migrations table based on filename
             * @filename id for record deletion
             */
            deleteMigrationRecord: (filename: string) =>
                migrationSuite.query.run<void>(
                    migrationQueries.deleteMigrationRecord,
                    {
                        table: migrationTable,
                        filename: filename
                    }
                ),
            createMigrationRecord: (data: any) =>
                migrationSuite.query.createOne({
                    data,
                    columns: migrationCs.create
                }),
            /**
             * Creates migration history table
             */
            createMigrationTable: () =>
                migrationSuite.query.run<void>(
                    migrationQueries.createMigrationTable,
                    {
                        table: migrationTable
                    }
                )
        },
        types: {
            /**
             * Lists PostgreSQL tables and columns used in the application
             */
            listDataTypes: () =>
                typeSuite.query.findMany<ColumnTypesModel>({
                    query: typeQueries.getColumnTypes
                })
        },
        tables: {
            listTables: (schema: string) =>
                migrationSuite.query.findMany<TablesModel>({
                    query: migrationQueries.getTablesInSchema,
                    params: {
                        schemaName: schema
                    }
                })
        },
        trx: client.query.transaction,
        queries: {
            dropTables: migrationQueries.deleteTables
        }
    };
};

export default db;
