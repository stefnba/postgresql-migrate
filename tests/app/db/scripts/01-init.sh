#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "postgres" --dbname "postgres" <<-EOSQL
    CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    DROP DATABASE IF EXISTS $DB_NAME;
    CREATE database $DB_NAME
        WITH
        OWNER = $DB_USER
        ENCODING = 'UTF8'
        LC_COLLATE = 'en_US.utf8'
        LC_CTYPE = 'en_US.utf8'
        TABLESPACE = pg_default
        CONNECTION LIMIT = -1
        IS_TEMPLATE = False;

    REVOKE CONNECT ON DATABASE $DB_NAME FROM PUBLIC;
    GRANT  CONNECT ON DATABASE $DB_NAME  TO $DB_USER;
    \c $DB_NAME postgres
    BEGIN;
        DROP SCHEMA IF EXISTS public CASCADE;
    COMMIT;
    \c $DB_NAME $DB_USER
    BEGIN;
        CREATE SCHEMA $DB_SCHEMA AUTHORIZATION $DB_USER;

        REVOKE ALL ON SCHEMA $DB_SCHEMA FROM PUBLIC;
        GRANT ALL ON SCHEMA $DB_SCHEMA TO $DB_USER;
    COMMIT;
EOSQL