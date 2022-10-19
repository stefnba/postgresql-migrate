"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbQuery = exports.pgp = exports.queries = void 0;
const query_1 = __importDefault(require("./query"));
exports.queries = query_1.default;
const pgp_1 = require("./pgp");
Object.defineProperty(exports, "pgp", { enumerable: true, get: function () { return pgp_1.pgp; } });
Object.defineProperty(exports, "dbQuery", { enumerable: true, get: function () { return pgp_1.dbQuery; } });
//# sourceMappingURL=index.js.map