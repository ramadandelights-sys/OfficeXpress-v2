// API configuration for different environments
const getApiBaseUrl = (): string => {
  // In development, use relative URLs (handled by Vite dev server proxy)
  if (import.meta.env.DEV) {
    return '';
  }
  
  // In production, use environment variable or fallback to current origin
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return apiUrl;
  }
  
  // Fallback to current origin for production
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
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