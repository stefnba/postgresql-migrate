/* UP */
CREATE TABLE IF NOT EXISTS "User_Users" (
    "id" serial4 PRIMARY KEY,
    "name" varchar(255) NOT NULL,
    "email" varchar(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS "Auth_Logins" (
    "id" serial4 PRIMARY KEY,
    "userId" int NOT NULL REFERENCES "User_Users" (id),
    "logginAt" timestamp,
    "success" boolean
);


/* DOWN */
DROP TABLE IF EXISTS "Auth_Logins" CASCADE;

DROP TABLE IF EXISTS "User_Users" CASCADE;

