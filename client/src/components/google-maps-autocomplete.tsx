/// <reference types="@types/google.maps" />
import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, X, Loader2 } from "lucide-react";

interface GoogleMapsAutocompleteProps {
  value?: string | null;
  placeholder?: string;
  onSelect: (value: string) => void;
  className?: string;
  error?: boolean;
  disabled?: boolean;
  restrictToCountry?: string;
  testId?: string;
}

declare global {
  interface Window {
    google: typeof google;
    initGoogleMapsCallback?: () => void;
  }
}

let isApiLoading = false;
let isApiLoaded = false;
const loadCallbacks: (() => void)[] = [];

function loadGoogleMapsApi(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isApiLoaded && window.google?.maps?.places) {
      resolve();
      return;
    }

    if (isApiLoading) {
      loadCallbacks.push(() => resolve());
      return;
    }

    if (!apiKey) {
      reject(new Error("Google Maps API key is required"));
      return;
    }

    isApiLoading = true;

    window.initGoogleMapsCallback = () => {
      isApiLoaded = true;
      isApiLoading = false;
      loadCallbacks.forEach(cb => cb());
      loadCallbacks.length = 0;
      resolve();
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMapsCallback`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      isApiLoading = false;
      reject(new Error("Failed to load Google Maps API"));
    };
    document.head.appendChild(script);
  });
}

export function GoogleMapsAutocomplete({
  value,
  placeholder = "Search for a location...",
  onSelect,
  className,
  error,
  disabled,
  restrictToCountry = "bd",
  testId
}: GoogleMapsAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value || "");
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      setApiError("Google Maps API key not configured");
      return;
    }

    loadGoogleMapsApi(apiKey)
      .then(() => {
        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        setApiReady(true);
      })
      .catch((err) => {
        setApiError(err.message);
      });
  }, [apiKey]);

  useEffect(() => {
    if (value !== undefined) {
      setInputValue(value || "");
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPredictions = useCallback((input: string) => {
    if (!autocompleteServiceRef.current || !input.trim()) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);

    const request: google.maps.places.AutocompletionRequest = {
      input,
      sessionToken: sessionTokenRef.current!,
      componentRestrictions: restrictToCountry ? { country: restrictToCountry } : undefined,
    };

    autocompleteServiceRef.current.getPlacePredictions(
      request,
      (results, status) => {
        setIsLoading(false);
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results);
        } else {
          setPredictions([]);
        }
      }
    );
  }, [restrictToCountry]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchPredictions(newValue);
    }, 300);
  };

  const handleSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    const description = prediction.description;
    setInputValue(description);
    setPredictions([]);
    setIsOpen(false);
    onSelect(description);
    sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
  };

  const handleClear = () => {
    setInputValue("");
    setPredictions([]);
    setIsOpen(false);
    onSelect("");
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    if (inputValue.trim() && predictions.length > 0) {
      setIsOpen(true);
    }
  };

  if (apiError) {
    return (
      <div className={`relative ${className || ""}`}>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              onSelect(e.target.value);
            }}
            placeholder={placeholder}
            className={`pl-10 pr-10 ${error ? "border-red-500" : ""}`}
            disabled={disabled}
            data-testid={testId}
          />
        </div>
        <p className="text-xs text-amber-600 mt-1">
          Location search unavailable. Please type your location manually.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className || ""}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          className={`pl-10 pr-10 ${error ? "border-red-500" : ""}`}
          disabled={disabled || !apiReady}
          data-testid={testId}
        />
        {isLoading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        ) : inputValue ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            data-testid={testId ? `${testId}-clear` : undefined}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {isOpen && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handleSelect(prediction)}
              className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-start gap-2 border-b last:border-b-0"
              data-testid={testId ? `${testId}-option-${prediction.place_id}` : undefined}
            >
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {prediction.structured_formatting.main_text}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {prediction.structured_formatting.secondary_text}
                </p>
              </div>
            </button>
          ))}
          <div className="px-4 py-2 text-xs text-muted-foreground border-t bg-muted/50 flex items-center gap-1">
            <img 
              src="https://developers.google.com/static/maps/documentation/images/powered_by_google_on_white.png" 
              alt="Powered by Google" 
              className="h-3"
            />
          </div>
        </div>
      )}
    </div>
  );
}
