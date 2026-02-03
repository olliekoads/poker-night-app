"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = seedDatabase;
const index_1 = __importDefault(require("../database/index"));
const samplePlayers = [
    { name: 'Alice Johnson' },
    { name: 'Bob Smith' },
    { name: 'Charlie Brown' },
    { name: 'Diana Prince' },
    { name: 'Eddie Murphy' }
];
const sampleSessions = [
    {
        name: 'Friday Night Poker',
        scheduled_datetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        playerIds: [1, 2, 3]
    },
    {
        name: 'Weekend Tournament',
        scheduled_datetime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        playerIds: [2, 3, 4, 5]
    },
    {
        name: 'Monthly Championship',
        scheduled_datetime: null,
        playerIds: [1, 3, 5]
    }
];
async function seedDatabase() {
    console.log('🌱 Starting database seeding...');
    try {
        await index_1.default.run('DELETE FROM session_players');
        await index_1.default.run('DELETE FROM sessions');
        await index_1.default.run('DELETE FROM players');
        console.log('✅ Cleared existing data');
        const playerIds = [];
        for (const player of samplePlayers) {
            const result = await index_1.default.run('INSERT INTO players (name) VALUES (?)', [player.name]);
            const playerId = result.lastID;
            playerIds.push(playerId);
            console.log(`✅ Created player: ${player.name} (ID: ${playerId})`);
        }
        const defaultUserId = 1;
        for (const session of sampleSessions) {
            const result = await index_1.default.run('INSERT INTO sessions (name, scheduled_datetime, created_by) VALUES (?, ?, ?)', [session.name, session.scheduled_datetime, defaultUserId]);
            const sessionId = result.lastID;
            console.log(`✅ Created session: ${session.name} (ID: ${sessionId})`);
            for (const playerIndex of session.playerIds) {
                if (playerIds[playerIndex - 1]) {
                    await index_1.default.run('INSERT INTO session_players (session_id, player_id, status, buy_in, cash_out) VALUES (?, ?, ?, ?, ?)', [sessionId, playerIds[playerIndex - 1], 'Invited', 0, 0]);
                }
            }
            console.log(`✅ Added ${session.playerIds.length} players to session: ${session.name}`);
        }
        console.log('🎉 Database seeding completed successfully!');
        console.log(`📊 Created ${playerIds.length} players and ${sampleSessions.length} sessions`);
    }
    catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
    process.exit(0);
}
if (require.main === module) {
    seedDatabase();
}
//# sourceMappingURL=seed.js.map