# Postgresql Migrate

Simple CLI migration tool for PostgreSQL and Node.js with migration files written in raw SQL. TypeScript types files for all tables and columns in the database are automatically created.

# How it works

Create a JSON config file, e.g. `config.json` with the connection to the database. You can either store connection information directly as a string but it is recommended to use environment variables from your .env file. To do so, simple add `env:VARIABLE_NAME` as the value and the package will automatiaclly replace it with the value of the environment variable.

Note: the db user used for the migration must have the required privileges to `CREATE TABLES` AND `DROP TABLES`.

### Install package

```bash
npm install postgresql-migrate
```

### Setup migration directory

Run the following command with the path to the directory that will contain the directory with the SQL migration files as well as the config.json.

```bash
postgresql-migrate setup -d "path-to-migration-dir"
```

### Configure your settings

Open the newly created config.json and specify your settings. For the migration to work, the connection (database) part is required. All other settings are optional.

```json
{
    "connection": {
        "host": "env:DB_HOST",
        "port": "env:DB_PORT",
        "user": "env:DB_USER",
        "password": "env:DB_PASSWORD",
        "database": "env:DB_NAME"
    }
}
```

Now you can run various CLI commands, such as creating migration files or applying up or down migration steps. You just need to reference the `config.json`.

### Run command to create migration file

```bash
postgresql-migrate -d "path-to-migration-dir" create "name-of-migration-file"

```

### Provide the migration step in raw SQL

For a successful migration, you should provide both up and down scripts and these must be placed after the `/* UP */` comment for the `[UP]` migration script and after `/* DOWN */` for the `[DOWN]` migration script.

```sql
/* UP */
CREATE TABLE "Users" (
    id SERIAL PRIMARY KEY,
    username VARCHAR NOT NULL,
    email VARCHAR NOT NULL
);

/* DOWN */
DROP TABLE IF EXISTS "Users" CASCADE;

```

### Run migrations with the following CLI command

```bash
postgresql-migrate -d "path-to-migration-dir" up
```

### Add migration command to `package.json`

To simplify running commands, it is recommended to add the following command to your `package.json`.

```json
{
    "scripts": {
        "migrate": "postgresql-migrate -d 'path-to-migration-dir'"
    }
}
```

### Run commands

Now you can use any command simply with

```bash
npm run migrate create|up|down|redo|reset|status
```
