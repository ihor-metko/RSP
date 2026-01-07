/**
 * Email Service
 * 
 * Centralized email sending service using Resend as the email provider.
 * This service abstracts email provider implementation from business logic.
 * 
 * Responsibilities:
 * - Sending transactional emails (invites, password resets, etc.)
 * - Error handling and logging
 * - Email template rendering
 * 
 * Non-responsibilities:
 * - Database access
 * - Permission checks
 * - Business logic
 */

import { Resend } from "resend";

// Lazy-initialize Resend client to avoid build-time errors
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

// Default sender email (can be configured via environment)
const getFromEmail = () => process.env.EMAIL_FROM || "ArenaOne <noreply@arenaone.com>";

// Support email (can be configured via environment)
const getSupportEmail = () => process.env.SUPPORT_EMAIL || "support@arenaone.com";

// Default locale for date/time formatting (can be configured via environment)
const getDefaultLocale = () => process.env.DEFAULT_LOCALE || "en-US";

/**
 * Email sending result
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Invite email parameters
 */
export interface InviteEmailParams {
  to: string;
  inviteLink: string;
  role: string;
  organizationName?: string;
  clubName?: string;
  inviterName?: string;
}

/**
 * Send an invite email
 * 
 * @param params - Invite email parameters
 * @returns Email sending result
 */
