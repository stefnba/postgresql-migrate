import 'mocha';
import { assert } from 'chai';

import { readConfigFile } from '../src/operations';

const pathToMigrationDir = 'tests/app/db/migration';

describe('Config File', () => {
    it('Should be an object', () => {
        assert.isFunction(readConfigFile);
    });
    it('Should return config object', () => {
        const config = readConfigFile(pathToMigrationDir);
        assert.isObject(config);
    });
});
