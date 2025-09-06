import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { initializeGoogleAnalytics, getGoogleAnalytics, type GAConfig } from '@/lib/google-analytics';

interface GoogleAnalyticsContextType {
  trackCorporateBooking: (data: any) => void;
  trackRentalBooking: (data: any) => void;
  trackVendorRegistration: (data: any) => void;
  trackContact: (data: any) => void;
  trackPageView: (pagePath: string, pageTitle?: string) => void;
  trackFormSubmission: (formName: string, formData?: Record<string, any>) => void;
}

const GoogleAnalyticsContext = createContext<GoogleAnalyticsContextType | null>(null);

interface GoogleAnalyticsProviderProps {
  children: ReactNode;
  config: GAConfig;
}

export function GoogleAnalyticsProvider({ children, config }: GoogleAnalyticsProviderProps) {
  useEffect(() => {
    // Initialize Google Analytics when component mounts
    if (config.measurementId && config.measurementId !== 'GA_MEASUREMENT_ID') {
      initializeGoogleAnalytics(config);
    }
  }, [config]);

  const trackCorporateBooking = (data: any) => {
    const ga = getGoogleAnalytics();
    if (ga) {
      ga.trackCorporateBooking(data);
    }
  };

  const trackRentalBooking = (data: any) => {
    const ga = getGoogleAnalytics();
    if (ga) {
      ga.trackRentalBooking(data);
    }
  };

  const trackVendorRegistration = (data: any) => {
    const ga = getGoogleAnalytics();
    if (ga) {
      ga.trackVendorRegistration(data);
    }
  };

  const trackContact = (data: any) => {
    const ga = getGoogleAnalytics();
    if (ga) {
      ga.trackContactSubmission(data);
    }
  };

  const trackPageView = (pagePath: string, pageTitle?: string) => {
    const ga = getGoogleAnalytics();
    if (ga) {
      ga.trackPageView(pagePath, pageTitle);
    }
  };

  const trackFormSubmission = (formName: string, formData?: Record<string, any>) => {
    const ga = getGoogleAnalytics();
    if (ga) {
      ga.trackFormSubmission(formName, formData);
    }
  };

  const value = {
    trackCorporateBooking,
    trackRentalBooking,
    trackVendorRegistration,
    trackContact,
    trackPageView,
    trackFormSubmission,
  };

  return (
    <GoogleAnalyticsContext.Provider value={value}>
      {children}
    </GoogleAnalyticsContext.Provider>
  );
}

export function useGoogleAnalytics() {
  const context = useContext(GoogleAnalyticsContext);
  if (!context) {
    // Return no-op functions if GA is not configured
    return {
      trackCorporateBooking: () => {},
      trackRentalBooking: () => {},
      trackVendorRegistration: () => {},
      trackContact: () => {},
      trackPageView: () => {},
      trackFormSubmission: () => {},
    };
  }
  return context;
}