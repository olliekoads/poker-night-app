"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("../database/index"));
async function addGameTypeAndDefaultInvite() {
    console.log('🔧 Adding game_type and default_invite columns...');
    try {
        console.log('📊 Adding game_type column to sessions table...');
        try {
            await index_1.default.run(`
        ALTER TABLE sessions 
        ADD COLUMN game_type TEXT DEFAULT 'cash' CHECK (game_type IN ('cash', 'tournament'))
      `);
            console.log('✅ Added game_type column to sessions');
        }
        catch (error) {
            if (error.message.includes('duplicate column name')) {
                console.log('ℹ️  game_type column already exists in sessions');
            }
            else {
                throw error;
            }
        }
        console.log('👥 Adding default_invite column to user_players table...');
        try {
            await index_1.default.run(`
        ALTER TABLE user_players 
        ADD COLUMN default_invite BOOLEAN DEFAULT 1
      `);
            console.log('✅ Added default_invite column to user_players');
        }
        catch (error) {
            if (error.message.includes('duplicate column name')) {
                console.log('ℹ️  default_invite column already exists in user_players');
            }
            else {
                throw error;
            }
        }
        console.log('🎯 Setting default game_type for existing sessions...');
        await index_1.default.run(`
      UPDATE sessions 
      SET game_type = 'cash' 
      WHERE game_type IS NULL
    `);
        console.log('📧 Setting default_invite = true for existing players...');
        await index_1.default.run(`
      UPDATE user_players 
      SET default_invite = 1 
      WHERE default_invite IS NULL
    `);
        console.log('\n📋 Verifying changes...');
        const sessionSample = await index_1.default.get(`
      SELECT id, name, game_type 
      FROM sessions 
      LIMIT 1
    `);
        if (sessionSample) {
            console.log(`✅ Session sample: ID ${sessionSample.id}, game_type: ${sessionSample.game_type}`);
        }
        const playerSample = await index_1.default.get(`
      SELECT up.id, p.name, up.default_invite 
      FROM user_players up 
      JOIN players p ON up.player_id = p.id 
      LIMIT 1
    `);
        if (playerSample) {
            console.log(`✅ Player sample: ${playerSample.name}, default_invite: ${playerSample.default_invite}`);
        }
        const sessionCount = await index_1.default.get('SELECT COUNT(*) as count FROM sessions');
        const playerCount = await index_1.default.get('SELECT COUNT(*) as count FROM user_players');
        console.log('\n🎉 Schema update completed successfully!');
        console.log(`📊 Updated ${sessionCount.count} sessions with game_type`);
        console.log(`👥 Updated ${playerCount.count} user_players with default_invite`);
        console.log('\n✨ New features ready:');
        console.log('  🎲 Sessions can now be marked as "cash" or "tournament"');
        console.log('  📧 Players can be configured for default invite inclusion');
    }
    catch (error) {
        console.error('❌ Error updating schema:', error);
        throw error;
    }
    process.exit(0);
}
addGameTypeAndDefaultInvite();
//# sourceMappingURL=addGameTypeAndDefaultInvite.js.map