"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("../database/index"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function importHistoricalData() {
    console.log('🎯 Starting historical data import...');
    try {
        const buyInsFile = path.join(__dirname, 'buyins.csv');
        const netProfitsFile = path.join(__dirname, 'net_profits.csv');
        console.log('📁 Reading CSV files...');
        if (!fs.existsSync(buyInsFile)) {
            console.error(`❌ Buy-ins file not found: ${buyInsFile}`);
            console.log('📝 Please create buyins.csv in the scripts directory with your buy-in data');
            return;
        }
        if (!fs.existsSync(netProfitsFile)) {
            console.error(`❌ Net profits file not found: ${netProfitsFile}`);
            console.log('📝 Please create net_profits.csv in the scripts directory with your net profit data');
            return;
        }
        const buyInsContent = fs.readFileSync(buyInsFile, 'utf-8');
        const netProfitsContent = fs.readFileSync(netProfitsFile, 'utf-8');
        const buyInsLines = buyInsContent.split('\n').filter(line => line.trim());
        const netProfitsLines = netProfitsContent.split('\n').filter(line => line.trim());
        console.log(`📊 Found ${buyInsLines.length} lines in buy-ins file`);
        console.log(`📊 Found ${netProfitsLines.length} lines in net profits file`);
        const buyInsHeaders = buyInsLines[0].split(',').slice(1);
        const netProfitsHeaders = netProfitsLines[0].split(',').slice(1);
        console.log(`📅 Found ${buyInsHeaders.length} sessions in buy-ins data`);
        console.log(`📅 Found ${netProfitsHeaders.length} sessions in net profits data`);
        if (buyInsHeaders.length !== netProfitsHeaders.length) {
            console.error('❌ Mismatch in number of sessions between files');
            return;
        }
        const sessions = [];
        for (let i = 0; i < buyInsHeaders.length; i++) {
            const date = buyInsHeaders[i].trim();
            if (!date || date === '')
                continue;
            console.log(`📅 Processing session: ${date}`);
            const sessionData = {
                date,
                players: []
            };
            for (let j = 1; j < buyInsLines.length; j++) {
                const buyInRow = buyInsLines[j].split(',');
                const netProfitRow = netProfitsLines[j].split(',');
                const playerName = buyInRow[0].trim();
                if (!playerName || playerName === '')
                    continue;
                const buyInValue = buyInRow[i + 1]?.trim();
                const netProfitValue = netProfitRow[i + 1]?.trim();
                if (!buyInValue || buyInValue === '' || !netProfitValue || netProfitValue === '')
                    continue;
                const buyIn = parseFloat(buyInValue);
                const netProfit = parseFloat(netProfitValue);
                if (isNaN(buyIn) || isNaN(netProfit))
                    continue;
                const cashOut = buyIn + netProfit;
                sessionData.players.push({
                    name: playerName,
                    buyIn,
                    netProfit,
                    cashOut
                });
            }
            if (sessionData.players.length > 0) {
                sessions.push(sessionData);
            }
        }
        console.log(`✅ Parsed ${sessions.length} sessions with data`);
        const users = await index_1.default.all('SELECT * FROM users ORDER BY id LIMIT 1');
        if (users.length === 0) {
            console.error('❌ No users found. Please make sure you have logged in at least once.');
            return;
        }
        const userId = users[0].id;
        console.log(`👤 Assigning sessions to user: ${users[0].email} (ID: ${userId})`);
        let importedSessions = 0;
        let importedPlayers = 0;
        for (const sessionData of sessions) {
            console.log(`\n🎲 Importing session: ${sessionData.date}`);
            const sessionDate = parseDate(sessionData.date);
            if (!sessionDate) {
                console.warn(`⚠️  Skipping session with invalid date: ${sessionData.date}`);
                continue;
            }
            const sessionResult = await index_1.default.run(`
        INSERT INTO sessions (name, scheduled_datetime, created_by, game_type, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [
                'Poker Night',
                sessionDate.toISOString(),
                userId,
                'cash',
                sessionDate.toISOString()
            ]);
            const sessionId = sessionResult.lastID;
            console.log(`  📝 Created session ID: ${sessionId}`);
            for (const playerData of sessionData.players) {
                let player = await index_1.default.get('SELECT * FROM players WHERE name = ?', [playerData.name]);
                if (!player) {
                    const playerResult = await index_1.default.run('INSERT INTO players (name) VALUES (?)', [playerData.name]);
                    const playerId = playerResult.lastID;
                    await index_1.default.run('INSERT INTO user_players (user_id, player_id, default_invite) VALUES (?, ?, ?)', [userId, playerId, 1]);
                    player = { id: playerId, name: playerData.name };
                    importedPlayers++;
                    console.log(`    👤 Created player: ${playerData.name} (ID: ${playerId})`);
                }
                await index_1.default.run(`
          INSERT INTO session_players (session_id, player_id, status, buy_in, cash_out)
          VALUES (?, ?, ?, ?, ?)
        `, [
                    sessionId,
                    player.id,
                    'In',
                    playerData.buyIn,
                    playerData.cashOut
                ]);
                console.log(`    💰 Added ${playerData.name}: $${playerData.buyIn} → $${playerData.cashOut} (${playerData.netProfit >= 0 ? '+' : ''}$${playerData.netProfit})`);
            }
            importedSessions++;
        }
        console.log('\n🎉 Historical data import completed successfully!');
        console.log(`📊 Summary:`);
        console.log(`  📅 Sessions imported: ${importedSessions}`);
        console.log(`  👥 New players created: ${importedPlayers}`);
        console.log(`  💰 Total session-player records created: ${sessions.reduce((sum, s) => sum + s.players.length, 0)}`);
    }
    catch (error) {
        console.error('❌ Import failed:', error);
        throw error;
    }
}
function parseDate(dateStr) {
    try {
        const parts = dateStr.split('/');
        if (parts.length === 2) {
            const month = parseInt(parts[0]);
            const day = parseInt(parts[1]);
            const year = 2025;
            const date = new Date(year, month - 1, day, 19, 0, 0);
            return date;
        }
        else if (parts.length === 3) {
            const month = parseInt(parts[0]);
            const day = parseInt(parts[1]);
            const year = parseInt(parts[2]);
            const date = new Date(year, month - 1, day, 19, 0, 0);
            return date;
        }
        return null;
    }
    catch (error) {
        console.error(`Error parsing date: ${dateStr}`, error);
        return null;
    }
}
if (require.main === module) {
    importHistoricalData()
        .then(() => {
        console.log('🎯 Import script completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        console.error('💥 Import script failed:', error);
        process.exit(1);
    });
}
exports.default = importHistoricalData;
//# sourceMappingURL=importHistoricalData.js.map