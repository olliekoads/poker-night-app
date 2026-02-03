"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("../database/index"));
async function migrateProduction() {
    console.log('🚀 Starting production database migration...');
    try {
        const isPostgreSQL = process.env.DATABASE_URL?.startsWith('postgresql');
        console.log(`📊 Database type: ${isPostgreSQL ? 'PostgreSQL' : 'SQLite'}`);
        console.log('📊 Adding game_type column to sessions table...');
        try {
            if (isPostgreSQL) {
                await index_1.default.run(`
          ALTER TABLE sessions 
          ADD COLUMN game_type TEXT DEFAULT 'cash' 
          CHECK (game_type IN ('cash', 'tournament'))
        `);
            }
            else {
                await index_1.default.run(`
          ALTER TABLE sessions 
          ADD COLUMN game_type TEXT DEFAULT 'cash' CHECK (game_type IN ('cash', 'tournament'))
        `);
            }
            console.log('✅ Added game_type column to sessions');
        }
        catch (error) {
            if (error.message.includes('already exists') || error.message.includes('duplicate column')) {
                console.log('ℹ️  game_type column already exists in sessions');
            }
            else {
                throw error;
            }
        }
        console.log('👥 Adding default_invite column to user_players table...');
        try {
            if (isPostgreSQL) {
                await index_1.default.run(`
          ALTER TABLE user_players 
          ADD COLUMN default_invite BOOLEAN DEFAULT TRUE
        `);
            }
            else {
                await index_1.default.run(`
          ALTER TABLE user_players 
          ADD COLUMN default_invite BOOLEAN DEFAULT 1
        `);
            }
            console.log('✅ Added default_invite column to user_players');
        }
        catch (error) {
            if (error.message.includes('already exists') || error.message.includes('duplicate column')) {
                console.log('ℹ️  default_invite column already exists in user_players');
            }
            else {
                throw error;
            }
        }
        console.log('🎯 Setting default game_type for existing sessions...');
        const sessionResult = await index_1.default.run(`
      UPDATE sessions 
      SET game_type = 'cash' 
      WHERE game_type IS NULL
    `);
        console.log(`✅ Updated ${sessionResult.changes || 0} sessions with default game_type`);
        console.log('📧 Setting default_invite = true for existing players...');
        const playerResult = await index_1.default.run(`
      UPDATE user_players 
      SET default_invite = ${isPostgreSQL ? 'TRUE' : '1'}
      WHERE default_invite IS NULL
    `);
        console.log(`✅ Updated ${playerResult.changes || 0} user_players with default_invite = true`);
        console.log('\n📋 Verifying migration...');
        const sessionSample = await index_1.default.get(`
      SELECT id, name, game_type 
      FROM sessions 
      LIMIT 1
    `);
        if (sessionSample) {
            console.log(`✅ Sessions table: ID ${sessionSample.id}, game_type: ${sessionSample.game_type}`);
        }
        else {
            console.log('ℹ️  No sessions found to verify');
        }
        const playerSample = await index_1.default.get(`
      SELECT id, user_id, player_id, default_invite 
      FROM user_players 
      LIMIT 1
    `);
        if (playerSample) {
            console.log(`✅ User_players table: ID ${playerSample.id}, default_invite: ${playerSample.default_invite}`);
        }
        else {
            console.log('ℹ️  No user_players found to verify');
        }
        const sessionCount = await index_1.default.get('SELECT COUNT(*) as count FROM sessions');
        const userPlayerCount = await index_1.default.get('SELECT COUNT(*) as count FROM user_players');
        console.log('\n🎉 Production migration completed successfully!');
        console.log(`📊 Total sessions: ${sessionCount.count}`);
        console.log(`👥 Total user_players: ${userPlayerCount.count}`);
        console.log('\n✨ New features ready:');
        console.log('  🎲 Sessions can now be marked as "cash" or "tournament"');
        console.log('  📧 Players can be configured for default invite inclusion');
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}
if (require.main === module) {
    migrateProduction()
        .then(() => {
        console.log('🎯 Migration script completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        console.error('💥 Migration script failed:', error);
        process.exit(1);
    });
}
exports.default = migrateProduction;
//# sourceMappingURL=migrateProduction.js.map