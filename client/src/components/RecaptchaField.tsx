import { useEffect, useState } from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

declare global {
  interface Window {
    grecaptcha: any;
  }
}

interface RecaptchaFieldProps {
  control: any;
  name: string;
  siteKey?: string;
  required?: boolean;
}

export function RecaptchaField({ control, name, siteKey, required = true }: RecaptchaFieldProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [widgetId, setWidgetId] = useState<number | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // If no site key is provided and reCAPTCHA is required, show warning
  if (!siteKey && required) {
    return (
      <div className="p-4 border border-orange-200 bg-orange-50 rounded-md">
        <p className="text-orange-800 text-sm">
          Security verification is required but not configured. Please add VITE_RECAPTCHA_SITE_KEY to enable reCAPTCHA.
        </p>
      </div>
    );
  }

  // If no site key and not required, don't render
  if (!siteKey) {
    return null;
  }

  useEffect(() => {
    // Set a timeout for loading 
    const loadingTimer = setTimeout(() => {
      if (!isLoaded) {
        setLoadingTimeout(true);
      }
    }, 10000); // 10 second timeout

    // Load reCAPTCHA script
    if (!window.grecaptcha) {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        // Additional check in case the callback doesn't fire
        setTimeout(() => {
          if (window.grecaptcha && !isLoaded) {
            setIsLoaded(true);
          }
        }, 1000);
      };

      script.onerror = () => {
        setLoadingTimeout(true);
      };

      document.head.appendChild(script);

      // Define the callback function
      (window as any).onRecaptchaLoad = () => {
        setIsLoaded(true);
        clearTimeout(loadingTimer);
      };
    } else {
      setIsLoaded(true);
      clearTimeout(loadingTimer);
    }

    return () => {
      clearTimeout(loadingTimer);
    };
  }, [isLoaded, retryCount]);

  const renderRecaptcha = (onChange: (value: string | null) => void) => {
    if (!isLoaded || !window.grecaptcha) return null;

    const containerId = `recaptcha-${Math.random().toString(36).substr(2, 9)}`;

    setTimeout(() => {
      const container = document.getElementById(containerId);
      if (container && !container.hasChildNodes()) {
        const id = window.grecaptcha.render(container, {
          sitekey: siteKey,
          callback: (token: string) => onChange(token),
          'expired-callback': () => onChange(null),
          'error-callback': () => onChange(null),
        });
        setWidgetId(id);
      }
    }, 100);

    return <div id={containerId} className="recaptcha-container" />;
  };

  const resetRecaptcha = () => {
    if (window.grecaptcha && widgetId !== null) {
      window.grecaptcha.reset(widgetId);
    }
  };

  const retryLoadRecaptcha = () => {
    setLoadingTimeout(false);
    setIsLoaded(false);
    setRetryCount(prev => prev + 1);
    
    // Remove existing scripts
    const existingScripts = document.querySelectorAll('script[src*="recaptcha"]');
    existingScripts.forEach(script => script.remove());
    
    // Clear existing grecaptcha
    if (window.grecaptcha) {
      delete (window as any).grecaptcha;
    }
  };

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center gap-2">
            Security Verification
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetRecaptcha}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </FormLabel>
          <FormControl>
            <div className="space-y-2">
              {renderRecaptcha(field.onChange)}
              {!isLoaded && !loadingTimeout && (
                <div className="text-sm text-muted-foreground">
                  Loading security verification...
                </div>
              )}
              {loadingTimeout && (
                <div className="p-3 border border-yellow-200 bg-yellow-50 rounded-md">
                  <p className="text-yellow-800 text-sm mb-2">
                    Security verification is taking longer than expected. This may be due to:
                  </p>
                  <ul className="text-yellow-700 text-xs list-disc list-inside space-y-1 mb-3">
                    <li>Network connectivity issues</li>
                    <li>New domain verification in progress (can take 24-48 hours)</li>
                    <li>Firewall or ad-blocker interference</li>
                  </ul>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={retryLoadRecaptcha}
                      className="text-xs"
                    >
                      Retry Loading
                    </Button>
                    <p className="text-xs text-yellow-600 flex items-center">
                      You can still submit the form - our server has additional spam protection.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}