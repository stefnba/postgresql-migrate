import { QueryFile } from 'pg-promise';
import path from 'path';

function sqlFile(file: string) {
    const fullPath = path.join(__dirname, 'sql', file);
    return new QueryFile(fullPath, { minify: true, debug: true });
}

export default {
    dml: {
        list: sqlFile('getMigrationHistory.sql'),
        delete: sqlFile('deleteMigrationRecord.sql')
    },
    ddl: {
        create: sqlFile('createMigrationTable.sql'),
        list: sqlFile('getTablesInSchema.sql')
    },
    types: {
        list: sqlFile('getColumnTypes.sql')
    }
};
