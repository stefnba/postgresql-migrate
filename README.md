# Postgresql Migrate

This is a simple CLI migration tool for PostgreSQL and Node.js. Migrations are written in raw SQL. At the end of a successful migration, it generates automatically a TypeScript types file for all tables and columns in the database.

# How it works

Create a JSON config file, e.g. `config.json` with the connection to the database. You can either store connection information directly as a string but it is recommended to use environment variables from your .env file. To do so, simple add `env:VARIABLE_NAME` as the value and the package will automatiaclly replace it with the value of the environment variable.

Note: the db user used for the migration must have the required privileges to `CREATE TABLES` AND `DROP TABLES`.

#### Create config.json

```json
{
    "database": {
        "host": "env:DB_HOST",
        "port": "env:DB_PORT",
        "user": "env:DB_USER",
        "password": "env:DB_PASSWORD",
        "database": "env:DB_NAME"
    }
}
```

Now you can run various CLI commands, such as creating migration files or applying up or down migration steps. You just need to reference the `config.json`.

#### Run command to create migration file

```bash
postgresql-migrate -f "path-to-config-json" create "name-of-migration-file"

```

#### Provide the migration step in raw SQL

For a successful migration, you should provide both up and down scripts and these must be inbetween the markeers. This means for `[UP]` migrations `/* BEGIN_UP */` and `/* END_UP */` and for `[DOWN]` migrations between `/* BEGIN_DOWN */` and `/* END_DOWN */`

```sql
/* BEGIN_UP */
CREATE TABLE "Users" (
    id SERIAL PRIMARY KEY,
    username VARCHAR NOT NULL,
    email VARCHAR NOT NULL
);
/* END_UP */

/* BEGIN_DOWN */
DROP TABLE IF EXISTS "Users" CASCADE;
/* END_DOWN */

```

#### Run migrations with the following CLI command

```bash
postgresql-migrate -f "path-to-config-json" up
```

#### Add migration command to `package.json`

To simplify running commands, it is recommended to add the following command to your `package.json`.

```json
{
    "scripts": {
        "migrate": "postgresql-migrate -f 'path-to-config-json'"
    }
}
```

Now you can use any command simply with

```bash
npm run migrate create|up|down|redo|reset
```
