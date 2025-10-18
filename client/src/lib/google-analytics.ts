// Google Analytics 4 utility functions
declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: any) => void;
    dataLayer: any[];
  }
}

export interface GAConfig {
  measurementId: string;
}

export interface GAEvent {
  event: string;
  eventCategory?: string;
  eventAction?: string;
  eventLabel?: string;
  value?: number;
  customParameters?: Record<string, any>;
}

class GoogleAnalytics {
  private measurementId: string;
  private isInitialized = false;

  constructor(config: GAConfig) {
    this.measurementId = config.measurementId;
  }

  // Initialize Google Analytics
  init(): void {
    if (this.isInitialized || typeof window === 'undefined' || !this.measurementId || this.measurementId === 'GA_MEASUREMENT_ID') {
      return;
    }

    // Initialize dataLayer if not exists
    window.dataLayer = window.dataLayer || [];
    
    // Define gtag function
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };

    // Load GA4 script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
    document.head.appendChild(script);

    // Initialize GA4
    window.gtag('js', new Date() as any);
    window.gtag('config', this.measurementId, {
      page_title: document.title,
      page_location: window.location.href,
    });

    this.isInitialized = true;
    console.log(`Google Analytics initialized with ID: ${this.measurementId}`);
  }

  // Track page views
  trackPageView(pagePath: string, pageTitle?: string): void {
    if (typeof window === 'undefined' || !window.gtag) return;
    
    window.gtag('config', this.measurementId, {
      page_path: pagePath,
      page_title: pageTitle || document.title,
    });
    
    console.log(`GA: Page view tracked - ${pagePath}`);
  }

  // Track custom events
  trackEvent(eventData: GAEvent): void {
    if (typeof window === 'undefined' || !window.gtag) return;
    
    const { event, eventCategory, eventAction, eventLabel, value, customParameters } = eventData;
    
    const eventParams: any = {
      event_category: eventCategory,
      event_label: eventLabel,
      value: value,
      ...customParameters,
    };

    // Remove undefined values
    Object.keys(eventParams).forEach(key => {
      if (eventParams[key] === undefined) {
        delete eventParams[key];
      }
    });

    window.gtag('event', event, eventParams);
    console.log(`GA: Event tracked - ${event}`, eventParams);
  }

  // Track form submissions
  trackFormSubmission(formName: string, formData?: Record<string, any>): void {
    this.trackEvent({
      event: 'form_submit',
      eventCategory: 'engagement',
      eventAction: 'form_submission',
      eventLabel: formName,
      customParameters: {
        form_name: formName,
        ...formData,
      },
    });
  }

  // Track corporate booking
  trackCorporateBooking(data: {
    companyName: string;
    customerName: string;
    email: string;
    phone: string;
    serviceType: string;
    contractType: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    [key: string]: any;
  }): void {
    // Assign higher value to monthly contracts
    const leadValue = data.contractType === 'monthly' ? 100 : 50;

    // Track as generate_lead event (GA4 recommended event)
    this.trackEvent({
      event: 'generate_lead',
      eventCategory: 'Lead',
      eventAction: 'corporate_booking',
      eventLabel: 'Corporate Service Booking',
      value: leadValue,
      customParameters: {
        currency: 'USD',
        service_type: data.serviceType,
        contract_type: data.contractType,
        company_name: data.companyName,
        form_type: 'corporate_booking',
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
      },
    });
  }

  // Track rental booking
  trackRentalBooking(data: {
    customerName: string;
    email: string;
    phone: string;
    vehicleType: string;
    vehicleCapacity: string;
    pickupDate: string;
    serviceType: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    [key: string]: any;
  }): void {
    // Assign value based on vehicle type (premium vehicles = higher value)
    const vehicleValues: Record<string, number> = {
      'ultra-luxury': 75,
      'luxury': 60,
      'premium': 50,
      'standard': 35,
      'economy': 25,
      'super-economy': 20,
    };
    
    const leadValue = vehicleValues[data.vehicleType] || 40;

    // Track as generate_lead event (GA4 recommended event)
    this.trackEvent({
      event: 'generate_lead',
      eventCategory: 'Lead',
      eventAction: 'rental_booking',
      eventLabel: 'Vehicle Rental Booking',
      value: leadValue,
      customParameters: {
        currency: 'USD',
        vehicle_type: data.vehicleType,
        vehicle_capacity: data.vehicleCapacity,
        service_type: data.serviceType,
        pickup_date: data.pickupDate,
        form_type: 'rental_booking',
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
      },
    });
  }

  // Track vendor registration
  trackVendorRegistration(data: {
    companyName: string;
    contactPerson: string;
    email: string;
    phone: string;
    vehicleTypes: string[];
    experience: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    [key: string]: any;
  }): void {
    // Track as sign_up event (GA4 recommended event)
    this.trackEvent({
      event: 'sign_up',
      eventCategory: 'Registration',
      eventAction: 'vendor_registration',
      eventLabel: 'Vendor Registration',
      customParameters: {
        method: 'website_form',
        company_name: data.companyName,
        vehicle_types: data.vehicleTypes.join(','),
        vehicle_types_count: data.vehicleTypes.length,
        experience_years: data.experience,
        form_type: 'vendor_registration',
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
      },
    });
  }

  // Track contact form
  trackContactSubmission(data: {
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    message?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    [key: string]: any;
  }): void {
    // Track as contact event (GA4 recommended event)
    this.trackEvent({
      event: 'contact',
      eventCategory: 'Contact',
      eventAction: 'form_submit',
      eventLabel: 'Contact Form',
      customParameters: {
        form_type: 'contact',
        subject: data.subject,
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
      },
    });
  }
}

// Singleton instance
let googleAnalytics: GoogleAnalytics | null = null;

export function initializeGoogleAnalytics(config: GAConfig): GoogleAnalytics {
  if (!googleAnalytics) {
    googleAnalytics = new GoogleAnalytics(config);
    googleAnalytics.init();
  }
  return googleAnalytics;
}

export function getGoogleAnalytics(): GoogleAnalytics | null {
  return googleAnalytics;
}

export { GoogleAnalytics };