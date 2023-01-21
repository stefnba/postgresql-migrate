import { DatabaseRepository } from 'postgresql-node';
import type {
    MigrationTableModel,
    ColumnTypesModel,
    MigrationRecordData
} from '../types';

export class MigrationTable extends DatabaseRepository<any> {
    create(migrationTable: string) {
        return this.query
            .run(this.sqlFile('createMigrationTable.sql'), {
                table: migrationTable
            })
            .none();
    }
}

export class MigrationRecord extends DatabaseRepository<any> {
    list(migrationTable: string) {
        return this.query.find('', { params: { table: migrationTable } });
    }

    remove(migrationTable: string, filename: string) {
        return this.query.run('', {
            table: migrationTable,
            filename: filename
        });
    }

    add(data: object) {
        this.query.add(data, { returning: '*' });
    }
}
