/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface RoutePoint {
  name: string;
  latitude: number | null;
  longitude: number | null;
  type?: 'start' | 'end' | 'pickup' | 'dropoff';
  isVisible?: boolean;
  order?: number; // Order within the group (pickup order or dropoff order)
}

interface GoogleMapsRouteDisplayProps {
  startPoint?: {
    name: string;
    latitude: number | null;
    longitude: number | null;
  };
  endPoint?: {
    name: string;
    latitude: number | null;
    longitude: number | null;
  };
  pickupPoints?: RoutePoint[];
  dropoffPoints?: RoutePoint[];
  height?: string;
  showOnlyVisible?: boolean;
  className?: string;
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
  if (window.google?.maps) {
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
      console.error("[GoogleMapsRouteDisplay] Failed to load Google Maps API");
      apiLoadPromise = null;
      reject(new Error("Failed to load Google Maps API"));
    };
    document.head.appendChild(script);
  });

  return apiLoadPromise;
}

export function GoogleMapsRouteDisplay({
  startPoint,
  endPoint,
  pickupPoints = [],
  dropoffPoints = [],
  height = "300px",
  showOnlyVisible = false,
  className,
  testId
}: GoogleMapsRouteDisplayProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const [apiReady, setApiReady] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      setApiError("Google Maps API key not configured");
      setIsLoading(false);
      return;
    }

    loadGoogleMapsApi(apiKey)
      .then(() => {
        setApiReady(true);
        setIsLoading(false);
      })
      .catch((err) => {
        setApiError(err.message);
        setIsLoading(false);
      });
  }, [apiKey]);

  useEffect(() => {
    console.log('[GoogleMapsRouteDisplay] useEffect running, apiReady:', apiReady, 'hasContainer:', !!mapContainerRef.current);
    if (!apiReady || !mapContainerRef.current) return;

    console.log('[GoogleMapsRouteDisplay] Building points from:', {
      startPoint,
      endPoint,
      pickupPointsCount: pickupPoints.length,
      dropoffPointsCount: dropoffPoints.length,
      showOnlyVisible
    });

    const filteredPickups = showOnlyVisible 
      ? pickupPoints.filter(p => p.isVisible !== false && p.latitude && p.longitude)
      : pickupPoints.filter(p => p.latitude && p.longitude);
    
    const filteredDropoffs = showOnlyVisible 
      ? dropoffPoints.filter(p => p.isVisible !== false && p.latitude && p.longitude)
      : dropoffPoints.filter(p => p.latitude && p.longitude);

    const allPoints: RoutePoint[] = [];
    
    if (startPoint?.latitude && startPoint?.longitude) {
      allPoints.push({ ...startPoint, type: 'start' });
    }
    
    filteredPickups.forEach((p, idx) => {
      if (p.latitude && p.longitude) {
        allPoints.push({ ...p, type: 'pickup', order: idx + 1 });
      }
    });
    
    filteredDropoffs.forEach((p, idx) => {
      if (p.latitude && p.longitude) {
        allPoints.push({ ...p, type: 'dropoff', order: idx + 1 });
      }
    });
    
    if (endPoint?.latitude && endPoint?.longitude) {
      allPoints.push({ ...endPoint, type: 'end' });
    }

    console.log('[GoogleMapsRouteDisplay] Total points to display:', allPoints.length, allPoints.map(p => ({ name: p.name, type: p.type, lat: p.latitude, lng: p.longitude })));

    if (allPoints.length === 0) {
      // Show map centered on Dhaka with no markers
      const defaultCenter = { lat: 23.8103, lng: 90.4125 };
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
      mapRef.current = map;
      
      // Add info window to indicate no coordinates
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; max-width: 250px;">
            <strong style="color: #666;">No location data available</strong>
            <p style="color: #888; font-size: 12px; margin-top: 4px;">
              Pickup and drop-off points need coordinates to display on the map. 
              Add coordinates using the location picker in the admin panel.
            </p>
          </div>
        `,
        position: defaultCenter,
      });
      infoWindow.open(map);
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    allPoints.forEach(point => {
      if (point.latitude && point.longitude) {
        bounds.extend({ lat: point.latitude, lng: point.longitude });
      }
    });

    const center = bounds.getCenter();
    const map = new window.google.maps.Map(mapContainerRef.current, {
      center,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });
    mapRef.current = map;

    map.fitBounds(bounds, 50);

    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    const markerColors = {
      start: '#22c55e',
      end: '#ef4444',
      pickup: '#3b82f6',
      dropoff: '#f59e0b',
    };

    allPoints.forEach((point) => {
      if (!point.latitude || !point.longitude) return;

      const color = markerColors[point.type || 'pickup'];
      const isStartOrEnd = point.type === 'start' || point.type === 'end';
      
      // For start/end, use icon letters; for pickup/dropoff, use their order number
      const labelText = isStartOrEnd 
        ? (point.type === 'start' ? 'S' : 'E')
        : String(point.order || '');
      
      const marker = new window.google.maps.Marker({
        position: { lat: point.latitude, lng: point.longitude },
        map,
        title: point.name,
        label: {
          text: labelText,
          color: 'white',
          fontSize: '11px',
          fontWeight: 'bold',
        },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2,
        },
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <strong>${point.name}</strong>
            <br/>
            <span style="color: #666; font-size: 12px;">
              ${point.type === 'start' ? 'Start Point' : 
                point.type === 'end' ? 'End Point' : 
                point.type === 'pickup' ? 'Pickup Point' : 'Drop-off Point'}
            </span>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
    });

    // Clean up previous polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    // Always draw a polyline connecting the points
    if (allPoints.length >= 2) {
      console.log('[GoogleMapsRouteDisplay] Drawing route with', allPoints.length, 'points');
      
      const path = allPoints
        .filter(p => p.latitude && p.longitude)
        .map(p => ({ lat: p.latitude!, lng: p.longitude! }));
      
      console.log('[GoogleMapsRouteDisplay] Polyline path:', path);
      
      // Draw immediate polyline (always works)
      const polyline = new window.google.maps.Polyline({
        path,
        map,
        strokeColor: '#4f46e5',
        strokeWeight: 5,
        strokeOpacity: 1,
        geodesic: true,
        zIndex: 1,
      });
      polylineRef.current = polyline;
      console.log('[GoogleMapsRouteDisplay] Polyline created and set on map');

      // Optionally try to get directions for road-following route
      try {
        const directionsService = new window.google.maps.DirectionsService();
        
        if (directionsRendererRef.current) {
          directionsRendererRef.current.setMap(null);
        }
        
        const directionsRenderer = new window.google.maps.DirectionsRenderer({
          map,
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: '#6366f1',
            strokeWeight: 5,
            strokeOpacity: 0.9,
          },
        });
        directionsRendererRef.current = directionsRenderer;

        const origin = { lat: allPoints[0].latitude!, lng: allPoints[0].longitude! };
        const destination = { lat: allPoints[allPoints.length - 1].latitude!, lng: allPoints[allPoints.length - 1].longitude! };
        
        const waypoints = allPoints.slice(1, -1).map(point => ({
          location: { lat: point.latitude!, lng: point.longitude! },
          stopover: true,
        }));

        directionsService.route(
          {
            origin,
            destination,
            waypoints,
            travelMode: window.google.maps.TravelMode.DRIVING,
            optimizeWaypoints: false,
          },
          (result, status) => {
            if (status === window.google.maps.DirectionsStatus.OK && result) {
              console.log('[GoogleMapsRouteDisplay] Directions API success, replacing polyline');
              // Hide the simple polyline and show directions route
              if (polylineRef.current) {
                polylineRef.current.setMap(null);
              }
              directionsRenderer.setDirections(result);
            } else {
              console.warn('[GoogleMapsRouteDisplay] Directions API status:', status, '- keeping simple polyline');
              // Keep the simple polyline visible
            }
          }
        );
      } catch (err) {
        console.warn('[GoogleMapsRouteDisplay] Directions request failed:', err);
        // Simple polyline remains visible
      }
    } else {
      console.log('[GoogleMapsRouteDisplay] Not enough points for route:', allPoints.length);
    }

    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
    };
  }, [apiReady, startPoint, endPoint, pickupPoints, dropoffPoints, showOnlyVisible]);

  if (isLoading) {
    return (
      <div 
        className={`flex items-center justify-center bg-muted rounded-md ${className || ""}`}
        style={{ height }}
        data-testid={testId}
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (apiError) {
    return (
      <div 
        className={`flex items-center justify-center bg-muted rounded-md ${className || ""}`}
        style={{ height }}
        data-testid={testId}
      >
        <p className="text-sm text-muted-foreground">
          Map unavailable: {apiError}
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div 
        ref={mapContainerRef}
        style={{ height, width: '100%' }}
        className="rounded-md border"
        data-testid={testId}
      />
      <div className="flex flex-wrap gap-4 mt-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Start</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Pickup</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span>Drop-off</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>End</span>
        </div>
      </div>
    </div>
  );
}
