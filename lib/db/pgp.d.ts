import pgPromise from 'pg-promise';
declare const pgp: pgPromise.IMain<{}, import("pg-promise/typescript/pg-subset").IClient>;
export default pgp;
