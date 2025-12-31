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
export function emailWrapper(content: string, isAdmin: boolean = false) {
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

// Helper for detail sections with change tracking
function detailSectionWithChanges(title: string, items: Array<{label: string, value: string, oldValue?: string, bookingUrl?: string}>) {
  return `
    <div style="margin: 30px 0;">
      <h2 style="margin: 0 0 20px 0; color: #374151; font-size: 18px; font-weight: 600; padding-bottom: 10px; border-bottom: 2px solid #B2DFDB;">
        ${title}
      </h2>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${items.map(item => {
          const hasChanged = item.oldValue !== undefined && item.oldValue !== item.value;
          let valueHtml = item.value;
          
          // Add hyperlink for Reference ID if bookingUrl is provided
          if (item.bookingUrl && item.label === 'Reference ID') {
            valueHtml = `<a href="${item.bookingUrl}" style="color: #4c9096; text-decoration: none; font-weight: 600;">${item.value}</a>`;
          }
          
          // If value changed, show in bold with old value struck through in red
          if (hasChanged) {
            valueHtml = `<strong>${valueHtml}</strong> <span style="color: #dc2626; text-decoration: line-through; font-size: 13px;">(${item.oldValue})</span>`;
          }
          
          return `
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 500; width: 40%;">
              ${item.label}
            </td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px;">
              ${valueHtml}
            </td>
          </tr>
        `;
        }).join('')}
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
  
  driverAssigned: (data: any) => ({
    subject: `Driver Assigned to Your Booking #${data.referenceId}`,
    html: emailWrapper(`
      <h2 style="margin: 0 0 16px 0; color: #374151; font-size: 24px; font-weight: 700;">
        Driver Assigned to Your Booking
      </h2>
      
      <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
        Dear ${data.customerName},
      </p>
      
      <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
        Great news! We have assigned a driver to your booking <strong>#${data.referenceId}</strong>.
      </p>
      
      ${detailSection('Driver Information', [
        { label: 'Driver Name', value: data.driverName },
        { label: 'Phone', value: data.driverPhone },
        { label: 'Vehicle', value: `${data.vehicleMake} ${data.vehicleModel} (${data.vehicleYear})` },
        { label: 'License Plate', value: data.licensePlate }
      ])}
      
      ${detailSection('Your Booking Details', [
        { label: 'Reference ID', value: `#${data.referenceId}` },
        { label: 'Pickup Location', value: data.fromLocation },
        { label: 'Destination', value: data.toLocation },
        { label: 'Pickup Date', value: data.startDate },
        { label: 'Pickup Time', value: data.startTime }
      ])}
      
      <div style="margin: 30px 0; padding: 20px; background-color: #e0f2f1; border-left: 4px solid #B2DFDB; border-radius: 4px;">
        <p style="margin: 0; color: #004d40; font-size: 14px; line-height: 1.6;">
          ✓ Your driver will contact you before the scheduled pickup time.
        </p>
      </div>
      
      <p style="margin: 32px 0 0 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
        Best regards,<br>
        <strong style="color: #374151;">OfficeXpress Team</strong>
      </p>
    `, false)
  }),
  
  driverChanged: (data: any) => ({
    subject: `Driver Changed for Your Booking #${data.referenceId}`,
    html: emailWrapper(`
      <h2 style="margin: 0 0 16px 0; color: #374151; font-size: 24px; font-weight: 700;">
        Driver Update Notification
      </h2>
      
      <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
        Dear ${data.customerName},
      </p>
      
      <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
        We wanted to inform you that we have updated the driver assigned to your booking <strong>#${data.referenceId}</strong>.
      </p>
      
      ${detailSection('New Driver Information', [
        { label: 'Driver Name', value: data.driverName },
        { label: 'Phone', value: data.driverPhone },
        { label: 'Vehicle', value: `${data.vehicleMake} ${data.vehicleModel} (${data.vehicleYear})` },
        { label: 'License Plate', value: data.licensePlate }
      ])}
      
      ${detailSection('Your Booking Details', [
        { label: 'Reference ID', value: `#${data.referenceId}` },
        { label: 'Pickup Location', value: data.fromLocation },
        { label: 'Destination', value: data.toLocation },
        { label: 'Pickup Date', value: data.startDate },
        { label: 'Pickup Time', value: data.startTime }
      ])}
      
      <div style="margin: 30px 0; padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
        <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
          ⓘ Your new driver will contact you before the scheduled pickup time.
        </p>
      </div>
      
      <p style="margin: 32px 0 0 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
        Best regards,<br>
        <strong style="color: #374151;">OfficeXpress Team</strong>
      </p>
    `, false)
  }),
  
  bookingUpdated: (data: any) => ({
    subject: `Booking Updated - #${data.referenceId}`,
    html: emailWrapper(`
      <h2 style="margin: 0 0 16px 0; color: #374151; font-size: 24px; font-weight: 700;">
        Your Booking Has Been Updated
      </h2>
      
      <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
        Dear ${data.customerName},
      </p>
      
      <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
        Your booking <strong>#${data.referenceId}</strong> has been updated with the following details:
      </p>
      
      ${data.bookingType === 'rental' ? detailSectionWithChanges('Updated Booking Details', [
        { label: 'Reference ID', value: `#${data.referenceId}`, bookingUrl: data.bookingUrl },
        { label: 'Pickup Location', value: data.fromLocation, oldValue: data.oldFromLocation },
        { label: 'Destination', value: data.toLocation, oldValue: data.oldToLocation },
        { label: 'Pickup Date', value: data.startDate, oldValue: data.oldStartDate },
        { label: 'Pickup Time', value: data.startTime, oldValue: data.oldStartTime },
        ...(data.endDate ? [{ label: 'Return Date', value: data.endDate, oldValue: data.oldEndDate }] : []),
        ...(data.endTime ? [{ label: 'End Time', value: data.endTime, oldValue: data.oldEndTime }] : []),
        { label: 'Vehicle Type', value: data.vehicleType, oldValue: data.oldVehicleType },
        { label: 'Capacity', value: data.vehicleCapacity, oldValue: data.oldVehicleCapacity }
      ]) : detailSectionWithChanges('Updated Booking Details', [
        { label: 'Reference ID', value: `#${data.referenceId}`, bookingUrl: data.bookingUrl },
        { label: 'Service Type', value: data.serviceType, oldValue: data.oldServiceType },
        { label: 'Company', value: data.companyName, oldValue: data.oldCompanyName }
      ])}
      
      <div style="margin: 30px 0; padding: 20px; background-color: #e0f2f1; border-left: 4px solid #B2DFDB; border-radius: 4px;">
        <p style="margin: 0; color: #004d40; font-size: 14px; line-height: 1.6;">
          ✓ Please review the updated details carefully. If you have any questions, feel free to contact us.
        </p>
      </div>
      
      <p style="margin: 32px 0 0 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
        Best regards,<br>
        <strong style="color: #374151;">OfficeXpress Team</strong>
      </p>
    `, false)
  }),
  
  bookingCancelled: (data: any) => ({
    subject: `Booking Cancelled - #${data.referenceId}`,
    html: emailWrapper(`
      <h2 style="margin: 0 0 16px 0; color: #374151; font-size: 24px; font-weight: 700;">
        Booking Cancellation Confirmation
      </h2>
      
      <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
        Dear ${data.customerName},
      </p>
      
      <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
        Your booking <strong>#${data.referenceId}</strong> has been ${data.cancelledBy === 'admin' ? 'cancelled by our team' : 'successfully cancelled'}.
      </p>
      
      ${data.bookingType === 'rental' ? detailSection('Cancelled Booking Details', [
        { label: 'Reference ID', value: `#${data.referenceId}` },
        { label: 'Service Type', value: data.serviceType },
        { label: 'Pickup Location', value: data.fromLocation },
        { label: 'Destination', value: data.toLocation },
        { label: 'Pickup Date', value: data.startDate }
      ]) : detailSection('Cancelled Booking Details', [
        { label: 'Reference ID', value: `#${data.referenceId}` },
        { label: 'Company', value: data.companyName },
        { label: 'Service Type', value: data.serviceType }
      ])}
      
      ${data.cancellationReason ? `
        <div style="margin: 30px 0; padding: 20px; background-color: #f3f4f6; border-radius: 8px;">
          <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px; font-weight: 600;">
            Cancellation Reason:
          </p>
          <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
            ${data.cancellationReason}
          </p>
        </div>
      ` : ''}
      
      <div style="margin: 30px 0; padding: 20px; background-color: #fee2e2; border-left: 4px solid #ef4444; border-radius: 4px;">
        <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">
          This booking is no longer active. If you have any questions or would like to make a new booking, please contact us.
        </p>
      </div>
      
      <p style="margin: 32px 0 0 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
        Best regards,<br>
        <strong style="color: #374151;">OfficeXpress Team</strong>
      </p>
    `, false)
  }),
  
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
  }),

  carpoolBooking: (data: any) => ({
    subject: `Carpool Booking Confirmed - #${data.referenceId}`,
    html: emailWrapper(`
      <h2 style="margin: 0 0 16px 0; color: #374151; font-size: 24px; font-weight: 700;">
        🚗 Your Carpool Ride is Confirmed!
      </h2>
      
      <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
        Dear ${data.customerName},
      </p>
      
      <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
        Your carpool booking has been confirmed. We'll notify you once enough passengers join this ride and a driver is assigned.
      </p>
      
      <div style="margin: 24px 0; padding: 16px; background-color: #f3f4f6; border-radius: 8px;">
        <p style="margin: 0 0 8px 0; color: #374151; font-size: 16px; font-weight: 600;">
          Booking Reference: <span style="color: #059669;">#${data.referenceId}</span>
        </p>
      </div>
      
      ${detailSection('Trip Details', [
        { label: 'Route', value: `${data.routeName}` },
        { label: 'From', value: data.fromLocation },
        { label: 'To', value: data.toLocation },
        { label: 'Travel Date', value: data.travelDate },
        { label: 'Departure Time', value: data.departureTime },
        { label: 'Pickup Point', value: data.pickupPoint },
        { label: 'Drop-off Point', value: data.dropOffPoint }
      ])}
      
      ${detailSection('Passenger Information', [
        { label: 'Name', value: data.customerName },
        { label: 'Phone', value: data.phone },
        { label: 'Email', value: data.email }
      ])}
      
      <div style="margin: 30px 0; padding: 20px; background-color: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 4px;">
        <p style="margin: 0 0 12px 0; color: #1e40af; font-size: 14px; font-weight: 600;">
          📢 Help us fill this ride!
        </p>
        <p style="margin: 0 0 16px 0; color: #1e3a8a; font-size: 13px; line-height: 1.6;">
          Share this link with friends, colleagues, or on social media to help reach the minimum 3 passengers required for this trip:
        </p>
        <div style="text-align: center;">
          <a href="${data.shareLink}" 
             style="display: inline-block; background-color: #3b82f6; color: #ffffff; 
                    text-decoration: none; padding: 12px 28px; border-radius: 6px; 
                    font-weight: 600; font-size: 14px; margin-bottom: 12px;">
            Share This Ride
          </a>
        </div>
        <p style="margin: 12px 0 0 0; color: #6b7280; font-size: 11px; text-align: center; font-family: monospace; word-break: break-all;">
          ${data.shareLink}
        </p>
        <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 11px; text-align: center;">
          This link is valid for 30 days
        </p>
      </div>
      
      <div style="margin: 30px 0; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
        <p style="margin: 0 0 8px 0; color: #92400e; font-size: 14px; font-weight: 600;">
          ⚠️ Important Notice
        </p>
        <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.6;">
          This trip requires a minimum of 3 passengers. If we don't reach this minimum 2 hours before departure, you'll receive an email notification and the trip will be cancelled. Don't worry - we'll keep your information and notify you when there's enough interest!
        </p>
      </div>
      
      <p style="margin: 32px 0 0 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
        Best regards,<br>
        <strong style="color: #374151;">OfficeXpress Team</strong>
      </p>
    `, false)
  }),

  carpoolDriverAssigned: (data: any) => ({
    subject: `🚗 Driver Assigned - Carpool Trip #${data.referenceId}`,
    html: emailWrapper(`
      <h2 style="margin: 0 0 16px 0; color: #374151; font-size: 24px; font-weight: 700;">
        🎉 Your Carpool Ride is Ready!
      </h2>
      
      <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
        Dear ${data.customerName},
      </p>
      
      <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
        Great news! We've reached the minimum number of passengers and assigned a driver to your carpool trip <strong>#${data.referenceId}</strong>. Get ready to ride!
      </p>
      
      ${detailSection('Driver Information', [
        { label: 'Driver Name', value: data.driverName },
        { label: 'Phone', value: data.driverPhone },
        { label: 'Vehicle', value: `${data.vehicleMake} ${data.vehicleModel} (${data.vehicleYear})` },
        { label: 'License Plate', value: data.licensePlate },
        { label: 'Vehicle Capacity', value: `${data.vehicleCapacity} seats` }
      ])}
      
      ${detailSection('Trip Details', [
        { label: 'Reference ID', value: `#${data.referenceId}` },
        { label: 'Route', value: data.routeName },
        { label: 'From', value: data.fromLocation },
        { label: 'To', value: data.toLocation },
        { label: 'Travel Date', value: data.travelDate },
        { label: 'Departure Time', value: data.departureTime },
        { label: 'Pickup Point', value: data.pickupPoint },
        { label: 'Drop-off Point', value: data.dropOffPoint }
      ])}
      
      <div style="margin: 30px 0; padding: 20px; background-color: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 4px;">
        <p style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px; font-weight: 600;">
          📞 Next Steps
        </p>
        <p style="margin: 0; color: #1e3a8a; font-size: 13px; line-height: 1.6;">
          Your driver will contact you before the scheduled departure time. Please be ready at your pickup point 5 minutes early.
        </p>
      </div>
      
      <div style="margin: 30px 0; padding: 20px; background-color: #dcfce7; border-left: 4px solid #22c55e; border-radius: 4px;">
        <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
          ✓ Have a great trip! We hope you enjoy sharing the ride.
        </p>
      </div>
      
      <p style="margin: 32px 0 0 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
        Safe travels,<br>
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

