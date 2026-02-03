"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const metricsService_1 = __importDefault(require("../services/metricsService"));
const router = express_1.default.Router();
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const summary = await metricsService_1.default.getMetricsSummary(userId);
        res.json(summary);
    }
    catch (error) {
        console.error('Error fetching metrics summary:', error);
        res.status(500).json({ error: 'Failed to fetch metrics summary' });
    }
});
router.get('/sessions/:sessionId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        console.log('Fetching metrics for session:', sessionId);
        const sessionMetrics = await metricsService_1.default.getSessionMetrics(parseInt(sessionId));
        console.log('Session metrics result:', sessionMetrics);
        res.json(sessionMetrics);
    }
    catch (error) {
        console.error('Error fetching session metrics:', error);
        res.status(500).json({ error: 'Failed to fetch session metrics' });
    }
});
router.post('/track', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { eventType, eventData, sessionId, playerEmail } = req.body;
        if (!eventType) {
            res.status(400).json({ error: 'Event type is required' });
            return;
        }
        await metricsService_1.default.trackEvent({
            userId,
            sessionId,
            playerEmail,
            eventType,
            eventData,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({ message: 'Event tracked successfully' });
    }
    catch (error) {
        console.error('Error tracking custom event:', error);
        res.status(500).json({ error: 'Failed to track event' });
    }
});
router.get('/admin/all', auth_1.authenticateToken, async (req, res) => {
    try {
        const summary = await metricsService_1.default.getMetricsSummary();
        res.json(summary);
    }
    catch (error) {
        console.error('Error fetching admin metrics:', error);
        res.status(500).json({ error: 'Failed to fetch admin metrics' });
    }
});
router.get('/debug/:sessionId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const db = require('../database/index').default;
        const session = await db.get('SELECT id, name, created_at FROM sessions WHERE id = ?', [sessionId]);
        const allMetrics = await db.all('SELECT * FROM user_metrics WHERE session_id = ? ORDER BY created_at DESC', [sessionId]);
        const inviteViews = await db.all('SELECT * FROM user_metrics WHERE session_id = ? AND event_type = ?', [sessionId, 'invite_page_view']);
        const totalMetrics = await db.get('SELECT COUNT(*) as count FROM user_metrics');
        const recentMetrics = await db.all('SELECT * FROM user_metrics ORDER BY created_at DESC LIMIT 10');
        res.json({
            sessionId: parseInt(sessionId),
            sessionExists: !!session,
            session,
            totalMetricsInDatabase: totalMetrics?.count || 0,
            metricsForThisSession: allMetrics.length,
            inviteViewsForThisSession: inviteViews.length,
            allMetricsForSession: allMetrics,
            inviteViews,
            recentMetricsInDatabase: recentMetrics
        });
    }
    catch (error) {
        console.error('Error in debug endpoint:', error);
        res.status(500).json({ error: 'Debug endpoint failed', details: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=metrics.js.map