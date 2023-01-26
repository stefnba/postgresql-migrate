import dayjs from 'dayjs';
import { DatabaseRepository } from 'postgresql-node';
import type {
    MigrationTableModel,
    MigrationFiles,
    ColumnTypesModel
} from '../types';

export class MigrationTable extends DatabaseRepository {
    sqlFilesDir = [__dirname, 'sql'];

    private queries = {
        createMigrationTable: this.sqlFile('createMigrationTable.sql')
    };

    create(migrationTable: string) {
        return this.query
            .run(this.queries.createMigrationTable, {
                table: migrationTable
            })
            .none();
    }
}

export class DataTypes extends DatabaseRepository<ColumnTypesModel> {
    sqlFilesDir = [__dirname, 'sql'];

    private queries = {
        getDataTypes: this.sqlFile('getDataTypes.sql')
    };

    list(schemaName: string, migrationsTable: string) {
        return this.query
            .run(this.queries.getDataTypes, {
                schemaName,
                migrationsTable
            })
            .many<ColumnTypesModel>();
    }
}

export class MigrationRecord extends DatabaseRepository<MigrationTableModel> {
    sqlFilesDir = [__dirname, 'sql'];

    private queries = {
        getMigrationHistory: this.sqlFile('getMigrationHistory.sql'),
        deleteMigrationRecord: this.sqlFile('deleteMigrationRecord.sql')
    };

    async list(migrationTable: string) {
        const result = await this.query
            .find(this.queries.getMigrationHistory, {
                params: { table: migrationTable }
            })
            .manyOrNone<MigrationTableModel>();

        if (result) return result;
        return [];
    }

    remove(migrationTable: string, filenames: string[]) {
        return this.query
            .run(this.queries.deleteMigrationRecord, {
                table: migrationTable,
                filename: filenames
            })
            .manyOrNone();
    }

    add(migrationTable: string, data: MigrationFiles) {
        const columns = this.columnSet([
            'content',
            'filename',
            'hash',
            { name: 'createdAt', prop: 'ts', init: (col) => dayjs(col.value) },
            'title'
        ]);
        return this.query
            .add(data, {
                returning: '*',
                columns,
                table: migrationTable
            })
            .many<MigrationTableModel>();
    }
}
