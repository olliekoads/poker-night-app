import { Resend } from 'resend';
import { Session, Player } from '../types/index';

interface SessionInviteEmailData {
  session: Session;
  player: Player;
  inviteUrl: string;
  hostName: string;
  hostEmail?: string;
}

class EmailService {
  private resend: Resend | null = null;
  private isConfigured = false;
  private fromEmail: string = 'noreply@famylin.com';

  constructor() {
    this.initializeResend();
  }

  private initializeResend(): void {
    try {
      const apiKey = process.env.RESEND_API_KEY;

      if (!apiKey) {
        console.log('RESEND_API_KEY not found. Email functionality will be disabled.');
        return;
      }

      this.resend = new Resend(apiKey);
      this.isConfigured = true;

      // Use custom from email if provided
      if (process.env.EMAIL_FROM) {
        this.fromEmail = process.env.EMAIL_FROM;
      }

      console.log('Email service initialized successfully with Resend');
      console.log('From email:', this.fromEmail);
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  public async sendSessionInviteEmail(data: SessionInviteEmailData): Promise<boolean> {
    console.log('📧 [EmailService] sendSessionInviteEmail called for:', data.player.email);
    if (!this.isConfigured || !this.resend) {
      console.log('Email service not configured. Skipping email send.');
      return false;
    }

    if (!data.player.email) {
      console.log(`Player ${data.player.name} has no email address. Skipping email send.`);
      return false;
    }

    try {
      console.log('📧 [EmailService] Generating email HTML...');
      const emailHtml = this.generateSessionInviteHtml(data);
      const emailText = this.generateSessionInviteText(data);
      console.log('📧 [EmailService] Email content generated, preparing to send...');

      // Format date for email subject
      const formatDateForSubject = (dateString: string): string => {
        const date = new Date(dateString);
        const timezone = data.session.timezone || 'America/Los_Angeles';
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: timezone
        });
      };

      const dateText = data.session.scheduled_datetime ? ` - ${formatDateForSubject(data.session.scheduled_datetime)}` : '';

      console.log('📧 [EmailService] Calling resend.emails.send...');
      const result = await this.resend.emails.send({
        from: `Poker Night <${this.fromEmail}>`,
        to: data.player.email,
        subject: `Poker Night invitation: ${data.session.name || 'Upcoming game'}${dateText}`,
        replyTo: data.hostEmail || undefined,
        text: emailText,
        html: emailHtml,
      });

      if (result.error) {
        console.error(`❌ Resend API error:`, result.error);
        return false;
      }

      console.log(`✅ Session invite email sent to ${data.player.email}:`, result.data?.id);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send session invite email to ${data.player.email}:`, error);
      return false;
    }
  }

  public async sendBulkSessionInvites(
    session: Session,
    players: Player[],
    hostName: string,
    baseUrl: string,
    hostEmail?: string
  ): Promise<{ sent: number; failed: number }> {
    console.log('📧 [EmailService] sendBulkSessionInvites called with', players.length, 'players');
    let sent = 0;
    let failed = 0;

    for (const player of players) {
      console.log('📧 [EmailService] Processing player:', player.name, 'email:', player.email);
      if (!player.email) {
        console.log(`Player ${player.name} has no email address. Skipping.`);
        failed++;
        continue;
      }

      // Generate invite URL with base64 encoded email
      const encodedEmail = Buffer.from(player.email).toString('base64');
      const inviteUrl = `${baseUrl}/invite/${session.id}/${encodedEmail}`;
      console.log('📧 [EmailService] Invite URL:', inviteUrl);

      const emailData: SessionInviteEmailData = {
        session,
        player,
        inviteUrl,
        hostName,
        hostEmail,
      };

      console.log('📧 [EmailService] Calling sendSessionInviteEmail...');
      const success = await this.sendSessionInviteEmail(emailData);
      console.log('📧 [EmailService] sendSessionInviteEmail returned:', success);
      if (success) {
        sent++;
      } else {
        failed++;
      }

      // Add a small delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('📧 [EmailService] Bulk send complete:', { sent, failed });
    return { sent, failed };
  }

  public async sendSessionReminderEmail(data: SessionInviteEmailData): Promise<boolean> {
    if (!this.isConfigured || !this.resend) {
      console.log('Email service not configured. Skipping reminder email send.');
      return false;
    }

    if (!data.player.email) {
      console.log(`Player ${data.player.name} has no email address. Skipping reminder email send.`);
      return false;
    }

    try {
      const emailHtml = this.generateSessionReminderHtml(data);
      const emailText = this.generateSessionReminderText(data);

      // Format date for email subject
      const formatDateForSubject = (dateString: string): string => {
        const date = new Date(dateString);
        const timezone = data.session.timezone || 'America/Los_Angeles';
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: timezone
        });
      };

      const dateText = data.session.scheduled_datetime ? ` - ${formatDateForSubject(data.session.scheduled_datetime)}` : '';

      const result = await this.resend.emails.send({
        from: `Poker Night <${this.fromEmail}>`,
        to: data.player.email,
        subject: `Reminder: Poker Night response needed${dateText}`,
        replyTo: data.hostEmail || undefined,
        text: emailText,
        html: emailHtml,
      });

      if (result.error) {
        console.error(`❌ Resend API error:`, result.error);
        return false;
      }

      console.log(`✅ Session reminder email sent to ${data.player.email}:`, result.data?.id);
      return true;
    } catch (error) {
      console.error(`Failed to send session reminder email to ${data.player.email}:`, error);
      return false;
    }
  }

  public async sendBulkSessionReminders(
    session: Session,
    players: Player[],
    hostName: string,
    baseUrl: string,
    hostEmail?: string
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const player of players) {
      if (!player.email) {
        console.log(`Player ${player.name} has no email address. Skipping reminder.`);
        failed++;
        continue;
      }

      // Generate invite URL with base64 encoded email
      const encodedEmail = Buffer.from(player.email).toString('base64');
      const inviteUrl = `${baseUrl}/invite/${session.id}/${encodedEmail}`;

      const emailData: SessionInviteEmailData = {
        session,
        player,
        inviteUrl,
        hostName,
        hostEmail,
      };

      const success = await this.sendSessionReminderEmail(emailData);
      if (success) {
        sent++;
      } else {
        failed++;
      }

      // Add a small delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { sent, failed };
  }

  private generateSessionInviteHtml(data: SessionInviteEmailData): string {
    const { session, player, inviteUrl, hostName, hostEmail } = data;
    
    const formatDate = (dateString: string): string => {
      const date = new Date(dateString);
      const timezone = session.timezone || 'America/Los_Angeles';
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: timezone
      });
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Poker Night Invitation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 24px; }
          .content { padding: 0; }
          .session-details { background: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
          .cta-button { display: inline-block; background: #1f2937; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 16px 0; }
          .cta-button:hover { background: #111827; color: #ffffff; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Poker Night Invitation</h1>
        </div>
        
        <div class="content">
          <p>Hi ${player.name},</p>
          
          <p>${hostName} invited you to a poker session.</p>
          
          <div class="session-details">
            <h3>${session.name || 'Poker Night'}</h3>
            ${session.scheduled_datetime ? `
              <p><strong>When:</strong> ${formatDate(session.scheduled_datetime)}</p>
            ` : ''}
            <p><strong>Game type:</strong> ${session.game_type === 'tournament' ? 'Tournament' : 'Cash Game'}</p>
            <p><strong>Host:</strong> ${hostName}${hostEmail ? ` (${hostEmail})` : ''}</p>
          </div>
          
          <p>Please let the host know whether you can make it:</p>
          
          <div style="text-align: center;">
            <a href="${inviteUrl}" class="cta-button">
              Respond to invitation
            </a>
          </div>
          
          <p>You can also copy and paste this link into your browser:</p>
          <p><a href="${inviteUrl}">${inviteUrl}</a></p>
          
          <p>Thanks,<br>
          Poker Night</p>
        </div>
        
        <div class="footer">
          <p>This invitation was sent by ${hostName} through Poker Night.</p>
        </div>
      </body>
      </html>
    `;
  }

  private generateSessionInviteText(data: SessionInviteEmailData): string {
    const { session, player, inviteUrl, hostName, hostEmail } = data;
    
    const formatDate = (dateString: string): string => {
      const date = new Date(dateString);
      const timezone = session.timezone || 'America/Los_Angeles';
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: timezone
      });
    };

