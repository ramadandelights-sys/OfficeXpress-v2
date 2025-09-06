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
  trackCorporateBooking(data: any): void {
    this.trackEvent({
      event: 'corporate_booking',
      eventCategory: 'conversion',
      eventAction: 'booking_submit',
      eventLabel: 'corporate',
      customParameters: {
        service_type: data.serviceType,
        vehicle_type: data.vehicleType,
        capacity: data.capacity,
      },
    });
  }

  // Track rental booking
  trackRentalBooking(data: any): void {
    this.trackEvent({
      event: 'rental_booking',
      eventCategory: 'conversion',
      eventAction: 'booking_submit',
      eventLabel: 'rental',
      customParameters: {
        service_type: data.serviceType,
        vehicle_type: data.vehicleType,
        capacity: data.capacity,
        duration: data.duration,
      },
    });
  }

  // Track vendor registration
  trackVendorRegistration(data: any): void {
    this.trackEvent({
      event: 'vendor_registration',
      eventCategory: 'conversion',
      eventAction: 'registration_submit',
      eventLabel: 'vendor',
      customParameters: {
        vehicle_types: data.vehicleTypes,
        experience: data.experience,
      },
    });
  }

  // Track contact form
  trackContactSubmission(data: any): void {
    this.trackEvent({
      event: 'contact_submit',
      eventCategory: 'engagement',
      eventAction: 'form_submit',
      eventLabel: 'contact',
      customParameters: {
        subject: data.subject,
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