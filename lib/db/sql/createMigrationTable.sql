/*
Creates migration history table
 */
CREATE TABLE IF NOT EXISTS $<table:name> (
    "id" serial4 PRIMARY KEY,
    "filename" varchar NOT NULL UNIQUE,
    "createdAt" timestamp NOT NULL,
    "runAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" varchar NOT NULL,
    "hash" varchar,
    "content" text)
