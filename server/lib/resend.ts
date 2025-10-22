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
                <td style="background-color: #B2DFDB; padding: 40px 30px; text-align: center;">
                  <img src="https://officexpress.org/logo.jpg" alt="OfficeXpress" style="max-width: 200px; height: auto; margin-bottom: 10px;" />
                  <p style="margin: 8px 0 0 0; color: #374151; font-size: 14px; font-weight: 500;">
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
                <td style="background-color: #374151; padding: 30px; text-align: center;">
                  <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 16px; font-weight: 600;">
                    OfficeXpress
                  </p>
                  <p style="margin: 0; color: #d1d5db; font-size: 13px; line-height: 1.6;">
                    Your Trusted Transportation Partner in Bangladesh
                  </p>
                  ${!isAdmin ? `
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #6b7280;">
                      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
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
      <h2 style="margin: 0 0 20px 0; color: #374151; font-size: 18px; font-weight: 600; padding-bottom: 10px; border-bottom: 2px solid #B2DFDB;">
        ${title}
      </h2>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${items.map(item => `
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 500; width: 40%;">
              ${item.label}
            </td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px;">
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
      subject: `New Corporate Booking #${data.referenceId}`,
      html: emailWrapper(`
        <div style="background-color: #e0f2f1; border-left: 4px solid #B2DFDB; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
          <p style="margin: 0; color: #004d40; font-size: 14px; font-weight: 600;">
            🔔 New Corporate Booking Submitted - Reference #${data.referenceId}
          </p>
        </div>
        
        <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
          A new corporate booking has been submitted on OfficeXpress.
        </p>
        
        ${detailSection('Company Information', [
          { label: 'Reference ID', value: `#${data.referenceId}` },
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
        
        <p style="margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #9ca3af; font-size: 13px;">
          <em>Submitted on: ${new Date().toLocaleString()}</em>
        </p>
      `, true)
    }),
    customer: (data: any) => ({
      subject: `New Corporate Booking #${data.referenceId}`,
      html: emailWrapper(`
        <h2 style="margin: 0 0 16px 0; color: #374151; font-size: 24px; font-weight: 700;">
          Thank you for your booking!
        </h2>
        
        <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
          Dear ${data.customerName},
        </p>
        
        <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
          We have received your corporate transportation booking request for <strong>${data.companyName}</strong>. Our team will review your requirements and contact you shortly.
        </p>
        
        <div style="margin: 24px 0; padding: 16px; background-color: #f3f4f6; border-radius: 8px;">
          <p style="margin: 0; color: #374151; font-size: 16px; font-weight: 600;">
            Reference ID: <span style="color: #004d40;">#${data.referenceId}</span>
          </p>
        </div>
        
        ${detailSection('Your Booking Details', [
          { label: 'Service Type', value: data.serviceType },
          { label: 'Contract Type', value: data.contractType },
          { label: 'Number of Employees', value: data.numberOfEmployees }
        ])}
        
        <div style="margin: 30px 0; padding: 20px; background-color: #e0f2f1; border-left: 4px solid #B2DFDB; border-radius: 4px;">
          <p style="margin: 0; color: #004d40; font-size: 14px; line-height: 1.6;">
            ✓ We will get back to you within 24 hours to discuss your requirements in detail.
          </p>
        </div>
        
        <p style="margin: 32px 0 0 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
          Best regards,<br>
          <strong style="color: #374151;">OfficeXpress Team</strong>
        </p>
      `, false)
    })
  },
  
  rentalBooking: {
    admin: (data: any) => ({
      subject: `New Rental Booking #${data.referenceId}`,
      html: emailWrapper(`
        <div style="background-color: #e0f2f1; border-left: 4px solid #B2DFDB; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
          <p style="margin: 0; color: #004d40; font-size: 14px; font-weight: 600;">
            🚗 New Vehicle Rental Booking - Reference #${data.referenceId}
          </p>
        </div>
        
        <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
          A new rental booking has been submitted on OfficeXpress.
        </p>
        
        ${detailSection('Customer Information', [
          { label: 'Reference ID', value: `#${data.referenceId}` },
          { label: 'Name', value: data.customerName },
          { label: 'Email', value: data.email || 'Not provided' },
          { label: 'Phone', value: data.phone }
        ])}
        
        ${detailSection('Rental Details', [
          { label: 'Service Type', value: data.serviceType },
          { label: 'Vehicle Type', value: data.vehicleType },
          { label: 'Capacity', value: data.vehicleCapacity },
          { label: 'Pickup Location', value: data.fromLocation },
          { label: 'Destination', value: data.toLocation },
          { label: 'Pickup Date', value: data.startDate },
          ...(data.endDate ? [{ label: 'Return Date', value: data.endDate }] : []),
          { label: 'Pickup Time', value: data.startTime },
          ...(data.endTime ? [{ label: 'End Time', value: data.endTime }] : [])
        ])}
        
        <p style="margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #9ca3af; font-size: 13px;">
          <em>Submitted on: ${new Date().toLocaleString()}</em>
        </p>
      `, true)
    }),
    customer: (data: any) => ({
      subject: `New Rental Booking #${data.referenceId}`,
      html: emailWrapper(`
        <h2 style="margin: 0 0 16px 0; color: #374151; font-size: 24px; font-weight: 700;">
          Thank you for your booking!
        </h2>
        
        <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
          Dear ${data.customerName},
        </p>
        
        <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
          We have received your vehicle rental booking request. Our team will confirm availability and contact you shortly.
        </p>
        
        <div style="margin: 24px 0; padding: 16px; background-color: #f3f4f6; border-radius: 8px;">
          <p style="margin: 0; color: #374151; font-size: 16px; font-weight: 600;">
            Reference ID: <span style="color: #004d40;">#${data.referenceId}</span>
          </p>
        </div>
        
        ${detailSection('Your Booking Details', [
          { label: 'Service Type', value: data.serviceType },
          { label: 'Vehicle Type', value: data.vehicleType },
          { label: 'Capacity', value: data.vehicleCapacity },
          { label: 'Pickup Location', value: data.fromLocation },
          { label: 'Destination', value: data.toLocation },
          { label: 'Pickup Date', value: data.startDate },
          { label: 'Pickup Time', value: data.startTime }
        ])}
        
        <div style="margin: 30px 0; padding: 20px; background-color: #e0f2f1; border-left: 4px solid #B2DFDB; border-radius: 4px;">
          <p style="margin: 0; color: #004d40; font-size: 14px; line-height: 1.6;">
            ✓ We will get back to you within 24 hours to confirm your booking.
          </p>
        </div>
        
        <p style="margin: 32px 0 0 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
          Best regards,<br>
          <strong style="color: #374151;">OfficeXpress Team</strong>
        </p>
      `, false)
    })
  },
  
  vendorRegistration: {
    admin: (data: any) => ({
      subject: `New Vendor Registration #${data.referenceId}`,
      html: emailWrapper(`
        <div style="background-color: #e0f2f1; border-left: 4px solid #B2DFDB; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
          <p style="margin: 0; color: #004d40; font-size: 14px; font-weight: 600;">
            🤝 New Vendor Registration - Reference #${data.referenceId}
          </p>
        </div>
        
        <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
          A new vendor has registered on OfficeXpress.
        </p>
        
        ${detailSection('Vendor Information', [
          { label: 'Reference ID', value: `#${data.referenceId}` },
          { label: 'Full Name', value: data.fullName },
          { label: 'Email', value: data.email },
          { label: 'Phone', value: data.phone },
          { label: 'Location', value: data.location }
        ])}
        
        ${detailSection('Service Details', [
          { label: 'Vehicle Types', value: Array.isArray(data.vehicleTypes) ? data.vehicleTypes.join(', ') : data.vehicleTypes },
          { label: 'Service Modality', value: data.serviceModality },
          { label: 'Experience', value: data.experience },
          ...(data.additionalInfo ? [{ label: 'Additional Information', value: data.additionalInfo }] : [])
        ])}
        
        <p style="margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #9ca3af; font-size: 13px;">
          <em>Submitted on: ${new Date().toLocaleString()}</em>
        </p>
      `, true)
    }),
    customer: (data: any) => ({
      subject: `New Vendor Registration #${data.referenceId}`,
      html: emailWrapper(`
        <h2 style="margin: 0 0 16px 0; color: #374151; font-size: 24px; font-weight: 700;">
          Thank you for registering!
        </h2>
        
        <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
          Dear ${data.fullName},
        </p>
        
        <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
          We have received your vendor registration. Our team will review your application and contact you shortly.
        </p>
        
        <div style="margin: 24px 0; padding: 16px; background-color: #f3f4f6; border-radius: 8px;">
          <p style="margin: 0; color: #374151; font-size: 16px; font-weight: 600;">
            Reference ID: <span style="color: #004d40;">#${data.referenceId}</span>
          </p>
        </div>
        
        ${detailSection('Your Registration Details', [
          { label: 'Full Name', value: data.fullName },
          { label: 'Vehicle Types', value: Array.isArray(data.vehicleTypes) ? data.vehicleTypes.join(', ') : data.vehicleTypes },
          { label: 'Service Modality', value: data.serviceModality },
          { label: 'Experience', value: data.experience }
        ])}
        
        <div style="margin: 30px 0; padding: 20px; background-color: #e0f2f1; border-left: 4px solid #B2DFDB; border-radius: 4px;">
          <p style="margin: 0; color: #004d40; font-size: 14px; line-height: 1.6;">
            ✓ We will get back to you within 48 hours regarding the next steps.
          </p>
        </div>
        
        <p style="margin: 32px 0 0 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
          Best regards,<br>
          <strong style="color: #374151;">OfficeXpress Team</strong>
        </p>
      `, false)
    })
  },
  
  contactMessage: {
    admin: (data: any) => ({
      subject: `New Contact Message #${data.referenceId}`,
      html: emailWrapper(`
        <div style="background-color: #e0f2f1; border-left: 4px solid #B2DFDB; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
          <p style="margin: 0; color: #004d40; font-size: 14px; font-weight: 600;">
            ✉️ New Contact Message - Reference #${data.referenceId}
          </p>
        </div>
        
        <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
          A new contact message has been submitted on OfficeXpress.
        </p>
        
        ${detailSection('Contact Information', [
          { label: 'Reference ID', value: `#${data.referenceId}` },
          { label: 'Name', value: data.name },
          { label: 'Email', value: data.email },
          ...(data.phone ? [{ label: 'Phone', value: data.phone }] : []),
          { label: 'Subject', value: data.subject || 'General Inquiry' }
        ])}
        
        <div style="margin: 30px 0;">
          <h2 style="margin: 0 0 20px 0; color: #374151; font-size: 18px; font-weight: 600; padding-bottom: 10px; border-bottom: 2px solid #B2DFDB;">
            Message
          </h2>
          <div style="background: #f5f5f5; padding: 20px; border-left: 4px solid #B2DFDB; border-radius: 4px;">
            <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.8; white-space: pre-wrap;">
              ${data.message?.replace(/\n/g, '<br>') || ''}
            </p>
          </div>
        </div>
        
        <p style="margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #9ca3af; font-size: 13px;">
          <em>Submitted on: ${new Date().toLocaleString()}</em>
        </p>
      `, true)
    }),
    customer: (data: any) => ({
      subject: `New Contact Message #${data.referenceId}`,
      html: emailWrapper(`
        <h2 style="margin: 0 0 16px 0; color: #374151; font-size: 24px; font-weight: 700;">
          Thank you for contacting us!
        </h2>
        
        <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
          Dear ${data.name},
        </p>
        
        <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
          We have received your message and will respond as soon as possible.
        </p>
        
        <div style="margin: 24px 0; padding: 16px; background-color: #f3f4f6; border-radius: 8px;">
          <p style="margin: 0; color: #374151; font-size: 16px; font-weight: 600;">
            Reference ID: <span style="color: #004d40;">#${data.referenceId}</span>
          </p>
        </div>
        
        <div style="margin: 30px 0;">
          <h2 style="margin: 0 0 20px 0; color: #374151; font-size: 18px; font-weight: 600; padding-bottom: 10px; border-bottom: 2px solid #B2DFDB;">
            Your Message
          </h2>
          <div style="background: #f5f5f5; padding: 20px; border-left: 4px solid #B2DFDB; border-radius: 4px;">
            <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.8; white-space: pre-wrap;">
              ${data.message?.replace(/\n/g, '<br>') || ''}
            </p>
          </div>
        </div>
        
        <div style="margin: 30px 0; padding: 20px; background-color: #e0f2f1; border-left: 4px solid #B2DFDB; border-radius: 4px;">
          <p style="margin: 0; color: #004d40; font-size: 14px; line-height: 1.6;">
            ✓ We typically respond to all inquiries within 24 hours.
          </p>
        </div>
        
        <p style="margin: 32px 0 0 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
          Best regards,<br>
          <strong style="color: #374151;">OfficeXpress Team</strong>
        </p>
      `, false)
    })
  },
  
  employeeOnboarding: (data: any) => ({
    subject: `Welcome to OfficeXpress - Complete Your Account Setup`,
    html: emailWrapper(`
      <h2 style="margin: 0 0 16px 0; color: #374151; font-size: 24px; font-weight: 700;">
        Welcome to OfficeXpress!
      </h2>
      
      <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
        Dear ${data.name},
      </p>
      
      <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
        Your employee account has been successfully created on the OfficeXpress platform. To get started, please click the button below to set your password and complete your account setup.
      </p>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${data.onboardingUrl}" style="display: inline-block; padding: 16px 40px; background-color: #4c9096; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          Set Up Your Account
        </a>
      </div>
      
      <div style="margin: 30px 0; padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
        <p style="margin: 0 0 8px 0; color: #856404; font-size: 14px; font-weight: 600;">
          ⚠️ Important Security Notice
        </p>
        <p style="margin: 0; color: #856404; font-size: 13px; line-height: 1.6;">
          This onboarding link will expire in ${data.expiresIn}. If the link expires, please contact your administrator to request a new one. For security reasons, this link can only be used once.
        </p>
      </div>
      
      <div style="margin: 30px 0; padding: 20px; background-color: #f3f4f6; border-radius: 8px;">
        <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px; font-weight: 600;">
          Can't click the button? Copy and paste this link into your browser:
        </p>
        <p style="margin: 0; color: #4c9096; font-size: 12px; word-break: break-all; font-family: monospace;">
          ${data.onboardingUrl}
        </p>
      </div>
      
      ${detailSection('Your Account Details', [
        { label: 'Full Name', value: data.name },
        { label: 'Email', value: data.email },
        { label: 'Phone', value: data.phone },
        { label: 'Role', value: data.role.charAt(0).toUpperCase() + data.role.slice(1) }
      ])}
      
      <div style="margin: 30px 0; padding: 20px; background-color: #e0f2f1; border-left: 4px solid #B2DFDB; border-radius: 4px;">
        <p style="margin: 0; color: #004d40; font-size: 14px; line-height: 1.6;">
          ✓ If you have any questions or need assistance, please contact your administrator.
        </p>
      </div>
      
      <p style="margin: 32px 0 0 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
        Best regards,<br>
        <strong style="color: #374151;">OfficeXpress Team</strong>
      </p>
    `, false)
  })
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
      from: `OfficeXpress <${fromEmail}>`,
      to: 'hesham@officexpress.org',
      subject: adminEmail.subject,
      html: adminEmail.html
    });
    
    // Send customer confirmation if email is provided
    if (data.email) {
      await client.emails.send({
        from: `OfficeXpress <${fromEmail}>`,
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

// Send employee onboarding email
export async function sendEmployeeOnboardingEmail(data: {
  email: string;
  name: string;
  phone: string;
  role: string;
  onboardingUrl: string;
  expiresIn: string;
}) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    const template = emailTemplates.employeeOnboarding(data);
    
    await client.emails.send({
      from: `OfficeXpress <${fromEmail}>`,
      to: data.email,
      subject: template.subject,
      html: template.html
    });
    
    console.log(`Employee onboarding email sent to ${data.email}`);
  } catch (error) {
    console.error('Error sending employee onboarding email:', error);
    throw error; // Throw so we can inform the user if email fails
  }
}
