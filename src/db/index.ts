import dayjs from 'dayjs';
import { DatabaseRepository } from 'postgresql-node';
import type { MigrationTableModel, MigrationFiles } from '../types';

export class MigrationTable extends DatabaseRepository {
    sqlFilesDir = [__dirname, 'sql'];

    create(migrationTable: string) {
        return this.query
            .run(this.sqlFile('createMigrationTable.sql'), {
                table: migrationTable
            })
            .none();
    }
}

export class MigrationRecord extends DatabaseRepository<MigrationTableModel> {
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

    remove(migrationTable: string, filenames: string[]) {
        return this.query
            .run(this.sqlFile('deleteMigrationRecord.sql'), {
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
