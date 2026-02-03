"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const index_1 = __importDefault(require("../database/index"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/', auth_1.authenticateToken, async (req, res) => {
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    if (!userId || !userEmail) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    const sql = `
    WITH user_accessible_players AS (
      -- Players the user has explicitly added
      SELECT up.player_id, 1 as user_added, 0 as from_owned_session
      FROM user_players up
      WHERE up.user_id = ?

      UNION

      -- Players from sessions the user created
      SELECT DISTINCT sp2.player_id, 0 as user_added, 1 as from_owned_session
      FROM sessions s2
      JOIN session_players sp2 ON s2.id = sp2.session_id
      WHERE s2.created_by = ?

      UNION

      -- Players from sessions the user participated in
      SELECT DISTINCT sp3.player_id, 0 as user_added, 0 as from_owned_session
      FROM sessions s3
      JOIN session_players sp3 ON s3.id = sp3.session_id
      WHERE s3.id IN (
        SELECT DISTINCT sp4.session_id
        FROM session_players sp4
        JOIN players p4 ON sp4.player_id = p4.id
        WHERE p4.email = ?
      )
    )
    SELECT DISTINCT
      p.id,
      p.name,
      CASE
        WHEN (MAX(uap.user_added) = 1 OR MAX(uap.from_owned_session) = 1) THEN p.email
        ELSE NULL
      END as email,
      p.created_at,
      CASE
        WHEN MAX(uap.user_added) = 1 THEN up.default_invite
        ELSE NULL
      END as default_invite
    FROM players p
    JOIN user_accessible_players uap ON p.id = uap.player_id
    LEFT JOIN user_players up ON p.id = up.player_id AND up.user_id = ?
    GROUP BY p.id, p.name, p.created_at, up.default_invite
    ORDER BY p.created_at DESC
  `;
    try {
        const rows = await index_1.default.all(sql, [userId, userId, userEmail, userId]);
        const players = rows.map(row => ({
            id: row.id,
            name: row.name,
            email: row.email,
            created_at: row.created_at,
            default_invite: row.default_invite === true || row.default_invite === 1 ? true :
                row.default_invite === false || row.default_invite === 0 ? false :
                    undefined
        }));
        res.json(players);
    }
    catch (err) {
        console.error('Error fetching players:', err.message);
        res.status(500).json({ error: 'Failed to fetch players' });
    }
});
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM players WHERE id = ?';
    try {
        const row = await index_1.default.get(sql, [id]);
        if (!row) {
            res.status(404).json({ error: 'Player not found' });
        }
        else {
            res.json(row);
        }
    }
    catch (err) {
        console.error('Error fetching player:', err.message);
        res.status(500).json({ error: 'Failed to fetch player' });
    }
});
router.post('/', auth_1.authenticateToken, async (req, res) => {
    const { name, email } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    if (!name || !name.trim()) {
        res.status(400).json({ error: 'Player name is required' });
        return;
    }
    try {
        const existingPlayer = await index_1.default.get('SELECT * FROM players WHERE name = ?', [name.trim()]);
        if (existingPlayer) {
            const isPostgreSQL = process.env.DATABASE_URL?.startsWith('postgresql');
            const insertSql = isPostgreSQL
                ? 'INSERT INTO user_players (user_id, player_id, default_invite) VALUES (?, ?, ?) ON CONFLICT (user_id, player_id) DO NOTHING'
                : 'INSERT OR IGNORE INTO user_players (user_id, player_id, default_invite) VALUES (?, ?, ?)';
            const defaultInviteValue = isPostgreSQL ? true : 1;
            await index_1.default.run(insertSql, [userId, existingPlayer.id, defaultInviteValue]);
            res.status(201).json(existingPlayer);
        }
        else {
            const sql = 'INSERT INTO players (name, email) VALUES (?, ?)';
            const result = await index_1.default.run(sql, [name.trim(), email?.trim() || null]);
            const playerId = result.lastID;
            if (!playerId) {
                throw new Error('Failed to get player ID');
            }
            const isPostgreSQL = process.env.DATABASE_URL?.startsWith('postgresql');
            const defaultInviteValue = isPostgreSQL ? true : 1;
            await index_1.default.run('INSERT INTO user_players (user_id, player_id, default_invite) VALUES (?, ?, ?)', [userId, playerId, defaultInviteValue]);
            const player = await index_1.default.get('SELECT * FROM players WHERE id = ?', [playerId]);
            res.status(201).json(player);
        }
    }
    catch (err) {
        console.error('Error creating player:', err.message);
        res.status(500).json({ error: 'Failed to create player' });
    }
});
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, email } = req.body;
    console.log('PUT /api/players/:id received:', { id, name, email, emailType: typeof email });
    if (!name || !name.trim()) {
        res.status(400).json({ error: 'Player name is required' });
        return;
    }
    const emailValue = email?.trim() || null;
    console.log('Email value to be saved:', emailValue);
    const sql = 'UPDATE players SET name = ?, email = ? WHERE id = ?';
    try {
        const result = await index_1.default.run(sql, [name.trim(), emailValue, id]);
        if (result.changes === 0) {
            res.status(404).json({ error: 'Player not found' });
        }
        else {
            const player = await index_1.default.get('SELECT * FROM players WHERE id = ?', [id]);
            res.json(player);
        }
    }
    catch (err) {
        if (err.message.includes('UNIQUE constraint failed') || err.message.includes('duplicate key')) {
            res.status(409).json({ error: 'Player name already exists' });
        }
        else {
            console.error('Error updating player:', err.message);
            res.status(500).json({ error: 'Failed to update player' });
        }
    }
});
router.put('/:id/default-invite', auth_1.authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { default_invite } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    if (typeof default_invite !== 'boolean') {
        res.status(400).json({ error: 'default_invite must be a boolean value' });
        return;
    }
    try {
        const userPlayer = await index_1.default.get('SELECT * FROM user_players WHERE user_id = ? AND player_id = ?', [userId, id]);
        if (!userPlayer) {
            res.status(403).json({ error: 'You can only modify players you have added' });
            return;
        }
        const isPostgreSQL = process.env.DATABASE_URL?.startsWith('postgresql');
        const defaultInviteValue = isPostgreSQL ? default_invite : (default_invite ? 1 : 0);
        const result = await index_1.default.run('UPDATE user_players SET default_invite = ? WHERE user_id = ? AND player_id = ?', [defaultInviteValue, userId, id]);
        if (result.changes === 0) {
            res.status(404).json({ error: 'Player relationship not found' });
        }
        else {
            res.json({ message: 'Default invite setting updated successfully' });
        }
    }
    catch (err) {
        console.error('Error updating default invite setting:', err.message);
        res.status(500).json({ error: 'Failed to update default invite setting' });
    }
});
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM players WHERE id = ?';
    try {
        const result = await index_1.default.run(sql, [id]);
        if (result.changes === 0) {
            res.status(404).json({ error: 'Player not found' });
        }
        else {
            res.json({ message: 'Player deleted successfully' });
        }
    }
    catch (err) {
        console.error('Error deleting player:', err.message);
        res.status(500).json({ error: 'Failed to delete player' });
    }
});
exports.default = router;
//# sourceMappingURL=players.js.map