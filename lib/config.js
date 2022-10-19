"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readConfigFile = void 0;
const fs_1 = require("fs");
const readConfigFile = (path) => {
    if (!path)
        throw new Error('A valid path to a config file must be provided.');
    const configFile = (0, fs_1.readFileSync)(path, { encoding: 'utf8' });
    // console.log('File is read!');
    let config;
    // read json
    if (path.endsWith('.json')) {
        try {
            config = JSON.parse(configFile);
            return config;
        }
        catch (e) {
            console.log(e);
        }
    }
    return {};
};
exports.readConfigFile = readConfigFile;
//# sourceMappingURL=config.js.map