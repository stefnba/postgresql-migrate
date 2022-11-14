import type { ConfigObject } from '../types';
/**
 * Creates new migration file in migration dir
 * @param name
 */
declare const createMigrationFile: (name: string, config: ConfigObject) => void;
export default createMigrationFile;
