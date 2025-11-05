import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Users, Calendar, MapPin, Clock, User, Phone, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import type { CarpoolBooking, Driver, CarpoolRoute, CarpoolTimeSlot } from "@shared/schema";

export default function CarpoolBookingManagement({ showDriverAssignment }: { showDriverAssignment: boolean }) {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Fetch all bookings
  const { data: bookings = [], isLoading: loadingBookings, refetch } = useQuery<CarpoolBooking[]>({
    queryKey: ['/api/admin/carpool/bookings'],
  });

  // Fetch all routes
  const { data: routes = [] } = useQuery<CarpoolRoute[]>({
    queryKey: ['/api/admin/carpool/routes'],
  });

  // Fetch active drivers
  const { data: activeDrivers = [] } = useQuery<Driver[]>({
    queryKey: ['/api/drivers/active'],
    enabled: showDriverAssignment,
  });

  // Assign driver mutation
  const assignDriverMutation = useMutation({
    mutationFn: async ({ bookingId, driverId }: { bookingId: string; driverId: string }) => {
      return await apiRequest('PUT', `/api/admin/carpool/bookings/${bookingId}/assign-driver`, { driverId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/carpool/bookings'] });
      toast({ title: "Success", description: "Driver assigned successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to assign driver", variant: "destructive" });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      return await apiRequest('PUT', `/api/admin/carpool/bookings/${bookingId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/carpool/bookings'] });
      toast({ title: "Success", description: "Status updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    },
  });

  // Group bookings by route, date, and time slot to identify routes with 3+ bookings
  const groupedBookings = bookings.reduce((acc, booking) => {
    const key = `${booking.routeId}-${booking.timeSlotId}-${booking.travelDate}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(booking);
    return acc;
  }, {} as Record<string, CarpoolBooking[]>);

  // Find routes with 3+ pending bookings
  const routesNeedingDrivers = Object.entries(groupedBookings)
    .filter(([_, bookings]) => {
      const pendingBookings = bookings.filter(b => b.status === 'pending');
      return pendingBookings.length >= 3;
    })
    .map(([key, bookings]) => ({
      key,
      bookings,
      count: bookings.filter(b => b.status === 'pending').length,
    }));

  // Filter bookings by status
  const filteredBookings = selectedStatus === "all" 
    ? bookings 
    : bookings.filter(b => b.status === selectedStatus);

  // Get route name helper
  const getRouteName = (routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    return route ? route.name : 'Unknown Route';
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'insufficient_bookings':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert for routes needing drivers */}
      {routesNeedingDrivers.length > 0 && showDriverAssignment && (
        <Alert className="border-yellow-500 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>{routesNeedingDrivers.length}</strong> route(s) have 3+ pending bookings and need driver assignment:
            <ul className="mt-2 space-y-1">
              {routesNeedingDrivers.map(({ key, bookings, count }) => {
                const booking = bookings[0];
                return (
                  <li key={key} className="text-sm">
                    • <strong>{getRouteName(booking.routeId)}</strong> on {booking.travelDate} - {count} bookings
                  </li>
                );
              })}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Bookings List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2" data-testid="heading-carpool-bookings">
              <Users className="h-5 w-5" />
              Carpool Bookings ({filteredBookings.length})
            </CardTitle>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]" data-testid="select-booking-status">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bookings</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="insufficient_bookings">Insufficient Bookings</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loadingBookings ? (
            <div className="text-center py-8">Loading bookings...</div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No bookings found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Travel Date</TableHead>
                    <TableHead>Boarding → Drop-off</TableHead>
                    <TableHead>Status</TableHead>
                    {showDriverAssignment && <TableHead>Driver</TableHead>}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => {
                    const isHighPriority = groupedBookings[`${booking.routeId}-${booking.timeSlotId}-${booking.travelDate}`]?.filter(b => b.status === 'pending').length >= 3;
                    
                    return (
                      <TableRow 
                        key={booking.id} 
                        className={isHighPriority && booking.status === 'pending' ? 'bg-yellow-50' : ''}
                        data-testid={`row-booking-${booking.id}`}
                      >
                        <TableCell className="font-mono text-sm">{booking.referenceId}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{booking.customerName}</div>
                            <div className="text-sm text-gray-500">{formatPhoneNumber(booking.phone)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{getRouteName(booking.routeId)}</div>
                            {isHighPriority && booking.status === 'pending' && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                3+ bookings
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{booking.travelDate}</TableCell>
                        <TableCell className="text-sm">
                          <div>Board: Point {booking.boardingPointId}</div>
                          <div>Drop: Point {booking.dropOffPointId}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(booking.status || 'pending')}>
                            {booking.status || 'pending'}
                          </Badge>
                        </TableCell>
                        {showDriverAssignment && (
                          <TableCell>
                            {booking.driverId ? (
                              <div className="text-sm">
                                <div className="font-medium">Assigned</div>
                                <div className="text-gray-500">{booking.driverId}</div>
                              </div>
                            ) : booking.status === 'pending' ? (
                              <Select
                                onValueChange={(driverId) => {
                                  assignDriverMutation.mutate({ bookingId: booking.id, driverId });
                                }}
                                disabled={assignDriverMutation.isPending}
                              >
                                <SelectTrigger className="w-[150px]" data-testid={`select-driver-${booking.id}`}>
                                  <SelectValue placeholder="Assign driver" />
                                </SelectTrigger>
                                <SelectContent>
                                  {activeDrivers.map((driver) => (
                                    <SelectItem key={driver.id} value={driver.id}>
                                      {driver.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-sm text-gray-500">-</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <Select
                            value={booking.status || 'pending'}
                            onValueChange={(status) => {
                              updateStatusMutation.mutate({ bookingId: booking.id, status });
                            }}
                            disabled={updateStatusMutation.isPending}
                          >
                            <SelectTrigger className="w-[150px]" data-testid={`select-status-${booking.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                              <SelectItem value="insufficient_bookings">Insufficient</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
