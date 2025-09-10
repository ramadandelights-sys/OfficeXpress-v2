import { Link } from "wouter";
import { Car, Facebook, Linkedin, Instagram, MapPin, Phone, Mail } from "lucide-react";
import logoImage from "@assets/logo_v2_1756987631987.png";

export default function Footer() {
  return (
    <footer className="bg-slate-800 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <img 
                src={logoImage} 
                alt="OfficeXpress Logo" 
                className="h-32 w-auto object-contain"
              />
            </div>
            <p className="text-gray-300 mb-4">
              Professional transportation solutions for businesses and individuals across Bangladesh.
            </p>
            <div className="space-y-2 text-gray-300 mb-4">
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
                className="text-gray-400 hover:text-white transition-colors"
                data-testid="footer-facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors"
                data-testid="footer-linkedin"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors"
                data-testid="footer-instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Our Services</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <Link href="/corporate" className="hover:text-white transition-colors">
                  Corporate Transportation
                </Link>
              </li>
              <li>
                <Link href="/rental" className="hover:text-white transition-colors">
                  Vehicle Rental
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Airport Transfers
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  City Tours
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/portfolio" className="hover:text-white transition-colors">
                  Our Clients
                </Link>
              </li>
              <li>
                <Link href="/vendor" className="hover:text-white transition-colors">
                  Partner With Us
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <Link href="/terms-and-conditions" className="hover:text-white transition-colors" data-testid="footer-terms">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-white transition-colors" data-testid="footer-privacy">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center">
          <p className="text-gray-400">&copy; 2024 OfficeXpress Transportation Services. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
