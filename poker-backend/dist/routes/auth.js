"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../config/auth"));
const auth_2 = require("../config/auth");
const auth_3 = require("../middleware/auth");
const metricsService_1 = __importDefault(require("../services/metricsService"));
const router = express_1.default.Router();
router.get('/dev-login', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        res.status(403).json({ error: 'Dev login only available in development mode' });
        return;
    }
    try {
        const db = require('../database/index').default;
        const users = await db.all('SELECT * FROM users LIMIT 1');
        if (!users || users.length === 0) {
            res.status(404).json({ error: 'No users found in database' });
            return;
        }
        const user = users[0];
        const token = (0, auth_2.generateJWT)(user);
        console.log('🔓 Dev login: Auto-authenticated as', user.email);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?token=${token}`);
    }
    catch (error) {
        console.error('Dev login error:', error);
        res.status(500).json({ error: 'Dev login failed' });
    }
});
router.get('/google', auth_1.default.authenticate('google', {
    scope: ['profile', 'email']
}));
router.get('/google/callback', (req, res, next) => {
    console.log('OAuth callback received');
    auth_1.default.authenticate('google', { session: false }, (err, user, info) => {
        console.log('OAuth authenticate result:', { err, user: user ? 'User found' : 'No user', info });
        if (err) {
            console.error('OAuth authentication error:', err);
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=auth_failed`);
        }
        if (!user) {
            console.error('OAuth authentication failed: No user returned');
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=auth_failed`);
        }
        try {
            const token = (0, auth_2.generateJWT)(user);
            console.log('JWT token generated successfully');
            metricsService_1.default.trackUserLogin(user.id, req.ip, req.get('User-Agent'));
            res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?token=${token}`);
        }
        catch (error) {
            console.error('OAuth callback error:', error);
            res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=auth_failed`);
        }
    })(req, res, next);
});
router.get('/me', auth_3.authenticateToken, (req, res) => {
    if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }
    res.json({
        user: req.user,
        message: 'User authenticated successfully'
    });
});
router.post('/logout', (req, res) => {
    res.json({ message: 'Logged out successfully' });
});
router.get('/status', auth_3.authenticateToken, (req, res) => {
    res.json({
        authenticated: true,
        user: req.user
    });
});
exports.default = router;
//# sourceMappingURL=auth.js.map