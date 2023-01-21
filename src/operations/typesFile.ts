import { writeFileSync } from 'fs';

import dbClient from '../db/client';
import DEFAULTS from '../defaults';

export default class DataTypes {
    private dbQuery: ReturnType<typeof dbClient>;
    private filepath: string;

    constructor(db: ReturnType<typeof dbClient>, filepath: string) {
        this.dbQuery = db;
        this.filepath = filepath;

        this.createDataTypeFile();
    }

    /**
     * Converts postgres data types to data types for TypeScript
     * @returns types string for TypeScript
     */
    private async parseDataTypes(): Promise<string> {
        const columns = await this.dbQuery.dataTypes.list();

        return columns
            .map((col) => {
                const { tableName, columns } = col;
                const colTypes = columns.map((c) => {
                    return `${c.columnName}${
                        c.isNullable === 'YES' ? '?' : ''
                    }: ${
                        DEFAULTS.dataTypeConversion[c.dataType] || 'unknown'
                    };`;
                });

                const type = `export type ${tableName} = { \n${colTypes.join(
                    '\n'
                )} }\n`;
                return type;
            })
            .join('\n');
    }

    /**
     * Creates types.d.ts file with data types from database, only when path is provided in config.json
     */
    private async createDataTypeFile() {
        const typesFile = this.filepath;
        if (!typesFile) return;
        const dataTypes = await this.parseDataTypes();
        writeFileSync(typesFile, dataTypes, {
            encoding: 'utf8'
        });
        return;
    }
}
