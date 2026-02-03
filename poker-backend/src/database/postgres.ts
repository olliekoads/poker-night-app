import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL connection configuration
// Railway provides DATABASE_URL which requires SSL
const connectionString = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

// Remove sslmode from connection string if present (it would override our ssl object)
const cleanConnectionString = connectionString?.replace(/[?&]sslmode=[^&]*/g, '');

const pool = new Pool({
  connectionString: cleanConnectionString,
  // Railway's PostgreSQL requires SSL
  ssl: {
    rejectUnauthorized: false
  }
});

// Test the connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('PostgreSQL connection error:', err);
});

// Initialize database tables
export async function initializePostgresDatabase(): Promise<void> {
  const client = await pool.connect();
  
  try {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `);
    console.log('Users table ready');

    // Create players table
    await client.query(`
      CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Players table ready');

    // Create sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        scheduled_datetime TIMESTAMP,
        timezone VARCHAR(100) DEFAULT 'America/Los_Angeles',
        game_type VARCHAR(50) DEFAULT 'cash',
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
      )
    `);
    console.log('Sessions table ready');

    // Create session_players junction table
    await client.query(`
      CREATE TABLE IF NOT EXISTS session_players (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'Invited' CHECK (status IN ('Invited', 'In', 'Out', 'Maybe', 'Attending but not playing')),
        buy_in DECIMAL(10,2) DEFAULT 0.00,
        cash_out DECIMAL(10,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE,
        UNIQUE(session_id, player_id)
      )
    `);
    console.log('Session_players table ready');

    // Create seating_charts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS seating_charts (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        number_of_tables INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
      )
    `);
    console.log('Seating_charts table ready');

    // Create seating_assignments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS seating_assignments (
        id SERIAL PRIMARY KEY,
        seating_chart_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        table_number INTEGER NOT NULL,
        seat_position INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (seating_chart_id) REFERENCES seating_charts (id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
      )
    `);
    console.log('Seating_assignments table ready');

    // Create user_players junction table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_players (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        default_invite BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE,
        UNIQUE(user_id, player_id)
      )
    `);
    console.log('User_players table ready');

    // Create user_metrics table for tracking user activity and engagement
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_metrics (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        player_email VARCHAR(255),
        session_id INTEGER,
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
      )
    `);
    console.log('User_metrics table ready');

    // Create indexes for better query performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_metrics_user_id ON user_metrics(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_metrics_session_id ON user_metrics(session_id);
      CREATE INDEX IF NOT EXISTS idx_user_metrics_event_type ON user_metrics(event_type);
      CREATE INDEX IF NOT EXISTS idx_user_metrics_created_at ON user_metrics(created_at);
      CREATE INDEX IF NOT EXISTS idx_user_metrics_player_email ON user_metrics(player_email);
    `);
    console.log('User_metrics indexes ready');

    // Migration: Add timezone column if it doesn't exist, then set default values
    try {
      // First, try to add the timezone column if it doesn't exist
      await client.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'America/Los_Angeles'`);

      // Then update any NULL values
      const result = await client.query(`UPDATE sessions SET timezone = 'America/Los_Angeles' WHERE timezone IS NULL`);
      if (result.rowCount && result.rowCount > 0) {
        console.log(`Successfully migrated ${result.rowCount} existing sessions to PST timezone`);
      }
    } catch (migrationError) {
      console.error('Error during timezone migration:', migrationError);
    }

    // Migration: Add game_type column if it doesn't exist
    try {
      await client.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS game_type VARCHAR(50) DEFAULT 'cash'`);

      // Update any NULL values
      const result = await client.query(`UPDATE sessions SET game_type = 'cash' WHERE game_type IS NULL`);
      if (result.rowCount && result.rowCount > 0) {
        console.log(`Successfully migrated ${result.rowCount} existing sessions to cash game type`);
      }
    } catch (migrationError) {
      console.error('Error during game_type migration:', migrationError);
    }

  } catch (error) {
    console.error('Error initializing PostgreSQL database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Export the pool for use in other modules
export default pool;
