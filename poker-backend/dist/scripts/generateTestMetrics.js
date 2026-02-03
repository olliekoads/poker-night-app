"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("../database/index"));
async function generateTestMetrics() {
    console.log('🎯 Generating test metrics data...');
    try {
        const sessions = await index_1.default.all('SELECT * FROM sessions ORDER BY id');
        console.log(`Found ${sessions.length} sessions to generate metrics for`);
        const users = await index_1.default.all('SELECT * FROM users');
        console.log(`Found ${users.length} users`);
        if (sessions.length === 0) {
            console.log('❌ No sessions found. Please run the seed script first.');
            return;
        }
        const testEmails = [
            'alice@example.com',
            'bob@example.com',
            'charlie@example.com',
            'diana@example.com',
            'eve@example.com',
            'frank@example.com',
            'grace@example.com',
            'henry@example.com'
        ];
        for (const session of sessions) {
            console.log(`\n📊 Generating metrics for session: ${session.name || 'Poker Night'} (ID: ${session.id})`);
            const viewCount = Math.floor(Math.random() * 11) + 5;
            console.log(`  📱 Generating ${viewCount} invite page views...`);
            for (let i = 0; i < viewCount; i++) {
                const email = testEmails[Math.floor(Math.random() * testEmails.length)];
                const hoursAgo = Math.floor(Math.random() * 72) + 1;
                const createdAt = new Date(Date.now() - (hoursAgo * 60 * 60 * 1000)).toISOString();
                await index_1.default.run(`
          INSERT INTO user_metrics (
            user_id, session_id, player_email, event_type, event_data, 
            ip_address, user_agent, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
                    session.created_by || 1,
                    session.id,
                    email,
                    'invite_page_view',
                    JSON.stringify({
                        source: Math.random() > 0.5 ? 'mobile' : 'desktop',
                        referrer: Math.random() > 0.7 ? 'direct' : 'link'
                    }),
                    `192.168.1.${Math.floor(Math.random() * 255)}`,
                    Math.random() > 0.5 ?
                        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15' :
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    createdAt
                ]);
            }
            const responseCount = Math.floor(Math.random() * 6) + 3;
            console.log(`  ✅ Generating ${responseCount} status responses...`);
            const statuses = ['In', 'Out', 'Maybe', 'Attending but not playing'];
            for (let i = 0; i < responseCount; i++) {
                const email = testEmails[Math.floor(Math.random() * testEmails.length)];
                const status = statuses[Math.floor(Math.random() * statuses.length)];
                const hoursAgo = Math.floor(Math.random() * 48) + 1;
                const createdAt = new Date(Date.now() - (hoursAgo * 60 * 60 * 1000)).toISOString();
                await index_1.default.run(`
          INSERT INTO user_metrics (
            user_id, session_id, player_email, event_type, event_data, 
            ip_address, user_agent, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
                    session.created_by || 1,
                    session.id,
                    email,
                    'status_response',
                    JSON.stringify({
                        status: status,
                        previous_status: 'Invited',
                        response_time_hours: hoursAgo
                    }),
                    `192.168.1.${Math.floor(Math.random() * 255)}`,
                    Math.random() > 0.5 ?
                        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15' :
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    createdAt
                ]);
            }
            const sessionCreatedAt = new Date(session.created_at || Date.now()).toISOString();
            await index_1.default.run(`
        INSERT INTO user_metrics (
          user_id, session_id, event_type, event_data, 
          ip_address, user_agent, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
                session.created_by || 1,
                session.id,
                'session_created',
                JSON.stringify({
                    session_name: session.name || 'Poker Night',
                    scheduled_datetime: session.scheduled_datetime,
                    player_count: Math.floor(Math.random() * 8) + 4
                }),
                `192.168.1.${Math.floor(Math.random() * 255)}`,
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                sessionCreatedAt
            ]);
            const loginCount = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < loginCount; i++) {
                const hoursAgo = Math.floor(Math.random() * 24) + 1;
                const createdAt = new Date(Date.now() - (hoursAgo * 60 * 60 * 1000)).toISOString();
                await index_1.default.run(`
          INSERT INTO user_metrics (
            user_id, event_type, event_data, 
            ip_address, user_agent, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
                    session.created_by || 1,
                    'user_login',
                    JSON.stringify({
                        login_method: 'google_oauth',
                        session_duration_estimate: Math.floor(Math.random() * 120) + 30
                    }),
                    `192.168.1.${Math.floor(Math.random() * 255)}`,
                    Math.random() > 0.5 ?
                        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15' :
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    createdAt
                ]);
            }
            console.log(`  ✅ Generated metrics for session ${session.id}`);
        }
        console.log('\n🎲 Generating additional random events...');
        const additionalEvents = ['player_added', 'session_viewed', 'seating_chart_generated'];
        for (let i = 0; i < 10; i++) {
            const eventType = additionalEvents[Math.floor(Math.random() * additionalEvents.length)];
            const sessionId = sessions[Math.floor(Math.random() * sessions.length)].id;
            const hoursAgo = Math.floor(Math.random() * 168) + 1;
            const createdAt = new Date(Date.now() - (hoursAgo * 60 * 60 * 1000)).toISOString();
            await index_1.default.run(`
        INSERT INTO user_metrics (
          user_id, session_id, event_type, event_data, 
          ip_address, user_agent, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
                1,
                sessionId,
                eventType,
                JSON.stringify({
                    action: eventType,
                    timestamp: createdAt,
                    random_data: Math.floor(Math.random() * 1000)
                }),
                `192.168.1.${Math.floor(Math.random() * 255)}`,
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                createdAt
            ]);
        }
        console.log('\n🎉 Test metrics generation completed successfully!');
        console.log('\n📊 Summary:');
        const totalMetrics = await index_1.default.get('SELECT COUNT(*) as count FROM user_metrics');
        console.log(`  📈 Total metrics events: ${totalMetrics.count}`);
        const eventTypes = await index_1.default.all(`
      SELECT event_type, COUNT(*) as count 
      FROM user_metrics 
      GROUP BY event_type 
      ORDER BY count DESC
    `);
        console.log('  📋 Event breakdown:');
        eventTypes.forEach(type => {
            console.log(`    ${type.event_type}: ${type.count} events`);
        });
        console.log('\n✨ You can now view metrics for your sessions!');
        console.log('   Go to your sessions page and click "View Metrics" on any session you own.');
    }
    catch (error) {
        console.error('❌ Error generating test metrics:', error);
        throw error;
    }
    process.exit(0);
}
generateTestMetrics();
//# sourceMappingURL=generateTestMetrics.js.map