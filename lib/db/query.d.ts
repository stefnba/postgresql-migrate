import { QueryFile } from 'pg-promise';
declare const _default: {
    dml: {
        list: QueryFile;
        delete: QueryFile;
    };
    ddl: {
        create: QueryFile;
        list: QueryFile;
        drop: QueryFile;
    };
    types: {
        list: QueryFile;
    };
};
export default _default;
