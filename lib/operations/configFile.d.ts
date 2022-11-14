import type { ConfigObject } from '../types';
/**
 * Reads config json and return config object
 * @param rootDir path to root directory
 * @param configFileName name of config file, defaults to what is provided in DEFAULTS
 * @returns config object
 */
declare const readConfigFile: (rootDir: string, configFileName?: string) => ConfigObject;
export default readConfigFile;
