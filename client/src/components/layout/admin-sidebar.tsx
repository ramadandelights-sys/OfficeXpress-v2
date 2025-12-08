import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Truck,
  Wallet,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  LogOut,
  Edit,
  Users,
  Scale,
  Building,
  Car,
  UserPlus,
  MessageSquare,
  MapPin,
  Calendar,
  CalendarOff,
  CreditCard,
  RefreshCw,
  UserCog,
  Target,
  Palette,
  AlertTriangle,
  X
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  permission?: string;
}

interface NavGroup {
  title: string;
  icon: React.ReactNode;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Content",
    icon: <FileText className="h-4 w-4" />,
    items: [
      { title: "Blog Posts", href: "/admin/content/blog", icon: <Edit className="h-4 w-4" />, permission: "blogPosts" },
      { title: "Portfolio", href: "/admin/content/portfolio", icon: <Users className="h-4 w-4" />, permission: "portfolioClients" },
      { title: "Legal Pages", href: "/admin/content/legal", icon: <Scale className="h-4 w-4" />, permission: "legalPages" },
    ],
  },
  {
    title: "Bookings & Forms",
    icon: <ClipboardList className="h-4 w-4" />,
    items: [
      { title: "Corporate", href: "/admin/bookings/corporate", icon: <Building className="h-4 w-4" />, permission: "corporateBookings" },
      { title: "Rental", href: "/admin/bookings/rental", icon: <Car className="h-4 w-4" />, permission: "rentalBookings" },
      { title: "Vendor", href: "/admin/bookings/vendor", icon: <UserPlus className="h-4 w-4" />, permission: "vendorRegistrations" },
      { title: "Contact", href: "/admin/bookings/contact", icon: <MessageSquare className="h-4 w-4" />, permission: "contactMessages" },
    ],
  },
  {
    title: "Operations",
    icon: <Truck className="h-4 w-4" />,
    items: [
      { title: "Carpool Routes", href: "/admin/operations/routes", icon: <MapPin className="h-4 w-4" />, permission: "carpoolRouteManagement" },
      { title: "Carpool Bookings", href: "/admin/operations/bookings", icon: <Calendar className="h-4 w-4" />, permission: "carpoolBookings" },
      { title: "Drivers", href: "/admin/operations/drivers", icon: <Car className="h-4 w-4" />, permission: "driverManagement" },
      { title: "Blackout Dates", href: "/admin/operations/blackout", icon: <CalendarOff className="h-4 w-4" />, permission: "carpoolBlackoutDates" },
    ],
  },
  {
    title: "Finance",
    icon: <Wallet className="h-4 w-4" />,
    items: [
      { title: "Wallets", href: "/admin/finance/wallets", icon: <CreditCard className="h-4 w-4" />, permission: "walletManagement" },
      { title: "Refunds", href: "/admin/finance/refunds", icon: <RefreshCw className="h-4 w-4" />, permission: "walletManagement" },
      { title: "Subscriptions", href: "/admin/finance/subscriptions", icon: <Calendar className="h-4 w-4" />, permission: "subscriptionManagement" },
    ],
  },
  {
    title: "Settings",
    icon: <Settings className="h-4 w-4" />,
    items: [
      { title: "Website", href: "/admin/settings/website", icon: <Palette className="h-4 w-4" />, permission: "websiteSettings" },
      { title: "Marketing", href: "/admin/settings/marketing", icon: <Target className="h-4 w-4" />, permission: "marketingSettings" },
      { title: "Employees", href: "/admin/settings/employees", icon: <UserCog className="h-4 w-4" /> },
      { title: "Complaints", href: "/admin/settings/complaints", icon: <AlertTriangle className="h-4 w-4" />, permission: "complaintManagement" },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const [location, navigate] = useLocation();
  const { user, hasPermission, isSuperAdmin } = useAuth();
  const [openGroups, setOpenGroups] = useState<string[]>(["Content", "Bookings & Forms", "Operations", "Finance", "Settings"]);

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleNavClick = (href: string) => {
    navigate(href);
    onNavigate?.();
  };

  const filterItems = (items: NavItem[]) => {
    return items.filter((item) => {
      if (!item.permission) {
        if (item.href === "/admin/settings/employees") {
          return isSuperAdmin;
        }
        return true;
      }
      return hasPermission(item.permission as any, "view");
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Admin Panel</h2>
        {user && (
          <p className="text-sm text-muted-foreground mt-1">
            {user.phone || user.email}
            <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {user.role}
            </span>
          </p>
        )}
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          <Button
            variant={location === "/admin" || location === "/admin/" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => handleNavClick("/admin")}
            data-testid="nav-dashboard"
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          {navGroups.map((group) => {
            const filteredItems = filterItems(group.items);
            if (filteredItems.length === 0) return null;

            const isOpen = openGroups.includes(group.title);
            const isActive = filteredItems.some((item) => location.startsWith(item.href));

            return (
              <Collapsible
                key={group.title}
                open={isOpen}
                onOpenChange={() => toggleGroup(group.title)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-between",
                      isActive && "bg-accent"
                    )}
                    data-testid={`nav-group-${group.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <span className="flex items-center">
                      {group.icon}
                      <span className="ml-2">{group.title}</span>
                    </span>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 mt-1 space-y-1">
                  {filteredItems.map((item) => (
                    <Button
                      key={item.href}
                      variant={location === item.href ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => handleNavClick(item.href)}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {item.icon}
                      <span className="ml-2">{item.title}</span>
                    </Button>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border bg-background">
          <SidebarContent />
        </div>
      </div>

      <div className="lg:hidden sticky top-0 z-40 flex items-center gap-x-4 bg-background px-4 py-3 shadow-sm border-b border-border">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open sidebar</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarContent onNavigate={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex-1 text-sm font-semibold leading-6 text-foreground">
          {title || "Admin Panel"}
        </div>
      </div>

      <main className="lg:pl-64">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          {title && (
            <div className="hidden lg:block mb-6">
              <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
