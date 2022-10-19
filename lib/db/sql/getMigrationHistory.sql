SELECT
    "id",
    "filename",
    "createdAt",
    "runAt",
    "title"
FROM
    $<table:name>
ORDER BY
    "filename"
