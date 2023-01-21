import { DatabaseRepository } from 'postgresql-node';
import type {
    MigrationTableModel,
    ColumnTypesModel,
    MigrationRecordData,
    MigrationFile
} from '../types';

export class MigrationTable extends DatabaseRepository<any> {
    sqlFilesDir = [__dirname, 'sql'];

    create(migrationTable: string) {
        return this.query
            .run(this.sqlFile('createMigrationTable.sql'), {
                table: migrationTable
            })
            .none();
    }
}

export class MigrationRecord extends DatabaseRepository<any> {
    sqlFilesDir = [__dirname, 'sql'];

    async list(migrationTable: string) {
        const result = await this.query
            .find(this.sqlFile('getMigrationHistory.sql'), {
                params: { table: migrationTable }
            })
            .manyOrNone<MigrationTableModel>();

        if (result) return result;
        return [];
    }

    remove(migrationTable: string, filename: string) {
        return this.query.run('', {
            table: migrationTable,
            filename: filename
        });
    }

    add(migrationTable: string, data: MigrationFile[]) {
        const columns = [''];
        return this.query
            .add(data, { returning: '*', columns, table: migrationTable })
            .many<MigrationTableModel>();
    }
}
