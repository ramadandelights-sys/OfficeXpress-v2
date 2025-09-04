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
}

export function RecaptchaField({ control, name, siteKey }: RecaptchaFieldProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [widgetId, setWidgetId] = useState<number | null>(null);

  // If no site key is provided, don't render reCAPTCHA
  if (!siteKey) {
    return null;
  }

  useEffect(() => {
    // Load reCAPTCHA script
    if (!window.grecaptcha) {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);

      // Define the callback function
      (window as any).onRecaptchaLoad = () => {
        setIsLoaded(true);
      };
    } else {
      setIsLoaded(true);
    }
  }, []);

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
              {!isLoaded && (
                <div className="text-sm text-muted-foreground">
                  Loading security verification...
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