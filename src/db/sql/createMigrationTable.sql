/*
Creates migration history table
 */
CREATE TABLE IF NOT EXISTS $<table:name> (
    "id" serial4 PRIMARY KEY,
    "filename" varchar,
    "createdAt" timestamp,
    "runAt" timestamp,
    "title" varchar)
