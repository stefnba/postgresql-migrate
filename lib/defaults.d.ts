declare const _default: {
    templateFile: string;
    templateDirectionMarkers: {
        up: RegExp;
        down: RegExp;
    };
    commands: readonly ["up", "down", "create", "redo", "reset"];
    migrationDir: string;
    migrationTable: string;
    databaseSchema: string;
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
