declare const _default: {
    templates: {
        dir: string;
        configFile: string;
        migrationSql: string;
        markers: {
            up: RegExp;
            down: RegExp;
        };
    };
    database: {
        schema: string;
        migrationsTable: string;
    };
    configFile: {
        name: string;
    };
    commands: readonly ["up", "down", "create", "redo", "reset", "setup", "status"];
    migrationsDir: string;
    typeFile: string;
    dataTypeConversion: {
        int4: string;
        float4: string;
        float8: string;
        serial: string;
        serial4: string;
        serial8: string;
        varchar: string;
        uuid: string;
        char: string;
        text: string;
        bool: string;
        json: string;
        date: string;
        time: string;
        timestamp: string;
        timestampz: string;
    };
};
export default _default;
