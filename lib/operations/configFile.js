"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const defaults_1 = __importDefault(require("../defaults"));
dotenv_1.default.config();
/**
 * Reads config json and return config object
 * @param rootDir path to root directory
 * @param configFileName name of config file, defaults to what is provided in DEFAULTS
 * @returns config object
 */
const readConfigFile = (rootDir, configFileName = defaults_1.default.configFile.name) => {
    var _a, _b, _c, _d;
    try {
        const rootDirAbsolute = path_1.default.join(process.cwd(), rootDir);
        const configRaw = JSON.parse((0, fs_1.readFileSync)(path_1.default.join(rootDirAbsolute, configFileName), {
            encoding: 'utf8'
        }));
        // todo validate json
        if (!(configRaw === null || configRaw === void 0 ? void 0 : configRaw.connection)) {
            console.log(chalk_1.default.red('Config.json has wrong schema!'));
            process.exit(1);
        }
        // integrate env variables for nested database
        const connectionWithEnvVars = Object.entries(configRaw.connection).reduce((prev, curr) => {
            const [key, value] = curr;
            let v = value;
            if (typeof value === 'string' && value.startsWith('env:')) {
                const variable = value.replace('env:', '');
                v = process.env[variable];
            }
            return Object.assign(Object.assign({}, prev), { [key]: v });
        }, {});
        const config = {
            connection: connectionWithEnvVars,
            database: {
                migrationsTable: ((_a = configRaw === null || configRaw === void 0 ? void 0 : configRaw.database) === null || _a === void 0 ? void 0 : _a.migrationsTable) ||
                    defaults_1.default.database.migrationsTable,
                schema: ((_b = configRaw === null || configRaw === void 0 ? void 0 : configRaw.database) === null || _b === void 0 ? void 0 : _b.schema) || defaults_1.default.database.schema
            },
            typesFile: (configRaw === null || configRaw === void 0 ? void 0 : configRaw.typesFile)
                ? ((_c = configRaw === null || configRaw === void 0 ? void 0 : configRaw.typesFile) === null || _c === void 0 ? void 0 : _c.startsWith('/'))
                    ? path_1.default.join(process.cwd(), configRaw === null || configRaw === void 0 ? void 0 : configRaw.typesFile)
                    : path_1.default.join(rootDirAbsolute, (configRaw === null || configRaw === void 0 ? void 0 : configRaw.typesFile) || '')
                : undefined,
            migrationsDir: (configRaw === null || configRaw === void 0 ? void 0 : configRaw.migrationsDir)
                ? ((_d = configRaw === null || configRaw === void 0 ? void 0 : configRaw.migrationsDir) === null || _d === void 0 ? void 0 : _d.startsWith('/'))
                    ? path_1.default.join(process.cwd(), configRaw === null || configRaw === void 0 ? void 0 : configRaw.migrationsDir)
                    : path_1.default.join(rootDirAbsolute, (configRaw === null || configRaw === void 0 ? void 0 : configRaw.migrationsDir) || '')
                : path_1.default.join(rootDirAbsolute, defaults_1.default.migrationsDir)
        };
        return config;
    }
    catch (e) {
        console.log(chalk_1.default.red('Config file read error!'));
        console.log(e);
        process.exit(1);
    }
};
exports.default = readConfigFile;
