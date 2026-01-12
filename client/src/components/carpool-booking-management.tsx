import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Users, Calendar, MapPin, Clock, Car, User, AlertCircle, Trash2, Bus, Package, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { useAuth } from "@/hooks/useAuth";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TripBookingForAdmin {
  id: string;
  vehicleTripId: string | null;
  subscriptionId: string | null;
  userId: string | null;
  status: string;
  pickupSequence: number | null;
  createdAt: string;
  bookingType: 'subscription' | 'individual';
  tripReferenceId: string | null;
  tripDate: string | null;
  tripStatus: string | null;
  customerName: string | null;
  customerPhone: string | null;
  routeName: string | null;
  fromLocation: string | null;
  toLocation: string | null;
  departureTime: string | null;
  boardingPointName: string | null;
  dropOffPointName: string | null;
  driverName: string | null;
  driverPhone: string | null;
  vehicleType: string | null;
  referenceId: string | null;
}

export default function CarpoolBookingManagement({ showDriverAssignment }: { showDriverAssignment: boolean }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedTripStatus, setSelectedTripStatus] = useState<string>("all");
  const [selectedBookingType, setSelectedBookingType] = useState<string>("all");
  const [deleteBookingId, setDeleteBookingId] = useState<string | null>(null);

  const isSuperadmin = user?.role === 'superadmin';

  // Fetch all trip bookings with enriched data
  const { data: bookings = [], isLoading: loadingBookings } = useQuery<TripBookingForAdmin[]>({
    queryKey: ['/api/admin/trip-bookings'],
  });

  // Update booking status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      return await apiRequest('PUT', `/api/admin/trip-bookings/${bookingId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trip-bookings'] });
      toast({ title: "Success", description: "Booking status updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    },
  });

  const [expandedTrips, setExpandedTrips] = useState<Record<string, boolean>>({});

  const toggleTrip = (tripId: string) => {
    setExpandedTrips(prev => ({ ...prev, [tripId]: !prev[tripId] }));
  };

  // Filter bookings by status, trip status, and booking type
  const filteredBookings = bookings.filter(b => {
    const matchesStatus = selectedStatus === "all" || b.status === selectedStatus;
    const matchesTripStatus = selectedTripStatus === "all" || b.tripStatus === selectedTripStatus || (selectedTripStatus === "not_assigned" && !b.tripStatus);
    const matchesBookingType = selectedBookingType === "all" || b.bookingType === selectedBookingType;
    return matchesStatus && matchesTripStatus && matchesBookingType;
  });

  // Group bookings by trip
  const groupedTrips = useMemo(() => {
    const groups: Record<string, TripBookingForAdmin[]> = {};
    const noTrip: TripBookingForAdmin[] = [];

    filteredBookings.forEach(booking => {
      const tripId = booking.tripReferenceId || booking.referenceId;
      if (tripId) {
        if (!groups[tripId]) groups[tripId] = [];
        groups[tripId].push(booking);
      } else {
        noTrip.push(booking);
      }
    });

    return { groups, noTrip };
  }, [filteredBookings]);

  // Get status color for booking status
  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'expected':
        return 'bg-blue-100 text-blue-800';
      case 'picked_up':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'no_show':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status color for trip status
  const getTripStatusColor = (status: string | null) => {
    switch (status) {
      case 'pending_assignment':
        return 'bg-orange-100 text-orange-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get vehicle type icon and display
  const getVehicleInfo = (vehicleType: string | null) => {
    switch (vehicleType) {
      case 'sedan':
        return { icon: <Car className="h-4 w-4" />, label: 'Sedan (4)' };
      case '7_seater':
        return { icon: <Car className="h-4 w-4" />, label: '7-Seater' };
      case '10_seater':
        return { icon: <Bus className="h-4 w-4" />, label: '10-Seater' };
      case '14_seater':
        return { icon: <Bus className="h-4 w-4" />, label: '14-Seater' };
      case '32_seater':
        return { icon: <Bus className="h-4 w-4" />, label: 'Bus (32)' };
      default:
        return { icon: <Car className="h-4 w-4" />, label: 'Unknown' };
    }
  };

  // Stats
  const stats = {
    total: bookings.length,
    monthly: bookings.filter(b => b.bookingType === 'subscription').length,
    individual: bookings.filter(b => b.bookingType === 'individual').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    pendingAssignment: bookings.filter(b => b.tripStatus === 'pending_assignment').length,
    notInTrip: bookings.filter(b => !b.tripStatus && b.bookingType === 'individual').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Bookings</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.monthly}</div>
            <div className="text-sm text-gray-500">Monthly Subs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.individual}</div>
            <div className="text-sm text-gray-500">Individual</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.pendingAssignment}</div>
            <div className="text-sm text-gray-500">Pending Driver</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-500">{stats.notInTrip}</div>
            <div className="text-sm text-gray-500">Not in Trip</div>
          </CardContent>
        </Card>
      </div>

      {/* Alert for trips pending driver assignment */}
      {stats.pendingAssignment > 0 && (
        <Alert className="border-orange-500 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>{stats.pendingAssignment}</strong> booking(s) are in trips pending driver assignment. 
            <a href="/admin/operations/driver-assignment" className="ml-2 underline font-medium">
              Go to Driver Assignment →
            </a>
          </AlertDescription>
        </Alert>
      )}

      {/* Bookings List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2" data-testid="heading-carpool-bookings">
              <Users className="h-5 w-5" />
              Bookings ({filteredBookings.length})
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={selectedBookingType} onValueChange={setSelectedBookingType}>
                <SelectTrigger className="w-[140px]" data-testid="select-booking-type">
                  <SelectValue placeholder="Booking Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="subscription">Monthly</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[150px]" data-testid="select-booking-status">
                  <SelectValue placeholder="Booking Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="expected">Expected</SelectItem>
                  <SelectItem value="picked_up">Picked Up</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedTripStatus} onValueChange={setSelectedTripStatus}>
                <SelectTrigger className="w-[180px]" data-testid="select-trip-status">
                  <SelectValue placeholder="Trip Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trip Statuses</SelectItem>
                  <SelectItem value="not_assigned">Not in Trip</SelectItem>
                  <SelectItem value="pending_assignment">Pending Assignment</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingBookings ? (
            <div className="text-center py-8">Loading bookings...</div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No bookings found. Bookings are created when the AI Trip Generator groups subscribers into trips.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30px]"></TableHead>
                    <TableHead>Trip</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Date / Time</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Passengers</TableHead>
                    <TableHead>Trip Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(groupedTrips.groups).map(([tripId, tripBookings]) => {
                    const firstBooking = tripBookings[0];
                    const vehicleInfo = getVehicleInfo(firstBooking.vehicleType);
                    const isExpanded = expandedTrips[tripId];

                    return (
                      <Collapsible
                        key={tripId}
                        open={isExpanded}
                        onOpenChange={() => toggleTrip(tripId)}
                        asChild
                      >
                        <>
                          <TableRow 
                            className={`cursor-pointer hover:bg-gray-50 ${firstBooking.tripStatus === 'pending_assignment' ? 'bg-orange-50' : ''}`}
                            onClick={(e) => {
                              // Don't toggle if clicking on a button or select
                              if ((e.target as HTMLElement).closest('button, [role="combobox"]')) return;
                              toggleTrip(tripId);
                            }}
                          >
                            <TableCell>
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </TableCell>
                            <TableCell>
                              <div className="font-mono text-sm font-medium">{tripId}</div>
                              <Badge variant="outline" className="mt-1 text-xs">
                                {firstBooking.bookingType === 'subscription' ? 'Monthly' : 'Individual'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{firstBooking.routeName || 'Unknown'}</div>
                                <div className="text-xs text-gray-500">
                                  {firstBooking.fromLocation} → {firstBooking.toLocation}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-start gap-1">
                                <Calendar className="h-3 w-3 mt-1" />
                                <div>
                                  <div className="text-sm font-medium">{firstBooking.tripDate || '-'}</div>
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Clock className="h-3 w-3" />
                                    {firstBooking.departureTime || '-'}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {vehicleInfo.icon}
                                <span className="text-sm">{vehicleInfo.label}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {firstBooking.driverName ? (
                                <div className="text-sm">
                                  <div className="font-medium">{firstBooking.driverName}</div>
                                  <div className="text-gray-500 text-xs">
                                    {firstBooking.driverPhone ? formatPhoneNumber(firstBooking.driverPhone) : '-'}
                                  </div>
                                </div>
                              ) : (
                                <Badge variant="outline" className="text-orange-600 border-orange-300">
                                  Not Assigned
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{tripBookings.length} Users</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getTripStatusColor(firstBooking.tripStatus)} variant="outline">
                                {firstBooking.tripStatus?.replace('_', ' ') || 'Unknown'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                          <CollapsibleContent asChild>
                            <TableRow className="bg-gray-50/50">
                              <TableCell colSpan={8} className="p-0">
                                <div className="p-4 space-y-4">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="hover:bg-transparent">
                                        <TableHead className="h-8 text-xs uppercase">Customer</TableHead>
                                        <TableHead className="h-8 text-xs uppercase">Pickup → Drop</TableHead>
                                        <TableHead className="h-8 text-xs uppercase">Booking Status</TableHead>
                                        <TableHead className="h-8 text-xs uppercase">Actions</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {tripBookings.map((booking) => (
                                        <TableRow key={booking.id} className="hover:bg-transparent">
                                          <TableCell>
                                            <div>
                                              <div className="font-medium flex items-center gap-1 text-sm">
                                                <User className="h-3 w-3" />
                                                {booking.customerName || 'Unknown'}
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                {booking.customerPhone ? formatPhoneNumber(booking.customerPhone) : '-'}
                                              </div>
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <div className="text-xs">
                                              <div className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3 text-green-600" />
                                                <span>{booking.boardingPointName || 'Unknown'}</span>
                                              </div>
                                              <div className="flex items-center gap-1 mt-1">
                                                <MapPin className="h-3 w-3 text-red-600" />
                                                <span>{booking.dropOffPointName || 'Unknown'}</span>
                                              </div>
                                              {booking.pickupSequence && (
                                                <div className="text-[10px] text-gray-400 mt-0.5">
                                                  Pickup #{booking.pickupSequence}
                                                </div>
                                              )}
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <Badge className={`text-[10px] h-5 ${getBookingStatusColor(booking.status)}`}>
                                              {booking.status}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>
                                            <Select
                                              value={booking.status}
                                              onValueChange={(status) => {
                                                updateStatusMutation.mutate({ bookingId: booking.id, status });
                                              }}
                                              disabled={updateStatusMutation.isPending}
                                            >
                                              <SelectTrigger className="h-8 w-[110px] text-xs">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="expected">Expected</SelectItem>
                                                <SelectItem value="picked_up">Picked Up</SelectItem>
                                                <SelectItem value="completed">Completed</SelectItem>
                                                <SelectItem value="no_show">No Show</SelectItem>
                                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    );
                  })}
                  {groupedTrips.noTrip.map((booking) => {
                    const vehicleInfo = getVehicleInfo(booking.vehicleType);
                    return (
                      <TableRow key={booking.id} className="bg-gray-50/20">
                        <TableCell></TableCell>
                        <TableCell>
                          <div className="font-mono text-sm font-medium">{booking.referenceId || '-'}</div>
                          <Badge variant="outline" className="mt-1 text-xs text-gray-500 border-gray-300">
                            Not in trip
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{booking.routeName || 'Unknown'}</div>
                            <div className="text-xs text-gray-500">
                              {booking.fromLocation} → {booking.toLocation}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start gap-1">
                            <Calendar className="h-3 w-3 mt-1" />
                            <div>
                              <div className="text-sm font-medium">{booking.tripDate || '-'}</div>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                {booking.departureTime || '-'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {vehicleInfo.icon}
                            <span className="text-sm">{vehicleInfo.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                           <Badge variant="outline" className="text-gray-400 border-gray-200">
                              N/A
                            </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium flex items-center gap-1 text-sm">
                            <User className="h-3 w-3" />
                            {booking.customerName || 'Unknown'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getBookingStatusColor(booking.status)}>
                            {booking.status}
                          </Badge>
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
