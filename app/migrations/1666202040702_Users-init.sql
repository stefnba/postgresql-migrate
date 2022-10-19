/* BEGIN_UP */
CREATE TABLE IF NOT EXISTS "User_Users" (
    "id" int,
    "name" varchar(255)
);

CREATE TABLE IF NOT EXISTS "Auth_Logins" (
    "id" serial4 PRIMARY KEY,
    "name" varchar
);


/* END_UP */
/* BEGIN_DOWN */
DROP TABLE IF EXISTS "User_Users";

DROP TABLE IF EXISTS "Auth_Logins"
/* END_DOWN */
