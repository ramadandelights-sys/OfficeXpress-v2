import { Link } from "wouter";
import { Car, Facebook, Linkedin, Instagram, MapPin, Phone, Mail } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { WebsiteSettings } from "@shared/schema";

export default function Footer() {
  // Fetch dynamic logo
  const { data: logoData } = useQuery({
    queryKey: ['/api/logo'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch website settings for colors (public endpoint)
  const { data: websiteSettings } = useQuery<WebsiteSettings | null>({
    queryKey: ['/api/website-settings'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const logoSrc = (logoData as { src?: string })?.src || "/logo.jpg";
  
  // Use website settings colors or fallback to defaults
  const footerBgColor = websiteSettings?.footerBackgroundColor || "#1e293b";
  const footerTextColor = websiteSettings?.footerTextColor || "#ffffff";
  const linkColor = websiteSettings?.linkColor || "#3b82f6";
  const linkHoverColor = websiteSettings?.linkHoverColor || "#2563eb";
  
  // Calculate muted colors for secondary text (make them lighter/darker based on background)
  const mutedTextColor = footerTextColor === "#ffffff" ? "#9ca3af" : "#6b7280";
  const borderColor = footerTextColor === "#ffffff" ? "#374151" : "#d1d5db";

  return (
    <footer 
      className="py-12" 
      style={{ 
        backgroundColor: footerBgColor, 
        color: footerTextColor 
      }}
    >
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <img 
                src={logoSrc} 
                alt="OfficeXpress Logo" 
                className="h-16 w-auto object-contain"
              />
            </div>
            <p className="mb-4" style={{ color: mutedTextColor }}>
              Professional transportation solutions for businesses and individuals across Bangladesh.
            </p>
            <div className="space-y-2 mb-4" style={{ color: mutedTextColor }}>
              <p className="flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                Dhanmondi, Dhaka 1205
              </p>
              <p className="flex items-center">
                <Phone className="w-4 h-4 mr-2" />
                +880 1XXX-XXXXXX
              </p>
              <p className="flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                info@officexpress.org
              </p>
            </div>
            <div className="flex space-x-4">
              <a
                href="#"
                className="transition-colors"
                style={{ color: mutedTextColor }}
                onMouseEnter={(e) => (e.target as HTMLElement).style.color = linkHoverColor}
                onMouseLeave={(e) => (e.target as HTMLElement).style.color = mutedTextColor}
                data-testid="footer-facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="transition-colors"
                style={{ color: mutedTextColor }}
                onMouseEnter={(e) => (e.target as HTMLElement).style.color = linkHoverColor}
                onMouseLeave={(e) => (e.target as HTMLElement).style.color = mutedTextColor}
                data-testid="footer-linkedin"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="transition-colors"
                style={{ color: mutedTextColor }}
                onMouseEnter={(e) => (e.target as HTMLElement).style.color = linkHoverColor}
                onMouseLeave={(e) => (e.target as HTMLElement).style.color = mutedTextColor}
                data-testid="footer-instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Our Services</h4>
            <ul className="space-y-2" style={{ color: mutedTextColor }}>
              <li>
                <Link 
                  href="/corporate" 
                  className="transition-colors"
                  style={{ color: linkColor }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.color = linkHoverColor}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.color = linkColor}
                >
                  Corporate Transportation
                </Link>
              </li>
              <li>
                <Link 
                  href="/rental" 
                  className="transition-colors"
                  style={{ color: linkColor }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.color = linkHoverColor}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.color = linkColor}
                >
                  Vehicle Rental
                </Link>
              </li>
              <li>
                <Link 
                  href="/contact" 
                  className="transition-colors"
                  style={{ color: linkColor }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.color = linkHoverColor}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.color = linkColor}
                >
                  Airport Transfers
                </Link>
              </li>
              <li>
                <Link 
                  href="/contact" 
                  className="transition-colors"
                  style={{ color: linkColor }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.color = linkHoverColor}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.color = linkColor}
                >
                  City Tours
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2" style={{ color: mutedTextColor }}>
              <li>
                <Link 
                  href="/about" 
                  className="transition-colors"
                  style={{ color: linkColor }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.color = linkHoverColor}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.color = linkColor}
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link 
                  href="/portfolio" 
                  className="transition-colors"
                  style={{ color: linkColor }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.color = linkHoverColor}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.color = linkColor}
                >
                  Our Clients
                </Link>
              </li>
              <li>
                <Link 
                  href="/vendor" 
                  className="transition-colors"
                  style={{ color: linkColor }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.color = linkHoverColor}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.color = linkColor}
                >
                  Partner With Us
                </Link>
              </li>
              <li>
                <Link 
                  href="/blog" 
                  className="transition-colors"
                  style={{ color: linkColor }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.color = linkHoverColor}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.color = linkColor}
                >
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Legal</h4>
            <ul className="space-y-2" style={{ color: mutedTextColor }}>
              <li>
                <Link 
                  href="/terms-and-conditions" 
                  className="transition-colors"
                  style={{ color: linkColor }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.color = linkHoverColor}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.color = linkColor}
                  data-testid="footer-terms"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link 
                  href="/privacy-policy" 
                  className="transition-colors"
                  style={{ color: linkColor }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.color = linkHoverColor}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.color = linkColor}
                  data-testid="footer-privacy"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  href="/contact" 
                  className="transition-colors"
                  style={{ color: linkColor }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.color = linkHoverColor}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.color = linkColor}
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 text-center" style={{ borderTop: `1px solid ${borderColor}` }}>
          <p style={{ color: mutedTextColor }}>&copy; 2024 OfficeXpress Transportation Services. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
