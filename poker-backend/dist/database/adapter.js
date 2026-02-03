"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const usePostgres = !!process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql');
class SQLiteAdapter {
    constructor() {
        this.db = require('./db').default;
    }
    query(sql, params = []) {
        return this.all(sql, params);
    }
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(row);
                }
            });
        });
    }
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows || []);
                }
            });
        });
    }
}
class PostgreSQLAdapter {
    constructor() {
        try {
            this.pool = require('./postgres').default;
            console.log('PostgreSQL adapter initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize PostgreSQL adapter:', error);
            throw error;
        }
    }
    convertSqlPlaceholders(sql) {
        let paramIndex = 1;
        return sql.replace(/\?/g, () => `$${paramIndex++}`);
    }
    convertSqlFunctions(sql) {
        let convertedSql = sql;
        convertedSql = convertedSql.replace(/GROUP_CONCAT\(([^)]+)\)/g, (_match, field) => {
            return `STRING_AGG(${field}::text, ',')`;
        });
        convertedSql = convertedSql.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
        if (sql.match(/INSERT\s+OR\s+IGNORE\s+INTO/gi) && !convertedSql.includes('ON CONFLICT')) {
            convertedSql = convertedSql.replace(/(\)\s*VALUES\s*\([^)]+\))/gi, '$1 ON CONFLICT DO NOTHING');
        }
        return convertedSql;
    }
    async query(sql, params = []) {
        try {
            let convertedSql = this.convertSqlFunctions(sql);
            convertedSql = this.convertSqlPlaceholders(convertedSql);
            const result = await this.pool.query(convertedSql, params);
            return result.rows;
        }
        catch (error) {
            console.error('PostgreSQL query error:', error);
            console.error('Original SQL:', sql);
            console.error('Converted SQL:', this.convertSqlPlaceholders(this.convertSqlFunctions(sql)));
            console.error('Params:', params);
            throw error;
        }
    }
    async run(sql, params = []) {
        let modifiedSql = sql;
        if (sql.trim().toUpperCase().startsWith('INSERT') && !sql.toUpperCase().includes('RETURNING')) {
            modifiedSql = sql + ' RETURNING id';
        }
        try {
            let convertedSql = this.convertSqlFunctions(modifiedSql);
            convertedSql = this.convertSqlPlaceholders(convertedSql);
            const result = await this.pool.query(convertedSql, params);
            return {
                lastID: result.rows[0]?.id,
                changes: result.rowCount
            };
        }
        catch (error) {
            console.error('PostgreSQL run error:', error);
            console.error('Original SQL:', sql);
            console.error('Modified SQL:', modifiedSql);
            console.error('Converted SQL:', this.convertSqlPlaceholders(modifiedSql));
            console.error('Params:', params);
            throw error;
        }
    }
    async get(sql, params = []) {
        try {
            let convertedSql = this.convertSqlFunctions(sql);
            convertedSql = this.convertSqlPlaceholders(convertedSql);
            const result = await this.pool.query(convertedSql, params);
            return result.rows[0];
        }
        catch (error) {
            console.error('PostgreSQL get error:', error);
            console.error('Original SQL:', sql);
            console.error('Converted SQL:', this.convertSqlPlaceholders(this.convertSqlFunctions(sql)));
            console.error('Params:', params);
            throw error;
        }
    }
    async all(sql, params = []) {
        try {
            let convertedSql = this.convertSqlFunctions(sql);
            convertedSql = this.convertSqlPlaceholders(convertedSql);
            const result = await this.pool.query(convertedSql, params);
            return result.rows;
        }
        catch (error) {
            console.error('PostgreSQL all error:', error);
            console.error('Original SQL:', sql);
            console.error('Converted SQL:', this.convertSqlPlaceholders(this.convertSqlFunctions(sql)));
            console.error('Params:', params);
            throw error;
        }
    }
}
let adapter;
try {
    if (usePostgres) {
        console.log('Initializing PostgreSQL adapter...');
        adapter = new PostgreSQLAdapter();
        console.log('PostgreSQL adapter ready');
    }
    else {
        console.log('Initializing SQLite adapter...');
        adapter = new SQLiteAdapter();
        console.log('SQLite adapter ready');
    }
}
catch (error) {
    console.error('Failed to initialize database adapter:', error);
    console.log('Falling back to SQLite adapter...');
    adapter = new SQLiteAdapter();
}
exports.default = adapter;
//# sourceMappingURL=adapter.js.map