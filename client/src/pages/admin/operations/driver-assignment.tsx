import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Car, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Users,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { format } from "date-fns";
import type { Driver } from "@shared/schema";

interface RentalAssignment {
  id: string;
  referenceId: string;
  customerName: string;
  customerPhone: string;
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  vehicleType: string;
  driverId: string | null;
  driverName: string | null;
  status: string;
  createdAt: string;
}

interface CarpoolAssignment {
  id: string;
  tripReferenceId: string;
  routeName: string;
  fromLocation: string;
  toLocation: string;
  tripDate: string;
  departureTime: string;
  vehicleCapacity: number;
  recommendedVehicleType: string | null;
  passengerCount: number;
  driverId: string | null;
  driverName: string | null;
  status: string;
}

function formatTimeWithAmPm(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function maskPII(value: string, show: boolean): string {
  if (show || !value) return value;
  if (value.includes('@')) {
    const [local, domain] = value.split('@');
    return `${local.slice(0, 2)}***@${domain}`;
  }
  if (value.length > 4) {
    return `${value.slice(0, 2)}${'*'.repeat(value.length - 4)}${value.slice(-2)}`;
  }
  return '****';
}

export default function AdminDriverAssignmentPage() {
  const { hasPermission, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"rental" | "carpool">("rental");
  
  const canViewPII = isSuperAdmin || hasPermission('driverAssignmentViewPII' as any);
  const [showPII, setShowPII] = useState(canViewPII);

  const { data: rentalAssignments = [], isLoading: loadingRental, refetch: refetchRental } = useQuery<RentalAssignment[]>({
    queryKey: ["/api/admin/driver-assignment/rental"],
    enabled: hasPermission('driverAssignment'),
  });

  const { data: carpoolAssignments = [], isLoading: loadingCarpool, refetch: refetchCarpool } = useQuery<CarpoolAssignment[]>({
    queryKey: ["/api/admin/driver-assignment/carpool"],
    enabled: hasPermission('driverAssignment'),
  });

  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ["/api/drivers/active"],
    enabled: hasPermission('driverAssignment'),
  });

  const assignRentalDriverMutation = useMutation({
    mutationFn: async ({ bookingId, driverId }: { bookingId: string; driverId: string }) => {
      return await apiRequest("PUT", `/api/rental-bookings/${bookingId}/assign-driver`, { driverId });
    },
    onSuccess: () => {
      toast({ title: "Driver assigned successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/driver-assignment/rental"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to assign driver", description: error.message, variant: "destructive" });
    },
  });

  const assignCarpoolDriverMutation = useMutation({
    mutationFn: async ({ tripId, driverId }: { tripId: string; driverId: string }) => {
      return await apiRequest("PATCH", `/api/admin/carpool/ai-trips/${tripId}`, { 
        driverId,
        status: 'confirmed'
      });
    },
    onSuccess: () => {
      toast({ title: "Driver assigned successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/driver-assignment/carpool"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to assign driver", description: error.message, variant: "destructive" });
    },
  });

  const pendingRental = rentalAssignments.filter(r => !r.driverId);
  const pendingCarpool = carpoolAssignments.filter(c => c.status === 'pending_assignment');

  if (!hasPermission('driverAssignment')) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">You don't have permission to access driver assignment.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Driver Assignment</h1>
          <p className="text-muted-foreground">Assign drivers to rental bookings and carpool trips</p>
        </div>
        <div className="flex items-center gap-2">
          {canViewPII && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPII(!showPII)}
              className="gap-2"
            >
              {showPII ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPII ? "Hide PII" : "Show PII"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchRental();
              refetchCarpool();
            }}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Rental</p>
                <p className="text-2xl font-bold text-orange-600">{pendingRental.length}</p>
              </div>
              <Car className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Carpool</p>
                <p className="text-2xl font-bold text-blue-600">{pendingCarpool.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "rental" | "carpool")}>
        <TabsList>
          <TabsTrigger value="rental" className="gap-2">
            <Car className="h-4 w-4" />
            Rental Bookings
            {pendingRental.length > 0 && (
              <Badge variant="destructive" className="ml-1">{pendingRental.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="carpool" className="gap-2">
            <Users className="h-4 w-4" />
            Carpool Trips
            {pendingCarpool.length > 0 && (
              <Badge variant="destructive" className="ml-1">{pendingCarpool.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rental" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Rental Bookings Pending Driver Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRental ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : pendingRental.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>All rental bookings have drivers assigned</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      {showPII && <TableHead>Customer</TableHead>}
                      <TableHead>Pickup</TableHead>
                      <TableHead>Dropoff</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Assign Driver</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRental.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <span className="font-mono bg-muted px-2 py-1 rounded text-sm">
                            {booking.referenceId}
                          </span>
                        </TableCell>
                        {showPII && (
                          <TableCell>
                            <div>
                              <p className="font-medium">{booking.customerName}</p>
                              <p className="text-sm text-muted-foreground">{booking.customerPhone}</p>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {format(new Date(booking.pickupDate), 'MMM dd')}
                              {booking.pickupTime && ` at ${formatTimeWithAmPm(booking.pickupTime)}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {booking.pickupLocation}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {format(new Date(booking.dropoffDate), 'MMM dd')}
                              {booking.dropoffTime && ` at ${formatTimeWithAmPm(booking.dropoffTime)}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {booking.dropoffLocation}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{booking.vehicleType || 'Not specified'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={booking.driverId || ""}
                            onValueChange={(value) => {
                              assignRentalDriverMutation.mutate({
                                bookingId: booking.id,
                                driverId: value
                              });
                            }}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select driver" />
                            </SelectTrigger>
                            <SelectContent>
                              {drivers.map((driver) => (
                                <SelectItem key={driver.id} value={driver.id}>
                                  {driver.name} ({driver.phone})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="carpool" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Carpool Trips Pending Driver Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCarpool ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : pendingCarpool.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>All carpool trips have drivers assigned</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trip ID</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Passengers</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Assign Driver</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingCarpool.map((trip) => (
                      <TableRow key={trip.id}>
                        <TableCell>
                          <span className="font-mono bg-muted px-2 py-1 rounded text-sm">
                            {trip.tripReferenceId}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{trip.routeName}</p>
                            <p className="text-xs text-muted-foreground">
                              {trip.fromLocation} → {trip.toLocation}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {format(new Date(trip.tripDate), 'MMM dd, yyyy')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {trip.departureTime ? formatTimeWithAmPm(trip.departureTime) : 'Not set'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{trip.passengerCount}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {trip.recommendedVehicleType || 'sedan'} ({trip.vehicleCapacity} seats)
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={trip.driverId || ""}
                            onValueChange={(value) => {
                              assignCarpoolDriverMutation.mutate({
                                tripId: trip.id,
                                driverId: value
                              });
                            }}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select driver" />
                            </SelectTrigger>
                            <SelectContent>
                              {drivers.map((driver) => (
                                <SelectItem key={driver.id} value={driver.id}>
                                  {driver.name} ({driver.phone})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
