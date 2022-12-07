"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_promise_1 = require("pg-promise");
const path_1 = __importDefault(require("path"));
function sqlFile(file) {
    const fullPath = path_1.default.join(__dirname, 'sql', file);
    return new pg_promise_1.QueryFile(fullPath, { minify: true, debug: true });
}
exports.default = {
    dml: {
        list: sqlFile('getMigrationHistory.sql'),
        delete: sqlFile('deleteMigrationRecord.sql')
    },
    ddl: {
        create: sqlFile('createMigrationTable.sql'),
        list: sqlFile('getTablesInSchema.sql'),
        drop: sqlFile('deleteTables.sql')
    },
    types: {
        list: sqlFile('getColumnTypes.sql')
    }
};
