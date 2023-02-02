# Postgresql Migrate

Lightweight CLI migration tool for PostgreSQL and Node.js with migration files written in raw SQL. TypeScript types files for all tables and columns in the database can be automatically created.

# Get Started

## Install package

```bash
npm install postgresql-migrate
```

## Create `config.json`

Create a config.json file, e.g. in your `db` directory of your project, and specify your configuration. For the migration to work, the database connection part is required. All other properties are optional.

You can either store connection information directly as a string but it is recommended to use environment variables from your .env file. To do so, simple add `env:VARIABLE_NAME` as the value and the package will automatiaclly replace it with the value of the environment variable.

_Note: the db user used for the migration must have the required privileges to `CREATE TABLES` AND `DROP TABLES`._

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

## Test migration command

Run the following command with the path to the `config.json` file to test the database connection.

```bash
postgresql-migrate -d "path-to-config-file" connect
```

## Add migration command to `package.json` scripts

To simplify running commands, add the following command to your `package.json` scripts.

```json
{
    "scripts": {
        "migrate": "postgresql-migrate -d 'path-to-migration-dir'"
    }
}
```

# Run migrations

Now you can run various CLI commands, such as creating migration files or applying up or down migration steps.

## Create migration file

The following command create a new migration in the `migrations` directory that is specified in your config. If no path is provided, it defaults to `./migrations` relative to your `config.json`.

```bash
npm run migrate create "name-of-migration-file"
```

A new file with the following content is created:

```sql
/* UP */
/* DOWN */
```

### Provide migration step in raw SQL

Now, you can define your migrations script for this step, both for `UP` and `DOWN` migration. For a successful migration, you should definitely provide both.

The `UP` step must be placed after the `/* UP */` comment, the `DOWN` step after `/* DOWN */`.

_Note: Do not delete any of these comments as they are required to capture each migration direction!_

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

## Apply migrations

To apply all pending `UP` migrations, run the following command.

```bash
npm run migrate up
```

If you wish to apply only 1 step, add the numbers of steps to the command.

```bash
npm run migrate up 1
```

The same applies for `DOWN` migrations

```bash
npm run migrate down [steps]
```

# Additional configuration

## Generate types file

In case your projects uses TypeScript and requires the types of each column in your database tables, you can add the property `typesFile` to your

```json
{
    "typesFile": "./types.d.ts"
}
```

## Configuration

| Item                                                   | Property in `config.json` | CLI argument | Type   | Default   |
| ------------------------------------------------------ | ------------------------- | ------------ | ------ | --------- |
| Database host                                          | connection.host           | -            | STRING | localhost |
| Database port                                          | connection.port           | -            | INT    | 5432      |
| Database name                                          | connection.database       | -            | STRING | -         |
| Database user                                          | connection.user           | -            | STRING | -         |
| Database password                                      | connection.password       | -            | STRING | -         |
| Path to directory that contains migration .sql files   | migrationsDir             | -            | STRING | -         |
| Path to types that will be generated after a migration | typesFile                 | -            | STRING | -         |
| Name of database table to tracks migrations            | database.migrationsTable  | -            | STRING | -         |
| Database schema                                        | database.schema           | -            | STRING | -         |

Example of a `config.json` with all possible properties

```json
{
    "connection": {
        "host": "host of database [MANDATORY]",
        "port": "port of database [MANDATORY]",
        "user": "username [MANDATORY]",
        "password": "password of user [MANDATORY]",
        "database": "database to connect to [MANDATORY]"
    },
    "migrationsDir": "[OPTIONAL]",
    "typesFile": "[OPTIONAL]",
    "database": {
        "schema": "[OPTIONAL]",
        "migrationsTable": "[OPTIONAL]"
    }
}
```

## Commands

| **Command** | Description                  |
| ----------- | ---------------------------- |
| up          | Apply `UP` migrations        |
| down        | Apply `DOWN` migrations      |
| status      | Display status of migrations |

# License

The MIT License (MIT)