// Send booking update notification email
export async function sendBookingNotificationEmail(
  type: 'driverAssigned' | 'driverChanged' | 'bookingUpdated' | 'bookingCancelled',
  data: any
) {
  try {
    if (!data.email) {
      console.log(`No email provided for ${type} notification`);
      return;
    }
    
    const { client, fromEmail } = await getUncachableResendClient();
    const template = emailTemplates[type](data);
    
    await client.emails.send({
      from: `OfficeXpress <${fromEmail}>`,
      to: data.email,
      subject: template.subject,
      html: template.html
    });
    
    console.log(`${type} email sent to ${data.email}`);
  } catch (error) {
    console.error(`Error sending ${type} email:`, error);
    // Don't throw - we don't want to fail the operation if email fails
  }
}

// Send carpool booking confirmation email
export async function sendCarpoolBookingConfirmation(data: any) {
  try {
    if (!data.email) {
      console.log('No email provided for carpool booking confirmation');
      return;
    }
    
    const { client, fromEmail } = await getUncachableResendClient();
    const template = emailTemplates.carpoolBooking(data);
    
    await client.emails.send({
      from: `OfficeXpress <${fromEmail}>`,
      to: data.email,
      subject: template.subject,
      html: template.html
    });
    
    console.log(`Carpool booking confirmation sent to ${data.email} for booking #${data.referenceId}`);
  } catch (error) {
    console.error('Error sending carpool booking confirmation:', error);
    // Don't throw - we don't want to fail the booking if email fails
  }
}

