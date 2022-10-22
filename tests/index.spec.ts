import 'mocha';
import { assert } from 'chai';

import { readConfigFile } from '../src/operations';

describe('Config File', () => {
    it('should be an object', () => {
        assert.isFunction(readConfigFile);
    });
    it('should return config object', () => {
        const config = readConfigFile('tests/app/config.json');
        assert.isObject(config);
    });
});

describe('Create new Migration File', () => {
    it('should be an object', () => {
        assert.isFunction(readConfigFile);
    });
    it('should return config object', () => {
        const config = readConfigFile('tests/app/config.json');
        assert.isObject(config);
    });
});

describe('Migrate Command', () => {
    it('should be an object', () => {
        assert.isFunction(readConfigFile);
    });
    it('should return config object', () => {
        const config = readConfigFile('tests/app/config.json');
        assert.isObject(config);
    });
});
