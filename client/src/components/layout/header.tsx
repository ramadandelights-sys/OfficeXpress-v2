import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Car, Search, Menu, X, User, LogOut, Settings, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "@/components/LanguageSelector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const [location, navigate] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Fetch dynamic logo
  const { data: logoData } = useQuery({
    queryKey: ['/api/logo'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const logoSrc = logoData?.src || "/logo.jpg";

  const navigation = [
    { name: t('nav.home'), href: "/" },
    { name: t('nav.corporate'), href: "/corporate" },
    { name: t('nav.rental'), href: "/rental" },
    { name: t('nav.carpool'), href: "/carpool" },
    { name: t('nav.vendors'), href: "/vendor" },
    { name: t('nav.contact'), href: "/contact" },
  ];

  const moreAboutItems = [
    { name: t('nav.about'), href: "/about" },
    { name: t('nav.portfolio'), href: "/portfolio" },
    { name: t('nav.blog'), href: "/blog" },
  ];

  // Grouped navigation for logged-in users (mobile)
  const groupedNavigation = user ? [
    {
      header: t('services.header'),
      items: [
        { name: t('nav.corporate'), href: "/corporate" },
        { name: t('nav.rental'), href: "/rental" },
        { name: t('nav.carpool'), href: "/carpool" },
      ]
    },
    {
      header: t('company.header'),
      items: [
        { name: t('nav.about'), href: "/about" },
        { name: t('nav.contact'), href: "/contact" },
      ]
    },
    {
      header: t('common.other'),
      items: [
        { name: t('nav.home'), href: "/" },
        { name: t('nav.portfolio'), href: "/portfolio" },
        { name: t('nav.vendors'), href: "/vendor" },
        { name: t('nav.blog'), href: "/blog" },
      ]
    }
  ] : null;

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      toast({ title: t('auth.logoutSuccess') });
      navigate("/");
      window.location.reload();
    } catch (error) {
      toast({ title: t('auth.logoutFailed'), variant: "destructive" });
    }
  };

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <header className="bg-white shadow-sm border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <div className="flex-1 flex justify-center md:justify-start">
            <Link href="/" className="flex items-center space-x-3" data-testid="logo-link">
              <div className="flex items-center space-x-2">
                <img 
                  src={logoSrc} 
                  alt="OfficeXpress Logo" 
                  className="h-12 w-auto object-contain"
                />
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`font-medium transition-colors px-2 py-2 rounded-lg text-sm ${
                  isActive(item.href)
                    ? "bg-brand-primary text-primary-foreground"
                    : "text-foreground hover:text-primary hover:bg-brand-primary/10"
                }`}
                data-testid={`nav-${item.name.toLowerCase().replace(" ", "-")}`}
              >
                {item.name}
              </Link>
            ))}
            
            {/* More About OfficeXpress Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`font-medium transition-colors px-2 py-2 rounded-lg text-sm flex items-center gap-1 ${
                    isActive("/about") || isActive("/portfolio") || isActive("/blog")
                      ? "bg-brand-primary text-primary-foreground"
                      : "text-foreground hover:text-primary hover:bg-brand-primary/10"
                  }`}
                  data-testid="nav-more-about"
                >
                  {t('nav.moreAbout')}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {moreAboutItems.map((item) => (
                  <DropdownMenuItem key={item.name} asChild>
                    <Link
                      href={item.href}
                      className={`cursor-pointer ${
                        isActive(item.href) ? "bg-brand-primary/10" : ""
                      }`}
                      data-testid={`dropdown-${item.name.toLowerCase().replace(" ", "-")}`}
                    >
                      {item.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Auth Navigation */}
            {!authLoading && (
              <>
                {user ? (
                  <>
                    {user.role === 'customer' && (
                      <Link
                        href="/dashboard"
                        className={`font-medium transition-colors px-2 py-2 rounded-lg text-sm flex items-center gap-1 ${
                          isActive("/dashboard")
                            ? "bg-brand-primary text-primary-foreground"
                            : "text-foreground hover:text-primary hover:bg-brand-primary/10"
                        }`}
                        data-testid="nav-dashboard"
                      >
                        <User className="w-4 h-4" />
                        {t('nav.dashboard')}
                      </Link>
                    )}
                    {(user.role === 'employee' || user.role === 'superadmin') && (
                      <Link
                        href="/admin"
                        className={`font-medium transition-colors px-2 py-2 rounded-lg text-sm flex items-center gap-1 ${
                          isActive("/admin")
                            ? "bg-brand-primary text-primary-foreground"
                            : "text-foreground hover:text-primary hover:bg-brand-primary/10"
                        }`}
                        data-testid="nav-admin"
                      >
                        <Settings className="w-4 h-4" />
                        {t('nav.adminPanel')}
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      className="flex items-center gap-1"
                      data-testid="button-logout"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('auth.logout')}
                    </Button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="font-medium transition-colors px-3 py-2 rounded-lg text-sm bg-brand-primary text-primary-foreground hover:bg-brand-primary/90"
                    data-testid="nav-login"
                  >
                    {t('auth.login')}
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Language Selector, Search & Mobile Menu */}
          <div className="flex items-center space-x-2 absolute right-4 md:relative md:right-auto md:ml-6">
            <LanguageSelector />
            <div className="relative hidden sm:block">
              <Input
                type="text"
                placeholder={t('common.search')}
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
              {isMobileMenuOpen ? <X className="w-10 h-10" /> : <Menu className="w-10 h-10" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4">
            <nav className="flex flex-col space-y-4">
              {/* Show grouped navigation when logged in, otherwise show regular navigation */}
              {groupedNavigation ? (
                groupedNavigation.map((group) => (
                  <div key={group.header} className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1">
                      {group.header}
                    </div>
                    {group.items.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`font-medium transition-colors px-3 py-2 rounded-lg block ${
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
                  </div>
                ))
              ) : (
                <>
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
                  {moreAboutItems.map((item) => (
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
                </>
              )}
              
              {/* Mobile Auth Navigation */}
              {!authLoading && (
                <>
                  {user ? (
                    <>
                      {user.role === 'customer' && (
                        <Link
                          href="/dashboard"
                          className={`font-medium transition-colors px-3 py-2 rounded-lg flex items-center gap-2 ${
                            isActive("/dashboard")
                              ? "bg-brand-primary text-primary-foreground"
                              : "text-foreground hover:text-primary hover:bg-brand-primary/10"
                          }`}
                          onClick={() => setIsMobileMenuOpen(false)}
                          data-testid="mobile-nav-dashboard"
                        >
                          <User className="w-4 h-4" />
                          {t('nav.dashboard')}
                        </Link>
                      )}
                      {(user.role === 'employee' || user.role === 'superadmin') && (
                        <Link
                          href="/admin"
                          className={`font-medium transition-colors px-3 py-2 rounded-lg flex items-center gap-2 ${
                            isActive("/admin")
                              ? "bg-brand-primary text-primary-foreground"
                              : "text-foreground hover:text-primary hover:bg-brand-primary/10"
                          }`}
                          onClick={() => setIsMobileMenuOpen(false)}
                          data-testid="mobile-nav-admin"
                        >
                          <Settings className="w-4 h-4" />
                          {t('nav.adminPanel')}
                        </Link>
                      )}
                      <Button
                        variant="ghost"
                        onClick={() => {
                          handleLogout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="flex items-center gap-2 justify-start px-3"
                        data-testid="mobile-button-logout"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('auth.logout')}
                      </Button>
                    </>
                  ) : (
                    <Link
                      href="/login"
                      className="font-medium transition-colors px-3 py-2 rounded-lg bg-brand-primary text-primary-foreground hover:bg-brand-primary/90"
                      onClick={() => setIsMobileMenuOpen(false)}
                      data-testid="mobile-nav-login"
                    >
                      {t('auth.login')}
                    </Link>
                  )}
                </>
              )}
            </nav>
            <div className="mt-4 sm:hidden">
              <Input
                type="text"
                placeholder={t('common.search')}
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