// Send carpool driver assignment email
export async function sendCarpoolDriverAssignmentEmail(data: any) {
  try {
    if (!data.email) {
      console.log('No email provided for carpool driver assignment notification');
      return;
    }
    
    const { client, fromEmail } = await getUncachableResendClient();
    const template = emailTemplates.carpoolDriverAssigned(data);
    
    await client.emails.send({
      from: `OfficeXpress <${fromEmail}>`,
      to: data.email,
      subject: template.subject,
      html: template.html
    });
    
    console.log(`Carpool driver assignment email sent to ${data.email} for booking #${data.referenceId}`);
  } catch (error) {
    console.error('Error sending carpool driver assignment email:', error);
    // Don't throw - we don't want to fail the driver assignment if email fails
  }
}

// Send completion email with NPS survey link
export async function sendCompletionEmailWithSurvey(data: {
  email: string;
  customerName: string;
  referenceId: string;
  surveyToken: string;
  submissionType: string;
}) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    // Survey URL with token
    const surveyUrl = `https://officexpress.org/survey?token=${data.surveyToken}`;
    
    const content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="background: linear-gradient(135deg, #B2DFDB 0%, #80CBC4 100%); padding: 40px; border-radius: 8px; margin-bottom: 30px;">
          <h1 style="margin: 0; color: #1a1a1a; font-size: 28px; font-weight: 700;">
            ✨ Thank You!
          </h1>
        </div>
      </div>

      <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Dear <strong>${data.customerName}</strong>,
      </p>

      <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Thank you for choosing OfficeXpress! We're delighted to inform you that your request 
        <strong style="color: #059669;">#${data.referenceId}</strong> has been completed.
      </p>

      <div style="background-color: #f9fafb; padding: 25px; border-radius: 8px; border-left: 4px solid #B2DFDB; margin: 30px 0;">
        <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; font-weight: 600;">
          📊 Help us improve your experience
        </p>
        <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
          We'd love to hear about your experience! Please take a moment to complete our quick survey.
          Your feedback helps us serve you better.
        </p>
        <div style="text-align: center;">
          <a href="${surveyUrl}" 
             style="display: inline-block; background-color: #059669; color: #ffffff; 
                    text-decoration: none; padding: 14px 32px; border-radius: 6px; 
                    font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.2);">
            Complete Survey
          </a>
        </div>
        <p style="margin: 15px 0 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
          This survey will take less than 2 minutes to complete
        </p>
      </div>

      <p style="margin: 0 0 10px 0; color: #374151; font-size: 14px; line-height: 1.6;">
        If you have any questions or concerns, please don't hesitate to contact us.
      </p>

      <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
        Best regards,<br/>
        <strong style="color: #059669;">The OfficeXpress Team</strong>
      </p>
    `;

    await client.emails.send({
      from: `OfficeXpress <${fromEmail}>`,
      to: data.email,
      subject: `✅ Request Completed - ${data.referenceId} | We'd love your feedback!`,
      html: emailWrapper(content, false)
    });
    
    console.log(`Completion email with survey sent to ${data.email} for ${data.referenceId}`);
  } catch (error) {
    console.error('Error sending completion email with survey:', error);
    // Don't throw - we don't want to fail the status update if email fails
  }
}

