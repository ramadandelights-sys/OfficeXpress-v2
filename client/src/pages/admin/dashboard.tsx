import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import {
  Building,
  Car,
  Users,
  MessageSquare,
  Wallet,
  RefreshCw,
  AlertTriangle,
  Calendar,
  TrendingUp,
  FileText
} from "lucide-react";
import type { 
  CorporateBooking, 
  RentalBooking, 
  VendorRegistration, 
  ContactMessage,
  BlogPost
} from "@shared/schema";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: "up" | "down" | "neutral";
}

function StatCard({ title, value, icon, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { hasPermission } = useAuth();

  const { data: corporateBookings = [] } = useQuery<CorporateBooking[]>({
    queryKey: ["/api/admin/corporate-bookings"],
    enabled: hasPermission('corporateBookings', 'view'),
  });

  const { data: rentalBookings = [] } = useQuery<RentalBooking[]>({
    queryKey: ["/api/admin/rental-bookings"],
    enabled: hasPermission('rentalBookings', 'view'),
  });

  const { data: vendorRegistrations = [] } = useQuery<VendorRegistration[]>({
    queryKey: ["/api/admin/vendor-registrations"],
    enabled: hasPermission('vendorRegistrations', 'view'),
  });

  const { data: contactMessages = [] } = useQuery<ContactMessage[]>({
    queryKey: ["/api/admin/contact-messages"],
    enabled: hasPermission('contactMessages', 'view'),
  });

  const { data: blogPosts = [] } = useQuery<BlogPost[]>({
    queryKey: ["/api/admin/blog-posts"],
    enabled: hasPermission('blogPosts', 'view'),
  });

  const { data: walletStats } = useQuery<{ totalUsers: number; totalBalance: number }>({
    queryKey: ["/api/admin/wallet-stats"],
    enabled: hasPermission('walletManagement', 'view'),
  });

  const { data: refundStats } = useQuery<{ pending: number }>({
    queryKey: ["/api/admin/refund-stats"],
    enabled: hasPermission('walletManagement', 'view'),
  });

  const { data: complaintStats } = useQuery<{ total: number; pending: number }>({
    queryKey: ["/api/admin/complaint-stats"],
    enabled: hasPermission('complaintManagement', 'view'),
  });

  const publishedBlogs = blogPosts.filter(p => p.published).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {hasPermission('corporateBookings', 'view') && (
          <StatCard
            title="Corporate Bookings"
            value={corporateBookings.length}
            icon={<Building className="h-4 w-4" />}
            description="Total submissions"
          />
        )}
        {hasPermission('rentalBookings', 'view') && (
          <StatCard
            title="Rental Bookings"
            value={rentalBookings.length}
            icon={<Car className="h-4 w-4" />}
            description="Total submissions"
          />
        )}
        {hasPermission('vendorRegistrations', 'view') && (
          <StatCard
            title="Vendor Registrations"
            value={vendorRegistrations.length}
            icon={<Users className="h-4 w-4" />}
            description="Total registrations"
          />
        )}
        {hasPermission('contactMessages', 'view') && (
          <StatCard
            title="Contact Messages"
            value={contactMessages.length}
            icon={<MessageSquare className="h-4 w-4" />}
            description="Total messages"
          />
        )}
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {hasPermission('blogPosts', 'view') && (
          <StatCard
            title="Blog Posts"
            value={`${publishedBlogs}/${blogPosts.length}`}
            icon={<FileText className="h-4 w-4" />}
            description="Published / Total"
          />
        )}
        {hasPermission('walletManagement', 'view') && walletStats && (
          <StatCard
            title="Active Wallets"
            value={walletStats.totalUsers}
            icon={<Wallet className="h-4 w-4" />}
            description={`Total balance: ৳${walletStats.totalBalance?.toLocaleString() || 0}`}
          />
        )}
        {hasPermission('walletManagement', 'view') && refundStats && (
          <StatCard
            title="Pending Refunds"
            value={refundStats.pending || 0}
            icon={<RefreshCw className="h-4 w-4" />}
            description="Awaiting processing"
          />
        )}
        {hasPermission('complaintManagement', 'view') && complaintStats && (
          <StatCard
            title="Open Complaints"
            value={complaintStats.pending || 0}
            icon={<AlertTriangle className="h-4 w-4" />}
            description={`${complaintStats.total || 0} total complaints`}
          />
        )}
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
              {hasPermission('blogPosts', 'edit') && (
                <a href="/admin/content/blog" className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm">Create Blog Post</span>
                </a>
              )}
              {hasPermission('corporateBookings', 'view') && (
                <a href="/admin/bookings/corporate" className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors">
                  <Building className="h-4 w-4 text-primary" />
                  <span className="text-sm">View Corporate Bookings</span>
                </a>
              )}
              {hasPermission('carpoolBookings', 'view') && (
                <a href="/admin/operations/bookings" className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm">Manage Carpool Bookings</span>
                </a>
              )}
              {hasPermission('walletManagement', 'view') && (
                <a href="/admin/finance/wallets" className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-sm">Manage Wallets</span>
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {corporateBookings.slice(0, 3).map((booking) => (
                <div key={booking.id} className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{booking.companyName}</p>
                    <p className="text-muted-foreground text-xs">Corporate booking</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(booking.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {rentalBookings.slice(0, 2).map((booking) => (
                <div key={booking.id} className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <Car className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{booking.customerName}</p>
                    <p className="text-muted-foreground text-xs">Rental booking</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(booking.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {corporateBookings.length === 0 && rentalBookings.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
