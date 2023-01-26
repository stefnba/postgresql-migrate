import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

/**
 * Replaces strings in config file with env variable if marker is present
 * @param variable
 * @returns
 * Replaced variable
 */
export const replaceEnvVar = <T extends string | number | undefined>(
    variable: T
): T | undefined => {
    if (!variable) return undefined;

    const envMarker = 'env:';

    if (typeof variable === 'string' && variable.startsWith(envMarker)) {
        const value = process.env[variable.replace(envMarker, '')];
        return value as T;
    }
    return variable;
};

/**
 *
 * @param path
 * @param basePath
 * @returns
 */
export const setFilePath = <T extends string | undefined>(
    path: T,
    basePath?: string
) => {
    if (typeof path === 'string') {
        if (path.startsWith('/')) {
            return join(process.cwd(), path);
        }
        return join(basePath || process.cwd(), path);
    }
    return path;
};
