import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email};
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableResendClient() {
  const credentials = await getCredentials();
  return {
    client: new Resend(credentials.apiKey),
    fromEmail: connectionSettings.settings.from_email
  };
}

export interface CarpoolInsufficientBookingEmailData {
  customerName: string;
  customerEmail: string;
  routeName: string;
  fromLocation: string;
  toLocation: string;
  departureTime: string;
  bookingReference: string;
}

export async function sendCarpoolInsufficientBookingEmail(data: CarpoolInsufficientBookingEmailData) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .content { padding: 20px 0; }
            .info-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; }
            .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0; color: #dc3545;">Carpool Trip Cancellation Notice</h2>
            </div>
            
            <div class="content">
              <p>Dear ${data.customerName},</p>
              
              <p>We regret to inform you that your carpool booking has been cancelled due to insufficient passengers.</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0;">Trip Details:</h3>
                <p><strong>Route:</strong> ${data.routeName}</p>
                <p><strong>From:</strong> ${data.fromLocation}</p>
                <p><strong>To:</strong> ${data.toLocation}</p>
                <p><strong>Scheduled Departure:</strong> ${data.departureTime}</p>
                <p><strong>Booking Reference:</strong> ${data.bookingReference}</p>
              </div>
              
              <p>Unfortunately, we were unable to meet the minimum requirement of 3 passengers for this trip. As per our policy, trips with fewer than 3 confirmed bookings are cancelled 2 hours before departure.</p>
              
              <p><strong>What happens next:</strong></p>
              <ul>
                <li>Your booking has been automatically cancelled</li>
                <li>If you made any payment, a full refund will be processed within 5-7 business days</li>
                <li>You can book another trip on our platform at any time</li>
              </ul>
              
              <p>We apologize for any inconvenience this may cause. Please feel free to browse our other available routes and time slots for your commute needs.</p>
            </div>
            
            <div class="footer">
              <p>Thank you for choosing OfficeXpress Carpool Service.</p>
              <p>If you have any questions, please contact our support team.</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await client.emails.send({
      from: fromEmail,
      to: data.customerEmail,
      subject: `Carpool Trip Cancelled - ${data.routeName} (${data.departureTime})`,
      html: htmlContent,
    });

    console.log('[Email] Insufficient booking notification sent:', {
      to: data.customerEmail,
      bookingRef: data.bookingReference,
      messageId: result.data?.id
    });

    return result;
  } catch (error) {
    console.error('[Email] Failed to send insufficient booking notification:', error);
    throw error;
  }
}
