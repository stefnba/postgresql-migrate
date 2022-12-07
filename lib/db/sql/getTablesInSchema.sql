SELECT
    tablename
FROM
    pg_tables
WHERE
    schemaname = $<schemaName>;

