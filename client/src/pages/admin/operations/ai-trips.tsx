import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Brain, 
  Calendar, 
  Car, 
  ChevronDown, 
  ChevronRight, 
  RefreshCw, 
  User, 
  MapPin, 
  Clock, 
  AlertTriangle,
  Merge,
  XCircle,
  CheckCircle,
  Users
} from "lucide-react";
import { format, addDays } from "date-fns";
import type { Driver } from "@shared/schema";

interface TripPassenger {
  id: string;
  userName: string;
  userPhone: string;
  boardingPointName: string;
  dropOffPointName: string;
  pickupSequence: number | null;
  status: string;
}

interface AITrip {
  id: string;
  tripReferenceId: string;
  routeName: string;
  fromLocation: string;
  toLocation: string;
  departureTimeSlot: string;
  tripDate: string;
  vehicleCapacity: number;
  recommendedVehicleType: string | null;
  status: string;
  driverId: string | null;
  driverName: string | null;
  driverPhone: string | null;
  passengerCount: number;
  passengers: TripPassenger[];
  generatedBy: string | null;
  aiConfidenceScore: string | null;
  aiRationale: string | null;
}

export default function AdminAITripsPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 1));
  const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set());
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergingTrip, setMergingTrip] = useState<AITrip | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>("");

  const dateString = format(selectedDate, "yyyy-MM-dd");

  const { data: trips = [], isLoading, refetch } = useQuery<AITrip[]>({
    queryKey: ["/api/admin/carpool/ai-trips", dateString],
    queryFn: async () => {
      const res = await fetch(`/api/admin/carpool/ai-trips?date=${dateString}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch trips');
      return res.json();
    },
    enabled: hasPermission('driverAssignment'),
  });

  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ["/api/drivers/active"],
    enabled: hasPermission('driverAssignment'),
  });

  const generateTripsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/carpool/ai-trips/generate", { date: dateString });
    },
    onSuccess: (data: any) => {
      toast({ title: data.message || "Trips generated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/carpool/ai-trips", dateString] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to generate trips", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateTripMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { driverId?: string; status?: string } }) => {
      return await apiRequest("PATCH", `/api/admin/carpool/ai-trips/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Trip updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/carpool/ai-trips", dateString] });
    },
    onError: () => {
      toast({ title: "Failed to update trip", variant: "destructive" });
    },
  });

  const cancelTripMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/admin/carpool/ai-trips/${id}/cancel`, { reason: "Cancelled by admin" });
    },
    onSuccess: () => {
      toast({ title: "Trip cancelled successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/carpool/ai-trips", dateString] });
    },
    onError: () => {
      toast({ title: "Failed to cancel trip", variant: "destructive" });
    },
  });

  const mergeTripsMutation = useMutation({
    mutationFn: async ({ targetId, sourceId }: { targetId: string; sourceId: string }) => {
      return await apiRequest("POST", `/api/admin/carpool/ai-trips/${targetId}/merge`, { sourceTripId: sourceId });
    },
    onSuccess: () => {
      toast({ title: "Trips merged successfully" });
      setShowMergeDialog(false);
      setMergingTrip(null);
      setMergeTargetId("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/carpool/ai-trips", dateString] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to merge trips", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const toggleTripExpanded = (tripId: string) => {
    setExpandedTrips(prev => {
      const next = new Set(prev);
      if (next.has(tripId)) {
        next.delete(tripId);
      } else {
        next.add(tripId);
      }
      return next;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'low_capacity_warning':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300" data-testid={`badge-status-${status}`}><AlertTriangle className="h-3 w-3 mr-1" />Low Capacity</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300" data-testid={`badge-status-${status}`}><CheckCircle className="h-3 w-3 mr-1" />Confirmed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300" data-testid={`badge-status-${status}`}><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      case 'pending_assignment':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300" data-testid={`badge-status-${status}`}><Clock className="h-3 w-3 mr-1" />Pending Assignment</Badge>;
      default:
        return <Badge variant="outline" data-testid={`badge-status-${status}`}>{status}</Badge>;
    }
  };

  const getVehicleIcon = (vehicleType: string | null) => {
    return <Car className="h-4 w-4" />;
  };

  const lowCapacityTrips = trips.filter(t => t.status === 'low_capacity_warning');
  const pendingTrips = trips.filter(t => t.status === 'pending_assignment');
  const confirmedTrips = trips.filter(t => t.status === 'confirmed');
  const otherTrips = trips.filter(t => !['low_capacity_warning', 'pending_assignment', 'confirmed', 'cancelled'].includes(t.status));

  if (!hasPermission('driverAssignment')) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>AI Trip Planner</CardTitle>
          </div>
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal" data-testid="button-select-date">
                  <Calendar className="mr-2 h-4 w-4" />
                  {format(selectedDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button 
              onClick={() => generateTripsMutation.mutate()} 
              disabled={generateTripsMutation.isPending}
              data-testid="button-generate-trips"
            >
              {generateTripsMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Generate Trips
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Trips</p>
                    <p className="text-2xl font-bold" data-testid="stat-total-trips">{trips.length}</p>
                  </div>
                  <Car className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Assignment</p>
                    <p className="text-2xl font-bold text-blue-600" data-testid="stat-pending-trips">{pendingTrips.length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Low Capacity</p>
                    <p className="text-2xl font-bold text-yellow-600" data-testid="stat-low-capacity-trips">{lowCapacityTrips.length}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Confirmed</p>
                    <p className="text-2xl font-bold text-green-600" data-testid="stat-confirmed-trips">{confirmedTrips.length}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No trips for {format(selectedDate, "MMMM d, yyyy")}</h3>
              <p className="text-muted-foreground mb-4">Click "Generate Trips" to create AI-optimized trips for this date.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {trips.map((trip) => (
                <Card key={trip.id} className={trip.status === 'low_capacity_warning' ? 'border-yellow-300 bg-yellow-50/50 dark:bg-yellow-900/10' : ''} data-testid={`card-trip-${trip.id}`}>
                  <Collapsible open={expandedTrips.has(trip.id)} onOpenChange={() => toggleTripExpanded(trip.id)}>
                    <CollapsibleTrigger asChild>
                      <div className="p-4 cursor-pointer hover:bg-muted/50 flex items-center justify-between" data-testid={`trigger-trip-${trip.id}`}>
                        <div className="flex items-center gap-4">
                          <Button variant="ghost" size="sm" className="p-0 h-auto">
                            {expandedTrips.has(trip.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded" data-testid={`text-trip-reference-${trip.id}`}>{trip.tripReferenceId}</span>
                              {getStatusBadge(trip.status)}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span data-testid={`text-route-${trip.id}`}>{trip.routeName}</span>
                              <span>•</span>
                              <Clock className="h-3 w-3" />
                              <span data-testid={`text-time-${trip.id}`}>{trip.departureTimeSlot || 'Not set'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span data-testid={`text-passenger-count-${trip.id}`}>{trip.passengerCount} passengers</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            {getVehicleIcon(trip.recommendedVehicleType)}
                            <span data-testid={`text-vehicle-${trip.id}`}>{trip.recommendedVehicleType || 'Not set'} ({trip.vehicleCapacity} seats)</span>
                          </div>
                          {trip.driverName ? (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                              <User className="h-4 w-4" />
                              <span data-testid={`text-driver-${trip.id}`}>{trip.driverName}</span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-orange-600 border-orange-300" data-testid={`badge-no-driver-${trip.id}`}>No Driver</Badge>
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 border-t">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div>
                            <h4 className="font-medium mb-2 flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Passenger Manifest
                            </h4>
                            {trip.passengers.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No passengers assigned</p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>#</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Pickup</TableHead>
                                    <TableHead>Drop-off</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {trip.passengers.map((passenger, idx) => (
                                    <TableRow key={passenger.id} data-testid={`row-passenger-${passenger.id}`}>
                                      <TableCell>{passenger.pickupSequence || idx + 1}</TableCell>
                                      <TableCell data-testid={`text-passenger-name-${passenger.id}`}>{passenger.userName}</TableCell>
                                      <TableCell data-testid={`text-passenger-phone-${passenger.id}`}>{passenger.userPhone}</TableCell>
                                      <TableCell data-testid={`text-passenger-pickup-${passenger.id}`}>{passenger.boardingPointName}</TableCell>
                                      <TableCell data-testid={`text-passenger-dropoff-${passenger.id}`}>{passenger.dropOffPointName}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                          <div className="space-y-4">
                            {trip.aiRationale && (
                              <div>
                                <h4 className="font-medium mb-2 flex items-center gap-2">
                                  <Brain className="h-4 w-4" />
                                  AI Recommendation
                                </h4>
                                <p className="text-sm text-muted-foreground bg-muted p-3 rounded" data-testid={`text-ai-rationale-${trip.id}`}>{trip.aiRationale}</p>
                                {trip.aiConfidenceScore && (
                                  <p className="text-xs text-muted-foreground mt-1" data-testid={`text-ai-confidence-${trip.id}`}>
                                    Confidence: {parseFloat(trip.aiConfidenceScore) * 100}%
                                  </p>
                                )}
                              </div>
                            )}
                            <div>
                              <h4 className="font-medium mb-2">Assign Driver</h4>
                              <Select
                                value={trip.driverId || ""}
                                onValueChange={(value) => {
                                  updateTripMutation.mutate({ 
                                    id: trip.id, 
                                    data: { 
                                      driverId: value,
                                      status: value ? 'confirmed' : 'pending_assignment'
                                    } 
                                  });
                                }}
                                data-testid={`select-driver-${trip.id}`}
                              >
                                <SelectTrigger className="w-full" data-testid={`trigger-select-driver-${trip.id}`}>
                                  <SelectValue placeholder="Select a driver" />
                                </SelectTrigger>
                                <SelectContent>
                                  {drivers.map((driver) => (
                                    <SelectItem key={driver.id} value={driver.id} data-testid={`option-driver-${driver.id}`}>
                                      {driver.name} ({driver.phone})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setMergingTrip(trip);
                                  setShowMergeDialog(true);
                                }}
                                disabled={trips.length < 2 || trip.status === 'cancelled'}
                                data-testid={`button-merge-${trip.id}`}
                              >
                                <Merge className="h-4 w-4 mr-1" />
                                Merge
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => cancelTripMutation.mutate(trip.id)}
                                disabled={cancelTripMutation.isPending || trip.status === 'cancelled'}
                                data-testid={`button-cancel-${trip.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Trips</DialogTitle>
            <DialogDescription>
              Select a trip to merge passengers into. The source trip ({mergingTrip?.tripReferenceId}) will be cancelled.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
              <SelectTrigger data-testid="select-merge-target">
                <SelectValue placeholder="Select target trip" />
              </SelectTrigger>
              <SelectContent>
                {trips
                  .filter(t => t.id !== mergingTrip?.id && t.status !== 'cancelled')
                  .map((trip) => (
                    <SelectItem key={trip.id} value={trip.id} data-testid={`option-merge-target-${trip.id}`}>
                      {trip.tripReferenceId} - {trip.routeName} ({trip.passengerCount} passengers)
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMergeDialog(false)} data-testid="button-cancel-merge">
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (mergingTrip && mergeTargetId) {
                  mergeTripsMutation.mutate({ targetId: mergeTargetId, sourceId: mergingTrip.id });
                }
              }}
              disabled={!mergeTargetId || mergeTripsMutation.isPending}
              data-testid="button-confirm-merge"
            >
              {mergeTripsMutation.isPending ? "Merging..." : "Merge Trips"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
