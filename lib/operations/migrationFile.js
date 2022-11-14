"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const dayjs_1 = __importDefault(require("dayjs"));
const defaults_1 = __importDefault(require("../defaults"));
/**
 * Creates new migration file in migration dir
 * @param name
 */
const createMigrationFile = (name, config) => {
    const template = (0, fs_1.readFileSync)(path_1.default.join(defaults_1.default.templates.dir, defaults_1.default.templates.migrationSql), { encoding: 'utf-8' });
    const filename = `${(0, dayjs_1.default)().valueOf()}_${name.replace(/_|\s|\.|\\,/g, '-')}.sql`;
    const fullpath = path_1.default.join(config.migrationsDir, filename); // config.migrationsDir is already correct absolute path
    (0, fs_1.writeFileSync)(fullpath, template, { encoding: 'utf-8' });
    console.log(chalk_1.default.blue(`${filename} created`));
};
exports.default = createMigrationFile;
