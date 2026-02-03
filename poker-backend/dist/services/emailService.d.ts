import { Session, Player } from '../types/index';
interface SessionInviteEmailData {
    session: Session;
    player: Player;
    inviteUrl: string;
    hostName: string;
}
declare class EmailService {
    private transporter;
    private isConfigured;
    constructor();
    private initializeTransporter;
    sendSessionInviteEmail(data: SessionInviteEmailData): Promise<boolean>;
    sendBulkSessionInvites(session: Session, players: Player[], hostName: string, baseUrl: string): Promise<{
        sent: number;
        failed: number;
    }>;
    sendSessionReminderEmail(data: SessionInviteEmailData): Promise<boolean>;
    sendBulkSessionReminders(session: Session, players: Player[], hostName: string, baseUrl: string): Promise<{
        sent: number;
        failed: number;
    }>;
    private generateSessionInviteHtml;
    private generateSessionInviteText;
    private generateSessionReminderHtml;
    private generateSessionReminderText;
    isEmailConfigured(): boolean;
}
export declare const emailService: EmailService;
export default emailService;
//# sourceMappingURL=emailService.d.ts.map