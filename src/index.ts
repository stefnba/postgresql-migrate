#!/usr/bin/env node

import { readConfigFile } from './config';

export const CONFIG_FILE = 'app/config.json';

//
export const CONFIG = readConfigFile(CONFIG_FILE);

import { runMigrations } from './operations';

export const DEFAULTS = {
    templateFile: 'src/template.sql',
    migrationTable: '_migrations'
};

// expose CLI operations
export const migrateUp = runMigrations;

migrateUp('UP');
