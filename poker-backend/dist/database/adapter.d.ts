interface DatabaseAdapter {
    query: (sql: string, params?: any[]) => Promise<any>;
    run: (sql: string, params?: any[]) => Promise<{
        lastID?: number;
        changes?: number;
    }>;
    get: (sql: string, params?: any[]) => Promise<any>;
    all: (sql: string, params?: any[]) => Promise<any[]>;
}
declare let adapter: DatabaseAdapter;
export default adapter;
//# sourceMappingURL=adapter.d.ts.map