export default {
    templateFile: 'templates/template.sql',
    templateDirectionMarkers: {
        up: /\/\* BEGIN_UP \*\/([\s\S]+)\/\* END_UP \*\//,
        down: /\/\* BEGIN_DOWN \*\/([\s\S]+)\/\* END_DOWN \*\//
    },
    migrationDir: './migrations',
    migrationTable: '_migrations',
    databaseSchema: 'public',
    typeFile: './types.d.ts',
    dataTypeConversion: {
        int4: 'number',
        float4: 'number',
        float8: 'number',
        serial: 'number',
        serial4: 'number',
        serial8: 'number',
        varchar: 'string',
        uuid: 'string',
        char: 'string',
        text: 'string',
        bool: 'boolean',
        json: 'object',
        date: 'Date',
        time: 'Date',
        timestamp: 'Date',
        timestampz: 'Date'
    }
};
