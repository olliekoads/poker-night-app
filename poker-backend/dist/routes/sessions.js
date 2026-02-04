"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const index_1 = __importDefault(require("../database/index"));
const auth_1 = require("../middleware/auth");
const metricsService_1 = __importDefault(require("../services/metricsService"));
const emailService_1 = require("../services/emailService");
const router = express_1.default.Router();
function generateSessionNameFromDateTime(dateTimeString) {
    const date = new Date(dateTimeString);
    const options = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        hour12: true
    };
    return date.toLocaleDateString('en-US', options);
}
router.get('/', auth_1.authenticateToken, async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    const userEmail = req.user?.email;
    const sql = `
    SELECT DISTINCT
      s.*,
      GROUP_CONCAT(p.id) as player_ids,
      GROUP_CONCAT(p.name) as player_names,
      GROUP_CONCAT(sp.status) as player_statuses,
      GROUP_CONCAT(sp.buy_in) as player_buy_ins,
      GROUP_CONCAT(sp.cash_out) as player_cash_outs
    FROM sessions s
    LEFT JOIN session_players sp ON s.id = sp.session_id
    LEFT JOIN players p ON sp.player_id = p.id
    WHERE s.created_by = ?
       OR s.id IN (
         SELECT DISTINCT sp2.session_id
         FROM session_players sp2
         JOIN players p2 ON sp2.player_id = p2.id
         WHERE p2.email = ?
       )
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `;
    try {
        const rows = await index_1.default.all(sql, [userId, userEmail]);
        const sessions = rows.map(row => ({
            id: row.id,
            name: row.name,
            scheduledDateTime: row.scheduled_datetime,
            createdBy: row.created_by,
            createdAt: row.created_at,
            game_type: row.game_type || 'cash',
            players: row.player_ids ? row.player_ids.split(',').map((id, index) => ({
                id: `${row.id}-${parseInt(id)}`,
                session_id: row.id,
                player_id: parseInt(id),
                status: row.player_statuses ? row.player_statuses.split(',')[index] : 'Invited',
                buy_in: row.player_buy_ins ? parseFloat(row.player_buy_ins.split(',')[index]) || 0 : 0,
                cash_out: row.player_cash_outs ? parseFloat(row.player_cash_outs.split(',')[index]) || 0 : 0,
                created_at: row.created_at,
                player: {
                    id: parseInt(id),
                    name: row.player_names.split(',')[index],
                    created_at: row.created_at
                }
            })) : []
        }));
        res.json(sessions);
    }
    catch (err) {
        console.error('Error fetching sessions:', err.message);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const sql = `
    SELECT
      s.*,
      GROUP_CONCAT(p.id) as player_ids,
      GROUP_CONCAT(p.name) as player_names,
      GROUP_CONCAT(p.email) as player_emails,
      GROUP_CONCAT(sp.status) as player_statuses,
      GROUP_CONCAT(sp.buy_in) as player_buy_ins,
      GROUP_CONCAT(sp.cash_out) as player_cash_outs
    FROM sessions s
    LEFT JOIN session_players sp ON s.id = sp.session_id
    LEFT JOIN players p ON sp.player_id = p.id
    WHERE s.id = ?
    GROUP BY s.id
  `;
    try {
        const row = await index_1.default.get(sql, [id]);
        if (!row) {
            res.status(404).json({ error: 'Session not found' });
        }
        else {
            const session = {
                id: row.id,
                name: row.name,
                scheduledDateTime: row.scheduled_datetime,
                createdBy: row.created_by,
                createdAt: row.created_at,
                game_type: row.game_type || 'cash',
                players: row.player_ids ? row.player_ids.split(',').map((id, index) => ({
                    id: `${row.id}-${parseInt(id)}`,
                    session_id: row.id,
                    player_id: parseInt(id),
                    status: row.player_statuses ? row.player_statuses.split(',')[index] : 'Invited',
                    buy_in: row.player_buy_ins ? parseFloat(row.player_buy_ins.split(',')[index]) || 0 : 0,
                    cash_out: row.player_cash_outs ? parseFloat(row.player_cash_outs.split(',')[index]) || 0 : 0,
                    created_at: row.created_at,
                    player: {
                        id: parseInt(id),
                        name: row.player_names.split(',')[index],
                        email: row.player_emails ? row.player_emails.split(',')[index] : null,
                        created_at: row.created_at
                    }
                })) : []
            };
            res.json(session);
        }
    }
    catch (err) {
        console.error('Error fetching session:', err.message);
        res.status(500).json({ error: 'Failed to fetch session' });
    }
});
router.post('/past', auth_1.authenticateToken, async (req, res) => {
    const { name, scheduledDateTime, game_type, players } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    if (!scheduledDateTime || !players || !Array.isArray(players) || players.length === 0) {
        res.status(400).json({ error: 'scheduledDateTime and players array are required' });
        return;
    }
    try {
        const sessionResult = await index_1.default.run('INSERT INTO sessions (name, scheduled_datetime, created_by, game_type, created_at) VALUES (?, ?, ?, ?, ?)', [name || 'Poker Night', scheduledDateTime, userId, game_type || 'cash', new Date().toISOString()]);
        const sessionId = sessionResult.lastID;
        for (const player of players) {
            const { playerId, buyIn, cashOut } = player;
            if (typeof playerId !== 'number' || typeof buyIn !== 'number' || typeof cashOut !== 'number') {
                res.status(400).json({ error: 'Invalid player data format' });
                return;
            }
            await index_1.default.run('INSERT INTO session_players (session_id, player_id, status, buy_in, cash_out) VALUES (?, ?, ?, ?, ?)', [sessionId, playerId, 'In', buyIn, cashOut]);
        }
        const session = await index_1.default.get(`
      SELECT s.*, u.email as created_by_email
      FROM sessions s
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.id = ?
    `, [sessionId]);
        const sessionPlayers = await index_1.default.all(`
      SELECT sp.*, p.name as player_name, p.email as player_email
      FROM session_players sp
      JOIN players p ON sp.player_id = p.id
      WHERE sp.session_id = ?
    `, [sessionId]);
        const responseSession = {
            ...session,
            scheduledDateTime: session.scheduled_datetime,
            createdAt: session.created_at,
            createdBy: session.created_by,
            createdByEmail: session.created_by_email,
            gameType: session.game_type,
            players: sessionPlayers.map(sp => ({
                player_id: sp.player_id,
                player_name: sp.player_name,
                player_email: sp.player_email,
                status: sp.status,
                buy_in: sp.buy_in,
                cash_out: sp.cash_out
            }))
        };
        res.status(201).json(responseSession);
    }
    catch (err) {
        console.error('Error creating past session:', err.message);
        res.status(500).json({ error: 'Failed to create past session' });
    }
});
router.post('/', auth_1.authenticateToken, async (req, res) => {
    const { name, scheduledDateTime, timezone, playerIds, game_type } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    if (!scheduledDateTime) {
        res.status(400).json({ error: 'Scheduled date and time is required' });
        return;
    }
    const sessionName = name?.trim() || generateSessionNameFromDateTime(scheduledDateTime);
    const gameType = game_type || 'cash';
    const sessionTimezone = timezone || 'America/Los_Angeles';
    const sql = 'INSERT INTO sessions (name, scheduled_datetime, timezone, created_by, game_type) VALUES (?, ?, ?, ?, ?)';
    try {
        const result = await index_1.default.run(sql, [sessionName, scheduledDateTime, sessionTimezone, userId, gameType]);
        const sessionId = result.lastID;
        if (!sessionId) {
            throw new Error('Failed to get session ID');
        }
        if (playerIds && playerIds.length > 0) {
            await addPlayersToSession(sessionId, playerIds);
        }
        metricsService_1.default.trackSessionCreated(userId, sessionId);
        console.log('📧 Checking email sending...', { sessionId, playerIds, playerCount: playerIds?.length });
        if (playerIds && playerIds.length > 0) {
            console.log('📧 Starting background email sending for session', sessionId);
            sendSessionInviteEmails(sessionId, userId).catch(err => {
                console.error('Background email sending failed:', err);
            });
        }
        else {
            console.log('📧 No players to email (playerIds empty or undefined)');
        }
        await fetchSessionById(sessionId, res);
    }
    catch (err) {
        console.error('Error creating session:', err.message);
        res.status(500).json({ error: 'Failed to create session' });
    }
});
router.put('/:id', auth_1.authenticateToken, auth_1.requireSessionOwnership, async (req, res) => {
    const { id } = req.params;
    const { name, scheduledDateTime, timezone, playerIds, game_type } = req.body;
    if (!scheduledDateTime) {
        res.status(400).json({ error: 'Scheduled date and time is required' });
        return;
    }
    const sessionName = name?.trim() || generateSessionNameFromDateTime(scheduledDateTime);
    const gameType = game_type || 'cash';
    const sessionTimezone = timezone || 'America/Los_Angeles';
    const sql = 'UPDATE sessions SET name = ?, scheduled_datetime = ?, timezone = ?, game_type = ? WHERE id = ?';
    try {
        const result = await index_1.default.run(sql, [sessionName, scheduledDateTime, sessionTimezone, gameType, id]);
        if (result.changes === 0) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        await index_1.default.run('DELETE FROM session_players WHERE session_id = ?', [id]);
        if (playerIds && playerIds.length > 0) {
            await addPlayersToSession(parseInt(id), playerIds);
        }
        await fetchSessionById(parseInt(id), res);
    }
    catch (err) {
        console.error('Error updating session:', err.message);
        res.status(500).json({ error: 'Failed to update session' });
    }
});
router.delete('/:id', auth_1.authenticateToken, auth_1.requireSessionOwnership, async (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM sessions WHERE id = ?';
    try {
        const result = await index_1.default.run(sql, [id]);
        if (result.changes === 0) {
            res.status(404).json({ error: 'Session not found' });
        }
        else {
            res.json({ message: 'Session deleted successfully' });
        }
    }
    catch (err) {
        console.error('Error deleting session:', err.message);
        res.status(500).json({ error: 'Failed to delete session' });
    }
});
router.put('/:sessionId/players/:playerId/status', async (req, res) => {
    const { sessionId, playerId } = req.params;
    const { status } = req.body;
    if (!sessionId || !playerId) {
        res.status(400).json({ error: 'Session ID and Player ID are required' });
        return;
    }
    const sessionIdNum = parseInt(sessionId);
    const playerIdNum = parseInt(playerId);
    if (!status) {
        res.status(400).json({ error: 'Status is required' });
        return;
    }
    const validStatuses = ['Invited', 'In', 'Out', 'Maybe', 'Attending but not playing'];
    if (!validStatuses.includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
    }
    const sql = 'UPDATE session_players SET status = ? WHERE session_id = ? AND player_id = ?';
    try {
        const result = await index_1.default.run(sql, [status, sessionIdNum, playerIdNum]);
        if (result.changes === 0) {
            res.status(404).json({ error: 'Player not found in session' });
        }
        else {
            try {
                const playerResult = await index_1.default.get('SELECT email FROM players WHERE id = ?', [playerIdNum]);
                if (playerResult?.email) {
                    metricsService_1.default.trackStatusResponse(sessionIdNum, playerResult.email, status);
                }
            }
            catch (trackingError) {
                console.error('Error tracking status response:', trackingError);
            }
            res.json({ message: 'Player status updated successfully', status });
        }
    }
    catch (err) {
        console.error('Error updating player status:', err.message);
        res.status(500).json({ error: 'Failed to update player status' });
    }
});
router.put('/:sessionId/players/:playerId/financials', async (req, res) => {
    const { sessionId, playerId } = req.params;
    const { buy_in, cash_out } = req.body;
    if (!sessionId || !playerId) {
        res.status(400).json({ error: 'Session ID and Player ID are required' });
        return;
    }
    const sessionIdNum = parseInt(sessionId);
    const playerIdNum = parseInt(playerId);
    if (buy_in === undefined && cash_out === undefined) {
        res.status(400).json({ error: 'At least one of buy_in or cash_out is required' });
        return;
    }
    if ((buy_in !== undefined && (isNaN(buy_in) || buy_in < 0)) ||
        (cash_out !== undefined && (isNaN(cash_out) || cash_out < 0))) {
        res.status(400).json({ error: 'Buy-in and cash-out amounts must be non-negative numbers' });
        return;
    }
    const updates = [];
    const params = [];
    if (buy_in !== undefined) {
        updates.push('buy_in = ?');
        params.push(buy_in);
    }
    if (cash_out !== undefined) {
        updates.push('cash_out = ?');
        params.push(cash_out);
    }
    params.push(sessionIdNum, playerIdNum);
    const sql = `UPDATE session_players SET ${updates.join(', ')} WHERE session_id = ? AND player_id = ?`;
    try {
        const result = await index_1.default.run(sql, params);
        if (result.changes === 0) {
            res.status(404).json({ error: 'Player not found in session' });
        }
        else {
            res.json({
                message: 'Player financials updated successfully',
                buy_in: buy_in || null,
                cash_out: cash_out || null
            });
        }
    }
    catch (err) {
        console.error('Error updating player financials:', err.message);
        res.status(500).json({ error: 'Failed to update player financials' });
    }
});
router.post('/:sessionId/players/:playerId', async (req, res) => {
    const { sessionId, playerId } = req.params;
    const { status } = req.body;
    if (!sessionId || !playerId) {
        res.status(400).json({ error: 'Session ID and Player ID are required' });
        return;
    }
    const sessionIdNum = parseInt(sessionId);
    const playerIdNum = parseInt(playerId);
    if (!status) {
        res.status(400).json({ error: 'Status is required' });
        return;
    }
    const validStatuses = ['Invited', 'In', 'Out', 'Maybe', 'Attending but not playing'];
    if (!validStatuses.includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
    }
    const checkSql = 'SELECT id FROM session_players WHERE session_id = ? AND player_id = ?';
    try {
        const row = await index_1.default.get(checkSql, [sessionIdNum, playerIdNum]);
        if (row) {
            const updateSql = 'UPDATE session_players SET status = ? WHERE session_id = ? AND player_id = ?';
            await index_1.default.run(updateSql, [status, sessionIdNum, playerIdNum]);
            res.json({ message: 'Player status updated successfully', status, action: 'updated' });
        }
        else {
            const insertSql = 'INSERT INTO session_players (session_id, player_id, status, buy_in, cash_out) VALUES (?, ?, ?, 0, 0)';
            await index_1.default.run(insertSql, [sessionIdNum, playerIdNum, status]);
            sendPlayerAddedEmail(sessionIdNum, playerIdNum).catch(err => {
                console.error('Background email sending failed:', err);
            });
            res.json({ message: 'Player added to session successfully', status, action: 'added' });
        }
    }
    catch (err) {
        console.error('Error managing player in session:', err.message);
        res.status(500).json({ error: 'Failed to manage player in session' });
    }
});
async function addPlayersToSession(sessionId, playerIds) {
    if (!playerIds || playerIds.length === 0) {
        return;
    }
    const placeholders = playerIds.map(() => '(?, ?, ?, ?, ?)').join(', ');
    const sql = `INSERT INTO session_players (session_id, player_id, status, buy_in, cash_out) VALUES ${placeholders}`;
    const params = [];
    playerIds.forEach(playerId => {
        params.push(sessionId, playerId, 'Invited', 0, 0);
    });
    await index_1.default.run(sql, params);
}
async function fetchSessionById(sessionId, res) {
    const sql = `
    SELECT
      s.*,
      GROUP_CONCAT(p.id) as player_ids,
      GROUP_CONCAT(p.name) as player_names,
      GROUP_CONCAT(p.email) as player_emails,
      GROUP_CONCAT(sp.status) as player_statuses,
      GROUP_CONCAT(sp.buy_in) as player_buy_ins,
      GROUP_CONCAT(sp.cash_out) as player_cash_outs
    FROM sessions s
    LEFT JOIN session_players sp ON s.id = sp.session_id
    LEFT JOIN players p ON sp.player_id = p.id
    WHERE s.id = ?
    GROUP BY s.id
  `;
    try {
        const row = await index_1.default.get(sql, [sessionId]);
        if (row) {
            const session = {
                id: row.id,
                name: row.name,
                scheduledDateTime: row.scheduled_datetime,
                createdBy: row.created_by,
                createdAt: row.created_at,
                game_type: row.game_type || 'cash',
                players: row.player_ids ? row.player_ids.split(',').map((id, index) => ({
                    id: `${row.id}-${parseInt(id)}`,
                    session_id: row.id,
                    player_id: parseInt(id),
                    status: row.player_statuses ? row.player_statuses.split(',')[index] : 'Invited',
                    buy_in: row.player_buy_ins ? parseFloat(row.player_buy_ins.split(',')[index]) || 0 : 0,
                    cash_out: row.player_cash_outs ? parseFloat(row.player_cash_outs.split(',')[index]) || 0 : 0,
                    created_at: row.created_at,
                    player: {
                        id: parseInt(id),
                        name: row.player_names.split(',')[index],
                        email: row.player_emails ? row.player_emails.split(',')[index] : null,
                        created_at: row.created_at
                    }
                })) : []
            };
            res.status(201).json(session);
        }
        else {
            res.status(500).json({ error: 'Session saved but not found' });
        }
    }
    catch (err) {
        console.error('Error fetching created/updated session:', err.message);
        res.status(500).json({ error: 'Session saved but failed to fetch' });
    }
}
router.post('/:sessionId/invite-view', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { playerEmail } = req.body;
        console.log('📊 Tracking invite view:', { sessionId, playerEmail, ip: req.ip, userAgent: req.get('User-Agent') });
        if (!sessionId || !playerEmail) {
            console.log('❌ Missing required fields:', { sessionId, playerEmail });
            res.status(400).json({ error: 'Session ID and player email are required' });
            return;
        }
        await metricsService_1.default.trackInvitePageView(parseInt(sessionId), playerEmail, req.ip, req.get('User-Agent'));
        console.log('✅ Invite view tracked successfully for session', sessionId, 'email', playerEmail);
        res.json({ message: 'Invite view tracked successfully' });
    }
    catch (error) {
        console.error('❌ Error tracking invite view:', error);
        res.status(500).json({ error: 'Failed to track invite view' });
    }
});
router.post('/:sessionId/send-reminders', auth_1.authenticateToken, auth_1.requireSessionOwnership, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const sessionIdNum = parseInt(sessionId);
        if (!sessionIdNum) {
            res.status(400).json({ error: 'Valid session ID is required' });
            return;
        }
        const nonRespondersSql = `
      SELECT p.id, p.name, p.email
      FROM session_players sp
      JOIN players p ON sp.player_id = p.id
      WHERE sp.session_id = ?
        AND sp.status = 'Invited'
        AND p.email IS NOT NULL
        AND p.email != ''
    `;
        const nonResponders = await index_1.default.all(nonRespondersSql, [sessionIdNum]);
        if (nonResponders.length === 0) {
            res.json({
                message: 'No non-responders with email addresses found',
                sent: 0,
                failed: 0
            });
            return;
        }
        const result = await sendSessionReminderEmails(sessionIdNum, req.user?.id);
        res.json({
            message: `Reminder emails sent to ${result.sent} players`,
            sent: result.sent,
            failed: result.failed,
            totalNonResponders: nonResponders.length
        });
    }
    catch (error) {
        console.error('Error sending reminder emails:', error);
        res.status(500).json({ error: 'Failed to send reminder emails' });
    }
});
async function sendSessionInviteEmails(sessionId, hostUserId) {
    console.log('📧 sendSessionInviteEmails called for session', sessionId);
    try {
        console.log('📧 Querying session details...');
        const sessionSql = `
      SELECT s.*, u.email as host_email, u.name as host_name
      FROM sessions s
      JOIN users u ON s.created_by = u.id
      WHERE s.id = ?
    `;
        const session = await index_1.default.get(sessionSql, [sessionId]);
        console.log('📧 Session found:', session ? 'YES' : 'NO');
        if (!session) {
            console.error('Session not found for email sending:', sessionId);
            return;
        }
        console.log('📧 Querying players with emails...');
        const playersSql = `
      SELECT p.id, p.name, p.email
      FROM session_players sp
      JOIN players p ON sp.player_id = p.id
      WHERE sp.session_id = ? AND p.email IS NOT NULL AND p.email != ''
    `;
        const players = await index_1.default.all(playersSql, [sessionId]);
        console.log('📧 Players with emails found:', players.length, players.map(p => ({ id: p.id, name: p.name, hasEmail: !!p.email })));
        if (players.length === 0) {
            console.log('No players with email addresses found for session:', sessionId);
            return;
        }
        const baseUrl = process.env.FRONTEND_URL || 'https://edwinpokernight.com';
        console.log('📧 Base URL:', baseUrl);
        const hostName = session.host_name || session.host_email || 'Poker Night Host';
        console.log('📧 Host name:', hostName);
        console.log('📧 Calling emailService.sendBulkSessionInvites...');
        const result = await emailService_1.emailService.sendBulkSessionInvites({
            id: session.id,
            name: session.name,
            scheduled_datetime: session.scheduled_datetime,
            created_by: session.created_by,
            created_at: session.created_at,
            game_type: session.game_type
        }, players, hostName, baseUrl);
        console.log(`✅ Session invite emails sent for session ${sessionId}: ${result.sent} sent, ${result.failed} failed`);
    }
    catch (error) {
        console.error('❌ Error sending session invite emails:', error);
    }
}
async function sendPlayerAddedEmail(sessionId, playerId) {
    try {
        const sessionSql = `
      SELECT s.*, u.email as host_email, u.name as host_name
      FROM sessions s
      JOIN users u ON s.created_by = u.id
      WHERE s.id = ?
    `;
        const session = await index_1.default.get(sessionSql, [sessionId]);
        if (!session) {
            console.error('Session not found for player added email:', sessionId);
            return;
        }
        const playerSql = 'SELECT id, name, email FROM players WHERE id = ?';
        const player = await index_1.default.get(playerSql, [playerId]);
        if (!player || !player.email) {
            console.log(`Player ${playerId} has no email address. Skipping email send.`);
            return;
        }
        const baseUrl = process.env.FRONTEND_URL || 'https://edwinpokernight.com';
        const hostName = session.host_name || session.host_email || 'Poker Night Host';
        const encodedEmail = Buffer.from(player.email).toString('base64');
        const inviteUrl = `${baseUrl}/invite/${session.id}/${encodedEmail}`;
        const success = await emailService_1.emailService.sendSessionInviteEmail({
            session: {
                id: session.id,
                name: session.name,
                scheduled_datetime: session.scheduled_datetime,
                created_by: session.created_by,
                created_at: session.created_at,
                game_type: session.game_type
            },
            player,
            inviteUrl,
            hostName
        });
        if (success) {
            console.log(`Player added email sent to ${player.email} for session ${sessionId}`);
        }
    }
    catch (error) {
        console.error('Error sending player added email:', error);
    }
}
async function sendSessionReminderEmails(sessionId, hostUserId) {
    try {
        const sessionSql = `
      SELECT s.*, u.email as host_email, u.name as host_name
      FROM sessions s
      JOIN users u ON s.created_by = u.id
      WHERE s.id = ?
    `;
        const session = await index_1.default.get(sessionSql, [sessionId]);
        if (!session) {
            console.error('Session not found for reminder emails:', sessionId);
            return { sent: 0, failed: 0 };
        }
        const nonRespondersSql = `
      SELECT p.id, p.name, p.email
      FROM session_players sp
      JOIN players p ON sp.player_id = p.id
      WHERE sp.session_id = ?
        AND sp.status = 'Invited'
        AND p.email IS NOT NULL
        AND p.email != ''
    `;
        const nonResponders = await index_1.default.all(nonRespondersSql, [sessionId]);
        if (nonResponders.length === 0) {
            console.log('No non-responders with email addresses found for session:', sessionId);
            return { sent: 0, failed: 0 };
        }
        const baseUrl = process.env.FRONTEND_URL || 'https://edwinpokernight.com';
        const hostName = session.host_name || session.host_email || 'Poker Night Host';
        const result = await emailService_1.emailService.sendBulkSessionReminders({
            id: session.id,
            name: session.name,
            scheduled_datetime: session.scheduled_datetime,
            created_by: session.created_by,
            created_at: session.created_at,
            game_type: session.game_type
        }, nonResponders, hostName, baseUrl);
        console.log(`Session reminder emails sent for session ${sessionId}: ${result.sent} sent, ${result.failed} failed`);
        return result;
    }
    catch (error) {
        console.error('Error sending session reminder emails:', error);
        return { sent: 0, failed: 0 };
    }
}
exports.default = router;
//# sourceMappingURL=sessions.js.map