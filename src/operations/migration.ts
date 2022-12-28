import { readdirSync, readFileSync, writeFileSync } from 'fs';
import chalk from 'chalk';
import crypto from 'crypto';
import path from 'path';
import dayjs from 'dayjs';
import dotenv from 'dotenv';

import dbClient from '../db';
import DEFAULTS from '../defaults';
import type {
    MigrationFileObj,
    OperationType,
    MigrationTableModel,
    ConfigObject,
    ErrorObject,
    WarningObject
} from '../types';
import { Logger } from '../utils';

dotenv.config();

export default class Migration {
    private config: ConfigObject;
    private direction: OperationType;
    private dbQuery: ReturnType<typeof dbClient>;

    constructor(config: ConfigObject) {
        this.config = config;
        this.direction = 'up';
        this.dbQuery = dbClient(
            config.connection,
            config.database.migrationsTable
        );
    }
}
