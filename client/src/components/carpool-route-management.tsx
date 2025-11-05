import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit, Trash2, MapPin, Clock, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CarpoolRoute, CarpoolPickupPoint, CarpoolTimeSlot } from "@shared/schema";
import { insertCarpoolRouteSchema, updateCarpoolRouteSchema, insertCarpoolPickupPointSchema, insertCarpoolTimeSlotSchema } from "@shared/schema";
import { z } from "zod";

export default function CarpoolRouteManagement() {
  const { toast } = useToast();
  const [showRouteCreator, setShowRouteCreator] = useState(false);
  const [editingRoute, setEditingRoute] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [showPickupPointDialog, setShowPickupPointDialog] = useState(false);
  const [showTimeSlotDialog, setShowTimeSlotDialog] = useState(false);
  const [deleteRouteId, setDeleteRouteId] = useState<string | null>(null);
  const [deletePickupPointId, setDeletePickupPointId] = useState<string | null>(null);
  const [deleteTimeSlotId, setDeleteTimeSlotId] = useState<string | null>(null);

  // Fetch all routes
  const { data: routes = [], isLoading: loadingRoutes } = useQuery<CarpoolRoute[]>({
    queryKey: ['/api/admin/carpool/routes'],
  });

  // Fetch pickup points for selected route
  const { data: pickupPoints = [], isLoading: loadingPickupPoints } = useQuery<CarpoolPickupPoint[]>({
    queryKey: ['/api/admin/carpool/routes', selectedRoute, 'pickup-points'],
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
    onError: () => {
      toast({ title: "Error", description: "Failed to create route", variant: "destructive" });
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
    onError: () => {
      toast({ title: "Error", description: "Failed to update route", variant: "destructive" });
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
    onError: () => {
      toast({ title: "Error", description: "Failed to delete route", variant: "destructive" });
      setDeleteRouteId(null);
    },
  });

  // Create pickup point mutation
  const createPickupPointMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertCarpoolPickupPointSchema>) => {
      return await apiRequest('POST', '/api/admin/carpool/pickup-points', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/carpool/routes', selectedRoute, 'pickup-points'] });
      toast({ title: "Success", description: "Pickup point created successfully" });
      setShowPickupPointDialog(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create pickup point", variant: "destructive" });
    },
  });

  // Delete pickup point mutation
  const deletePickupPointMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/carpool/pickup-points/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/carpool/routes', selectedRoute, 'pickup-points'] });
      toast({ title: "Success", description: "Pickup point deleted successfully" });
      setDeletePickupPointId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete pickup point", variant: "destructive" });
      setDeletePickupPointId(null);
    },
  });

  // Create time slot mutation
  const createTimeSlotMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertCarpoolTimeSlotSchema>) => {
      return await apiRequest('POST', '/api/admin/carpool/time-slots', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/carpool/routes', selectedRoute, 'time-slots'] });
      toast({ title: "Success", description: "Time slot created successfully" });
      setShowTimeSlotDialog(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create time slot", variant: "destructive" });
    },
  });

  // Delete time slot mutation
  const deleteTimeSlotMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/carpool/time-slots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/carpool/routes', selectedRoute, 'time-slots'] });
      toast({ title: "Success", description: "Time slot deleted successfully" });
      setDeleteTimeSlotId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete time slot", variant: "destructive" });
      setDeleteTimeSlotId(null);
    },
  });

  return (
    <div className="space-y-6">
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

      {/* Pickup Points and Time Slots for Selected Route */}
      {selectedRoute && (
        <div className="grid md:grid-cols-2 gap-6">
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

          {/* Time Slots */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2" data-testid="heading-time-slots">
                  <Clock className="h-5 w-5" />
                  Time Slots
                </CardTitle>
                <Button onClick={() => setShowTimeSlotDialog(true)} size="sm" data-testid="button-create-time-slot">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Slot
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingTimeSlots ? (
                <div className="text-center py-4">Loading...</div>
              ) : timeSlots.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No time slots yet
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
      <PickupPointDialog
        open={showPickupPointDialog}
        onClose={() => setShowPickupPointDialog(false)}
        routeId={selectedRoute || ''}
        onSubmit={(data) => createPickupPointMutation.mutate(data)}
        isPending={createPickupPointMutation.isPending}
      />

      {/* Time Slot Dialog */}
      <TimeSlotDialog
        open={showTimeSlotDialog}
        onClose={() => setShowTimeSlotDialog(false)}
        routeId={selectedRoute || ''}
        onSubmit={(data) => createTimeSlotMutation.mutate(data)}
        isPending={createTimeSlotMutation.isPending}
      />

      {/* Delete Confirmations */}
      <AlertDialog open={deleteRouteId !== null} onOpenChange={() => setDeleteRouteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Route</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this route? This will also delete all associated pickup points and time slots.
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

      <AlertDialog open={deleteTimeSlotId !== null} onOpenChange={() => setDeleteTimeSlotId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Time Slot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this time slot?
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
    defaultValues: route || {
      name: '',
      fromLocation: '',
      toLocation: '',
      estimatedDistance: '0',
      pricePerSeat: '200',
      description: '',
      isActive: true,
    },
  });

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
                      <Input {...field} type="number" placeholder="e.g., 200" data-testid="input-distance" />
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
                      <Input {...field} type="number" placeholder="e.g., 200" data-testid="input-price" />
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
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel>Active Route</FormLabel>
                    <div className="text-sm text-gray-500">Make this route available for bookings</div>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-is-active" />
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
  isPending
}: {
  open: boolean;
  onClose: () => void;
  routeId: string;
  onSubmit: (data: z.infer<typeof insertCarpoolPickupPointSchema>) => void;
  isPending: boolean;
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
          <DialogTitle data-testid="dialog-title-pickup-point">Add Pickup Point</DialogTitle>
          <DialogDescription>
            Add a new pickup point for this route
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
                    <Input {...field} type="number" onChange={(e) => field.onChange(parseInt(e.target.value))} data-testid="input-sequence-order" />
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
          <DialogTitle data-testid="dialog-title-time-slot">Add Time Slot</DialogTitle>
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
                    <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-time-slot-active" />
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
