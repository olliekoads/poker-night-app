"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const usePostgres = !!process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql');
console.log(`Using database: ${usePostgres ? 'PostgreSQL' : 'SQLite'}`);
if (usePostgres) {
    const { initializePostgresDatabase } = require('./postgres');
    initializePostgresDatabase().catch((error) => {
        console.error('Failed to initialize PostgreSQL:', error);
        console.log('Falling back to SQLite...');
    });
}
const adapter_1 = __importDefault(require("./adapter"));
exports.default = adapter_1.default;
//# sourceMappingURL=index.js.map