// Send AI Trip Planner execution report email to admin
export async function sendAITripPlannerReportEmail(data: {
  adminEmail: string;
  timestamp: Date;
  tripDate: string;
  bookingsReceived: number;
  tripsCreated: number;
  passengersAssigned: number;
  lowCapacityTrips: number;
  generatedBy: 'ai' | 'fallback';
  errors: string[];
  isWeekend?: boolean;
  isBlackout?: boolean;
}) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const formattedTimestamp = data.timestamp.toLocaleString('en-US', {
      timeZone: 'Asia/Dhaka',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const statusEmoji = data.errors.length > 0 ? '⚠️' : data.tripsCreated > 0 ? '✅' : '📋';
    const statusText = data.errors.length > 0 ? 'Completed with Issues' : data.tripsCreated > 0 ? 'Successfully Generated' : 'No Trips to Generate';

    let skipReason = '';
    if (data.isWeekend) skipReason = 'Weekend - No trips generated';
    if (data.isBlackout) skipReason = 'Blackout Date - No trips generated';

    const content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="background: linear-gradient(135deg, #4c9096 0%, #3a7a80 100%); padding: 30px; border-radius: 8px;">
          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
            ${statusEmoji} AI Trip Planner Report
          </h1>
          <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
            Execution Report for ${data.tripDate}
          </p>
        </div>
      </div>

      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 16px;">📅 Execution Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Timestamp (Bangladesh Time):</td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: 600; text-align: right;">${formattedTimestamp}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Trip Date:</td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: 600; text-align: right;">${data.tripDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Status:</td>
            <td style="padding: 8px 0; color: ${data.errors.length > 0 ? '#dc2626' : '#059669'}; font-size: 14px; font-weight: 600; text-align: right;">${statusText}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Generated By:</td>
            <td style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: 600; text-align: right;">${data.generatedBy === 'ai' ? '🤖 AI' : '📋 Rule-based Fallback'}</td>
          </tr>
        </table>
      </div>

      ${skipReason ? `
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
          <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">
            ⏸️ ${skipReason}
          </p>
        </div>
      ` : `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
          <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: #1e40af; font-size: 28px; font-weight: 700;">${data.bookingsReceived}</p>
            <p style="margin: 5px 0 0 0; color: #3b82f6; font-size: 12px; text-transform: uppercase;">Bookings Reviewed</p>
          </div>
          <div style="background-color: #d1fae5; padding: 20px; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: #065f46; font-size: 28px; font-weight: 700;">${data.tripsCreated}</p>
            <p style="margin: 5px 0 0 0; color: #10b981; font-size: 12px; text-transform: uppercase;">Trips Created</p>
          </div>
          <div style="background-color: #e0e7ff; padding: 20px; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: #3730a3; font-size: 28px; font-weight: 700;">${data.passengersAssigned}</p>
            <p style="margin: 5px 0 0 0; color: #6366f1; font-size: 12px; text-transform: uppercase;">Passengers Matched</p>
          </div>
          <div style="background-color: ${data.lowCapacityTrips > 0 ? '#fef3c7' : '#f3f4f6'}; padding: 20px; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: ${data.lowCapacityTrips > 0 ? '#92400e' : '#374151'}; font-size: 28px; font-weight: 700;">${data.lowCapacityTrips}</p>
            <p style="margin: 5px 0 0 0; color: ${data.lowCapacityTrips > 0 ? '#f59e0b' : '#6b7280'}; font-size: 12px; text-transform: uppercase;">Low Capacity Warnings</p>
          </div>
        </div>
      `}

      ${data.errors.length > 0 ? `
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
          <h4 style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px; font-weight: 600;">⚠️ Errors Encountered:</h4>
          <ul style="margin: 0; padding-left: 20px; color: #b91c1c; font-size: 13px;">
            ${data.errors.map(err => `<li style="margin: 5px 0;">${err}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${data.tripsCreated > 0 ? `
        <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
          <p style="margin: 0; color: #065f46; font-size: 14px;">
            <strong>🚗 Action Required:</strong> ${data.tripsCreated} trip(s) have been created and need driver assignment. 
            Please log in to the admin panel to assign drivers.
          </p>
        </div>
      ` : ''}

      <p style="margin: 30px 0 10px 0; color: #6b7280; font-size: 12px; text-align: center;">
        This is an automated report from the OfficeXpress AI Trip Planner service.
      </p>
    `;

    await client.emails.send({
      from: `OfficeXpress System <${fromEmail}>`,
      to: data.adminEmail,
      subject: `${statusEmoji} AI Trip Planner Report - ${data.tripDate} | ${data.tripsCreated} trips, ${data.passengersAssigned} passengers`,
      html: emailWrapper(content, true)
    });
    
    console.log(`[Email] AI Trip Planner report sent to ${data.adminEmail}`);
  } catch (error) {
    console.error('[Email] Error sending AI Trip Planner report:', error);
    // Don't throw - we don't want to fail the trip generation if email fails
  }
}

// Send driver assignment needed notification to admins/employees
export async function sendDriverAssignmentNeededEmail(data: {
  email: string;
  recipientName: string;
  tripReferenceId: string;
  tripDate: string;
  routeName: string;
  departureTime: string;
  passengerCount: number;
  recommendedVehicle: string;
  tripType: 'carpool' | 'rental';
}) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 8px;">
          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
            🚗 Driver Assignment Needed
          </h1>
        </div>
      </div>

      <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Hi <strong>${data.recipientName}</strong>,
      </p>

      <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        A new ${data.tripType} trip has been created and requires driver assignment.
      </p>

      <div style="background-color: #fffbeb; border: 1px solid #fcd34d; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 15px 0; color: #92400e; font-size: 16px;">📋 Trip Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #78350f; font-size: 14px;">Reference ID:</td>
            <td style="padding: 8px 0; color: #451a03; font-size: 14px; font-weight: 600; text-align: right;">${data.tripReferenceId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #78350f; font-size: 14px;">Date:</td>
            <td style="padding: 8px 0; color: #451a03; font-size: 14px; font-weight: 600; text-align: right;">${data.tripDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #78350f; font-size: 14px;">Route:</td>
            <td style="padding: 8px 0; color: #451a03; font-size: 14px; font-weight: 600; text-align: right;">${data.routeName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #78350f; font-size: 14px;">Departure Time:</td>
            <td style="padding: 8px 0; color: #451a03; font-size: 14px; font-weight: 600; text-align: right;">${data.departureTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #78350f; font-size: 14px;">Passengers:</td>
            <td style="padding: 8px 0; color: #451a03; font-size: 14px; font-weight: 600; text-align: right;">${data.passengerCount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #78350f; font-size: 14px;">Recommended Vehicle:</td>
            <td style="padding: 8px 0; color: #451a03; font-size: 14px; font-weight: 600; text-align: right;">${data.recommendedVehicle}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://officexpress.org/admin/operations/ai-trip-planner" 
           style="display: inline-block; background-color: #f59e0b; color: #ffffff; 
                  text-decoration: none; padding: 14px 32px; border-radius: 6px; 
                  font-weight: 600; font-size: 16px;">
          Assign Driver Now
        </a>
      </div>

      <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
        Please assign a driver as soon as possible to ensure smooth operations.
      </p>
    `;

    await client.emails.send({
      from: `OfficeXpress <${fromEmail}>`,
      to: data.email,
      subject: `🚗 Driver Needed: ${data.tripReferenceId} - ${data.routeName} (${data.tripDate})`,
      html: emailWrapper(content, true)
    });
    
    console.log(`[Email] Driver assignment needed notification sent to ${data.email} for trip ${data.tripReferenceId}`);
  } catch (error) {
    console.error('[Email] Error sending driver assignment needed notification:', error);
  }
}

// Send customer notification when driver is assigned to carpool trip (AI-generated)
export async function sendCarpoolTripDriverAssignedEmail(data: {
  email: string;
  customerName: string;
  tripReferenceId: string;
  tripDate: string;
  routeName: string;
  departureTime: string;
  pickupPoint: string;
  dropOffPoint: string;
  driverName: string;
  driverPhone: string;
  vehicleInfo: string;
  licensePlate: string;
}) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 8px;">
          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
            ✅ Driver Assigned to Your Trip
          </h1>
        </div>
      </div>

      <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Dear <strong>${data.customerName}</strong>,
      </p>

      <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
        Great news! A driver has been assigned to your upcoming carpool trip. Here are your trip details:
      </p>

      <div style="background-color: #ecfdf5; border: 1px solid #6ee7b7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 16px;">🚗 Trip Information</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #047857; font-size: 14px;">Trip Reference:</td>
            <td style="padding: 8px 0; color: #064e3b; font-size: 14px; font-weight: 600; text-align: right;">${data.tripReferenceId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #047857; font-size: 14px;">Date:</td>
            <td style="padding: 8px 0; color: #064e3b; font-size: 14px; font-weight: 600; text-align: right;">${data.tripDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #047857; font-size: 14px;">Route:</td>
            <td style="padding: 8px 0; color: #064e3b; font-size: 14px; font-weight: 600; text-align: right;">${data.routeName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #047857; font-size: 14px;">Departure Time:</td>
            <td style="padding: 8px 0; color: #064e3b; font-size: 14px; font-weight: 600; text-align: right;">${data.departureTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #047857; font-size: 14px;">Pickup Point:</td>
            <td style="padding: 8px 0; color: #064e3b; font-size: 14px; font-weight: 600; text-align: right;">${data.pickupPoint}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #047857; font-size: 14px;">Drop-off Point:</td>
            <td style="padding: 8px 0; color: #064e3b; font-size: 14px; font-weight: 600; text-align: right;">${data.dropOffPoint}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #dbeafe; border: 1px solid #93c5fd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 16px;">👤 Driver Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #1d4ed8; font-size: 14px;">Driver Name:</td>
            <td style="padding: 8px 0; color: #1e3a8a; font-size: 14px; font-weight: 600; text-align: right;">${data.driverName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #1d4ed8; font-size: 14px;">Phone:</td>
            <td style="padding: 8px 0; color: #1e3a8a; font-size: 14px; font-weight: 600; text-align: right;">${data.driverPhone}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #1d4ed8; font-size: 14px;">Vehicle:</td>
            <td style="padding: 8px 0; color: #1e3a8a; font-size: 14px; font-weight: 600; text-align: right;">${data.vehicleInfo}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #1d4ed8; font-size: 14px;">License Plate:</td>
            <td style="padding: 8px 0; color: #1e3a8a; font-size: 14px; font-weight: 600; text-align: right;">${data.licensePlate}</td>
          </tr>
        </table>
      </div>

      <p style="margin: 0 0 10px 0; color: #374151; font-size: 14px; line-height: 1.6;">
        Please be ready at your pickup point at least 5 minutes before the scheduled departure time.
      </p>

      <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
        If you have any questions, please contact our support team or reach out to your driver directly.
      </p>
    `;

    await client.emails.send({
      from: `OfficeXpress <${fromEmail}>`,
      to: data.email,
      subject: `✅ Driver Assigned - Trip ${data.tripReferenceId} on ${data.tripDate}`,
      html: emailWrapper(content, false)
    });
    
    console.log(`[Email] Carpool trip driver assigned notification sent to ${data.email} for trip ${data.tripReferenceId}`);
  } catch (error) {
    console.error('[Email] Error sending carpool trip driver assigned notification:', error);
  }
}
