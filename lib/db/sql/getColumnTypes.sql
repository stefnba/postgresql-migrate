WITH "DataTypes" AS (
    SELECT
        "c"."column_name" AS "columnName",
        "c"."udt_name" AS "dataType",
        "c"."is_nullable" AS "isNullable",
        "c"."ordinal_position",
        "c"."table_name" AS "tableName",
        "constr"."constraint_type",
        "constr"."reference_table",
        "constr"."reference_column"
    FROM
        "information_schema"."columns" c
        LEFT JOIN (
            SELECT
                "tc"."table_name",
                "kcu"."column_name",
                "tc"."constraint_type",
                "ccu"."table_name" AS "reference_table",
                "ccu"."column_name" AS "reference_column"
            FROM
                "information_schema"."table_constraints" AS "tc"
                JOIN "information_schema"."key_column_usage" AS "kcu" ON "tc"."constraint_name" = "kcu"."constraint_name"
                    AND "tc"."table_schema" = "kcu"."table_schema"
                JOIN "information_schema"."constraint_column_usage" AS "ccu" ON "ccu"."constraint_name" = "tc"."constraint_name"
                    AND "ccu"."table_schema" = "tc"."table_schema"
            WHERE
                "tc"."table_schema" = $<schemaName>
                AND "tc"."constraint_type" = 'FOREIGN KEY') AS "constr" ON "c"."table_name" = "constr"."table_name"
        AND "c"."column_name" = "constr"."column_name"
    WHERE
        "c"."table_schema" = $<schemaName>
        AND "c"."table_name" <> $<migrationTable>
    ORDER BY
        "c"."table_name",
        "c"."ordinal_position"
)
SELECT
    "tableName",
    json_agg(t) "columns"
FROM
    "DataTypes" AS t
GROUP BY
    "tableName";

