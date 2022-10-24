export default {
    templates: {
        dir: 'templates',
        configFile: 'config.json',
        migrationSql: 'template.sql',
        markers: {
            up: /\/\*\s*UP\s\*\/([\s\S]+)\/\*\s*DOWN\s\*\//,
            down: /\/\*\s*DOWN\s\*\/([\s\S]+)/
        }
    },
    database: {
        schema: 'public',
        migrationsTable: '_migrations'
    },
    commands: [
        'up',
        'down',
        'create',
        'redo',
        'reset',
        'setup',
        'status'
    ] as const,
    migrationsDir: './migrations',

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
