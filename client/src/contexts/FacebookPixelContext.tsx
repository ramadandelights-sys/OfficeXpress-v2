import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { initializeFacebookPixel, getFacebookPixel, type FacebookPixelConfig } from '@/lib/facebook-pixel';

interface FacebookPixelContextType {
  trackCorporateBooking: (data: any) => void;
  trackRentalBooking: (data: any) => void;
  trackVendorRegistration: (data: any) => void;
  trackContact: (data: any) => void;
}

const FacebookPixelContext = createContext<FacebookPixelContextType | null>(null);

interface FacebookPixelProviderProps {
  children: ReactNode;
  config: FacebookPixelConfig;
}

export function FacebookPixelProvider({ children, config }: FacebookPixelProviderProps) {
  useEffect(() => {
    // Initialize Facebook Pixel when component mounts
    initializeFacebookPixel(config);
  }, [config]);

  const trackCorporateBooking = (data: any) => {
    const pixel = getFacebookPixel();
    if (pixel) {
      pixel.trackCorporateBooking(data);
    }
  };

  const trackRentalBooking = (data: any) => {
    const pixel = getFacebookPixel();
    if (pixel) {
      pixel.trackRentalBooking(data);
    }
  };

  const trackVendorRegistration = (data: any) => {
    const pixel = getFacebookPixel();
    if (pixel) {
      pixel.trackVendorRegistration(data);
    }
  };

  const trackContact = (data: any) => {
    const pixel = getFacebookPixel();
    if (pixel) {
      pixel.trackContact(data);
    }
  };

  const value = {
    trackCorporateBooking,
    trackRentalBooking,
    trackVendorRegistration,
    trackContact,
  };

  return (
    <FacebookPixelContext.Provider value={value}>
      {children}
    </FacebookPixelContext.Provider>
  );
}

export function useFacebookPixel() {
  const context = useContext(FacebookPixelContext);
  if (!context) {
    // Return no-op functions if pixel is not configured
    return {
      trackCorporateBooking: () => {},
      trackRentalBooking: () => {},
      trackVendorRegistration: () => {},
      trackContact: () => {},
    };
  }
  return context;
}