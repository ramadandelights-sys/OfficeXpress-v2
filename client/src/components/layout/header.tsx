import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Car, Search, Menu, X, User, LogOut, Settings, ChevronDown, Wallet, Calendar, MessageSquarePlus, UserCircle } from "lucide-react";
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

  // Fetch user's pending complaints count
  const { data: pendingComplaints } = useQuery<any[]>({
    queryKey: ['/api/my/complaints?status=pending'],
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute
  });
  
  const pendingComplaintsCount = Array.isArray(pendingComplaints) ? pendingComplaints.length : 0;

  // Large screens (lg+): Home, Office Commute, Rental, Blog, Contact
  const lgNavigation = [
    { name: t('nav.home'), href: "/" },
    { name: t('nav.carpool'), href: "/carpool" },
    { name: t('nav.rental'), href: "/rental" },
    { name: t('nav.blog'), href: "/blog" },
    { name: t('nav.contact'), href: "/contact" },
  ];

  // Large screens: Other Services dropdown items (Corporate, Vendors)
  const lgOtherServices = [
    { name: t('nav.corporate'), href: "/corporate" },
    { name: t('nav.vendors'), href: "/vendor" },
  ];

  // Medium screens (md to lg): Home, Office Commute, Blog, Contact
  const mdNavigation = [
    { name: t('nav.home'), href: "/" },
    { name: t('nav.carpool'), href: "/carpool" },
    { name: t('nav.blog'), href: "/blog" },
    { name: t('nav.contact'), href: "/contact" },
  ];

  // Medium screens: Other Services dropdown items (Corporate, Vendor, Rental)
  const mdOtherServices = [
    { name: t('nav.corporate'), href: "/corporate" },
    { name: t('nav.vendors'), href: "/vendor" },
    { name: t('nav.rental'), href: "/rental" },
  ];

  // Mobile navigation for non-logged-in users
  const mobileNavigation = [
    { name: t('nav.home'), href: "/" },
    { name: t('nav.carpool'), href: "/carpool" },
    { name: t('nav.rental'), href: "/rental" },
    { name: t('nav.corporate'), href: "/corporate" },
    { name: t('nav.vendors'), href: "/vendor" },
    { name: t('nav.blog'), href: "/blog" },
  ];

  // Grouped navigation for mobile (both logged-in and non-logged-in)
  const groupedMobileNavigation = [
    {
      header: t('services.header'),
      items: [
        { name: t('nav.carpool'), href: "/carpool" },
        { name: t('nav.rental'), href: "/rental" },
        { name: t('nav.corporate'), href: "/corporate" },
        { name: t('nav.vendors'), href: "/vendor" },
      ]
    },
    {
      header: t('common.other'),
      items: [
        { name: t('nav.home'), href: "/" },
        { name: t('nav.blog'), href: "/blog" },
        { name: t('nav.contact'), href: "/contact" },
      ]
    }
  ];

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

  const isOtherServicesActive = (items: { href: string }[]) => {
    return items.some(item => isActive(item.href));
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

          {/* Desktop Navigation - Large screens (lg+) */}
          <nav className="hidden lg:flex items-center space-x-4">
            {lgNavigation.map((item) => (
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
            
            {/* Other Services Dropdown - Large screens */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`font-medium transition-colors px-2 py-2 rounded-lg text-sm flex items-center gap-1 ${
                    isOtherServicesActive(lgOtherServices)
                      ? "bg-brand-primary text-primary-foreground"
                      : "text-foreground hover:text-primary hover:bg-brand-primary/10"
                  }`}
                  data-testid="nav-other-services"
                >
                  {t('nav.otherServices')}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {lgOtherServices.map((item) => (
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
            
            {/* Profile Dropdown - Large screens */}
            {!authLoading && (
              <>
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="font-medium transition-colors px-2 py-2 rounded-lg text-sm flex items-center gap-1 text-foreground hover:text-primary hover:bg-brand-primary/10 relative"
                        data-testid="nav-profile"
                      >
                        <UserCircle className="w-5 h-5" />
                        {t('nav.profile')}
                        <ChevronDown className="w-3 h-3" />
                        {pendingComplaintsCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium">
                            {pendingComplaintsCount}
                          </span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem asChild>
                        <Link href="/wallet" className="cursor-pointer flex items-center gap-2" data-testid="dropdown-wallet">
                          <Wallet className="w-4 h-4" />
                          {t('nav.myWallet')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/my-subscriptions" className="cursor-pointer flex items-center gap-2" data-testid="dropdown-subscriptions">
                          <Calendar className="w-4 h-4" />
                          {t('nav.subscriptions')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/complaints" className="cursor-pointer flex items-center gap-2 relative" data-testid="dropdown-complaints">
                          <MessageSquarePlus className="w-4 h-4" />
                          {t('nav.fileComplaint')}
                          {pendingComplaintsCount > 0 && (
                            <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                              {pendingComplaintsCount}
                            </span>
                          )}
                        </Link>
                      </DropdownMenuItem>
                      {user.role === 'customer' && (
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard" className="cursor-pointer flex items-center gap-2" data-testid="dropdown-dashboard">
                            <User className="w-4 h-4" />
                            {t('nav.dashboard')}
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {(user.role === 'employee' || user.role === 'superadmin') && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="cursor-pointer flex items-center gap-2" data-testid="dropdown-admin">
                            <Settings className="w-4 h-4" />
                            {t('nav.adminPanel')}
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={handleLogout} 
                        className="cursor-pointer flex items-center gap-2 text-destructive"
                        data-testid="dropdown-logout"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('auth.logout')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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

          {/* Desktop Navigation - Medium screens (md to lg) */}
          <nav className="hidden md:flex lg:hidden items-center space-x-4">
            {mdNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`font-medium transition-colors px-2 py-2 rounded-lg text-sm ${
                  isActive(item.href)
                    ? "bg-brand-primary text-primary-foreground"
                    : "text-foreground hover:text-primary hover:bg-brand-primary/10"
                }`}
                data-testid={`nav-md-${item.name.toLowerCase().replace(" ", "-")}`}
              >
                {item.name}
              </Link>
            ))}
            
            {/* Other Services Dropdown - Medium screens */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`font-medium transition-colors px-2 py-2 rounded-lg text-sm flex items-center gap-1 ${
                    isOtherServicesActive(mdOtherServices)
                      ? "bg-brand-primary text-primary-foreground"
                      : "text-foreground hover:text-primary hover:bg-brand-primary/10"
                  }`}
                  data-testid="nav-md-other-services"
                >
                  {t('nav.otherServices')}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {mdOtherServices.map((item) => (
                  <DropdownMenuItem key={item.name} asChild>
                    <Link
                      href={item.href}
                      className={`cursor-pointer ${
                        isActive(item.href) ? "bg-brand-primary/10" : ""
                      }`}
                      data-testid={`dropdown-md-${item.name.toLowerCase().replace(" ", "-")}`}
                    >
                      {item.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Profile Dropdown - Medium screens */}
            {!authLoading && (
              <>
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="font-medium transition-colors px-2 py-2 rounded-lg text-sm flex items-center gap-1 text-foreground hover:text-primary hover:bg-brand-primary/10 relative"
                        data-testid="nav-md-profile"
                      >
                        <UserCircle className="w-5 h-5" />
                        {t('nav.profile')}
                        <ChevronDown className="w-3 h-3" />
                        {pendingComplaintsCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium">
                            {pendingComplaintsCount}
                          </span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem asChild>
                        <Link href="/wallet" className="cursor-pointer flex items-center gap-2" data-testid="dropdown-md-wallet">
                          <Wallet className="w-4 h-4" />
                          {t('nav.myWallet')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/my-subscriptions" className="cursor-pointer flex items-center gap-2" data-testid="dropdown-md-subscriptions">
                          <Calendar className="w-4 h-4" />
                          {t('nav.subscriptions')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/complaints" className="cursor-pointer flex items-center gap-2 relative" data-testid="dropdown-md-complaints">
                          <MessageSquarePlus className="w-4 h-4" />
                          {t('nav.fileComplaint')}
                          {pendingComplaintsCount > 0 && (
                            <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                              {pendingComplaintsCount}
                            </span>
                          )}
                        </Link>
                      </DropdownMenuItem>
                      {user.role === 'customer' && (
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard" className="cursor-pointer flex items-center gap-2" data-testid="dropdown-md-dashboard">
                            <User className="w-4 h-4" />
                            {t('nav.dashboard')}
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {(user.role === 'employee' || user.role === 'superadmin') && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="cursor-pointer flex items-center gap-2" data-testid="dropdown-md-admin">
                            <Settings className="w-4 h-4" />
                            {t('nav.adminPanel')}
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={handleLogout} 
                        className="cursor-pointer flex items-center gap-2 text-destructive"
                        data-testid="dropdown-md-logout"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('auth.logout')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link
                    href="/login"
                    className="font-medium transition-colors px-3 py-2 rounded-lg text-sm bg-brand-primary text-primary-foreground hover:bg-brand-primary/90"
                    data-testid="nav-md-login"
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
              {/* Always show grouped navigation on mobile */}
              {groupedMobileNavigation.map((group) => (
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
              ))}
              
              {/* Mobile Auth Navigation */}
              {!authLoading && (
                <>
                  {user ? (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1">
                        {t('nav.account')}
                      </div>
                      {/* Wallet Link for all logged-in users */}
                      <Link
                        href="/wallet"
                        className={`font-medium transition-colors px-3 py-2 rounded-lg flex items-center gap-2 ${
                          isActive("/wallet")
                            ? "bg-brand-primary text-primary-foreground"
                            : "text-foreground hover:text-primary hover:bg-brand-primary/10"
                        }`}
                        onClick={() => setIsMobileMenuOpen(false)}
                        data-testid="mobile-nav-wallet"
                      >
                        <Wallet className="w-4 h-4" />
                        My Wallet
                      </Link>
                      
                      {/* Subscriptions Link for all logged-in users */}
                      <Link
                        href="/my-subscriptions"
                        className={`font-medium transition-colors px-3 py-2 rounded-lg flex items-center gap-2 ${
                          isActive("/my-subscriptions")
                            ? "bg-brand-primary text-primary-foreground"
                            : "text-foreground hover:text-primary hover:bg-brand-primary/10"
                        }`}
                        onClick={() => setIsMobileMenuOpen(false)}
                        data-testid="mobile-nav-subscriptions"
                      >
                        <Calendar className="w-4 h-4" />
                        My Subscriptions
                      </Link>
                      
                      {/* File Complaint Link for all logged-in users */}
                      <Link
                        href="/complaints"
                        className={`font-medium transition-colors px-3 py-2 rounded-lg flex items-center gap-2 relative ${
                          isActive("/complaints")
                            ? "bg-brand-primary text-primary-foreground"
                            : "text-foreground hover:text-primary hover:bg-brand-primary/10"
                        }`}
                        onClick={() => setIsMobileMenuOpen(false)}
                        data-testid="mobile-nav-complaints"
                      >
                        <MessageSquarePlus className="w-4 h-4" />
                        File Complaint
                        {pendingComplaintsCount > 0 && (
                          <span className="absolute top-1 right-10 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                            {pendingComplaintsCount}
                          </span>
                        )}
                      </Link>
                      
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
                    </div>
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
