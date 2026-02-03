export interface MetricEvent {
    userId?: number;
    playerEmail?: string;
    sessionId?: number;
    eventType: string;
    eventData?: any;
    ipAddress?: string;
    userAgent?: string;
}
export interface MetricsSummary {
    totalEvents: number;
    uniqueUsers: number;
    eventsByType: {
        [key: string]: number;
    };
    recentActivity: any[];
}
export interface SessionMetrics {
    sessionId: number;
    inviteViews: number;
    responses: number;
    responseRate: number;
    avgResponseTime: number;
    statusBreakdown: {
        [key: string]: number;
    };
    timeline: any[];
}
export declare class MetricsService {
    static trackEvent(event: MetricEvent): Promise<void>;
    static getMetricsSummary(userId?: number): Promise<MetricsSummary>;
    static getSessionMetrics(sessionId: number): Promise<SessionMetrics>;
    static trackInvitePageView(sessionId: number, playerEmail: string, ipAddress?: string, userAgent?: string): Promise<void>;
    static trackStatusResponse(sessionId: number, playerEmail: string, status: string, userId?: number): Promise<void>;
    static trackUserLogin(userId: number, ipAddress?: string, userAgent?: string): Promise<void>;
    static trackSessionCreated(userId: number, sessionId: number): Promise<void>;
    static trackPlayerAdded(userId: number, playerEmail?: string): Promise<void>;
}
export default MetricsService;
//# sourceMappingURL=metricsService.d.ts.map