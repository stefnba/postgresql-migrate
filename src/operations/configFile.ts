import { readFileSync } from 'fs';
import chalk from 'chalk';

import path from 'path';

import dotenv from 'dotenv';

import DEFAULTS from '../defaults';
import type { ConfigObject, ConfigRawObject } from '../types';

dotenv.config();

/**
 * Reads config json and return config object
 * @param configFilePath path to .json file
 * @param rootDirPath path to root directory
 * @returns config object
 */
const readConfigFile = (
    configFilePath: string,
    rootDirPath = './'
): ConfigObject => {
    try {
        const configFile = readFileSync(configFilePath, { encoding: 'utf8' });
        const configRaw = JSON.parse(configFile) as ConfigRawObject;

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
            typesFile: configRaw?.typesFile?.startsWith('/')
                ? configRaw?.typesFile?.slice(1)
                : path.join(rootDirPath, configRaw?.typesFile || ''),
            database: {
                migrationsTable:
                    configRaw?.database?.migrationsTable ||
                    DEFAULTS.database.migrationsTable,
                schema: configRaw?.database?.schema || DEFAULTS.database.schema
            },
            migrationsDir:
                configRaw?.migrationsDir ||
                path.join(rootDirPath, DEFAULTS.migrationsDir)
        };
        return config;
    } catch (e) {
        console.log(chalk.red('Config file read error!'));
        console.log(e);
        process.exit(1);
    }
};

export default readConfigFile;
