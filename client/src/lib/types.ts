// Common type definitions for the application
export interface Stats {
  vehicles: number;
  clients: number;
  cities: number;
  experience: number;
}

export interface ServiceFeature {
  icon: string;
  title: string;
  description: string;
}

export interface NavigationItem {
  name: string;
  href: string;
}

export interface SocialLink {
  name: string;
  href: string;
  icon: string;
  color: string;
}

export interface ContactInfo {
  address: string;
  phone: string[];
  email: string[];
}

// Form validation helpers
export const phoneRegex = /^\+880\s?1[3-9]\d{8}$/;
export const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Constants
export const COMPANY_INFO = {
  name: "OfficeXpress",
  domain: "officexpress.org",
  description: "Professional transportation solutions for businesses and individuals across Bangladesh.",
  address: {
    street: "House #123, Road #45",
    area: "Dhanmondi, Dhaka 1205",
    country: "Bangladesh"
  },
  contact: {
    phone: ["+880 1XXX-XXXXXX", "+880 1XXX-XXXXXX"],
    email: ["info@officexpress.org", "booking@officexpress.org"]
  }
} as const;

export const SERVICE_TYPES = {
  corporate: [
    "Employee Pick & Drop",
    "Monthly Contract", 
    "Airport Transfer",
    "Custom Package"
  ],
  rental: [
    "City Tour with Chauffeur",
    "Business Travel",
    "Airport Transfer", 
    "Special Events",
    "Custom Package"
  ],
  contact: [
    "Corporate Services",
    "Rental Services",
    "Airport Transfer",
    "Vendor Partnership", 
    "General Inquiry"
  ]
} as const;

export const VEHICLE_TYPES = [
  { id: "sedan", label: "Sedan" },
  { id: "suv", label: "SUV" },
  { id: "microbus", label: "Microbus" },
  { id: "van", label: "Van" },
  { id: "bus", label: "Bus" },
  { id: "luxury-car", label: "Luxury Car" }
] as const;

export const EXPERIENCE_LEVELS = [
  { value: "less-than-1", label: "Less than 1 year" },
  { value: "1-3", label: "1-3 years" },
  { value: "3-5", label: "3-5 years" },
  { value: "5-10", label: "5-10 years" },
  { value: "more-than-10", label: "More than 10 years" }
] as const;

export const DURATION_OPTIONS = [
  { value: "half-day", label: "Half Day (4 hours)" },
  { value: "full-day", label: "Full Day (8 hours)" },
  { value: "2-3-days", label: "2-3 Days" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" }
] as const;

export const SERVICE_MODALITIES = [
  { value: "driver-vehicle", label: "Driver + Vehicle" },
  { value: "vehicle-only", label: "Vehicle Only" },
  { value: "driver-only", label: "Driver Only" },
  { value: "fleet-services", label: "Fleet Services" }
] as const;
