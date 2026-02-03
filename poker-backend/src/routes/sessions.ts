import express, { Request, Response } from 'express';
import db from '../database/index';
import { authenticateToken, requireSessionOwnership, requireAuth } from '../middleware/auth';
import {
  SessionWithPlayers,
  CreateSessionRequest,
  UpdateSessionRequest,
  UpdatePlayerStatusRequest,
  UpdatePlayerFinancialsRequest,
  SessionQueryResult,
  TypedRequest,
  PlayerStatus
} from '../types/index';
import MetricsService from '../services/metricsService';
import { emailService } from '../services/emailService';

const router = express.Router();

// Helper function to generate session name from date/time
function generateSessionNameFromDateTime(dateTimeString: string): string {
  const date = new Date(dateTimeString);
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    hour12: true
  };
  return date.toLocaleDateString('en-US', options);
}

// GET all sessions where user is creator OR participant
router.get('/', authenticateToken, async (req: any, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // First, find the user's email to match with players table
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
    const rows = await db.all(sql, [userId, userEmail]);
    // Transform the data to match frontend format
    const sessions: SessionWithPlayers[] = rows.map(row => ({
      id: row.id,
      name: row.name,
      scheduledDateTime: row.scheduled_datetime,
      createdBy: row.created_by,
      createdAt: row.created_at,
      game_type: row.game_type || 'cash',
      players: row.player_ids ? row.player_ids.split(',').map((id: string, index: number) => ({
        id: `${row.id}-${parseInt(id)}`, // Unique session_player id using session-player combination
        session_id: row.id,
        player_id: parseInt(id),
        status: row.player_statuses ? row.player_statuses.split(',')[index] as PlayerStatus : 'Invited' as PlayerStatus,
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
  } catch (err: any) {
    console.error('Error fetching sessions:', err.message);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});


// GET session by ID
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
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
    const row = await db.get(sql, [id]);
    if (!row) {
      res.status(404).json({ error: 'Session not found' });
    } else {
      const session: SessionWithPlayers = {
        id: row.id,
        name: row.name,
        scheduledDateTime: row.scheduled_datetime,
        createdBy: row.created_by,
        createdAt: row.created_at,
        game_type: row.game_type || 'cash',
        players: row.player_ids ? row.player_ids.split(',').map((id: string, index: number) => ({
          id: `${row.id}-${parseInt(id)}`, // Unique session_player id using session-player combination
          session_id: row.id,
          player_id: parseInt(id),
          status: row.player_statuses ? row.player_statuses.split(',')[index] as PlayerStatus : 'Invited' as PlayerStatus,
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
  } catch (err: any) {
    console.error('Error fetching session:', err.message);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// POST create past session with financial data
router.post('/past', authenticateToken, async (req: any, res: Response): Promise<void> => {
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
    // Create the session
    const sessionResult = await db.run(
      'INSERT INTO sessions (name, scheduled_datetime, created_by, game_type, created_at) VALUES (?, ?, ?, ?, ?)',
      [name || 'Poker Night', scheduledDateTime, userId, game_type || 'cash', new Date().toISOString()]
    );

    const sessionId = sessionResult.lastID;

    // Add players with their financial data
    for (const player of players) {
      const { playerId, buyIn, cashOut } = player;

      if (typeof playerId !== 'number' || typeof buyIn !== 'number' || typeof cashOut !== 'number') {
        res.status(400).json({ error: 'Invalid player data format' });
        return;
      }

      // Add player to session with financial data
      await db.run(
        'INSERT INTO session_players (session_id, player_id, status, buy_in, cash_out) VALUES (?, ?, ?, ?, ?)',
        [sessionId, playerId, 'In', buyIn, cashOut]
      );
    }

    // Fetch the complete session data
    const session = await db.get(`
      SELECT s.*, u.email as created_by_email
      FROM sessions s
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.id = ?
    `, [sessionId]);

    // Fetch session players
    const sessionPlayers = await db.all(`
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
  } catch (err: any) {
    console.error('Error creating past session:', err.message);
    res.status(500).json({ error: 'Failed to create past session' });
  }
});

// POST create new session
router.post('/', authenticateToken, async (req: any, res: Response): Promise<void> => {
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

  // Generate session name from date/time if not provided
  const sessionName = name?.trim() || generateSessionNameFromDateTime(scheduledDateTime);
  const gameType = game_type || 'cash'; // Default to cash game
  const sessionTimezone = timezone || 'America/Los_Angeles'; // Default to PST

  const sql = 'INSERT INTO sessions (name, scheduled_datetime, timezone, created_by, game_type) VALUES (?, ?, ?, ?, ?)';

  try {
    const result = await db.run(sql, [sessionName, scheduledDateTime, sessionTimezone, userId, gameType]);
    const sessionId = result.lastID;

    if (!sessionId) {
      throw new Error('Failed to get session ID');
    }

    // Add players to session if provided
    if (playerIds && playerIds.length > 0) {
      await addPlayersToSession(sessionId, playerIds);
    }

    // Track session creation
    MetricsService.trackSessionCreated(userId, sessionId);

    // Send invitation emails in background (non-blocking)
    if (playerIds && playerIds.length > 0) {
      sendSessionInviteEmails(sessionId, userId).catch(err => {
        console.error('Background email sending failed:', err);
      });
    }

    await fetchSessionById(sessionId, res);
  } catch (err: any) {
    console.error('Error creating session:', err.message);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// PUT update session (only by owner)
router.put('/:id', authenticateToken, requireSessionOwnership, async (req: any, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, scheduledDateTime, timezone, playerIds, game_type } = req.body;

  if (!scheduledDateTime) {
    res.status(400).json({ error: 'Scheduled date and time is required' });
    return;
  }

  // Generate session name from date/time if not provided
  const sessionName = name?.trim() || generateSessionNameFromDateTime(scheduledDateTime);
  const gameType = game_type || 'cash'; // Default to cash game
  const sessionTimezone = timezone || 'America/Los_Angeles'; // Default to PST

  const sql = 'UPDATE sessions SET name = ?, scheduled_datetime = ?, timezone = ?, game_type = ? WHERE id = ?';

  try {
    const result = await db.run(sql, [sessionName, scheduledDateTime, sessionTimezone, gameType, id]);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Remove existing players and add new ones
    await db.run('DELETE FROM session_players WHERE session_id = ?', [id]);

    if (playerIds && playerIds.length > 0) {
      await addPlayersToSession(parseInt(id as string), playerIds);
    }

    await fetchSessionById(parseInt(id as string), res);
  } catch (err: any) {
    console.error('Error updating session:', err.message);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// DELETE session (only by owner)
router.delete('/:id', authenticateToken, requireSessionOwnership, async (req: any, res: Response) => {
  const { id } = req.params;
  const sql = 'DELETE FROM sessions WHERE id = ?';

  try {
    const result = await db.run(sql, [id]);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Session not found' });
    } else {
      res.json({ message: 'Session deleted successfully' });
    }
  } catch (err: any) {
    console.error('Error deleting session:', err.message);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// PUT update player status in session
router.put('/:sessionId/players/:playerId/status', async (req: TypedRequest<UpdatePlayerStatusRequest>, res: Response): Promise<void> => {
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

  const validStatuses: PlayerStatus[] = ['Invited', 'In', 'Out', 'Maybe', 'Attending but not playing'];
  if (!validStatuses.includes(status as PlayerStatus)) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }

  const sql = 'UPDATE session_players SET status = ? WHERE session_id = ? AND player_id = ?';

  try {
    const result = await db.run(sql, [status, sessionIdNum, playerIdNum]);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Player not found in session' });
    } else {
      // Track status response - get player email for tracking
      try {
        const playerResult = await db.get('SELECT email FROM players WHERE id = ?', [playerIdNum]);
        if (playerResult?.email) {
          MetricsService.trackStatusResponse(sessionIdNum, playerResult.email, status);
        }
      } catch (trackingError) {
        console.error('Error tracking status response:', trackingError);
      }

      res.json({ message: 'Player status updated successfully', status });
    }
  } catch (err: any) {
    console.error('Error updating player status:', err.message);
    res.status(500).json({ error: 'Failed to update player status' });
  }
});

// PUT update player financials in session
router.put('/:sessionId/players/:playerId/financials', async (req: TypedRequest<UpdatePlayerFinancialsRequest>, res: Response): Promise<void> => {
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

  // Validate that amounts are non-negative numbers
  if ((buy_in !== undefined && (isNaN(buy_in) || buy_in < 0)) ||
      (cash_out !== undefined && (isNaN(cash_out) || cash_out < 0))) {
    res.status(400).json({ error: 'Buy-in and cash-out amounts must be non-negative numbers' });
    return;
  }

  // Build dynamic SQL based on what fields are being updated
  const updates: string[] = [];
  const params: (number | string)[] = [];

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
    const result = await db.run(sql, params);

    if (result.changes === 0) {
      res.status(404).json({ error: 'Player not found in session' });
    } else {
      res.json({
        message: 'Player financials updated successfully',
        buy_in: buy_in || null,
        cash_out: cash_out || null
      });
    }
  } catch (err: any) {
    console.error('Error updating player financials:', err.message);
    res.status(500).json({ error: 'Failed to update player financials' });
  }
});

// POST add player to session (or update existing player status)
router.post('/:sessionId/players/:playerId', async (req: TypedRequest<UpdatePlayerStatusRequest>, res: Response): Promise<void> => {
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

  const validStatuses: PlayerStatus[] = ['Invited', 'In', 'Out', 'Maybe', 'Attending but not playing'];
  if (!validStatuses.includes(status as PlayerStatus)) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }

  // First check if player already exists in session
  const checkSql = 'SELECT id FROM session_players WHERE session_id = ? AND player_id = ?';

  try {
    const row = await db.get(checkSql, [sessionIdNum, playerIdNum]);

    if (row) {
      // Player exists, update their status
      const updateSql = 'UPDATE session_players SET status = ? WHERE session_id = ? AND player_id = ?';
      await db.run(updateSql, [status, sessionIdNum, playerIdNum]);
      res.json({ message: 'Player status updated successfully', status, action: 'updated' });
    } else {
      // Player doesn't exist, add them with the specified status
      const insertSql = 'INSERT INTO session_players (session_id, player_id, status, buy_in, cash_out) VALUES (?, ?, ?, 0, 0)';
      await db.run(insertSql, [sessionIdNum, playerIdNum, status]);

      // Send invitation email in background (non-blocking)
      sendPlayerAddedEmail(sessionIdNum, playerIdNum).catch(err => {
        console.error('Background email sending failed:', err);
      });

      res.json({ message: 'Player added to session successfully', status, action: 'added' });
    }
  } catch (err: any) {
    console.error('Error managing player in session:', err.message);
    res.status(500).json({ error: 'Failed to manage player in session' });
  }
});

// Helper function to add players to session with default "Invited" status
async function addPlayersToSession(sessionId: number, playerIds: number[]): Promise<void> {
  if (!playerIds || playerIds.length === 0) {
    return;
  }

  const placeholders = playerIds.map(() => '(?, ?, ?, ?, ?)').join(', ');
  const sql = `INSERT INTO session_players (session_id, player_id, status, buy_in, cash_out) VALUES ${placeholders}`;
  const params: (number | string)[] = [];

  playerIds.forEach(playerId => {
    params.push(sessionId, playerId, 'Invited', 0, 0);
  });

  await db.run(sql, params);
}

// Helper function to fetch session by ID and return response
async function fetchSessionById(sessionId: number, res: Response): Promise<void> {
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
    const row = await db.get(sql, [sessionId]);
    if (row) {
      const session: SessionWithPlayers = {
        id: row.id,
        name: row.name,
        scheduledDateTime: row.scheduled_datetime,
        createdBy: row.created_by,
        createdAt: row.created_at,
        game_type: row.game_type || 'cash',
        players: row.player_ids ? row.player_ids.split(',').map((id: string, index: number) => ({
          id: `${row.id}-${parseInt(id)}`, // Unique session_player id using session-player combination
          session_id: row.id,
          player_id: parseInt(id),
          status: row.player_statuses ? row.player_statuses.split(',')[index] as PlayerStatus : 'Invited' as PlayerStatus,
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
    } else {
      res.status(500).json({ error: 'Session saved but not found' });
    }
  } catch (err: any) {
    console.error('Error fetching created/updated session:', err.message);
    res.status(500).json({ error: 'Session saved but failed to fetch' });
  }
}

// Public route to track invite page views (no auth required)
router.post('/:sessionId/invite-view', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { playerEmail } = req.body;

    console.log('📊 Tracking invite view:', { sessionId, playerEmail, ip: req.ip, userAgent: req.get('User-Agent') });

    if (!sessionId || !playerEmail) {
      console.log('❌ Missing required fields:', { sessionId, playerEmail });
      res.status(400).json({ error: 'Session ID and player email are required' });
      return;
    }

    // Track invite page view
    await MetricsService.trackInvitePageView(
      parseInt(sessionId),
      playerEmail,
      req.ip,
      req.get('User-Agent')
    );

    console.log('✅ Invite view tracked successfully for session', sessionId, 'email', playerEmail);
    res.json({ message: 'Invite view tracked successfully' });
  } catch (error: any) {
    console.error('❌ Error tracking invite view:', error);
    res.status(500).json({ error: 'Failed to track invite view' });
  }
});

// POST send reminder emails to non-responders (only by session owner)
router.post('/:sessionId/send-reminders', authenticateToken, requireSessionOwnership, async (req: any, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const sessionIdNum = parseInt(sessionId);

    if (!sessionIdNum) {
      res.status(400).json({ error: 'Valid session ID is required' });
      return;
    }

    // Get players who haven't responded (status = 'Invited')
    const nonRespondersSql = `
      SELECT p.id, p.name, p.email
      FROM session_players sp
      JOIN players p ON sp.player_id = p.id
      WHERE sp.session_id = ?
        AND sp.status = 'Invited'
        AND p.email IS NOT NULL
        AND p.email != ''
    `;

    const nonResponders = await db.all(nonRespondersSql, [sessionIdNum]);

    if (nonResponders.length === 0) {
      res.json({
        message: 'No non-responders with email addresses found',
        sent: 0,
        failed: 0
      });
      return;
    }

    // Send reminder emails
    const result = await sendSessionReminderEmails(sessionIdNum, req.user?.id);

    res.json({
      message: `Reminder emails sent to ${result.sent} players`,
      sent: result.sent,
      failed: result.failed,
      totalNonResponders: nonResponders.length
    });
  } catch (error: any) {
    console.error('Error sending reminder emails:', error);
    res.status(500).json({ error: 'Failed to send reminder emails' });
  }
});

// Helper function to send session invite emails
async function sendSessionInviteEmails(sessionId: number, hostUserId: number): Promise<void> {
  try {
    // Get session details
    const sessionSql = `
      SELECT s.*, u.email as host_email, u.name as host_name
      FROM sessions s
      JOIN users u ON s.created_by = u.id
      WHERE s.id = ?
    `;
    const session = await db.get(sessionSql, [sessionId]);

    if (!session) {
      console.error('Session not found for email sending:', sessionId);
      return;
    }

    // Get players with email addresses
    const playersSql = `
      SELECT p.id, p.name, p.email
      FROM session_players sp
      JOIN players p ON sp.player_id = p.id
      WHERE sp.session_id = ? AND p.email IS NOT NULL AND p.email != ''
    `;
    const players = await db.all(playersSql, [sessionId]);

    if (players.length === 0) {
      console.log('No players with email addresses found for session:', sessionId);
      return;
    }

    // Get base URL from environment or use default
    const baseUrl = process.env.FRONTEND_URL || 'https://edwinpokernight.com';

    // Host name fallback
    const hostName = session.host_name || session.host_email || 'Poker Night Host';

    // Send emails
    const result = await emailService.sendBulkSessionInvites(
      {
        id: session.id,
        name: session.name,
        scheduled_datetime: session.scheduled_datetime,
        created_by: session.created_by,
        created_at: session.created_at,
        game_type: session.game_type
      },
      players,
      hostName,
      baseUrl
    );

    console.log(`Session invite emails sent for session ${sessionId}: ${result.sent} sent, ${result.failed} failed`);
  } catch (error) {
    console.error('Error sending session invite emails:', error);
  }
}

// Helper function to send email when a player is added to an existing session
async function sendPlayerAddedEmail(sessionId: number, playerId: number): Promise<void> {
  try {
    // Get session details
    const sessionSql = `
      SELECT s.*, u.email as host_email, u.name as host_name
      FROM sessions s
      JOIN users u ON s.created_by = u.id
      WHERE s.id = ?
    `;
    const session = await db.get(sessionSql, [sessionId]);

    if (!session) {
      console.error('Session not found for player added email:', sessionId);
      return;
    }

    // Get player details
    const playerSql = 'SELECT id, name, email FROM players WHERE id = ?';
    const player = await db.get(playerSql, [playerId]);

    if (!player || !player.email) {
      console.log(`Player ${playerId} has no email address. Skipping email send.`);
      return;
    }

    // Get base URL from environment or use default
    const baseUrl = process.env.FRONTEND_URL || 'https://edwinpokernight.com';

    // Host name fallback
    const hostName = session.host_name || session.host_email || 'Poker Night Host';

    // Generate invite URL with base64 encoded email
    const encodedEmail = Buffer.from(player.email).toString('base64');
    const inviteUrl = `${baseUrl}/invite/${session.id}/${encodedEmail}`;

    // Send email
    const success = await emailService.sendSessionInviteEmail({
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
  } catch (error) {
    console.error('Error sending player added email:', error);
  }
}

// Helper function to send reminder emails to non-responders
async function sendSessionReminderEmails(sessionId: number, hostUserId: number): Promise<{ sent: number; failed: number }> {
  try {
    // Get session details
    const sessionSql = `
      SELECT s.*, u.email as host_email, u.name as host_name
      FROM sessions s
      JOIN users u ON s.created_by = u.id
      WHERE s.id = ?
    `;
    const session = await db.get(sessionSql, [sessionId]);

    if (!session) {
      console.error('Session not found for reminder emails:', sessionId);
      return { sent: 0, failed: 0 };
    }

    // Get non-responders with email addresses
    const nonRespondersSql = `
      SELECT p.id, p.name, p.email
      FROM session_players sp
      JOIN players p ON sp.player_id = p.id
      WHERE sp.session_id = ?
        AND sp.status = 'Invited'
        AND p.email IS NOT NULL
        AND p.email != ''
    `;
    const nonResponders = await db.all(nonRespondersSql, [sessionId]);

    if (nonResponders.length === 0) {
      console.log('No non-responders with email addresses found for session:', sessionId);
      return { sent: 0, failed: 0 };
    }

    // Get base URL from environment or use default
    const baseUrl = process.env.FRONTEND_URL || 'https://edwinpokernight.com';

    // Host name fallback
    const hostName = session.host_name || session.host_email || 'Poker Night Host';

    // Send reminder emails
    const result = await emailService.sendBulkSessionReminders(
      {
        id: session.id,
        name: session.name,
        scheduled_datetime: session.scheduled_datetime,
        created_by: session.created_by,
        created_at: session.created_at,
        game_type: session.game_type
      },
      nonResponders,
      hostName,
      baseUrl
    );

    console.log(`Session reminder emails sent for session ${sessionId}: ${result.sent} sent, ${result.failed} failed`);
    return result;
  } catch (error) {
    console.error('Error sending session reminder emails:', error);
    return { sent: 0, failed: 0 };
  }
}

export default router;
