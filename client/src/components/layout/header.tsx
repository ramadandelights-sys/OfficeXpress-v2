import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Car, Search, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Header() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const navigation = [
    { name: "Home", href: "/" },
    { name: "About Us", href: "/about" },
    { name: "Corporate", href: "/corporate" },
    { name: "Rental", href: "/rental" },
    { name: "Portfolio", href: "/portfolio" },
    { name: "Vendors", href: "/vendor" },
    { name: "Contact", href: "/contact" },
    { name: "Blog", href: "/blog" },
    { name: "Admin", href: "/admin" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <header className="bg-white shadow-sm border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3" data-testid="logo-link">
            <img 
              src="/attached_assets/OfficeXpress_logo_1756863810405.png" 
              alt="OfficeXpress Logo" 
              className="h-10 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`font-medium transition-colors px-3 py-2 rounded-lg ${
                  isActive(item.href)
                    ? "bg-brand-primary text-primary-foreground"
                    : "text-foreground hover:text-primary hover:bg-brand-primary/10"
                }`}
                data-testid={`nav-${item.name.toLowerCase().replace(" ", "-")}`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Search & Mobile Menu */}
          <div className="flex items-center space-x-4">
            <div className="relative hidden sm:block">
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-muted border-border rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-ring"
                data-testid="search-input"
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              data-testid="mobile-menu-toggle"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4">
            <nav className="flex flex-col space-y-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`font-medium transition-colors px-3 py-2 rounded-lg ${
                    isActive(item.href)
                      ? "bg-brand-primary text-primary-foreground"
                      : "text-foreground hover:text-primary hover:bg-brand-primary/10"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  data-testid={`mobile-nav-${item.name.toLowerCase().replace(" ", "-")}`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className="mt-4 sm:hidden">
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-muted border-border rounded-lg"
                data-testid="mobile-search-input"
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
