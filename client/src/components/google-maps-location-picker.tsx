/// <reference types="@types/google.maps" />
import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, X, Loader2, Map } from "lucide-react";

export interface LocationData {
  name: string;
  latitude: number | null;
  longitude: number | null;
}

interface GoogleMapsLocationPickerProps {
  value?: LocationData | null;
  placeholder?: string;
  onSelect: (location: LocationData) => void;
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

let apiLoadPromise: Promise<void> | null = null;
let lastApiKey: string | null = null;

function loadGoogleMapsApi(apiKey: string): Promise<void> {
  if (window.google?.maps?.places) {
    return Promise.resolve();
  }

  if (!apiKey) {
    return Promise.reject(new Error("Google Maps API key is required"));
  }

  if (lastApiKey !== apiKey) {
    apiLoadPromise = null;
    lastApiKey = apiKey;
  }

  if (apiLoadPromise) {
    return apiLoadPromise;
  }

  apiLoadPromise = new Promise((resolve, reject) => {
    window.initGoogleMapsCallback = () => {
      resolve();
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=initGoogleMapsCallback`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.error("[GoogleMapsLocationPicker] Failed to load Google Maps API");
      apiLoadPromise = null;
      reject(new Error("Failed to load Google Maps API"));
    };
    document.head.appendChild(script);
  });

  return apiLoadPromise;
}

export function GoogleMapsLocationPicker({
  value,
  placeholder = "Search for a location...",
  onSelect,
  className,
  error,
  disabled,
  restrictToCountry = "bd",
  testId
}: GoogleMapsLocationPickerProps) {
  const [inputValue, setInputValue] = useState(value?.name || "");
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{lat: number, lng: number} | null>(
    value?.latitude && value?.longitude ? { lat: value.latitude, lng: value.longitude } : null
  );
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
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
        geocoderRef.current = new window.google.maps.Geocoder();
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        setApiReady(true);
      })
      .catch((err) => {
        setApiError(err.message);
      });
  }, [apiKey]);

  useEffect(() => {
    if (value?.name !== undefined) {
      setInputValue(value.name || "");
    }
    if (value?.latitude && value?.longitude) {
      setSelectedCoords({ lat: value.latitude, lng: value.longitude });
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

  useEffect(() => {
    if (!mapDialogOpen || !apiReady) return;

    let timeoutId: NodeJS.Timeout | null = null;
    let mapInstance: google.maps.Map | null = null;

    // Small delay to ensure dialog content is rendered
    const initMap = () => {
      if (!mapContainerRef.current) {
        // Retry after a short delay if container not ready
        timeoutId = setTimeout(initMap, 100);
        return;
      }

      const defaultCenter = { lat: 23.8103, lng: 90.4125 };
      const center = selectedCoords || defaultCenter;

      const map = new window.google.maps.Map(mapContainerRef.current, {
        center,
        zoom: selectedCoords ? 15 : 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      mapRef.current = map;
      mapInstance = map;
      placesServiceRef.current = new window.google.maps.places.PlacesService(map);

      if (selectedCoords) {
        const marker = new window.google.maps.Marker({
          position: selectedCoords,
          map,
          draggable: true,
        });
        markerRef.current = marker;

        marker.addListener("dragend", () => {
          const pos = marker.getPosition();
          if (pos) {
            setSelectedCoords({ lat: pos.lat(), lng: pos.lng() });
          }
        });
      }

      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        const latLng = e.latLng;
        if (!latLng) return;

        const newCoords = { lat: latLng.lat(), lng: latLng.lng() };
        setSelectedCoords(newCoords);

        if (markerRef.current) {
          markerRef.current.setPosition(newCoords);
        } else {
          const marker = new window.google.maps.Marker({
            position: newCoords,
            map,
            draggable: true,
          });
          markerRef.current = marker;

          marker.addListener("dragend", () => {
            const pos = marker.getPosition();
            if (pos) {
              setSelectedCoords({ lat: pos.lat(), lng: pos.lng() });
            }
          });
        }
      });
    };

    initMap();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    };
  }, [mapDialogOpen, apiReady]);

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

    if (placesServiceRef.current) {
      placesServiceRef.current.getDetails(
        { placeId: prediction.place_id, fields: ["geometry"] },
        (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            setSelectedCoords({ lat, lng });
            onSelect({ name: description, latitude: lat, longitude: lng });
          } else {
            onSelect({ name: description, latitude: null, longitude: null });
          }
        }
      );
    } else {
      onSelect({ name: description, latitude: null, longitude: null });
    }

    sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
  };

  const handleClear = () => {
    setInputValue("");
    setSelectedCoords(null);
    setPredictions([]);
    setIsOpen(false);
    onSelect({ name: "", latitude: null, longitude: null });
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    if (inputValue.trim() && predictions.length > 0) {
      setIsOpen(true);
    }
  };

  const handleMapConfirm = () => {
    if (!selectedCoords) return;

    geocoderRef.current?.geocode({ location: selectedCoords }, (results, status) => {
      if (status === window.google.maps.GeocoderStatus.OK && results?.[0]) {
        const address = results[0].formatted_address;
        setInputValue(address);
        onSelect({ name: address, latitude: selectedCoords.lat, longitude: selectedCoords.lng });
      } else {
        const coordsName = `${selectedCoords.lat.toFixed(6)}, ${selectedCoords.lng.toFixed(6)}`;
        setInputValue(coordsName);
        onSelect({ name: coordsName, latitude: selectedCoords.lat, longitude: selectedCoords.lng });
      }
      setMapDialogOpen(false);
    });
  };

  if (apiError) {
    return (
      <div className={`relative ${className || ""}`}>
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                onSelect({ name: e.target.value, latitude: null, longitude: null });
              }}
              placeholder={placeholder}
              className={`pl-10 pr-10 ${error ? "border-red-500" : ""}`}
              disabled={disabled}
              data-testid={testId}
            />
          </div>
        </div>
        <p className="text-xs text-amber-600 mt-1">
          Location search unavailable. Please type your location manually.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className || ""}`}>
      <div className="relative flex gap-2">
        <div className="relative flex-1">
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
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setMapDialogOpen(true)}
          disabled={disabled || !apiReady}
          title="Pick location on map"
          data-testid={testId ? `${testId}-map-btn` : undefined}
        >
          <Map className="h-4 w-4" />
        </Button>
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

      {selectedCoords && (
        <p className="text-xs text-muted-foreground mt-1">
          Coordinates: {selectedCoords.lat.toFixed(6)}, {selectedCoords.lng.toFixed(6)}
        </p>
      )}

      <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select Location on Map</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Click on the map to drop a pin, or drag the marker to adjust the location.
            </p>
            <div 
              ref={mapContainerRef} 
              className="w-full h-[400px] rounded-md border bg-muted"
              data-testid={testId ? `${testId}-map-container` : undefined}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMapDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleMapConfirm} 
                disabled={!selectedCoords}
                data-testid={testId ? `${testId}-map-confirm` : undefined}
              >
                Confirm Location
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
