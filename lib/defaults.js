"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    templateFile: 'templates/template.sql',
    templateDirectionMarkers: {
        up: /\/\* BEGIN_UP \*\/([\s\S]+)\/\* END_UP \*\//,
        down: /\/\* BEGIN_DOWN \*\/([\s\S]+)\/\* END_DOWN \*\//
    },
    migrationTable: '_migrations'
};
