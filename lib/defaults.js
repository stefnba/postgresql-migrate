"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const defaults = {
    templates: {
        dir: '../templates',
        configFile: 'config.json',
        migrationSql: 'template.sql',
        markers: {
            up: /\/\*\s*UP\s\*\/([\s\S]+)\/\*\s*DOWN\s\*\//,
            down: /\/\*\s*DOWN\s\*\/([\s\S]+)/
        }
    },
    database: {
        schema: 'public',
        migrationsTable: '_migrations'
    },
    configFile: {
        name: 'config.json'
    },
    commands: [
        'up',
        'down',
        'create',
        'redo',
        'reset',
        'setup',
        'status'
    ],
    migrationsDir: './migrations',
    typeFile: './types.d.ts',
    dataTypeConversion: {
        int4: 'number',
        float4: 'number',
        float8: 'number',
        serial: 'number',
        serial4: 'number',
        serial8: 'number',
        varchar: 'string',
        uuid: 'string',
        char: 'string',
        text: 'string',
        bool: 'boolean',
        json: 'object',
        date: 'Date',
        time: 'Date',
        timestamp: 'Date',
        timestampz: 'Date'
    }
};
// make template path absolute
exports.default = Object.assign(Object.assign({}, defaults), { templates: Object.assign(Object.assign({}, defaults.templates), { dir: path_1.default.join(__dirname, defaults.templates.dir) }) });
