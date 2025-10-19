import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
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

// Base email template with branding
function emailWrapper(content: string, isAdmin: boolean = false) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>OfficeXpress</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; max-width: 600px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <!-- Header Banner -->
              <tr>
                <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: -0.5px;">
                    OfficeXpress
                  </h1>
                  <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.95); font-size: 14px; font-weight: 500;">
                    Premium Transportation Services
                  </p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  ${content}
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #1a1a1a; padding: 30px; text-align: center;">
                  <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 16px; font-weight: 600;">
                    OfficeXpress
                  </p>
                  <p style="margin: 0; color: #a3a3a3; font-size: 13px; line-height: 1.6;">
                    Your Trusted Transportation Partner in Bangladesh
                  </p>
                  ${!isAdmin ? `
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #333333;">
                      <p style="margin: 0; color: #737373; font-size: 12px;">
                        This email was sent from OfficeXpress. Please do not reply to this email.
                      </p>
                    </div>
                  ` : ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Helper for detail sections
function detailSection(title: string, items: Array<{label: string, value: string}>) {
  return `
    <div style="margin: 30px 0;">
      <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 18px; font-weight: 600; padding-bottom: 10px; border-bottom: 2px solid #f97316;">
        ${title}
      </h2>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${items.map(item => `
          <tr>
            <td style="padding: 8px 0; color: #525252; font-size: 14px; font-weight: 500; width: 40%;">
              ${item.label}
            </td>
            <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px;">
              ${item.value}
            </td>
          </tr>
        `).join('')}
      </table>
    </div>
  `;
}

// Email templates
export const emailTemplates = {
  corporateBooking: {
    admin: (data: any) => ({
      subject: `New Corporate Booking - ${data.companyName}`,
      html: emailWrapper(`
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
          <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">
            🔔 New Corporate Booking Submitted
          </p>
        </div>
        
        <p style="margin: 0 0 24px 0; color: #525252; font-size: 15px; line-height: 1.6;">
          A new corporate booking has been submitted on OfficeXpress.
        </p>
        
        ${detailSection('Company Information', [
          { label: 'Company Name', value: data.companyName },
          { label: 'Primary Contact', value: data.customerName },
          { label: 'Email', value: data.email },
          { label: 'Phone', value: data.phone }
        ])}
        
        ${detailSection('Service Details', [
          { label: 'Service Type', value: data.serviceType },
          { label: 'Contract Type', value: data.contractType },
          { label: 'Employees', value: data.numberOfEmployees },
          ...(data.officeAddress ? [{ label: 'Office Address', value: data.officeAddress }] : []),
          ...(data.additionalRequirements ? [{ label: 'Additional Requirements', value: data.additionalRequirements }] : [])
        ])}
        
        <p style="margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #737373; font-size: 13px;">
          <em>Submitted on: ${new Date().toLocaleString()}</em>
        </p>
      `, true)
    }),
    customer: (data: any) => ({
      subject: 'Corporate Booking Confirmation - OfficeXpress',
      html: emailWrapper(`
        <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 24px; font-weight: 700;">
          Thank you for your booking!
        </h2>
        
        <p style="margin: 0 0 24px 0; color: #525252; font-size: 15px; line-height: 1.6;">
          Dear ${data.customerName},
        </p>
        
        <p style="margin: 0 0 32px 0; color: #525252; font-size: 15px; line-height: 1.6;">
          We have received your corporate transportation booking request for <strong>${data.companyName}</strong>. Our team will review your requirements and contact you shortly.
        </p>
        
        ${detailSection('Your Booking Details', [
          { label: 'Service Type', value: data.serviceType },
          { label: 'Contract Type', value: data.contractType },
          { label: 'Number of Employees', value: data.numberOfEmployees }
        ])}
        
        <div style="margin: 30px 0; padding: 20px; background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px;">
          <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
            ✓ We will get back to you within 24 hours to discuss your requirements in detail.
          </p>
        </div>
        
        <p style="margin: 32px 0 0 0; color: #525252; font-size: 15px; line-height: 1.6;">
          Best regards,<br>
          <strong style="color: #1a1a1a;">OfficeXpress Team</strong>
        </p>
      `, false)
    })
  },
  
  rentalBooking: {
    admin: (data: any) => ({
      subject: `New Rental Booking - ${data.customerName}`,
      html: emailWrapper(`
        <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
          <p style="margin: 0; color: #1e40af; font-size: 14px; font-weight: 600;">
            🚗 New Vehicle Rental Booking
          </p>
        </div>
        
        <p style="margin: 0 0 24px 0; color: #525252; font-size: 15px; line-height: 1.6;">
          A new rental booking has been submitted on OfficeXpress.
        </p>
        
        ${detailSection('Customer Information', [
          { label: 'Name', value: data.customerName },
          { label: 'Email', value: data.email },
          { label: 'Phone', value: data.phone }
        ])}
        
        ${detailSection('Rental Details', [
          { label: 'Service Type', value: data.serviceType },
          { label: 'Vehicle Type', value: data.vehicleType },
          { label: 'Capacity', value: data.vehicleCapacity },
          { label: 'Pickup Location', value: data.pickupLocation },
          { label: 'Destination', value: data.destination },
          { label: 'Pickup Date', value: data.pickupDate },
          ...(data.returnDate ? [{ label: 'Return Date', value: data.returnDate }] : []),
          { label: 'Pickup Time', value: data.pickupTime },
          ...(data.endTime ? [{ label: 'End Time', value: data.endTime }] : []),
          ...(data.specialRequirements ? [{ label: 'Special Requirements', value: data.specialRequirements }] : [])
        ])}
        
        <p style="margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #737373; font-size: 13px;">
          <em>Submitted on: ${new Date().toLocaleString()}</em>
        </p>
      `, true)
    }),
    customer: (data: any) => ({
      subject: 'Rental Booking Confirmation - OfficeXpress',
      html: emailWrapper(`
        <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 24px; font-weight: 700;">
          Thank you for your booking!
        </h2>
        
        <p style="margin: 0 0 24px 0; color: #525252; font-size: 15px; line-height: 1.6;">
          Dear ${data.customerName},
        </p>
        
        <p style="margin: 0 0 32px 0; color: #525252; font-size: 15px; line-height: 1.6;">
          We have received your vehicle rental booking request. Our team will confirm availability and contact you shortly.
        </p>
        
        ${detailSection('Your Booking Details', [
          { label: 'Service Type', value: data.serviceType },
          { label: 'Vehicle Type', value: data.vehicleType },
          { label: 'Capacity', value: data.vehicleCapacity },
          { label: 'Pickup Location', value: data.pickupLocation },
          { label: 'Destination', value: data.destination },
          { label: 'Pickup Date', value: data.pickupDate },
          { label: 'Pickup Time', value: data.pickupTime }
        ])}
        
        <div style="margin: 30px 0; padding: 20px; background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px;">
          <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
            ✓ We will get back to you within 24 hours to confirm your booking.
          </p>
        </div>
        
        <p style="margin: 32px 0 0 0; color: #525252; font-size: 15px; line-height: 1.6;">
          Best regards,<br>
          <strong style="color: #1a1a1a;">OfficeXpress Team</strong>
        </p>
      `, false)
    })
  },
  
  vendorRegistration: {
    admin: (data: any) => ({
      subject: `New Vendor Registration - ${data.companyName}`,
      html: emailWrapper(`
        <div style="background-color: #f3e8ff; border-left: 4px solid #a855f7; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
          <p style="margin: 0; color: #6b21a8; font-size: 14px; font-weight: 600;">
            🤝 New Vendor Registration
          </p>
        </div>
        
        <p style="margin: 0 0 24px 0; color: #525252; font-size: 15px; line-height: 1.6;">
          A new vendor has registered on OfficeXpress.
        </p>
        
        ${detailSection('Company Information', [
          { label: 'Company Name', value: data.companyName },
          { label: 'Contact Person', value: data.contactPerson },
          { label: 'Email', value: data.email },
          { label: 'Phone', value: data.phone }
        ])}
        
        ${detailSection('Service Details', [
          { label: 'Vehicle Types', value: Array.isArray(data.vehicleTypes) ? data.vehicleTypes.join(', ') : data.vehicleTypes },
          { label: 'Fleet Size', value: data.fleetSize },
          { label: 'Experience', value: data.experience },
          { label: 'Service Areas', value: data.serviceAreas },
          ...(data.additionalInfo ? [{ label: 'Additional Information', value: data.additionalInfo }] : [])
        ])}
        
        <p style="margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #737373; font-size: 13px;">
          <em>Submitted on: ${new Date().toLocaleString()}</em>
        </p>
      `, true)
    }),
    customer: (data: any) => ({
      subject: 'Vendor Registration Received - OfficeXpress',
      html: emailWrapper(`
        <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 24px; font-weight: 700;">
          Thank you for registering!
        </h2>
        
        <p style="margin: 0 0 24px 0; color: #525252; font-size: 15px; line-height: 1.6;">
          Dear ${data.contactPerson},
        </p>
        
        <p style="margin: 0 0 32px 0; color: #525252; font-size: 15px; line-height: 1.6;">
          We have received your vendor registration for <strong>${data.companyName}</strong>. Our team will review your application and contact you shortly.
        </p>
        
        ${detailSection('Your Registration Details', [
          { label: 'Company Name', value: data.companyName },
          { label: 'Vehicle Types', value: Array.isArray(data.vehicleTypes) ? data.vehicleTypes.join(', ') : data.vehicleTypes },
          { label: 'Fleet Size', value: data.fleetSize },
          { label: 'Experience', value: data.experience }
        ])}
        
        <div style="margin: 30px 0; padding: 20px; background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px;">
          <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
            ✓ We will get back to you within 48 hours regarding the next steps.
          </p>
        </div>
        
        <p style="margin: 32px 0 0 0; color: #525252; font-size: 15px; line-height: 1.6;">
          Best regards,<br>
          <strong style="color: #1a1a1a;">OfficeXpress Team</strong>
        </p>
      `, false)
    })
  },
  
  contactMessage: {
    admin: (data: any) => ({
      subject: `New Contact Message - ${data.subject || 'General Inquiry'}`,
      html: emailWrapper(`
        <div style="background-color: #fce7f3; border-left: 4px solid #ec4899; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
          <p style="margin: 0; color: #9f1239; font-size: 14px; font-weight: 600;">
            ✉️ New Contact Message
          </p>
        </div>
        
        <p style="margin: 0 0 24px 0; color: #525252; font-size: 15px; line-height: 1.6;">
          A new contact message has been submitted on OfficeXpress.
        </p>
        
        ${detailSection('Contact Information', [
          { label: 'Name', value: data.name },
          { label: 'Email', value: data.email },
          ...(data.phone ? [{ label: 'Phone', value: data.phone }] : []),
          { label: 'Subject', value: data.subject || 'General Inquiry' }
        ])}
        
        <div style="margin: 30px 0;">
          <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 18px; font-weight: 600; padding-bottom: 10px; border-bottom: 2px solid #f97316;">
            Message
          </h2>
          <div style="background: #f5f5f5; padding: 20px; border-left: 4px solid #f97316; border-radius: 4px;">
            <p style="margin: 0; color: #1a1a1a; font-size: 14px; line-height: 1.8; white-space: pre-wrap;">
              ${data.message?.replace(/\n/g, '<br>') || ''}
            </p>
          </div>
        </div>
        
        <p style="margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #737373; font-size: 13px;">
          <em>Submitted on: ${new Date().toLocaleString()}</em>
        </p>
      `, true)
    }),
    customer: (data: any) => ({
      subject: 'Message Received - OfficeXpress',
      html: emailWrapper(`
        <h2 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 24px; font-weight: 700;">
          Thank you for contacting us!
        </h2>
        
        <p style="margin: 0 0 24px 0; color: #525252; font-size: 15px; line-height: 1.6;">
          Dear ${data.name},
        </p>
        
        <p style="margin: 0 0 32px 0; color: #525252; font-size: 15px; line-height: 1.6;">
          We have received your message and will respond as soon as possible.
        </p>
        
        <div style="margin: 30px 0;">
          <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 18px; font-weight: 600; padding-bottom: 10px; border-bottom: 2px solid #f97316;">
            Your Message
          </h2>
          <div style="background: #f5f5f5; padding: 20px; border-left: 4px solid #f97316; border-radius: 4px;">
            <p style="margin: 0; color: #1a1a1a; font-size: 14px; line-height: 1.8; white-space: pre-wrap;">
              ${data.message?.replace(/\n/g, '<br>') || ''}
            </p>
          </div>
        </div>
        
        <div style="margin: 30px 0; padding: 20px; background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px;">
          <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
            ✓ We typically respond to all inquiries within 24 hours.
          </p>
        </div>
        
        <p style="margin: 32px 0 0 0; color: #525252; font-size: 15px; line-height: 1.6;">
          Best regards,<br>
          <strong style="color: #1a1a1a;">OfficeXpress Team</strong>
        </p>
      `, false)
    })
  }
};

// Send email notification
export async function sendEmailNotification(
  type: 'corporateBooking' | 'rentalBooking' | 'vendorRegistration' | 'contactMessage',
  data: any
) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    const template = emailTemplates[type];
    
    const adminEmail = template.admin(data);
    const customerEmail = template.customer(data);
    
    // Send admin notification
    await client.emails.send({
      from: fromEmail,
      to: 'hesham@officexpress.org',
      subject: adminEmail.subject,
      html: adminEmail.html
    });
    
    // Send customer confirmation if email is provided
    if (data.email) {
      await client.emails.send({
        from: fromEmail,
        to: data.email,
        subject: customerEmail.subject,
        html: customerEmail.html
      });
    }
    
    console.log(`Email notifications sent for ${type}`);
  } catch (error) {
    console.error('Error sending email notification:', error);
    // Don't throw - we don't want to fail the form submission if email fails
  }
}
