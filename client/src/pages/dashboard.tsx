import { useAuth, useLogout } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LogOut, User, Package, Calendar, Bell, Check, Car } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CorporateBooking, RentalBooking, CarpoolBooking, Notification } from "@shared/schema";
import { useState } from "react";
import { format } from "date-fns";

export default function CustomerDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const logout = useLogout();
  const [markingAsReadIds, setMarkingAsReadIds] = useState<Set<string>>(new Set());

  const { data: corporateBookings } = useQuery<CorporateBooking[]>({
    queryKey: ["/api/my/corporate-bookings"],
    enabled: !!user,
  });

  const { data: rentalBookings } = useQuery<RentalBooking[]>({
    queryKey: ["/api/my/rental-bookings"],
    enabled: !!user,
  });

  const { data: carpoolBookings } = useQuery<CarpoolBooking[]>({
    queryKey: ["/api/my/carpool-bookings"],
    enabled: !!user,
  });

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/my/notifications"],
    enabled: !!user,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      setMarkingAsReadIds((prev) => new Set(prev).add(notificationId));
      await apiRequest("PUT", `/api/my/notifications/${notificationId}/read`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/my/notifications"] });
      setMarkingAsReadIds((prev) => {
        const next = new Set(prev);
        next.delete(variables);
        return next;
      });
      toast({
        title: "Notification marked as read",
        description: "The notification has been marked as read",
      });
    },
    onError: (_error, variables) => {
      setMarkingAsReadIds((prev) => {
        const next = new Set(prev);
        next.delete(variables);
        return next;
      });
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
      setLocation("/");
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  // No need to filter - the API already returns only user's bookings
  const userCorporateBookings = corporateBookings || [];
  const userRentalBookings = rentalBookings || [];
  const userCarpoolBookings = carpoolBookings || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-dashboard-title">
              Customer Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2" data-testid="text-welcome">
              Welcome back, {user.name}!
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline" data-testid="button-logout">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-5 mb-8">
          <Card data-testid="card-profile">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                <p className="font-medium" data-testid="text-profile-name">{user.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                <p className="font-medium" data-testid="text-profile-phone">{user.phone}</p>
              </div>
              {user.email && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                  <p className="font-medium" data-testid="text-profile-email">{user.email}</p>
                </div>
              )}
              {user.temporaryPassword && (
                <Button 
                  onClick={() => setLocation("/change-password")} 
                  variant="outline" 
                  className="w-full mt-4"
                  data-testid="button-change-password"
                >
                  Change Password
                </Button>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-corporate-summary">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="mr-2 h-5 w-5" />
                Corporate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" data-testid="text-corporate-count">{userCorporateBookings.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Bookings</p>
            </CardContent>
          </Card>

          <Card data-testid="card-rental-summary">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Rental
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" data-testid="text-rental-count">{userRentalBookings.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Bookings</p>
            </CardContent>
          </Card>

          <Card data-testid="card-carpool-summary">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Car className="mr-2 h-5 w-5" />
                Carpool
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" data-testid="text-carpool-count">{userCarpoolBookings.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Bookings</p>
            </CardContent>
          </Card>

          <Card data-testid="card-notifications-summary">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" data-testid="text-notifications-count">{notifications.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All read'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {userCorporateBookings.length > 0 && (
            <Card data-testid="card-corporate-bookings">
              <CardHeader>
                <CardTitle>Recent Corporate Bookings</CardTitle>
                <CardDescription>Your corporate service bookings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userCorporateBookings.map((booking) => (
                    <div 
                      key={booking.id} 
                      className="border rounded-lg p-4"
                      data-testid={`card-booking-${booking.id}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{booking.companyName}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{booking.serviceType}</p>
                          <p className="text-xs text-gray-500 mt-1">Ref: {booking.referenceId}</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(booking.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {userRentalBookings.length > 0 && (
            <Card data-testid="card-rental-bookings">
              <CardHeader>
                <CardTitle>Recent Rental Bookings</CardTitle>
                <CardDescription>Your vehicle rental bookings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userRentalBookings.map((booking) => (
                    <div 
                      key={booking.id} 
                      className="border rounded-lg p-4"
                      data-testid={`card-rental-${booking.id}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{booking.vehicleType}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {booking.fromLocation} → {booking.toLocation}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Ref: {booking.referenceId}</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(booking.startDate || booking.pickupDate || booking.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {userCarpoolBookings.length > 0 && (
            <Card data-testid="card-carpool-bookings">
              <CardHeader>
                <CardTitle>Recent Carpool Bookings</CardTitle>
                <CardDescription>Your shared ride bookings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userCarpoolBookings.map((booking) => (
                    <div 
                      key={booking.id} 
                      className="border rounded-lg p-4"
                      data-testid={`card-carpool-${booking.id}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{booking.customerName}</p>
                            <span className={`text-xs px-2 py-1 rounded ${
                              booking.status === 'confirmed' 
                                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                : booking.status === 'pending'
                                ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                                : booking.status === 'cancelled'
                                ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                            }`}>
                              {booking.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Travel Date: {format(new Date(booking.travelDate), 'EEE, MMM d, yyyy')}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Phone: {booking.phone}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Ref: {booking.referenceId}</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(booking.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {userCorporateBookings.length === 0 && userRentalBookings.length === 0 && userCarpoolBookings.length === 0 && (
            <Card data-testid="card-no-bookings">
              <CardContent className="py-12 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  You don't have any bookings yet. Start by making a booking!
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-4">
                  <Button onClick={() => setLocation("/corporate")} data-testid="button-corporate">
                    Corporate Booking
                  </Button>
                  <Button onClick={() => setLocation("/rental")} variant="outline" data-testid="button-rental">
                    Rental Booking
                  </Button>
                  <Button onClick={() => setLocation("/carpool")} variant="outline" data-testid="button-carpool">
                    Carpool Booking
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card data-testid="card-notifications-inbox">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>All your booking notifications and updates</CardDescription>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <p className="text-center py-8 text-gray-600 dark:text-gray-400" data-testid="text-no-notifications">
                  No notifications yet
                </p>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`border rounded-lg p-4 ${
                        notification.isRead
                          ? 'bg-gray-50 dark:bg-gray-800'
                          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      }`}
                      data-testid={`notification-${notification.id}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900 dark:text-white" data-testid={`notification-title-${notification.id}`}>
                              {notification.title}
                            </h4>
                            {!notification.isRead && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                                New
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1" data-testid={`notification-message-${notification.id}`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2" data-testid={`notification-time-${notification.id}`}>
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markAsReadMutation.mutate(notification.id)}
                            disabled={markingAsReadIds.has(notification.id)}
                            data-testid={`button-mark-read-${notification.id}`}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            {markingAsReadIds.has(notification.id) ? "Marking..." : "Mark as read"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
