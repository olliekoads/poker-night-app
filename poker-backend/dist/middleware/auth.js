"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
exports.optionalAuth = optionalAuth;
exports.requireSessionOwnership = requireSessionOwnership;
exports.requireAuth = requireAuth;
const auth_1 = require("../config/auth");
async function authenticateToken(req, res, next) {
    if (process.env.NODE_ENV !== 'production' && req.headers['x-dev-bypass'] === 'true') {
        try {
            const db = require('../database/index').default;
            const users = await db.all('SELECT * FROM users LIMIT 1');
            if (users && users.length > 0) {
                req.user = (0, auth_1.userToAuthUser)(users[0]);
                console.log('🔓 Dev mode: Auto-authenticated as', users[0].email);
                next();
                return;
            }
        }
        catch (error) {
            console.error('Dev bypass failed:', error);
        }
    }
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: 'Access token required' });
        return;
    }
    try {
        const payload = (0, auth_1.verifyJWT)(token);
        if (!payload) {
            res.status(403).json({ error: 'Invalid or expired token' });
            return;
        }
        const user = await (0, auth_1.findUserById)(payload.userId);
        if (!user) {
            res.status(403).json({ error: 'User not found' });
            return;
        }
        req.user = (0, auth_1.userToAuthUser)(user);
        next();
    }
    catch (error) {
        console.error('Authentication error:', error);
        res.status(403).json({ error: 'Invalid token' });
    }
}
async function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        next();
        return;
    }
    try {
        const payload = (0, auth_1.verifyJWT)(token);
        if (payload) {
            const user = await (0, auth_1.findUserById)(payload.userId);
            if (user) {
                req.user = (0, auth_1.userToAuthUser)(user);
            }
        }
    }
    catch (error) {
        console.log('Optional auth failed:', error);
    }
    next();
}
async function requireSessionOwnership(req, res, next) {
    try {
        await authenticateToken(req, res, () => { });
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const sessionId = parseInt(req.params.sessionId || req.params.id);
        if (!sessionId) {
            res.status(400).json({ error: 'Session ID required' });
            return;
        }
        const db = require('../database/index').default;
        const session = await db.get('SELECT * FROM sessions WHERE id = ?', [sessionId]);
        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        if (session.created_by !== req.user.id) {
            res.status(403).json({ error: 'You can only modify sessions you created' });
            return;
        }
        next();
    }
    catch (error) {
        console.error('Session ownership check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
function requireAuth(req, res, next) {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    next();
}
//# sourceMappingURL=auth.js.map