import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit, Trash2, MapPin, Clock, Save, X, CalendarOff, Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CarpoolRoute, CarpoolPickupPoint, CarpoolTimeSlot, CarpoolBlackoutDate } from "@shared/schema";
import { insertCarpoolRouteSchema, updateCarpoolRouteSchema, insertCarpoolPickupPointSchema, insertCarpoolTimeSlotSchema, insertCarpoolBlackoutDateSchema } from "@shared/schema";
import { z } from "zod";

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const match = error.message.match(/^\d{3}:\s*(.+)$/);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        return parsed.message || match[1];
      } catch {
        return match[1];
      }
    }
    return error.message;
  }
  return "An unexpected error occurred";
}

export default function CarpoolRouteManagement() {
  const { toast } = useToast();
  const [showRouteCreator, setShowRouteCreator] = useState(false);
  const [editingRoute, setEditingRoute] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [showPickupPointDialog, setShowPickupPointDialog] = useState(false);
  const [showDropOffPointDialog, setShowDropOffPointDialog] = useState(false);
  const [showTimeSlotDialog, setShowTimeSlotDialog] = useState(false);
  const [deleteRouteId, setDeleteRouteId] = useState<string | null>(null);
  const [deletePickupPointId, setDeletePickupPointId] = useState<string | null>(null);
  const [deleteDropOffPointId, setDeleteDropOffPointId] = useState<string | null>(null);
  const [deleteTimeSlotId, setDeleteTimeSlotId] = useState<string | null>(null);
  const [showBlackoutDateDialog, setShowBlackoutDateDialog] = useState(false);
  const [deleteBlackoutDateId, setDeleteBlackoutDateId] = useState<string | null>(null);
  const [showHolidayImportDialog, setShowHolidayImportDialog] = useState(false);

  // Fetch all routes
  const { data: routes = [], isLoading: loadingRoutes } = useQuery<CarpoolRoute[]>({
    queryKey: ['/api/admin/carpool/routes'],
  });

  // Fetch pickup points for selected route
  const { data: pickupPoints = [], isLoading: loadingPickupPoints } = useQuery<CarpoolPickupPoint[]>({
    queryKey: ['/api/admin/carpool/routes', selectedRoute, 'pickup-points', 'pickup'],
    queryFn: async () => {
      if (!selectedRoute) return [];
      const response = await fetch(`/api/admin/carpool/routes/${selectedRoute}/pickup-points?pointType=pickup`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch pickup points');
      return response.json();
    },
    enabled: !!selectedRoute,
  });

  // Fetch drop-off points for selected route
  const { data: dropOffPoints = [], isLoading: loadingDropOffPoints } = useQuery<CarpoolPickupPoint[]>({
    queryKey: ['/api/admin/carpool/routes', selectedRoute, 'pickup-points', 'dropoff'],
    queryFn: async () => {
      if (!selectedRoute) return [];
      const response = await fetch(`/api/admin/carpool/routes/${selectedRoute}/pickup-points?pointType=dropoff`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch drop-off points');
      return response.json();
    },
    enabled: !!selectedRoute,
  });

  // Fetch time slots for selected route
  const { data: timeSlots = [], isLoading: loadingTimeSlots } = useQuery<CarpoolTimeSlot[]>({
    queryKey: ['/api/admin/carpool/routes', selectedRoute, 'time-slots'],
    enabled: !!selectedRoute,
  });

  // Create route mutation
  const createRouteMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertCarpoolRouteSchema>) => {
      return await apiRequest('POST', '/api/admin/carpool/routes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/carpool/routes'] });
      toast({ title: "Success", description: "Route created successfully" });
      setShowRouteCreator(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: extractErrorMessage(error), variant: "destructive" });
    },
  });

  // Update route mutation
  const updateRouteMutation = useMutation({
    mutationFn: async (data: z.infer<typeof updateCarpoolRouteSchema>) => {
      return await apiRequest('PUT', `/api/admin/carpool/routes/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/carpool/routes'] });
      toast({ title: "Success", description: "Route updated successfully" });
      setEditingRoute(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: extractErrorMessage(error), variant: "destructive" });
    },
  });

  // Delete route mutation
  const deleteRouteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/carpool/routes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/carpool/routes'] });
      toast({ title: "Success", description: "Route deleted successfully" });
      setDeleteRouteId(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: extractErrorMessage(error), variant: "destructive" });
      setDeleteRouteId(null);
    },
  });

  // Create pickup point mutation
  const createPickupPointMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertCarpoolPickupPointSchema>) => {
      return await apiRequest('POST', '/api/admin/carpool/pickup-points', { ...data, pointType: 'pickup' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/carpool/routes', selectedRoute, 'pickup-points', 'pickup'] });
      toast({ title: "Success", description: "Pickup point created successfully" });
      setShowPickupPointDialog(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: extractErrorMessage(error), variant: "destructive" });
    },
  });

  // Delete pickup point mutation
  const deletePickupPointMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/carpool/pickup-points/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/carpool/routes', selectedRoute, 'pickup-points', 'pickup'] });
      toast({ title: "Success", description: "Pickup point deleted successfully" });
      setDeletePickupPointId(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: extractErrorMessage(error), variant: "destructive" });
      setDeletePickupPointId(null);
    },
  });

  // Create drop-off point mutation
  const createDropOffPointMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertCarpoolPickupPointSchema>) => {
      return await apiRequest('POST', '/api/admin/carpool/pickup-points', { ...data, pointType: 'dropoff' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/carpool/routes', selectedRoute, 'pickup-points', 'dropoff'] });
      toast({ title: "Success", description: "Drop-off point created successfully" });
      setShowDropOffPointDialog(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: extractErrorMessage(error), variant: "destructive" });
    },
  });

  // Delete drop-off point mutation
  const deleteDropOffPointMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/carpool/pickup-points/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/carpool/routes', selectedRoute, 'pickup-points', 'dropoff'] });
      toast({ title: "Success", description: "Drop-off point deleted successfully" });
      setDeleteDropOffPointId(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: extractErrorMessage(error), variant: "destructive" });
      setDeleteDropOffPointId(null);
    },
  });

  // Create time slot mutation
  const createTimeSlotMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertCarpoolTimeSlotSchema>) => {
      return await apiRequest('POST', '/api/admin/carpool/time-slots', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/carpool/routes', selectedRoute, 'time-slots'] });
      toast({ title: "Success", description: "Office entry time created successfully" });
      setShowTimeSlotDialog(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: extractErrorMessage(error), variant: "destructive" });
    },
  });

  // Delete time slot mutation
  const deleteTimeSlotMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/carpool/time-slots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/carpool/routes', selectedRoute, 'time-slots'] });
      toast({ title: "Success", description: "Office entry time deleted successfully" });
      setDeleteTimeSlotId(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: extractErrorMessage(error), variant: "destructive" });
      setDeleteTimeSlotId(null);
    },
  });

  // Fetch blackout dates
  const { data: blackoutDates = [], isLoading: loadingBlackoutDates } = useQuery<CarpoolBlackoutDate[]>({
    queryKey: ['/api/admin/carpool/blackout-dates'],
  });

  // Create blackout date mutation
  const createBlackoutDateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertCarpoolBlackoutDateSchema>) => {
      return await apiRequest('POST', '/api/admin/carpool/blackout-dates', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/carpool/blackout-dates'] });
      toast({ title: "Success", description: "Blackout date created successfully" });
      setShowBlackoutDateDialog(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: extractErrorMessage(error), variant: "destructive" });
    },
  });

  // Delete blackout date mutation
  const deleteBlackoutDateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/carpool/blackout-dates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/carpool/blackout-dates'] });
      toast({ title: "Success", description: "Blackout date deleted successfully" });
      setDeleteBlackoutDateId(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: extractErrorMessage(error), variant: "destructive" });
      setDeleteBlackoutDateId(null);
    },
  });

  // Sync holidays mutation
  const syncHolidaysMutation = useMutation({
    mutationFn: async (holidays: any[]) => {
      return await apiRequest('POST', '/api/admin/holidays/sync', { holidays });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/carpool/blackout-dates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/holidays/suggestions'] });
      toast({ title: "Success", description: "Holidays imported as blackout dates successfully" });
      setShowHolidayImportDialog(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: extractErrorMessage(error), variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      {/* Blackout Dates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2" data-testid="heading-blackout-dates">
              <CalendarOff className="h-5 w-5" />
              Service Blackout Dates
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowHolidayImportDialog(true)} data-testid="button-import-holidays">
                <Download className="h-4 w-4 mr-2" />
                Import Holidays
              </Button>
              <Button onClick={() => setShowBlackoutDateDialog(true)} data-testid="button-create-blackout-date">
                <Plus className="h-4 w-4 mr-2" />
                Add Blackout Date
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingBlackoutDates ? (
            <div className="text-center py-8">Loading blackout dates...</div>
          ) : blackoutDates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No blackout dates configured. Add blackout dates to block service during holidays or maintenance periods.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Start Date & Time</TableHead>
                  <TableHead>End Date & Time</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blackoutDates.map((blackoutDate) => (
                  <TableRow key={blackoutDate.id} data-testid={`row-blackout-date-${blackoutDate.id}`}>
                    <TableCell className="font-medium">{blackoutDate.name}</TableCell>
                    <TableCell>{new Date(blackoutDate.startDate).toLocaleString()}</TableCell>
                    <TableCell>{new Date(blackoutDate.endDate).toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${blackoutDate.isActive ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                        {blackoutDate.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteBlackoutDateId(blackoutDate.id)}
                        data-testid={`button-delete-blackout-date-${blackoutDate.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Routes List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2" data-testid="heading-carpool-routes">
              <MapPin className="h-5 w-5" />
              Carpool Routes
            </CardTitle>
            <Button onClick={() => setShowRouteCreator(true)} data-testid="button-create-route">
              <Plus className="h-4 w-4 mr-2" />
              Create Route
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingRoutes ? (
            <div className="text-center py-8">Loading routes...</div>
          ) : routes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No routes found. Create your first route to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>From → To</TableHead>
                  <TableHead>Distance (km)</TableHead>
                  <TableHead>Price (BDT)</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes.map((route) => (
                  <TableRow key={route.id} data-testid={`row-route-${route.id}`}>
                    <TableCell className="font-medium">{route.name}</TableCell>
                    <TableCell>{route.fromLocation} → {route.toLocation}</TableCell>
                    <TableCell>{route.estimatedDistance}</TableCell>
                    <TableCell>{route.pricePerSeat}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${route.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {route.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRoute(route.id)}
                          data-testid={`button-manage-route-${route.id}`}
                        >
                          Manage
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingRoute(route.id)}
                          data-testid={`button-edit-route-${route.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteRouteId(route.id)}
                          data-testid={`button-delete-route-${route.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pickup Points, Drop-off Points, and Time Slots for Selected Route */}
      {selectedRoute && (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Pickup Points */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2" data-testid="heading-pickup-points">
                  <MapPin className="h-5 w-5" />
                  Pickup Points
                </CardTitle>
                <Button onClick={() => setShowPickupPointDialog(true)} size="sm" data-testid="button-create-pickup-point">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Point
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPickupPoints ? (
                <div className="text-center py-4">Loading...</div>
              ) : pickupPoints.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No pickup points yet
                </div>
              ) : (
                <div className="space-y-2">
                  {pickupPoints.map((point) => (
                    <div key={point.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`pickup-point-${point.id}`}>
                      <div>
                        <div className="font-medium">{point.name}</div>
                        <div className="text-sm text-gray-500">Order: {point.sequenceOrder}</div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeletePickupPointId(point.id)}
                        data-testid={`button-delete-pickup-point-${point.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Drop-off Points */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2" data-testid="heading-dropoff-points">
                  <MapPin className="h-5 w-5" />
                  Drop-off Points
                </CardTitle>
                <Button onClick={() => setShowDropOffPointDialog(true)} size="sm" data-testid="button-create-dropoff-point">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Point
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingDropOffPoints ? (
                <div className="text-center py-4">Loading...</div>
              ) : dropOffPoints.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No drop-off points yet
                </div>
              ) : (
                <div className="space-y-2">
                  {dropOffPoints.map((point) => (
                    <div key={point.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`dropoff-point-${point.id}`}>
                      <div>
                        <div className="font-medium">{point.name}</div>
                        <div className="text-sm text-gray-500">Order: {point.sequenceOrder}</div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteDropOffPointId(point.id)}
                        data-testid={`button-delete-dropoff-point-${point.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Office Entry Times */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2" data-testid="heading-time-slots">
                  <Clock className="h-5 w-5" />
                  Office Entry Times
                </CardTitle>
                <Button onClick={() => setShowTimeSlotDialog(true)} size="sm" data-testid="button-create-time-slot">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Office Entry Time
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingTimeSlots ? (
                <div className="text-center py-4">Loading...</div>
              ) : timeSlots.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No office entry times yet
                </div>
              ) : (
                <div className="space-y-2">
                  {timeSlots.map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`time-slot-${slot.id}`}>
                      <div>
                        <div className="font-medium">{slot.departureTime}</div>
                        <div className="text-sm text-gray-500">
                          {slot.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteTimeSlotId(slot.id)}
                        data-testid={`button-delete-time-slot-${slot.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Route Creator/Editor Dialog */}
      <RouteDialog
        open={showRouteCreator || editingRoute !== null}
        onClose={() => {
          setShowRouteCreator(false);
          setEditingRoute(null);
        }}
        route={editingRoute ? routes.find(r => r.id === editingRoute) : undefined}
        onSubmit={(data) => {
          if (editingRoute) {
            updateRouteMutation.mutate({ ...data, id: editingRoute });
          } else {
            createRouteMutation.mutate(data);
          }
        }}
        isPending={createRouteMutation.isPending || updateRouteMutation.isPending}
      />

      {/* Pickup Point Dialog */}
      {selectedRoute && (
        <PickupPointDialog
          open={showPickupPointDialog}
          onClose={() => setShowPickupPointDialog(false)}
          routeId={selectedRoute}
          onSubmit={(data) => createPickupPointMutation.mutate(data)}
          isPending={createPickupPointMutation.isPending}
          title="Add Pickup Point"
        />
      )}

      {/* Drop-off Point Dialog */}
      {selectedRoute && (
        <PickupPointDialog
          open={showDropOffPointDialog}
          onClose={() => setShowDropOffPointDialog(false)}
          routeId={selectedRoute}
          onSubmit={(data) => createDropOffPointMutation.mutate(data)}
          isPending={createDropOffPointMutation.isPending}
          title="Add Drop-off Point"
        />
      )}

      {/* Time Slot Dialog */}
      {selectedRoute && (
        <TimeSlotDialog
          open={showTimeSlotDialog}
          onClose={() => setShowTimeSlotDialog(false)}
          routeId={selectedRoute}
          onSubmit={(data) => createTimeSlotMutation.mutate(data)}
          isPending={createTimeSlotMutation.isPending}
        />
      )}

      {/* Delete Confirmations */}
      <AlertDialog open={deleteRouteId !== null} onOpenChange={() => setDeleteRouteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Route</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this route? This will also delete all associated pickup points and office entry times.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-route">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRouteId && deleteRouteMutation.mutate(deleteRouteId)}
              data-testid="button-confirm-delete-route"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deletePickupPointId !== null} onOpenChange={() => setDeletePickupPointId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pickup Point</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this pickup point?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePickupPointId && deletePickupPointMutation.mutate(deletePickupPointId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDropOffPointId !== null} onOpenChange={() => setDeleteDropOffPointId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Drop-off Point</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this drop-off point?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDropOffPointId && deleteDropOffPointMutation.mutate(deleteDropOffPointId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteTimeSlotId !== null} onOpenChange={() => setDeleteTimeSlotId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Office Entry Time</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this office entry time?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTimeSlotId && deleteTimeSlotMutation.mutate(deleteTimeSlotId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Blackout Date Dialog */}
      <BlackoutDateDialog
        open={showBlackoutDateDialog}
        onClose={() => setShowBlackoutDateDialog(false)}
        onSubmit={(data) => createBlackoutDateMutation.mutate(data)}
        isPending={createBlackoutDateMutation.isPending}
      />

      {/* Holiday Import Dialog */}
      <HolidayImportDialog
        open={showHolidayImportDialog}
        onClose={() => setShowHolidayImportDialog(false)}
        onSubmit={(holidays) => syncHolidaysMutation.mutate(holidays)}
        isPending={syncHolidaysMutation.isPending}
      />

      <AlertDialog open={deleteBlackoutDateId !== null} onOpenChange={() => setDeleteBlackoutDateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blackout Date</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this blackout date? This will allow bookings during this period again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-blackout-date">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteBlackoutDateId && deleteBlackoutDateMutation.mutate(deleteBlackoutDateId)}
              data-testid="button-confirm-delete-blackout-date"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Route Dialog Component
function RouteDialog({
  open,
  onClose,
  route,
  onSubmit,
  isPending
}: {
  open: boolean;
  onClose: () => void;
  route?: CarpoolRoute;
  onSubmit: (data: z.infer<typeof insertCarpoolRouteSchema>) => void;
  isPending: boolean;
}) {
  const form = useForm<z.infer<typeof insertCarpoolRouteSchema>>({
    resolver: zodResolver(insertCarpoolRouteSchema),
    defaultValues: {
      name: '',
      fromLocation: '',
      toLocation: '',
      estimatedDistance: '0',
      pricePerSeat: '200',
      description: '',
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      isActive: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (route) {
        form.reset({
          name: route.name || '',
          fromLocation: route.fromLocation || '',
          toLocation: route.toLocation || '',
          estimatedDistance: route.estimatedDistance || '0',
          pricePerSeat: route.pricePerSeat || '200',
          description: route.description || '',
          weekdays: route.weekdays || [0, 1, 2, 3, 4, 5, 6],
          isActive: route.isActive ?? true,
        });
      } else {
        form.reset({
          name: '',
          fromLocation: '',
          toLocation: '',
          estimatedDistance: '0',
          pricePerSeat: '200',
          description: '',
          weekdays: [0, 1, 2, 3, 4, 5, 6],
          isActive: true,
        });
      }
    }
  }, [open, route, form]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="dialog-title-route">{route ? 'Edit Route' : 'Create Route'}</DialogTitle>
          <DialogDescription>
            {route ? 'Update the route details' : 'Create a new carpool route'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Route Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Dhaka to Chittagong Express" data-testid="input-route-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fromLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Location</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Dhaka" data-testid="input-from-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="toLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To Location</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Chittagong" data-testid="input-to-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estimatedDistance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Distance (km)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        value={field.value || ''} 
                        onChange={(e) => field.onChange(e.target.value)} 
                        placeholder="e.g., 200" 
                        data-testid="input-distance" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pricePerSeat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price Per Seat (BDT)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        value={field.value || ''} 
                        onChange={(e) => field.onChange(e.target.value)} 
                        placeholder="e.g., 200" 
                        data-testid="input-price" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ''} placeholder="Additional details about the route" data-testid="input-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="weekdays"
              render={({ field }) => {
                const daysOfWeek = [
                  { label: 'Mon', value: 1 },
                  { label: 'Tue', value: 2 },
                  { label: 'Wed', value: 3 },
                  { label: 'Thu', value: 4 },
                  { label: 'Fri', value: 5 },
                  { label: 'Sat', value: 6 },
                  { label: 'Sun', value: 0 },
                ];

                return (
                  <FormItem>
                    <FormLabel>Operating Days</FormLabel>
                    <div className="flex flex-wrap gap-3">
                      {daysOfWeek.map((day) => (
                        <label key={day.value} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={field.value?.includes(day.value)}
                            onCheckedChange={(checked) => {
                              const currentDays = (field.value || []) as number[];
                              if (checked) {
                                field.onChange([...currentDays, day.value].sort((a, b) => a - b));
                              } else {
                                field.onChange(currentDays.filter((d) => d !== day.value));
                              }
                            }}
                            data-testid={`checkbox-weekday-${day.value}`}
                          />
                          <span className="text-sm font-medium">{day.label}</span>
                        </label>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel>Active Route</FormLabel>
                    <div className="text-sm text-gray-500">Make this route available for bookings</div>
                  </div>
                  <FormControl>
                    <Switch checked={field.value ?? undefined} onCheckedChange={field.onChange} data-testid="switch-is-active" />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel-route">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit-route">
                {isPending ? 'Saving...' : route ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Pickup Point Dialog Component
function PickupPointDialog({
  open,
  onClose,
  routeId,
  onSubmit,
  isPending,
  title = "Add Pickup Point"
}: {
  open: boolean;
  onClose: () => void;
  routeId: string;
  onSubmit: (data: z.infer<typeof insertCarpoolPickupPointSchema>) => void;
  isPending: boolean;
  title?: string;
}) {
  const form = useForm<z.infer<typeof insertCarpoolPickupPointSchema>>({
    resolver: zodResolver(insertCarpoolPickupPointSchema),
    defaultValues: {
      routeId,
      name: '',
      sequenceOrder: 1,
      latitude: null,
      longitude: null,
    },
  });

  // Reset form with routeId when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        routeId,
        name: '',
        sequenceOrder: 1,
        latitude: null,
        longitude: null,
      });
    }
  }, [open, routeId, form]);

  const handleSubmit = (data: z.infer<typeof insertCarpoolPickupPointSchema>) => {
    // Ensure routeId is included in the submission
    onSubmit({ ...data, routeId });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle data-testid="dialog-title-pickup-point">{title}</DialogTitle>
          <DialogDescription>
            Add a new {title.toLowerCase().includes('pickup') ? 'pickup' : 'drop-off'} point for this route
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Gulshan 2 Circle" data-testid="input-pickup-point-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sequenceOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sequence Order</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1"
                      value={field.value ?? ''} 
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === '' ? '' : parseInt(value) || '');
                      }}
                      onBlur={(e) => {
                        const value = e.target.value;
                        if (value === '' || !value) {
                          field.onChange(1);
                        }
                      }}
                      placeholder="Enter order number"
                      data-testid="input-sequence-order" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel-pickup-point">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit-pickup-point">
                {isPending ? 'Adding...' : 'Add'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Time Slot Dialog Component
function TimeSlotDialog({
  open,
  onClose,
  routeId,
  onSubmit,
  isPending
}: {
  open: boolean;
  onClose: () => void;
  routeId: string;
  onSubmit: (data: z.infer<typeof insertCarpoolTimeSlotSchema>) => void;
  isPending: boolean;
}) {
  const form = useForm<z.infer<typeof insertCarpoolTimeSlotSchema>>({
    resolver: zodResolver(insertCarpoolTimeSlotSchema),
    defaultValues: {
      routeId,
      departureTime: '',
      isActive: true,
    },
  });

  // Reset form with routeId when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        routeId,
        departureTime: '',
        isActive: true,
      });
    }
  }, [open, routeId, form]);

  const handleSubmit = (data: z.infer<typeof insertCarpoolTimeSlotSchema>) => {
    // Ensure routeId is included in the submission
    onSubmit({ ...data, routeId });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle data-testid="dialog-title-time-slot">Add Office Entry Time</DialogTitle>
          <DialogDescription>
            Add a new departure time for this route
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="departureTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Departure Time</FormLabel>
                  <FormControl>
                    <Input {...field} type="time" data-testid="input-departure-time" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel>Active</FormLabel>
                    <div className="text-sm text-gray-500">Available for booking</div>
                  </div>
                  <FormControl>
                    <Switch checked={field.value ?? undefined} onCheckedChange={field.onChange} data-testid="switch-time-slot-active" />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel-time-slot">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit-time-slot">
                {isPending ? 'Adding...' : 'Add'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Blackout Date Dialog Component
function BlackoutDateDialog({
  open,
  onClose,
  onSubmit,
  isPending
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: z.infer<typeof insertCarpoolBlackoutDateSchema>) => void;
  isPending: boolean;
}) {
  const form = useForm<z.infer<typeof insertCarpoolBlackoutDateSchema>>({
    resolver: zodResolver(insertCarpoolBlackoutDateSchema),
    defaultValues: {
      name: '',
      startDate: new Date(),
      endDate: new Date(),
      isActive: true,
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        name: '',
        startDate: new Date(),
        endDate: new Date(),
        isActive: true,
      });
    }
  }, [open, form]);

  const handleSubmit = (data: z.infer<typeof insertCarpoolBlackoutDateSchema>) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle data-testid="dialog-title-blackout-date">Add Blackout Date</DialogTitle>
          <DialogDescription>
            Block carpool service during holidays or maintenance periods
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Eid Holiday, Maintenance Day" data-testid="input-blackout-date-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date & Time</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                      onChange={(e) => field.onChange(new Date(e.target.value))}
                      data-testid="input-start-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date & Time</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                      onChange={(e) => field.onChange(new Date(e.target.value))}
                      data-testid="input-end-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel>Active</FormLabel>
                    <div className="text-sm text-gray-500">Block bookings during this period</div>
                  </div>
                  <FormControl>
                    <Switch checked={field.value ?? undefined} onCheckedChange={field.onChange} data-testid="switch-blackout-date-active" />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel-blackout-date">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit-blackout-date">
                {isPending ? 'Adding...' : 'Add Blackout Date'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface Holiday {
  name: string;
  nameBn: string;
  date: string;
  type: 'national' | 'religious' | 'cultural';
  durationDays: number;
  isVariable: boolean;
}

interface HolidaySuggestion {
  holiday: Holiday;
  expandedDates: string[];
  overlappingBlackouts: string[];
  fullyAdded: boolean;
  partiallyAdded: boolean;
}

function HolidayImportDialog({
  open,
  onClose,
  onSubmit,
  isPending
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (holidays: Holiday[]) => void;
  isPending: boolean;
}) {
  const [selectedHolidays, setSelectedHolidays] = useState<Holiday[]>([]);

  const { data: suggestions = [], isLoading } = useQuery<HolidaySuggestion[]>({
    queryKey: ['/api/admin/holidays/suggestions'],
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setSelectedHolidays([]);
    }
  }, [open]);

  const handleToggleHoliday = (holiday: Holiday, fullyAdded: boolean) => {
    if (fullyAdded) return;
    
    setSelectedHolidays(prev => {
      const isSelected = prev.some(h => h.date === holiday.date && h.name === holiday.name);
      if (isSelected) {
        return prev.filter(h => !(h.date === holiday.date && h.name === holiday.name));
      } else {
        return [...prev, holiday];
      }
    });
  };

  const handleSelectAll = () => {
    const availableHolidays = suggestions
      .filter(s => !s.fullyAdded)
      .map(s => s.holiday);
    setSelectedHolidays(availableHolidays);
  };

  const handleDeselectAll = () => {
    setSelectedHolidays([]);
  };

  const handleSubmit = () => {
    if (selectedHolidays.length > 0) {
      onSubmit(selectedHolidays);
    }
  };

  const getTypeColor = (type: 'national' | 'religious' | 'cultural') => {
    switch (type) {
      case 'national':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'religious':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cultural':
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const availableCount = suggestions.filter(s => !s.fullyAdded).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="dialog-title-import-holidays">
            <Calendar className="h-5 w-5" />
            Import Bangladesh Holidays
          </DialogTitle>
          <DialogDescription>
            Select holidays to add as blackout dates. Multi-day holidays (like Eid) will block all days automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={availableCount === 0}
            data-testid="button-select-all-holidays"
          >
            Select All ({availableCount})
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDeselectAll}
            disabled={selectedHolidays.length === 0}
            data-testid="button-deselect-all-holidays"
          >
            Deselect All
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2" data-testid="holiday-list-container">
          {isLoading ? (
            <div className="text-center py-8">Loading holidays...</div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No upcoming holidays found.
            </div>
          ) : (
            suggestions.map((suggestion, index) => {
              const { holiday, fullyAdded, partiallyAdded } = suggestion;
              const isSelected = selectedHolidays.some(
                h => h.date === holiday.date && h.name === holiday.name
              );

              return (
                <div
                  key={`${holiday.date}-${holiday.name}-${index}`}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    fullyAdded
                      ? 'bg-gray-50 border-gray-200 opacity-60'
                      : isSelected
                      ? 'bg-primary/5 border-primary'
                      : 'hover:bg-gray-50 border-gray-200'
                  }`}
                  data-testid={`holiday-item-${holiday.date}`}
                >
                  <Checkbox
                    checked={isSelected || fullyAdded}
                    disabled={fullyAdded}
                    onCheckedChange={() => handleToggleHoliday(holiday, fullyAdded)}
                    data-testid={`checkbox-holiday-${holiday.date}`}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{holiday.name}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full border ${getTypeColor(holiday.type)}`}>
                        {holiday.type}
                      </span>
                      {holiday.durationDays > 1 && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                          {holiday.durationDays} days
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {holiday.nameBn}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(holiday.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                      {holiday.durationDays > 1 && (
                        <span>
                          {' - '}
                          {new Date(new Date(holiday.date).setDate(
                            new Date(holiday.date).getDate() + holiday.durationDays - 1
                          )).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  {fullyAdded && (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                      Already Added
                    </span>
                  )}
                  {partiallyAdded && !fullyAdded && (
                    <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                      Partial
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-500">
            {selectedHolidays.length} holiday(s) selected
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-testid="button-cancel-import-holidays"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || selectedHolidays.length === 0}
              data-testid="button-submit-import-holidays"
            >
              {isPending ? 'Importing...' : `Import ${selectedHolidays.length} Holiday(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
