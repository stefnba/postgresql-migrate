#!/usr/bin/env node
export declare const CONFIG_FILE = "app/config.json";
export declare const CONFIG: import("./types").ConfigObj;
export declare const DEFAULTS: {
    templateFile: string;
    migrationTable: string;
};
export declare const migrateUp: (operation?: import("./types").OperationType) => Promise<void>;
