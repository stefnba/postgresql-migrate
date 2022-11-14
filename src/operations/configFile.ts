import { readFileSync } from 'fs';
import chalk from 'chalk';

import path from 'path';

import dotenv from 'dotenv';

import DEFAULTS from '../defaults';
import type { ConfigObject, ConfigRawObject } from '../types';

dotenv.config();

/**
 * Reads config json and return config object
 * @param rootDir path to root directory
 * @param configFileName name of config file, defaults to what is provided in DEFAULTS
 * @returns config object
 */
const readConfigFile = (
    rootDir: string,
    configFileName = DEFAULTS.configFile.name
): ConfigObject => {
    try {
        const rootDirAbsolute = path.join(process.cwd(), rootDir);

        const configRaw = JSON.parse(
            readFileSync(path.join(rootDirAbsolute, configFileName), {
                encoding: 'utf8'
            })
        ) as ConfigRawObject;

        // todo validate json
        if (!configRaw?.connection) {
            console.log(chalk.red('Config.json has wrong schema!'));
            process.exit(1);
        }

        // integrate env variables for nested database
        const connectionWithEnvVars = Object.entries(
            configRaw.connection
        ).reduce((prev, curr) => {
            const [key, value] = curr;
            let v = value;

            if (typeof value === 'string' && value.startsWith('env:')) {
                const variable = value.replace('env:', '');
                v = process.env[variable] as string | number;
            }

            return {
                ...prev,
                [key]: v
            };
        }, {}) as ConfigObject['connection'];

        const config: ConfigObject = {
            connection: connectionWithEnvVars,
            database: {
                migrationsTable:
                    configRaw?.database?.migrationsTable ||
                    DEFAULTS.database.migrationsTable,
                schema: configRaw?.database?.schema || DEFAULTS.database.schema
            },
            typesFile: configRaw?.typesFile
                ? configRaw?.typesFile?.startsWith('/')
                    ? path.join(process.cwd(), configRaw?.typesFile)
                    : path.join(rootDirAbsolute, configRaw?.typesFile || '')
                : undefined,
            migrationsDir: configRaw?.migrationsDir
                ? configRaw?.migrationsDir?.startsWith('/')
                    ? path.join(process.cwd(), configRaw?.migrationsDir)
                    : path.join(rootDirAbsolute, configRaw?.migrationsDir || '')
                : path.join(rootDirAbsolute, DEFAULTS.migrationsDir)
        };
        return config;
    } catch (e) {
        console.log(chalk.red('Config file read error!'));
        console.log(e);
        process.exit(1);
    }
};

export default readConfigFile;
