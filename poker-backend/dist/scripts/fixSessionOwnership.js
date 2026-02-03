"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("../database/index"));
async function fixSessionOwnership() {
    console.log('🔧 Fixing session ownership for metrics testing...');
    try {
        const users = await index_1.default.all('SELECT * FROM users ORDER BY id');
        console.log('📋 Available users:');
        users.forEach(user => {
            console.log(`  ID: ${user.id}, Email: ${user.email}, Name: ${user.name}`);
        });
        if (users.length === 0) {
            console.log('❌ No users found. Please make sure you have logged in at least once.');
            return;
        }
        const primaryUser = users[0];
        console.log(`\n🎯 Setting ${primaryUser.email} (ID: ${primaryUser.id}) as owner of all sessions...`);
        const sessions = await index_1.default.all('SELECT * FROM sessions ORDER BY id');
        console.log(`\n📊 Found ${sessions.length} sessions to update:`);
        for (const session of sessions) {
            console.log(`  📝 Updating session: "${session.name || 'Poker Night'}" (ID: ${session.id})`);
            await index_1.default.run('UPDATE sessions SET created_by = ? WHERE id = ?', [primaryUser.id, session.id]);
            await index_1.default.run('UPDATE user_metrics SET user_id = ? WHERE session_id = ?', [primaryUser.id, session.id]);
        }
        console.log('\n✅ Session ownership updated successfully!');
        const updatedSessions = await index_1.default.all(`
      SELECT s.*, u.email as owner_email 
      FROM sessions s 
      LEFT JOIN users u ON s.created_by = u.id 
      ORDER BY s.id
    `);
        console.log('\n📋 Updated session ownership:');
        updatedSessions.forEach(session => {
            console.log(`  📊 "${session.name || 'Poker Night'}" (ID: ${session.id}) → Owner: ${session.owner_email}`);
        });
        const metricsCount = await index_1.default.get(`
      SELECT COUNT(*) as count 
      FROM user_metrics 
      WHERE user_id = ?
    `, [primaryUser.id]);
        console.log(`\n📈 Total metrics events for ${primaryUser.email}: ${metricsCount.count}`);
        console.log('\n🎉 You can now view metrics for all your sessions!');
        console.log('   Go to https://edwinpokernight.com and click "View Metrics" on any session.');
    }
    catch (error) {
        console.error('❌ Error fixing session ownership:', error);
        throw error;
    }
    process.exit(0);
}
fixSessionOwnership();
//# sourceMappingURL=fixSessionOwnership.js.map