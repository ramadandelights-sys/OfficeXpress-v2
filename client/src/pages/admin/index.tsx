import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/layout/admin-sidebar";
import AdminDashboard from "./dashboard";
import AdminBlogPage from "./content/blog";
import AdminPortfolioPage from "./content/portfolio";
import AdminLegalPage from "./content/legal";
import AdminCorporatePage from "./bookings/corporate";
import AdminVendorPage from "./bookings/vendor";
import AdminContactPage from "./bookings/contact";
import AdminRoutesPage from "./operations/routes";
import AdminCarpoolBookingsPage from "./operations/bookings";
import AdminDriversPage from "./operations/drivers";
import AdminBlackoutPage from "./operations/blackout";
import AdminRentalPage from "./operations/rental";
import AdminAITripsPage from "./operations/ai-trips";
import AdminDriverAssignmentPage from "./operations/driver-assignment";
import AdminWalletsPage from "./finance/wallets";
import AdminRefundsPage from "./finance/refunds";
import AdminSubscriptionsPage from "./finance/subscriptions";
import AdminWebsitePage from "./settings/website";
import AdminMarketingPage from "./settings/marketing";
import AdminEmployeesPage from "./settings/employees";
import AdminComplaintsPage from "./settings/complaints";

export default function AdminRouter() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== 'employee' && user.role !== 'superadmin'))) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== 'employee' && user.role !== 'superadmin')) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold">Redirecting to login...</div>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/admin" component={() => <AdminLayout title="Dashboard"><AdminDashboard /></AdminLayout>} />
      <Route path="/admin/content/blog" component={() => <AdminLayout title="Blog Posts"><AdminBlogPage /></AdminLayout>} />
      <Route path="/admin/content/portfolio" component={() => <AdminLayout title="Portfolio Clients"><AdminPortfolioPage /></AdminLayout>} />
      <Route path="/admin/content/legal" component={() => <AdminLayout title="Legal Pages"><AdminLegalPage /></AdminLayout>} />
      <Route path="/admin/bookings/corporate" component={() => <AdminLayout title="Corporate Bookings"><AdminCorporatePage /></AdminLayout>} />
      <Route path="/admin/bookings/vendor" component={() => <AdminLayout title="Vendor Registrations"><AdminVendorPage /></AdminLayout>} />
      <Route path="/admin/bookings/contact" component={() => <AdminLayout title="Contact Messages"><AdminContactPage /></AdminLayout>} />
      <Route path="/admin/operations/routes" component={() => <AdminLayout title="Carpool Routes"><AdminRoutesPage /></AdminLayout>} />
      <Route path="/admin/operations/bookings" component={() => <AdminLayout title="Carpool Bookings"><AdminCarpoolBookingsPage /></AdminLayout>} />
      <Route path="/admin/operations/drivers" component={() => <AdminLayout title="Driver Management"><AdminDriversPage /></AdminLayout>} />
      <Route path="/admin/operations/blackout" component={() => <AdminLayout title="Blackout Dates"><AdminBlackoutPage /></AdminLayout>} />
      <Route path="/admin/operations/rental" component={() => <AdminLayout title="Rental Bookings"><AdminRentalPage /></AdminLayout>} />
      <Route path="/admin/operations/driver-assignment" component={() => <AdminLayout title="Driver Assignment"><AdminDriverAssignmentPage /></AdminLayout>} />
      <Route path="/admin/operations/ai-trips" component={() => <AdminLayout title="AI Trip Planner"><AdminAITripsPage /></AdminLayout>} />
      <Route path="/admin/finance/wallets" component={() => <AdminLayout title="Wallet Management"><AdminWalletsPage /></AdminLayout>} />
      <Route path="/admin/finance/refunds" component={() => <AdminLayout title="Refund Management"><AdminRefundsPage /></AdminLayout>} />
      <Route path="/admin/finance/subscriptions" component={() => <AdminLayout title="Subscription Management"><AdminSubscriptionsPage /></AdminLayout>} />
      <Route path="/admin/settings/website" component={() => <AdminLayout title="Website Settings"><AdminWebsitePage /></AdminLayout>} />
      <Route path="/admin/settings/marketing" component={() => <AdminLayout title="Marketing Settings"><AdminMarketingPage /></AdminLayout>} />
      <Route path="/admin/settings/employees" component={() => <AdminLayout title="Employee Management"><AdminEmployeesPage /></AdminLayout>} />
      <Route path="/admin/settings/complaints" component={() => <AdminLayout title="Complaint Management"><AdminComplaintsPage /></AdminLayout>} />
      <Route component={() => <AdminLayout title="Dashboard"><AdminDashboard /></AdminLayout>} />
    </Switch>
  );
}
