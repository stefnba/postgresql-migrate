import { readFileSync } from 'fs';
import type { ConfigObj } from './types';

export const readConfigFile = (path: string): ConfigObj => {
    if (!path)
        throw new Error('A valid path to a config file must be provided.');

    const configFile = readFileSync(path, { encoding: 'utf8' });
    // console.log('File is read!');
    let config: ConfigObj;

    // read json
    if (path.endsWith('.json')) {
        try {
            config = JSON.parse(configFile);
            return config;
        } catch (e) {
            console.log(e);
        }
    }
    return {} as ConfigObj;
};
