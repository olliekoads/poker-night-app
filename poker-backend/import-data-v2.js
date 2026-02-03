#!/usr/bin/env node
/**
 * Import historical poker data into production database (improved version)
 * Usage: railway ssh "node /app/poker-backend/import-data-v2.js"
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function importData() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  console.log('🎲 Importing historical poker data (v2 - chunked)...\n');
  
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  try {
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'old_poker_data.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log(`📥 Read ${sql.length} bytes from old_poker_data.sql`);
    
    // Split SQL into individual statements
    const statements = sql
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed && 
               !trimmed.startsWith('--') && 
               !trimmed.startsWith('SET ') &&
               !trimmed.startsWith('SELECT pg_catalog') &&
               !trimmed.startsWith('\\restrict');
      })
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`📤 Found ${statements.length} SQL statements to execute`);
    
    // Execute statements one by one
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt.length < 10) continue; // Skip very short statements
      
      try {
        await pool.query(stmt);
        successCount++;
        if (i % 50 === 0) {
          console.log(`  Progress: ${i}/${statements.length} statements executed...`);
        }
      } catch (error) {
        // Ignore duplicate key errors (already exists)
        if (error.code === '23505') {
          console.log(`  ⚠️  Skipped duplicate: ${stmt.substring(0, 80)}...`);
        } else {
          errorCount++;
          console.error(`  ❌ Error executing statement: ${error.message}`);
          console.error(`     Statement: ${stmt.substring(0, 100)}...`);
        }
      }
    }
    
    console.log(`\n✅ Import completed!`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    
    // Verify the import
    const sessionsResult = await pool.query('SELECT COUNT(*) FROM sessions');
    const playersResult = await pool.query('SELECT COUNT(*) FROM players');
    const sessionPlayersResult = await pool.query('SELECT COUNT(*) FROM session_players');
    
    console.log('\n📊 Current database summary:');
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
