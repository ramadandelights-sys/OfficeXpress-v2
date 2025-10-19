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

// Email templates
export const emailTemplates = {
  corporateBooking: {
    admin: (data: any) => ({
      subject: `New Corporate Booking - ${data.companyName}`,
      html: `
        <h2>New Corporate Transportation Booking</h2>
        <p>A new corporate booking has been submitted on OfficeXpress.</p>
        
        <h3>Company Information</h3>
        <ul>
          <li><strong>Company Name:</strong> ${data.companyName}</li>
          <li><strong>Primary Contact:</strong> ${data.customerName}</li>
          <li><strong>Email:</strong> ${data.email}</li>
          <li><strong>Phone:</strong> ${data.phone}</li>
        </ul>
        
        <h3>Service Details</h3>
        <ul>
          <li><strong>Service Type:</strong> ${data.serviceType}</li>
          <li><strong>Contract Type:</strong> ${data.contractType}</li>
          <li><strong>Number of Employees:</strong> ${data.numberOfEmployees}</li>
          ${data.officeAddress ? `<li><strong>Office Address:</strong> ${data.officeAddress}</li>` : ''}
          ${data.additionalRequirements ? `<li><strong>Additional Requirements:</strong> ${data.additionalRequirements}</li>` : ''}
        </ul>
        
        <p><em>Submitted on: ${new Date().toLocaleString()}</em></p>
      `
    }),
    customer: (data: any) => ({
      subject: 'Corporate Booking Confirmation - OfficeXpress',
      html: `
        <h2>Thank you for your booking!</h2>
        <p>Dear ${data.customerName},</p>
        
        <p>We have received your corporate transportation booking request for <strong>${data.companyName}</strong>. Our team will review your requirements and contact you shortly.</p>
        
        <h3>Your Booking Details</h3>
        <ul>
          <li><strong>Service Type:</strong> ${data.serviceType}</li>
          <li><strong>Contract Type:</strong> ${data.contractType}</li>
          <li><strong>Number of Employees:</strong> ${data.numberOfEmployees}</li>
        </ul>
        
        <p>We will get back to you within 24 hours to discuss your requirements in detail.</p>
        
        <p>Best regards,<br>
        <strong>OfficeXpress Team</strong><br>
        hesham@officexpress.org</p>
      `
    })
  },
  
  rentalBooking: {
    admin: (data: any) => ({
      subject: `New Rental Booking - ${data.customerName}`,
      html: `
        <h2>New Vehicle Rental Booking</h2>
        <p>A new rental booking has been submitted on OfficeXpress.</p>
        
        <h3>Customer Information</h3>
        <ul>
          <li><strong>Name:</strong> ${data.customerName}</li>
          <li><strong>Email:</strong> ${data.email}</li>
          <li><strong>Phone:</strong> ${data.phone}</li>
        </ul>
        
        <h3>Rental Details</h3>
        <ul>
          <li><strong>Service Type:</strong> ${data.serviceType}</li>
          <li><strong>Vehicle Type:</strong> ${data.vehicleType}</li>
          <li><strong>Capacity:</strong> ${data.vehicleCapacity}</li>
          <li><strong>Pickup Location:</strong> ${data.pickupLocation}</li>
          <li><strong>Destination:</strong> ${data.destination}</li>
          <li><strong>Pickup Date:</strong> ${data.pickupDate}</li>
          ${data.returnDate ? `<li><strong>Return Date:</strong> ${data.returnDate}</li>` : ''}
          <li><strong>Pickup Time:</strong> ${data.pickupTime}</li>
          ${data.endTime ? `<li><strong>End Time:</strong> ${data.endTime}</li>` : ''}
          ${data.specialRequirements ? `<li><strong>Special Requirements:</strong> ${data.specialRequirements}</li>` : ''}
        </ul>
        
        <p><em>Submitted on: ${new Date().toLocaleString()}</em></p>
      `
    }),
    customer: (data: any) => ({
      subject: 'Rental Booking Confirmation - OfficeXpress',
      html: `
        <h2>Thank you for your booking!</h2>
        <p>Dear ${data.customerName},</p>
        
        <p>We have received your vehicle rental booking request. Our team will confirm availability and contact you shortly.</p>
        
        <h3>Your Booking Details</h3>
        <ul>
          <li><strong>Service Type:</strong> ${data.serviceType}</li>
          <li><strong>Vehicle Type:</strong> ${data.vehicleType}</li>
          <li><strong>Capacity:</strong> ${data.vehicleCapacity}</li>
          <li><strong>Pickup Location:</strong> ${data.pickupLocation}</li>
          <li><strong>Destination:</strong> ${data.destination}</li>
          <li><strong>Pickup Date:</strong> ${data.pickupDate}</li>
          <li><strong>Pickup Time:</strong> ${data.pickupTime}</li>
        </ul>
        
        <p>We will get back to you within 24 hours to confirm your booking.</p>
        
        <p>Best regards,<br>
        <strong>OfficeXpress Team</strong><br>
        hesham@officexpress.org</p>
      `
    })
  },
  
  vendorRegistration: {
    admin: (data: any) => ({
      subject: `New Vendor Registration - ${data.companyName}`,
      html: `
        <h2>New Vendor Registration</h2>
        <p>A new vendor has registered on OfficeXpress.</p>
        
        <h3>Company Information</h3>
        <ul>
          <li><strong>Company Name:</strong> ${data.companyName}</li>
          <li><strong>Contact Person:</strong> ${data.contactPerson}</li>
          <li><strong>Email:</strong> ${data.email}</li>
          <li><strong>Phone:</strong> ${data.phone}</li>
        </ul>
        
        <h3>Service Details</h3>
        <ul>
          <li><strong>Vehicle Types:</strong> ${Array.isArray(data.vehicleTypes) ? data.vehicleTypes.join(', ') : data.vehicleTypes}</li>
          <li><strong>Fleet Size:</strong> ${data.fleetSize}</li>
          <li><strong>Experience:</strong> ${data.experience}</li>
          <li><strong>Service Areas:</strong> ${data.serviceAreas}</li>
          ${data.additionalInfo ? `<li><strong>Additional Information:</strong> ${data.additionalInfo}</li>` : ''}
        </ul>
        
        <p><em>Submitted on: ${new Date().toLocaleString()}</em></p>
      `
    }),
    customer: (data: any) => ({
      subject: 'Vendor Registration Received - OfficeXpress',
      html: `
        <h2>Thank you for registering!</h2>
        <p>Dear ${data.contactPerson},</p>
        
        <p>We have received your vendor registration for <strong>${data.companyName}</strong>. Our team will review your application and contact you shortly.</p>
        
        <h3>Your Registration Details</h3>
        <ul>
          <li><strong>Company Name:</strong> ${data.companyName}</li>
          <li><strong>Vehicle Types:</strong> ${Array.isArray(data.vehicleTypes) ? data.vehicleTypes.join(', ') : data.vehicleTypes}</li>
          <li><strong>Fleet Size:</strong> ${data.fleetSize}</li>
          <li><strong>Experience:</strong> ${data.experience}</li>
        </ul>
        
        <p>We will get back to you within 48 hours regarding the next steps.</p>
        
        <p>Best regards,<br>
        <strong>OfficeXpress Team</strong><br>
        hesham@officexpress.org</p>
      `
    })
  },
  
  contactMessage: {
    admin: (data: any) => ({
      subject: `New Contact Message - ${data.subject || 'General Inquiry'}`,
      html: `
        <h2>New Contact Message</h2>
        <p>A new contact message has been submitted on OfficeXpress.</p>
        
        <h3>Contact Information</h3>
        <ul>
          <li><strong>Name:</strong> ${data.name}</li>
          <li><strong>Email:</strong> ${data.email}</li>
          ${data.phone ? `<li><strong>Phone:</strong> ${data.phone}</li>` : ''}
          <li><strong>Subject:</strong> ${data.subject || 'General Inquiry'}</li>
        </ul>
        
        <h3>Message</h3>
        <p style="background: #f5f5f5; padding: 15px; border-left: 4px solid #333;">
          ${data.message?.replace(/\n/g, '<br>') || ''}
        </p>
        
        <p><em>Submitted on: ${new Date().toLocaleString()}</em></p>
      `
    }),
    customer: (data: any) => ({
      subject: 'Message Received - OfficeXpress',
      html: `
        <h2>Thank you for contacting us!</h2>
        <p>Dear ${data.name},</p>
        
        <p>We have received your message and will respond as soon as possible.</p>
        
        <h3>Your Message</h3>
        <p style="background: #f5f5f5; padding: 15px; border-left: 4px solid #333;">
          ${data.message?.replace(/\n/g, '<br>') || ''}
        </p>
        
        <p>We typically respond to all inquiries within 24 hours.</p>
        
        <p>Best regards,<br>
        <strong>OfficeXpress Team</strong><br>
        hesham@officexpress.org</p>
      `
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
