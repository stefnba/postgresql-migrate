/**
 * Creates dir and copies template config.json to it
 * @param dirPath directory path that holds required files and dirs
 * @param filename name of config file inside dir
 */
declare const setupRoot: (dirPath: string, filename?: string) => void;
export default setupRoot;
