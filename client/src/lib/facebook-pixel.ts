// Facebook Pixel and Conversions API integration
declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

export interface FacebookPixelConfig {
  pixelId: string;
  accessToken?: string;
}

export interface ConversionEvent {
  event: string;
  customData?: {
    currency?: string;
    value?: number;
    content_type?: string;
    content_ids?: string[];
    content_name?: string;
    [key: string]: any;
  };
  userData?: {
    em?: string; // email
    ph?: string; // phone
    fn?: string; // first name
    ln?: string; // last name
    ct?: string; // city
    st?: string; // state
    zp?: string; // zip code
    country?: string;
  };
}

class FacebookPixel {
  private pixelId: string;
  private accessToken?: string;
  private isInitialized = false;

  constructor(config: FacebookPixelConfig) {
    this.pixelId = config.pixelId;
    this.accessToken = config.accessToken;
  }

  // Initialize Facebook Pixel
  init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;

    // Facebook Pixel Code
    window.fbq = window.fbq || function() {
      (window.fbq.q = window.fbq.q || []).push(arguments);
    };
    window._fbq = window._fbq || window.fbq;
    window.fbq.push = window.fbq;
    window.fbq.loaded = true;
    window.fbq.version = '2.0';
    window.fbq.queue = [];

    // Load Facebook Pixel script
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);

    // Initialize pixel with PageView
    window.fbq('init', this.pixelId);
    window.fbq('track', 'PageView');

    this.isInitialized = true;
  }

  // Track standard events
  track(event: string, customData?: any): void {
    if (typeof window === 'undefined' || !window.fbq) return;
    
    window.fbq('track', event, customData);
    console.log(`Facebook Pixel: Tracked ${event}`, customData);
  }

  // Track custom events
  trackCustom(event: string, customData?: any): void {
    if (typeof window === 'undefined' || !window.fbq) return;
    
    window.fbq('trackCustom', event, customData);
    console.log(`Facebook Pixel: Tracked custom ${event}`, customData);
  }

  // Track form submissions via Conversions API
  async trackConversion(event: ConversionEvent): Promise<void> {
    try {
      // Send to our backend API which will forward to Facebook Conversions API
      const response = await fetch('/api/facebook-conversion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pixelId: this.pixelId,
          event: event.event,
          customData: event.customData,
          userData: event.userData,
          timestamp: Math.floor(Date.now() / 1000),
          actionSource: 'website',
          eventSourceUrl: window.location.href,
        }),
      });

      if (response.ok) {
        console.log(`Facebook Conversion API: Tracked ${event.event}`);
      } else {
        console.error('Facebook Conversion API error:', await response.text());
      }
    } catch (error) {
      console.error('Facebook Conversion API error:', error);
    }
  }

  // Track lead generation (form submissions)
  trackLead(customData?: any, userData?: any): void {
    this.track('Lead', customData);
    
    // Also send to Conversions API for better tracking
    this.trackConversion({
      event: 'Lead',
      customData,
      userData,
    });
  }

  // Track contact form submissions
  trackContact(formData: { name: string; email: string; phone?: string }): void {
    const customData = {
      content_type: 'contact_form',
      content_name: 'Contact Form Submission',
    };

    const userData = {
      em: this.hashEmail(formData.email),
      fn: this.hashData(formData.name.split(' ')[0]),
      ln: this.hashData(formData.name.split(' ').slice(1).join(' ')),
      ph: formData.phone ? this.hashData(this.normalizePhone(formData.phone)) : undefined,
    };

    this.trackLead(customData, userData);
  }

  // Track corporate booking submissions
  trackCorporateBooking(formData: { 
    companyName: string; 
    customerName: string; 
    email: string; 
    phone: string;
    serviceType: string;
    contractType: string;
  }): void {
    const customData = {
      content_type: 'corporate_booking',
      content_name: 'Corporate Service Booking',
      service_type: formData.serviceType,
      contract_type: formData.contractType,
    };

    const userData = {
      em: this.hashEmail(formData.email),
      fn: this.hashData(formData.customerName.split(' ')[0]),
      ln: this.hashData(formData.customerName.split(' ').slice(1).join(' ')),
      ph: this.hashData(this.normalizePhone(formData.phone)),
    };

    this.trackLead(customData, userData);
  }

  // Track rental booking submissions
  trackRentalBooking(formData: {
    customerName: string;
    email: string;
    phone: string;
    vehicleType: string;
    pickupDate: string;
  }): void {
    const customData = {
      content_type: 'rental_booking',
      content_name: 'Vehicle Rental Booking',
      vehicle_type: formData.vehicleType,
      pickup_date: formData.pickupDate,
    };

    const userData = {
      em: this.hashEmail(formData.email),
      fn: this.hashData(formData.customerName.split(' ')[0]),
      ln: this.hashData(formData.customerName.split(' ').slice(1).join(' ')),
      ph: this.hashData(this.normalizePhone(formData.phone)),
    };

    this.trackLead(customData, userData);
  }

  // Track vendor registrations
  trackVendorRegistration(formData: {
    companyName: string;
    contactPerson: string;
    email: string;
    phone: string;
    vehicleTypes: string[];
  }): void {
    const customData = {
      content_type: 'vendor_registration',
      content_name: 'Vendor Registration',
      vehicle_types: formData.vehicleTypes.join(','),
    };

    const userData = {
      em: this.hashEmail(formData.email),
      fn: this.hashData(formData.contactPerson.split(' ')[0]),
      ln: this.hashData(formData.contactPerson.split(' ').slice(1).join(' ')),
      ph: this.hashData(this.normalizePhone(formData.phone)),
    };

    this.trackLead(customData, userData);
  }

  // Utility functions for data hashing (required by Facebook)
  private async hashData(data: string): Promise<string> {
    if (!data) return '';
    
    // Normalize data
    const normalized = data.toLowerCase().trim();
    
    // Hash using SubtleCrypto API
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  }

  private hashEmail(email: string): Promise<string> {
    return this.hashData(email.toLowerCase().trim());
  }

  private normalizePhone(phone: string): string {
    // Remove all non-digits and normalize to international format
    const digits = phone.replace(/\D/g, '');
    
    // Handle Bangladesh phone numbers
    if (digits.startsWith('880')) {
      return '+' + digits;
    } else if (digits.startsWith('01')) {
      return '+880' + digits.substring(1);
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return '+880' + digits;
    }
    
    return '+' + digits;
  }
}

// Create and export singleton instance
let facebookPixel: FacebookPixel | null = null;

export const initializeFacebookPixel = (config: FacebookPixelConfig): FacebookPixel => {
  if (!facebookPixel) {
    facebookPixel = new FacebookPixel(config);
    facebookPixel.init();
  }
  return facebookPixel;
};

export const getFacebookPixel = (): FacebookPixel | null => {
  return facebookPixel;
};

export default FacebookPixel;