import nodemailer from 'nodemailer';
import { Session, Player } from '../types/index';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface SessionInviteEmailData {
  session: Session;
  player: Player;
  inviteUrl: string;
  hostName: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    try {
      // Check if email configuration is available
      const emailHost = process.env.EMAIL_HOST;
      const emailPort = process.env.EMAIL_PORT;
      const emailUser = process.env.EMAIL_USER;
      const emailPass = process.env.EMAIL_PASS;

      if (!emailHost || !emailPort || !emailUser || !emailPass) {
        console.log('Email configuration not found. Email functionality will be disabled.');
        return;
      }

      const config: EmailConfig = {
        host: emailHost,
        port: parseInt(emailPort),
        secure: parseInt(emailPort) === 465, // true for 465, false for other ports
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      };

      this.transporter = nodemailer.createTransport(config);
      this.isConfigured = true;

      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  public async sendSessionInviteEmail(data: SessionInviteEmailData): Promise<boolean> {
    console.log('📧 [EmailService] sendSessionInviteEmail called for:', data.player.email);
    if (!this.isConfigured || !this.transporter) {
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

      const mailOptions = {
        from: `"Poker Night" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: data.player.email,
        subject: `🃏 You're invited to ${data.session.name || 'Poker Night'}${dateText}`,
        text: emailText,
        html: emailHtml,
      };

      console.log('📧 [EmailService] Calling transporter.sendMail...');
      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Session invite email sent to ${data.player.email}:`, result.messageId);
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
    baseUrl: string
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
    if (!this.isConfigured || !this.transporter) {
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

      const mailOptions = {
        from: `"Poker Night" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: data.player.email,
        subject: `🔔 Reminder: Please respond to ${data.session.name || 'Poker Night'}${dateText}`,
        text: emailText,
        html: emailHtml,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Session reminder email sent to ${data.player.email}:`, result.messageId);
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
    baseUrl: string
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
    const { session, player, inviteUrl, hostName } = data;
    
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
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .session-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
          .cta-button { display: inline-block; background: #3b82f6; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; border: 2px solid #3b82f6; }
          .cta-button:hover { background: #2563eb; border-color: #2563eb; color: #ffffff; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .emoji { font-size: 1.2em; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1><span class="emoji">🃏</span> Poker Night Invitation</h1>
        </div>
        
        <div class="content">
          <p>Hi ${player.name},</p>
          
          <p>${hostName} has invited you to a poker session!</p>
          
          <div class="session-details">
            <h3><span class="emoji">🎮</span> ${session.name || 'Poker Night'}</h3>
            ${session.scheduled_datetime ? `
              <p><strong><span class="emoji">📅</span> When:</strong> ${formatDate(session.scheduled_datetime)}</p>
            ` : ''}
            <p><strong><span class="emoji">${session.game_type === 'tournament' ? '🏆' : '💵'}</span> Game Type:</strong> ${session.game_type === 'tournament' ? 'Tournament' : 'Cash Game'}</p>
            <p><strong><span class="emoji">👤</span> Host:</strong> ${hostName}</p>
          </div>
          
          <p>Please let us know if you can make it by clicking the button below:</p>
          
          <div style="text-align: center;">
            <a href="${inviteUrl}" class="cta-button">
              <span class="emoji">✅</span> Respond to Invitation
            </a>
          </div>
          
          <p>You can update your status anytime using the link above. We're looking forward to seeing you at the table!</p>
          
          <p>Best regards,<br>
          The Poker Night Team</p>
        </div>
        
        <div class="footer">
          <p>This invitation was sent by ${hostName} through Poker Night.<br>
          If you have any questions, please contact the host directly.</p>
        </div>
      </body>
      </html>
    `;
  }

  private generateSessionInviteText(data: SessionInviteEmailData): string {
    const { session, player, inviteUrl, hostName } = data;
    
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
🃏 POKER NIGHT INVITATION

Hi ${player.name},

${hostName} has invited you to a poker session!

SESSION DETAILS:
🎮 Session: ${session.name || 'Poker Night'}
${session.scheduled_datetime ? `📅 When: ${formatDate(session.scheduled_datetime)}` : ''}
${session.game_type === 'tournament' ? '🏆' : '💵'} Game Type: ${session.game_type === 'tournament' ? 'Tournament' : 'Cash Game'}
👤 Host: ${hostName}

Please respond to this invitation by visiting:
${inviteUrl}

You can update your status anytime using the link above. We're looking forward to seeing you at the table!

Best regards,
The Poker Night Team

---
This invitation was sent by ${hostName} through Poker Night.
If you have any questions, please contact the host directly.
    `.trim();
  }

  private generateSessionReminderHtml(data: SessionInviteEmailData): string {
    const { session, player, inviteUrl, hostName } = data;

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
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .session-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
          .cta-button { display: inline-block; background: #3b82f6; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; border: 2px solid #3b82f6; }
          .cta-button:hover { background: #2563eb; border-color: #2563eb; color: #ffffff; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .emoji { font-size: 1.2em; }
          .reminder-notice { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1><span class="emoji">🔔</span> Poker Night Reminder</h1>
          <p>We haven't heard from you yet!</p>
        </div>

        <div class="content">
          <p>Hi ${player.name},</p>

          <div class="reminder-notice">
            <p><strong><span class="emoji">⏰</span> Friendly Reminder:</strong> We're still waiting for your response to the poker session invitation from ${hostName}.</p>
          </div>

          <div class="session-details">
            <h3><span class="emoji">🎮</span> ${session.name || 'Poker Night'}</h3>
            ${session.scheduled_datetime ? `
              <p><strong><span class="emoji">📅</span> When:</strong> ${formatDate(session.scheduled_datetime)}</p>
            ` : ''}
            <p><strong><span class="emoji">${session.game_type === 'tournament' ? '🏆' : '💵'}</span> Game Type:</strong> ${session.game_type === 'tournament' ? 'Tournament' : 'Cash Game'}</p>
            <p><strong><span class="emoji">👤</span> Host:</strong> ${hostName}</p>
          </div>

          <p>Please let us know if you can make it by clicking the button below. It only takes a moment!</p>

          <div style="text-align: center;">
            <a href="${inviteUrl}" class="cta-button">
              <span class="emoji">✅</span> Respond Now
            </a>
          </div>

          <p>Your response helps us plan better for the session. Thanks for taking a moment to let us know!</p>

          <p>Best regards,<br>
          The Poker Night Team</p>
        </div>

        <div class="footer">
          <p>This reminder was sent by ${hostName} through Poker Night.<br>
          If you have any questions, please contact the host directly.</p>
        </div>
      </body>
      </html>
    `;
  }

  private generateSessionReminderText(data: SessionInviteEmailData): string {
    const { session, player, inviteUrl, hostName } = data;

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
🔔 POKER NIGHT REMINDER

Hi ${player.name},

⏰ FRIENDLY REMINDER: We're still waiting for your response to the poker session invitation from ${hostName}.

SESSION DETAILS:
🎮 Session: ${session.name || 'Poker Night'}
${session.scheduled_datetime ? `📅 When: ${formatDate(session.scheduled_datetime)}` : ''}
${session.game_type === 'tournament' ? '🏆' : '💵'} Game Type: ${session.game_type === 'tournament' ? 'Tournament' : 'Cash Game'}
👤 Host: ${hostName}

Please respond to this invitation by visiting:
${inviteUrl}

Your response helps us plan better for the session. Thanks for taking a moment to let us know!

Best regards,
The Poker Night Team

---
This reminder was sent by ${hostName} through Poker Night.
If you have any questions, please contact the host directly.
    `.trim();
  }

  public isEmailConfigured(): boolean {
    return this.isConfigured;
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;
