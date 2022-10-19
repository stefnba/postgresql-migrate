import pgPromise from 'pg-promise';
declare const pgp: pgPromise.IMain<{}, import("pg-promise/typescript/pg-subset").IClient>;
declare const dbQuery: pgPromise.IDatabase<{}, import("pg-promise/typescript/pg-subset").IClient>;
export { pgp, dbQuery };
