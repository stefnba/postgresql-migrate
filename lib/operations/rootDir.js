"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const defaults_1 = __importDefault(require("../defaults"));
/**
 * Creates dir and copies template config.json to it
 * @param dirPath directory path that holds required files and dirs
 * @param filename name of config file inside dir
 */
const setupRoot = (dirPath, filename = defaults_1.default.templates.configFile) => {
    const { templates, migrationsDir } = defaults_1.default;
    const dirPathAbsolute = path_1.default.join(process.cwd(), dirPath);
    // create root folder
    if (!(0, fs_1.existsSync)(dirPathAbsolute)) {
        (0, fs_1.mkdirSync)(dirPathAbsolute, { recursive: true });
    }
    // create config file
    const json = (0, fs_1.readFileSync)(path_1.default.join(templates.dir, templates.configFile), {
        encoding: 'utf-8'
    });
    (0, fs_1.writeFileSync)(path_1.default.join(dirPathAbsolute, filename), json, {
        encoding: 'utf-8'
    });
    // create dir for migration files
    const migrationsDirAbsolut = path_1.default.join(dirPathAbsolute, migrationsDir);
    if (!(0, fs_1.existsSync)(migrationsDirAbsolut)) {
        (0, fs_1.mkdirSync)(migrationsDirAbsolut, { recursive: true });
    }
    console.log(chalk_1.default.blue('Setup successful'));
};
exports.default = setupRoot;
