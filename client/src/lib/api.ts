// API configuration for different environments
const getApiBaseUrl = (): string => {
  // In development, use relative URLs (handled by Vite dev server proxy)
  if (import.meta.env.DEV) {
    return '';
  }
  
  // In production, first check for explicit API URL
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
  }
  
  // For production deployment without explicit API URL,
  // ensure we're using absolute URLs based on current location
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Fallback for server-side rendering
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

// Helper function to create API URLs
export const createApiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

// Export for use in other parts of the app
export { getApiBaseUrl };