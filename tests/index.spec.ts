import 'mocha';
import { assert } from 'chai';

import { readConfigFile } from '../src/operations';

const pathToConfig = 'tests/app/db/config.json';

describe('Config File', () => {
    it('should be an object', () => {
        assert.isFunction(readConfigFile);
    });
    it('should return config object', () => {
        const config = readConfigFile(pathToConfig);
        assert.isObject(config);
    });
});
