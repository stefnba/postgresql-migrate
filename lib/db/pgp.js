"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbQuery = exports.pgp = void 0;
const pg_promise_1 = __importDefault(require("pg-promise"));
const index_1 = require("../index");
const pgp = (0, pg_promise_1.default)();
exports.pgp = pgp;
const dbQuery = pgp(index_1.CONFIG.database);
exports.dbQuery = dbQuery;
//# sourceMappingURL=pgp.js.map