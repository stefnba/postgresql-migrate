#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateUp = exports.DEFAULTS = exports.CONFIG = exports.CONFIG_FILE = void 0;
const config_1 = require("./config");
exports.CONFIG_FILE = 'app/config.json';
//
exports.CONFIG = (0, config_1.readConfigFile)(exports.CONFIG_FILE);
const operations_1 = require("./operations");
exports.DEFAULTS = {
    templateFile: 'src/template.sql',
    migrationTable: '_migrations'
};
// expose CLI operations
exports.migrateUp = operations_1.runMigrations;
// migrateUp('DOWN');
(0, operations_1.newMigrationFile)('Users-init');
//# sourceMappingURL=index.js.map