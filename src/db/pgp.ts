import pgPromise from 'pg-promise';
import { CONFIG } from '../index';

const pgp = pgPromise();
const dbQuery = pgp(CONFIG.database);

export { pgp, dbQuery };
