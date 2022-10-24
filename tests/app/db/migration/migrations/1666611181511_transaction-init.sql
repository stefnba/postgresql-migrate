/* UP */
CREATE TABLE IF NOT EXISTS "Transactions" (
    "id" serial4 PRIMARY KEY,
    "date" timestamp NOT NULL,
    "amount" int NOT NULL,
    "userId" int NOT NULL REFERENCES "User_Users" (id)
);


/* DOWN */
DROP TABLE IF EXISTS "Transactions" CASCADE;

