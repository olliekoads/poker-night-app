#!/usr/bin/env node
/**
 * Import historical poker data into production database
 * Usage: railway run node import-data.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function importData() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    console.error('   Run with: railway run node import-data.js');
    process.exit(1);
  }

  console.log('🎲 Importing historical poker data...\n');
  
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  try {
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'old_poker_data.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log(`📥 Read ${sql.length} bytes from old_poker_data.sql`);
    
    // Execute the SQL
    console.log('📤 Importing to production database...');
    await pool.query(sql);
    
    console.log('✅ Data imported successfully!\n');
    
    // Verify the import
    const sessionsResult = await pool.query('SELECT COUNT(*) FROM sessions');
    const playersResult = await pool.query('SELECT COUNT(*) FROM players');
    const sessionPlayersResult = await pool.query('SELECT COUNT(*) FROM session_players');
    
    console.log('📊 Import summary:');
    console.log(`   Sessions: ${sessionsResult.rows[0].count}`);
    console.log(`   Players: ${playersResult.rows[0].count}`);
    console.log(`   Session-Players: ${sessionPlayersResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

importData();
