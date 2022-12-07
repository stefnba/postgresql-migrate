"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migration = exports.createMigrationFile = exports.readConfigFile = exports.setupRoot = void 0;
const rootDir_1 = __importDefault(require("./rootDir"));
exports.setupRoot = rootDir_1.default;
const configFile_1 = __importDefault(require("./configFile"));
exports.readConfigFile = configFile_1.default;
const migrationFile_1 = __importDefault(require("./migrationFile"));
exports.createMigrationFile = migrationFile_1.default;
const migration_1 = __importDefault(require("./migration"));
exports.Migration = migration_1.default;
