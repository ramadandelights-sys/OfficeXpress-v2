import { Link } from "wouter";
import { Car, Facebook, Linkedin, Instagram, MapPin, Phone, Mail } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { WebsiteSettings } from "@shared/schema";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();
  
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
  
  // CSS styles to ensure link colors override defaults
  const linkStyle = {
    color: linkColor + ' !important',
    textDecoration: 'none'
  };
  
  const linkHoverStyle = {
    color: linkHoverColor + ' !important',
    textDecoration: 'none'
  };

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
              {t('footer.tagline')}
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
            <h4 className="text-lg font-semibold mb-4">{t('footer.ourServices')}</h4>
            <ul className="space-y-2" style={{ color: mutedTextColor }}>
              <li>
                <Link 
                  href="/corporate" 
                  className="transition-colors"
                  style={linkStyle}
                  onMouseEnter={(e) => Object.assign((e.target as HTMLElement).style, linkHoverStyle)}
                  onMouseLeave={(e) => Object.assign((e.target as HTMLElement).style, linkStyle)}
                >
                  {t('footer.corporateTransportation')}
                </Link>
              </li>
              <li>
                <Link 
                  href="/rental" 
                  className="transition-colors"
                  style={linkStyle}
                  onMouseEnter={(e) => Object.assign((e.target as HTMLElement).style, linkHoverStyle)}
                  onMouseLeave={(e) => Object.assign((e.target as HTMLElement).style, linkStyle)}
                >
                  {t('footer.vehicleRental')}
                </Link>
              </li>
              <li>
                <Link 
                  href="/rental?service=airport" 
                  className="transition-colors"
                  style={linkStyle}
                  onMouseEnter={(e) => Object.assign((e.target as HTMLElement).style, linkHoverStyle)}
                  onMouseLeave={(e) => Object.assign((e.target as HTMLElement).style, linkStyle)}
                >
                  {t('footer.airportTransfers')}
                </Link>
              </li>
              <li>
                <Link 
                  href="/rental?service=tourism" 
                  className="transition-colors"
                  style={linkStyle}
                  onMouseEnter={(e) => Object.assign((e.target as HTMLElement).style, linkHoverStyle)}
                  onMouseLeave={(e) => Object.assign((e.target as HTMLElement).style, linkStyle)}
                >
                  {t('footer.cityTours')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2" style={{ color: mutedTextColor }}>
              <li>
                <Link 
                  href="/about" 
                  className="transition-colors"
                  style={linkStyle}
                  onMouseEnter={(e) => Object.assign((e.target as HTMLElement).style, linkHoverStyle)}
                  onMouseLeave={(e) => Object.assign((e.target as HTMLElement).style, linkStyle)}
                >
                  {t('footer.aboutUs')}
                </Link>
              </li>
              <li>
                <Link 
                  href="/portfolio" 
                  className="transition-colors"
                  style={linkStyle}
                  onMouseEnter={(e) => Object.assign((e.target as HTMLElement).style, linkHoverStyle)}
                  onMouseLeave={(e) => Object.assign((e.target as HTMLElement).style, linkStyle)}
                >
                  {t('footer.ourClients')}
                </Link>
              </li>
              <li>
                <Link 
                  href="/vendor" 
                  className="transition-colors"
                  style={linkStyle}
                  onMouseEnter={(e) => Object.assign((e.target as HTMLElement).style, linkHoverStyle)}
                  onMouseLeave={(e) => Object.assign((e.target as HTMLElement).style, linkStyle)}
                >
                  {t('footer.partnerWithUs')}
                </Link>
              </li>
              <li>
                <Link 
                  href="/blog" 
                  className="transition-colors"
                  style={linkStyle}
                  onMouseEnter={(e) => Object.assign((e.target as HTMLElement).style, linkHoverStyle)}
                  onMouseLeave={(e) => Object.assign((e.target as HTMLElement).style, linkStyle)}
                >
                  {t('footer.blog')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.legal')}</h4>
            <ul className="space-y-2" style={{ color: mutedTextColor }}>
              <li>
                <Link 
                  href="/terms-and-conditions" 
                  className="transition-colors"
                  style={linkStyle}
                  onMouseEnter={(e) => Object.assign((e.target as HTMLElement).style, linkHoverStyle)}
                  onMouseLeave={(e) => Object.assign((e.target as HTMLElement).style, linkStyle)}
                  data-testid="footer-terms"
                >
                  {t('footer.termsConditions')}
                </Link>
              </li>
              <li>
                <Link 
                  href="/privacy-policy" 
                  className="transition-colors"
                  style={linkStyle}
                  onMouseEnter={(e) => Object.assign((e.target as HTMLElement).style, linkHoverStyle)}
                  onMouseLeave={(e) => Object.assign((e.target as HTMLElement).style, linkStyle)}
                  data-testid="footer-privacy"
                >
                  {t('footer.privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link 
                  href="/contact" 
                  className="transition-colors"
                  style={linkStyle}
                  onMouseEnter={(e) => Object.assign((e.target as HTMLElement).style, linkHoverStyle)}
                  onMouseLeave={(e) => Object.assign((e.target as HTMLElement).style, linkStyle)}
                >
                  {t('footer.contactUs')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 text-center" style={{ borderTop: `1px solid ${borderColor}` }}>
          <p style={{ color: mutedTextColor }}>{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
}
