import { useAuth, useLogout } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LogOut, User, Package, Calendar } from "lucide-react";
import type { CorporateBooking, RentalBooking } from "@shared/schema";

export default function CustomerDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const logout = useLogout();

  const { data: corporateBookings } = useQuery<CorporateBooking[]>({
    queryKey: ["/api/my/corporate-bookings"],
    enabled: !!user,
  });

  const { data: rentalBookings } = useQuery<RentalBooking[]>({
    queryKey: ["/api/my/rental-bookings"],
    enabled: !!user,
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

        <div className="grid gap-6 md:grid-cols-3 mb-8">
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
                Corporate Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" data-testid="text-corporate-count">{userCorporateBookings.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total bookings</p>
            </CardContent>
          </Card>

          <Card data-testid="card-rental-summary">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Rental Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" data-testid="text-rental-count">{userRentalBookings.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total rentals</p>
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
                          {new Date(booking.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {userCorporateBookings.length === 0 && userRentalBookings.length === 0 && (
            <Card data-testid="card-no-bookings">
              <CardContent className="py-12 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  You don't have any bookings yet. Start by making a booking!
                </p>
                <div className="mt-4 space-x-4">
                  <Button onClick={() => setLocation("/corporate")} data-testid="button-corporate">
                    Corporate Booking
                  </Button>
                  <Button onClick={() => setLocation("/rental")} variant="outline" data-testid="button-rental">
                    Rental Booking
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