    return `
POKER NIGHT INVITATION

Hi ${player.name},

${hostName} invited you to a poker session.

SESSION DETAILS:
Session: ${session.name || 'Poker Night'}
${session.scheduled_datetime ? `When: ${formatDate(session.scheduled_datetime)}` : ''}
Game type: ${session.game_type === 'tournament' ? 'Tournament' : 'Cash Game'}
Host: ${hostName}${hostEmail ? ` (${hostEmail})` : ''}

Please let the host know whether you can make it:
${inviteUrl}

Thanks,
Poker Night

---
This invitation was sent by ${hostName} through Poker Night.
    `.trim();
  }

  private generateSessionReminderHtml(data: SessionInviteEmailData): string {
    const { session, player, inviteUrl, hostName, hostEmail } = data;

    const formatDate = (dateString: string): string => {
      const date = new Date(dateString);
      const timezone = session.timezone || 'America/Los_Angeles';
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: timezone
      });
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Poker Night Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 24px; }
          .content { padding: 0; }
          .session-details { background: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
          .cta-button { display: inline-block; background: #1f2937; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 16px 0; }
          .cta-button:hover { background: #111827; color: #ffffff; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .reminder-notice { background: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Poker Night Reminder</h1>
          <p>The host is still waiting for your response.</p>
        </div>

        <div class="content">
          <p>Hi ${player.name},</p>

          <div class="reminder-notice">
            <p><strong>Friendly reminder:</strong> ${hostName} is still waiting for your response to this poker session invitation.</p>
          </div>

          <div class="session-details">
            <h3>${session.name || 'Poker Night'}</h3>
            ${session.scheduled_datetime ? `
              <p><strong>When:</strong> ${formatDate(session.scheduled_datetime)}</p>
            ` : ''}
            <p><strong>Game type:</strong> ${session.game_type === 'tournament' ? 'Tournament' : 'Cash Game'}</p>
            <p><strong>Host:</strong> ${hostName}${hostEmail ? ` (${hostEmail})` : ''}</p>
          </div>

          <p>Please let the host know whether you can make it:</p>

          <div style="text-align: center;">
            <a href="${inviteUrl}" class="cta-button">
              Respond now
            </a>
          </div>

          <p>You can also copy and paste this link into your browser:</p>
          <p><a href="${inviteUrl}">${inviteUrl}</a></p>

          <p>Thanks,<br>
          Poker Night</p>
        </div>

        <div class="footer">
          <p>This reminder was sent by ${hostName} through Poker Night.</p>
        </div>
      </body>
      </html>
    `;
  }

  private generateSessionReminderText(data: SessionInviteEmailData): string {
    const { session, player, inviteUrl, hostName, hostEmail } = data;

    const formatDate = (dateString: string): string => {
      const date = new Date(dateString);
      const timezone = session.timezone || 'America/Los_Angeles';
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: timezone
      });
    };

    return `
POKER NIGHT REMINDER

Hi ${player.name},

Friendly reminder: ${hostName} is still waiting for your response to this poker session invitation.

SESSION DETAILS:
Session: ${session.name || 'Poker Night'}
${session.scheduled_datetime ? `When: ${formatDate(session.scheduled_datetime)}` : ''}
Game type: ${session.game_type === 'tournament' ? 'Tournament' : 'Cash Game'}
Host: ${hostName}${hostEmail ? ` (${hostEmail})` : ''}

Please let the host know whether you can make it:
${inviteUrl}

Thanks,
Poker Night

---
This reminder was sent by ${hostName} through Poker Night.
    `.trim();
  }

  public isEmailConfigured(): boolean {
    return this.isConfigured;
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;
