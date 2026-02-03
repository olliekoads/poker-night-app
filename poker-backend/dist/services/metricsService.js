"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsService = void 0;
const index_1 = __importDefault(require("../database/index"));
class MetricsService {
    static async trackEvent(event) {
        try {
            const sql = `
        INSERT INTO user_metrics (user_id, player_email, session_id, event_type, event_data, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
            const eventDataJson = event.eventData ? JSON.stringify(event.eventData) : null;
            console.log('📊 Attempting to track event:', {
                eventType: event.eventType,
                sessionId: event.sessionId,
                playerEmail: event.playerEmail,
                userId: event.userId,
                eventData: eventDataJson
            });
            const result = await index_1.default.run(sql, [
                event.userId || null,
                event.playerEmail || null,
                event.sessionId || null,
                event.eventType,
                eventDataJson,
                event.ipAddress || null,
                event.userAgent || null
            ]);
            console.log(`✅ Successfully tracked event: ${event.eventType} for ${event.userId ? `user ${event.userId}` : `email ${event.playerEmail}`}`, result);
        }
        catch (error) {
            console.error('❌ Error tracking metric event:', error);
            console.error('Event details:', event);
        }
    }
    static async getMetricsSummary(userId) {
        try {
            const whereClause = userId ? 'WHERE user_id = ?' : '';
            const params = userId ? [userId] : [];
            const totalResult = await index_1.default.get(`SELECT COUNT(*) as count FROM user_metrics ${whereClause}`, params);
            const totalEvents = totalResult?.count || 0;
            const uniqueUsersResult = await index_1.default.get(`
        SELECT COUNT(DISTINCT COALESCE(user_id, player_email)) as count 
        FROM user_metrics ${whereClause}
      `, params);
            const uniqueUsers = uniqueUsersResult?.count || 0;
            const eventTypesResult = await index_1.default.all(`
        SELECT event_type, COUNT(*) as count 
        FROM user_metrics ${whereClause}
        GROUP BY event_type 
        ORDER BY count DESC
      `, params);
            const eventsByType = {};
            eventTypesResult.forEach(row => {
                eventsByType[row.event_type] = row.count;
            });
            const recentActivity = await index_1.default.all(`
        SELECT event_type, event_data, created_at, user_id, player_email, session_id
        FROM user_metrics ${whereClause}
        ORDER BY created_at DESC 
        LIMIT 50
      `, params);
            return {
                totalEvents,
                uniqueUsers,
                eventsByType,
                recentActivity
            };
        }
        catch (error) {
            console.error('Error getting metrics summary:', error);
            return {
                totalEvents: 0,
                uniqueUsers: 0,
                eventsByType: {},
                recentActivity: []
            };
        }
    }
    static async getSessionMetrics(sessionId) {
        try {
            const inviteViewsResult = await index_1.default.get(`
        SELECT COUNT(*) as count 
        FROM user_metrics 
        WHERE session_id = ? AND event_type = 'invite_page_view'
      `, [sessionId]);
            const inviteViews = inviteViewsResult?.count || 0;
            const responsesResult = await index_1.default.get(`
        SELECT COUNT(*) as count 
        FROM user_metrics 
        WHERE session_id = ? AND event_type = 'status_response'
      `, [sessionId]);
            const responses = responsesResult?.count || 0;
            const responseRate = inviteViews > 0 ? (responses / inviteViews) * 100 : 0;
            const isPostgreSQL = process.env.DATABASE_URL?.startsWith('postgresql');
            const dateDiffQuery = isPostgreSQL
                ? `EXTRACT(EPOCH FROM (response.created_at - view.created_at)) / 60`
                : `(JULIANDAY(response.created_at) - JULIANDAY(view.created_at)) * 24 * 60`;
            const avgResponseTimeResult = await index_1.default.get(`
        SELECT AVG(${dateDiffQuery}) as avg_minutes
        FROM user_metrics view
        JOIN user_metrics response ON (
          view.session_id = response.session_id AND
          (view.user_id = response.user_id OR view.player_email = response.player_email)
        )
        WHERE view.session_id = ?
          AND view.event_type = 'invite_page_view'
          AND response.event_type = 'status_response'
          AND response.created_at > view.created_at
      `, [sessionId]);
            const avgResponseTime = avgResponseTimeResult?.avg_minutes || 0;
            const jsonExtract = isPostgreSQL
                ? `event_data->>'status'`
                : `JSON_EXTRACT(event_data, '$.status')`;
            const statusBreakdownResult = await index_1.default.all(`
        SELECT ${jsonExtract} as status, COUNT(*) as count
        FROM user_metrics
        WHERE session_id = ? AND event_type = 'status_response'
        GROUP BY ${jsonExtract}
      `, [sessionId]);
            const statusBreakdown = {};
            statusBreakdownResult.forEach(row => {
                if (row.status) {
                    statusBreakdown[row.status] = row.count;
                }
            });
            const timeline = await index_1.default.all(`
        SELECT event_type, event_data, created_at, user_id, player_email
        FROM user_metrics 
        WHERE session_id = ?
        ORDER BY created_at ASC
      `, [sessionId]);
            return {
                sessionId,
                inviteViews,
                responses,
                responseRate: Math.round(responseRate * 100) / 100,
                avgResponseTime: Math.round(avgResponseTime * 100) / 100,
                statusBreakdown,
                timeline
            };
        }
        catch (error) {
            console.error('Error getting session metrics:', error);
            return {
                sessionId,
                inviteViews: 0,
                responses: 0,
                responseRate: 0,
                avgResponseTime: 0,
                statusBreakdown: {},
                timeline: []
            };
        }
    }
    static async trackInvitePageView(sessionId, playerEmail, ipAddress, userAgent) {
        await this.trackEvent({
            sessionId,
            playerEmail,
            eventType: 'invite_page_view',
            eventData: { timestamp: new Date().toISOString() },
            ipAddress,
            userAgent
        });
    }
    static async trackStatusResponse(sessionId, playerEmail, status, userId) {
        await this.trackEvent({
            userId,
            sessionId,
            playerEmail,
            eventType: 'status_response',
            eventData: {
                status,
                timestamp: new Date().toISOString()
            }
        });
    }
    static async trackUserLogin(userId, ipAddress, userAgent) {
        await this.trackEvent({
            userId,
            eventType: 'user_login',
            eventData: { timestamp: new Date().toISOString() },
            ipAddress,
            userAgent
        });
    }
    static async trackSessionCreated(userId, sessionId) {
        await this.trackEvent({
            userId,
            sessionId,
            eventType: 'session_created',
            eventData: { timestamp: new Date().toISOString() }
        });
    }
    static async trackPlayerAdded(userId, playerEmail) {
        await this.trackEvent({
            userId,
            playerEmail,
            eventType: 'player_added',
            eventData: { timestamp: new Date().toISOString() }
        });
    }
}
exports.MetricsService = MetricsService;
exports.default = MetricsService;
//# sourceMappingURL=metricsService.js.map