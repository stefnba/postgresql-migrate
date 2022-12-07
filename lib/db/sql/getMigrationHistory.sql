SELECT
    "id",
    "filename",
    "createdAt",
    "runAt",
    "title",
    "content",
    "hash"
FROM
    $<table:name>
ORDER BY
    "filename"
