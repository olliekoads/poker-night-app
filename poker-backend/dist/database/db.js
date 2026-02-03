"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const getDatabasePath = () => {
    if (process.env.NODE_ENV === 'production') {
        return '/tmp/poker.db';
    }
    else {
        const dbDir = path_1.default.join(__dirname, '../../database');
        if (!fs_1.default.existsSync(dbDir)) {
            fs_1.default.mkdirSync(dbDir, { recursive: true });
        }
        return path_1.default.join(dbDir, 'poker.db');
    }
};
const dbPath = getDatabasePath();
const db = new sqlite3_1.default.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    }
    else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});
function initializeDatabase() {
    db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
        if (err) {
            console.error('Error creating players table:', err.message);
        }
        else {
            console.log('Players table ready');
            db.run(`ALTER TABLE players ADD COLUMN email TEXT`, (alterErr) => {
                if (alterErr && !alterErr.message.includes('duplicate column name')) {
                    console.error('Error adding email column:', alterErr.message);
                }
                else if (!alterErr) {
                    console.log('Email column added to players table');
                }
            });
        }
    });
    db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      scheduled_datetime TEXT,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
    )
  `, (err) => {
        if (err) {
            console.error('Error creating sessions table:', err.message);
        }
        else {
            console.log('Sessions table ready');
            db.run(`ALTER TABLE sessions ADD COLUMN created_by INTEGER`, (alterErr) => {
                if (alterErr && !alterErr.message.includes('duplicate column name')) {
                    console.error('Error adding created_by column:', alterErr.message);
                }
            });
            db.run(`ALTER TABLE sessions ADD COLUMN timezone TEXT DEFAULT 'America/Los_Angeles'`, (alterErr) => {
                if (alterErr && !alterErr.message.includes('duplicate column name')) {
                    console.error('Error adding timezone column:', alterErr.message);
                }
                else {
                    db.run(`UPDATE sessions SET timezone = 'America/Los_Angeles' WHERE timezone IS NULL`, (updateErr) => {
                        if (updateErr) {
                            console.error('Error updating existing sessions timezone:', updateErr.message);
                        }
                        else {
                            console.log('Successfully migrated existing sessions to PST timezone');
                        }
                    });
                }
            });
        }
    });
    db.run(`
    CREATE TABLE IF NOT EXISTS session_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      status TEXT DEFAULT 'Invited' CHECK (status IN ('Invited', 'In', 'Out', 'Maybe', 'Attending but not playing')),
      buy_in DECIMAL(10,2) DEFAULT 0.00,
      cash_out DECIMAL(10,2) DEFAULT 0.00,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE,
      UNIQUE(session_id, player_id)
    )
  `, (err) => {
        if (err) {
            console.error('Error creating session_players table:', err.message);
        }
        else {
            console.log('Session_players table ready');
            const alterQueries = [
                `ALTER TABLE session_players ADD COLUMN status TEXT DEFAULT 'Invited' CHECK (status IN ('Invited', 'In', 'Out', 'Maybe', 'Attending but not playing'))`,
                `ALTER TABLE session_players ADD COLUMN buy_in DECIMAL(10,2) DEFAULT 0.00`,
                `ALTER TABLE session_players ADD COLUMN cash_out DECIMAL(10,2) DEFAULT 0.00`
            ];
            alterQueries.forEach((query, index) => {
                db.run(query, (alterErr) => {
                    if (alterErr && !alterErr.message.includes('duplicate column name')) {
                        console.error(`Error adding column ${index + 1}:`, alterErr.message);
                    }
                    else if (!alterErr) {
                        console.log(`Column ${index + 1} added to session_players table`);
                    }
                });
            });
        }
    });
    db.run(`
    CREATE TABLE IF NOT EXISTS seating_charts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      number_of_tables INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    )
  `, (err) => {
        if (err) {
            console.error('Error creating seating_charts table:', err.message);
        }
        else {
            console.log('Seating_charts table ready');
        }
    });
    db.run(`
    CREATE TABLE IF NOT EXISTS seating_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seating_chart_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      table_number INTEGER NOT NULL,
      seat_position INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (seating_chart_id) REFERENCES seating_charts (id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
    )
  `, (err) => {
        if (err) {
            console.error('Error creating seating_assignments table:', err.message);
        }
        else {
            console.log('Seating_assignments table ready');
        }
    });
    db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_id TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )
  `, (err) => {
        if (err) {
            console.error('Error creating users table:', err.message);
        }
        else {
            console.log('Users table ready');
        }
    });
    db.run(`
    CREATE TABLE IF NOT EXISTS user_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE,
      UNIQUE(user_id, player_id)
    )
  `, (err) => {
        if (err) {
            console.error('Error creating user_players table:', err.message);
        }
        else {
            console.log('User_players table ready');
        }
    });
    db.run(`
    CREATE TABLE IF NOT EXISTS user_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      player_email TEXT,
      session_id INTEGER,
      event_type TEXT NOT NULL,
      event_data TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
      FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    )
  `, (err) => {
        if (err) {
            console.error('Error creating user_metrics table:', err.message);
        }
        else {
            console.log('User_metrics table ready');
        }
    });
    const metricsIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_user_metrics_user_id ON user_metrics(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_user_metrics_session_id ON user_metrics(session_id)',
        'CREATE INDEX IF NOT EXISTS idx_user_metrics_event_type ON user_metrics(event_type)',
        'CREATE INDEX IF NOT EXISTS idx_user_metrics_created_at ON user_metrics(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_user_metrics_player_email ON user_metrics(player_email)'
    ];
    metricsIndexes.forEach((indexQuery, index) => {
        db.run(indexQuery, (err) => {
            if (err) {
                console.error(`Error creating metrics index ${index + 1}:`, err.message);
            }
        });
    });
}
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        }
        else {
            console.log('Database connection closed');
        }
        process.exit(0);
    });
});
exports.default = db;
//# sourceMappingURL=db.js.map