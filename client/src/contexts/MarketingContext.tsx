import React, { createContext, useContext, useEffect, ReactNode, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { initializeFacebookPixel, getFacebookPixel } from '@/lib/facebook-pixel';
import { initializeGoogleAnalytics, getGoogleAnalytics } from '@/lib/google-analytics';
import type { MarketingSettings } from '@shared/schema';

interface MarketingContextType {
  // Facebook Pixel tracking functions
  trackCorporateBooking: (data: any) => Promise<void>;
  trackRentalBooking: (data: any) => Promise<void>;
  trackVendorRegistration: (data: any) => Promise<void>;
  trackContact: (data: any) => Promise<void>;
  
  // Google Analytics tracking functions
  trackPageView: (pagePath: string, pageTitle?: string) => void;
  trackFormSubmission: (formName: string, formData?: Record<string, any>) => void;
  
  // Marketing settings state
  settings: MarketingSettings | null;
  isLoading: boolean;
  trackingEnabled: boolean;
}

const MarketingContext = createContext<MarketingContextType | null>(null);

interface MarketingProviderProps {
  children: ReactNode;
}

export function MarketingProvider({ children }: MarketingProviderProps) {
  const [initialized, setInitialized] = useState(false);
  
  // Fetch marketing settings from database
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/admin/marketing-settings'],
    retry: false,
  });

  const marketingSettings = Array.isArray(settings) ? settings[0] as MarketingSettings : settings as MarketingSettings | undefined;

  useEffect(() => {
    if (marketingSettings && marketingSettings.trackingEnabled) {
      // Always initialize Facebook Pixel if enabled (handles hot reloads)
      if (marketingSettings.facebookEnabled && marketingSettings.facebookPixelId) {
        initializeFacebookPixel({
          pixelId: marketingSettings.facebookPixelId,
        });
      }

      // Always initialize Google Analytics if enabled (handles hot reloads)
      if (marketingSettings.googleEnabled && marketingSettings.googleAnalyticsId) {
        initializeGoogleAnalytics({
          measurementId: marketingSettings.googleAnalyticsId,
        });
      }

      setInitialized(true);
    }
  }, [marketingSettings]);

  // Facebook Pixel tracking functions
  const trackCorporateBooking = async (data: any) => {
    if (!marketingSettings?.trackingEnabled || !marketingSettings?.facebookEnabled) return;
    
    const pixel = getFacebookPixel();
    if (pixel) {
      await pixel.trackCorporateBooking({
        ...data,
        utm_source: marketingSettings.utmSource,
        utm_medium: marketingSettings.utmMedium,
        utm_campaign: marketingSettings.utmCampaign,
      });
    }
  };

  const trackRentalBooking = async (data: any) => {
    if (!marketingSettings?.trackingEnabled || !marketingSettings?.facebookEnabled) return;
    
    const pixel = getFacebookPixel();
    if (pixel) {
      await pixel.trackRentalBooking({
        ...data,
        utm_source: marketingSettings.utmSource,
        utm_medium: marketingSettings.utmMedium,
        utm_campaign: marketingSettings.utmCampaign,
      });
    }
  };

  const trackVendorRegistration = async (data: any) => {
    if (!marketingSettings?.trackingEnabled || !marketingSettings?.facebookEnabled) return;
    
    const pixel = getFacebookPixel();
    if (pixel) {
      await pixel.trackVendorRegistration({
        ...data,
        utm_source: marketingSettings.utmSource,
        utm_medium: marketingSettings.utmMedium,
        utm_campaign: marketingSettings.utmCampaign,
      });
    }
  };

  const trackContact = async (data: any) => {
    if (!marketingSettings?.trackingEnabled) return;
    
    // Track with Facebook Pixel
    if (marketingSettings.facebookEnabled) {
      const pixel = getFacebookPixel();
      if (pixel) {
        await pixel.trackContact({
          ...data,
          utm_source: marketingSettings.utmSource,
          utm_medium: marketingSettings.utmMedium,
          utm_campaign: marketingSettings.utmCampaign,
        });
      }
    }

    // Track with Google Analytics
    if (marketingSettings.googleEnabled) {
      const ga = getGoogleAnalytics();
      if (ga) {
        ga.trackContactSubmission({
          ...data,
          utm_source: marketingSettings.utmSource,
          utm_medium: marketingSettings.utmMedium,
          utm_campaign: marketingSettings.utmCampaign,
        });
      }
    }
  };

  // Google Analytics tracking functions
  const trackPageView = (pagePath: string, pageTitle?: string) => {
    if (!marketingSettings?.trackingEnabled || !marketingSettings?.googleEnabled) return;
    
    const ga = getGoogleAnalytics();
    if (ga) {
      ga.trackPageView(pagePath, pageTitle);
    }
  };

  const trackFormSubmission = (formName: string, formData?: Record<string, any>) => {
    if (!marketingSettings?.trackingEnabled) return;
    
    const dataWithUTM = {
      ...formData,
      utm_source: marketingSettings.utmSource,
      utm_medium: marketingSettings.utmMedium,
      utm_campaign: marketingSettings.utmCampaign,
    };

    // Track with both Facebook Pixel and Google Analytics
    if (marketingSettings.facebookEnabled) {
      const pixel = getFacebookPixel();
      if (pixel) {
        pixel.trackCustom('FormSubmission', {
          form_name: formName,
          ...dataWithUTM,
        });
      }
    }

    if (marketingSettings.googleEnabled) {
      const ga = getGoogleAnalytics();
      if (ga) {
        ga.trackFormSubmission(formName, dataWithUTM);
      }
    }
  };

  const value = {
    trackCorporateBooking,
    trackRentalBooking,
    trackVendorRegistration,
    trackContact,
    trackPageView,
    trackFormSubmission,
    settings: marketingSettings || null,
    isLoading,
    trackingEnabled: marketingSettings?.trackingEnabled || false,
  };

  return (
    <MarketingContext.Provider value={value}>
      {children}
    </MarketingContext.Provider>
  );
}

export function useMarketing() {
  const context = useContext(MarketingContext);
  if (!context) {
    // Return no-op functions if marketing is not configured
    return {
      trackCorporateBooking: async () => {},
      trackRentalBooking: async () => {},
      trackVendorRegistration: async () => {},
      trackContact: async () => {},
      trackPageView: () => {},
      trackFormSubmission: () => {},
      settings: null,
      isLoading: false,
      trackingEnabled: false,
    };
  }
  return context;
}

// Legacy hooks for backward compatibility
export function useFacebookPixel() {
  const marketing = useMarketing();
  return {
    trackCorporateBooking: marketing.trackCorporateBooking,
    trackRentalBooking: marketing.trackRentalBooking,
    trackVendorRegistration: marketing.trackVendorRegistration,
    trackContact: marketing.trackContact,
  };
}

export function useGoogleAnalytics() {
  const marketing = useMarketing();
  return {
    trackCorporateBooking: marketing.trackCorporateBooking,
    trackRentalBooking: marketing.trackRentalBooking,
    trackVendorRegistration: marketing.trackVendorRegistration,
    trackContact: marketing.trackContact,
    trackPageView: marketing.trackPageView,
    trackFormSubmission: marketing.trackFormSubmission,
  };
}