export async function sendInviteEmail(
  params: InviteEmailParams
): Promise<EmailResult> {
  try {
    const { to, inviteLink, role, organizationName, clubName, inviterName } = params;

    // Determine the scope (organization or club)
    const scope = clubName ? "club" : "organization";
    const entityName = clubName || organizationName || "the platform";

    // Format the role for display
    const displayRole = formatRoleForDisplay(role);

    // Build email subject
    const subject = `You've been invited to join ${entityName}`;

    // Build email HTML
    const html = buildInviteEmailHTML({
      inviteLink,
      displayRole,
      entityName,
      scope,
      inviterName,
    });

    // Send email using Resend
    const resend = getResendClient();
    const response = await resend.emails.send({
      from: getFromEmail(),
      to,
      subject,
      html,
    });

    if (response.error) {
      console.error("Failed to send invite email:", response.error);
      return {
        success: false,
        error: response.error.message || "Failed to send email",
      };
    }

    console.log(`Invite email sent successfully to ${to}, messageId: ${response.data?.id}`);

    return {
      success: true,
      messageId: response.data?.id,
    };
  } catch (error) {
    console.error("Error sending invite email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Format role string for human-readable display
 */
function formatRoleForDisplay(role: string): string {
  const roleMap: Record<string, string> = {
    ORGANIZATION_OWNER: "Organization Owner",
    ORGANIZATION_ADMIN: "Organization Administrator",
    CLUB_OWNER: "Club Owner",
    CLUB_ADMIN: "Club Administrator",
  };

  return roleMap[role] || role;
}

/**
 * Build invite email HTML template
 */
function buildInviteEmailHTML(params: {
  inviteLink: string;
  displayRole: string;
  entityName: string;
  scope: string;
  inviterName?: string;
}): string {
  const { inviteLink, displayRole, entityName, scope, inviterName } = params;

  const inviterText = inviterName
    ? `${inviterName} has invited you`
    : "You've been invited";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invite to ${entityName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
      color: white;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #333;
      font-size: 22px;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .content p {
      margin: 0 0 20px;
      color: #555;
      font-size: 16px;
    }
    .invite-details {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 25px 0;
      border-radius: 4px;
    }
    .invite-details p {
      margin: 8px 0;
      font-size: 15px;
    }
    .invite-details strong {
      color: #333;
      display: inline-block;
      min-width: 80px;
    }
    .cta-button {
      display: inline-block;
      padding: 16px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      margin: 20px 0;
      transition: transform 0.2s;
    }
    .cta-button:hover {
      transform: translateY(-2px);
    }
    .footer {
      padding: 30px;
      text-align: center;
      background: #f8f9fa;
      border-top: 1px solid #e9ecef;
    }
    .footer p {
      margin: 5px 0;
      color: #6c757d;
      font-size: 14px;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .expiry-notice {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 4px;
      padding: 15px;
      margin: 20px 0;
      color: #856404;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎾 ArenaOne</h1>
    </div>
    
    <div class="content">
      <h2>You're Invited!</h2>
      
      <p>${inviterText} to join <strong>${entityName}</strong> as a <strong>${displayRole}</strong>.</p>
      
      <div class="invite-details">
        <p><strong>Role:</strong> ${displayRole}</p>
        <p><strong>${scope === "club" ? "Club" : "Organization"}:</strong> ${entityName}</p>
      </div>
      
      <p>Click the button below to accept this invitation and get started:</p>
      
      <div style="text-align: center;">
        <a href="${inviteLink}" class="cta-button">Accept Invitation</a>
      </div>
      
      <div class="expiry-notice">
        ⚠️ This invitation will expire in 7 days. Please accept it before it expires.
      </div>
      
      <p style="margin-top: 30px; font-size: 14px; color: #6c757d;">
        If you weren't expecting this invitation, you can safely ignore this email.
      </p>
    </div>
    
    <div class="footer">
      <p><strong>ArenaOne</strong></p>
      <p>Your premium padel booking platform</p>
      <p style="margin-top: 15px;">
        Need help? Contact us at <a href="mailto:support@arenaone.com">support@arenaone.com</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Booking cancellation email parameters
 */
export interface BookingCancellationEmailParams {
  to: string;
  userName?: string;
  courtName: string;
  clubName: string;
  startTime: string;
  endTime: string;
}

/**
 * Send a booking cancellation notification email
 * 
 * @param params - Booking cancellation email parameters
 * @returns Email sending result
 */
export async function sendBookingCancellationEmail(
  params: BookingCancellationEmailParams
): Promise<EmailResult> {
  try {
    const { to, userName, courtName, clubName, startTime, endTime } = params;

    // Format dates for display using configured locale
    const locale = getDefaultLocale();
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    // Validate date parsing
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.error(`[sendBookingCancellationEmail] Invalid date strings - start: ${startTime}, end: ${endTime}`);
      return {
        success: false,
        error: "Invalid date format",
      };
    }
    
    const formattedDate = start.toLocaleDateString(locale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedStartTime = start.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
    const formattedEndTime = end.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Build email subject
    const subject = `Booking Cancelled - Payment Not Completed`;

    // Build email HTML
    const html = buildCancellationEmailHTML({
      userName,
      courtName,
      clubName,
      formattedDate,
      formattedStartTime,
      formattedEndTime,
    });

    // Send email using Resend
    const resend = getResendClient();
    const response = await resend.emails.send({
      from: getFromEmail(),
      to,
      subject,
      html,
    });

    if (response.error) {
      console.error("Failed to send cancellation email:", response.error);
      return {
        success: false,
        error: response.error.message || "Failed to send email",
      };
    }

    console.log(`Cancellation email sent successfully to ${to}, messageId: ${response.data?.id}`);

    return {
      success: true,
      messageId: response.data?.id,
    };
  } catch (error) {
    console.error("Error sending cancellation email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Build booking cancellation email HTML template
 */
function buildCancellationEmailHTML(params: {
  userName?: string;
  courtName: string;
  clubName: string;
  formattedDate: string;
  formattedStartTime: string;
  formattedEndTime: string;
}): string {
  const { userName, courtName, clubName, formattedDate, formattedStartTime, formattedEndTime } = params;

  const greeting = userName ? `Hi ${userName}` : "Hi";
  const supportEmail = getSupportEmail();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Cancelled</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
      padding: 40px 20px;
      text-align: center;
      color: white;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #333;
      font-size: 22px;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .content p {
      margin: 0 0 20px;
      color: #555;
      font-size: 16px;
    }
    .booking-details {
      background: #f8f9fa;
      border-left: 4px solid #dc3545;
      padding: 20px;
      margin: 25px 0;
      border-radius: 4px;
    }
    .booking-details p {
      margin: 8px 0;
      font-size: 15px;
    }
    .booking-details strong {
      color: #333;
      display: inline-block;
      min-width: 100px;
    }
    .notice {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 4px;
      padding: 15px;
      margin: 20px 0;
      color: #856404;
      font-size: 14px;
    }
    .footer {
      padding: 30px;
      text-align: center;
      background: #f8f9fa;
      border-top: 1px solid #e9ecef;
    }
    .footer p {
      margin: 5px 0;
      color: #6c757d;
      font-size: 14px;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎾 ArenaOne</h1>
    </div>
    
    <div class="content">
      <h2>Booking Cancelled</h2>
      
      <p>${greeting},</p>
      
      <p>Your booking was automatically cancelled because payment was not completed in time.</p>
      
      <div class="booking-details">
        <p><strong>Club:</strong> ${clubName}</p>
        <p><strong>Court:</strong> ${courtName}</p>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Time:</strong> ${formattedStartTime} - ${formattedEndTime}</p>
      </div>
      
      <div class="notice">
        ⚠️ To secure your booking in the future, please complete payment within 30 minutes of confirmation.
      </div>
      
      <p>The court is now available for other players. If you still wish to book this time slot, please make a new reservation and complete the payment promptly.</p>
      
      <p style="margin-top: 30px; font-size: 14px; color: #6c757d;">
        If you have any questions, please contact us.
      </p>
    </div>
    
    <div class="footer">
      <p><strong>ArenaOne</strong></p>
      <p>Your premium padel booking platform</p>
      <p style="margin-top: 15px;">
        Need help? Contact us at <a href="mailto:${supportEmail}">${supportEmail}</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Test email service configuration
 * 
 * @returns true if email service is properly configured
 */
export function isEmailServiceConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
