import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar, MapPin, Clock, Users, DollarSign, CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertCarpoolBookingSchema } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useLocation as useWouterLocation } from "wouter";
import { cn } from "@/lib/utils";

import type { 
  CarpoolRoute, 
  CarpoolPickupPoint, 
  CarpoolTimeSlot 
} from "@shared/schema";

export default function CarpoolPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useWouterLocation();
  const { toast } = useToast();
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [bookingResponse, setBookingResponse] = useState<{referenceId: string; shareToken: string; shareUrl: string} | null>(null);
  
  // Extract share token from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('share');
    if (token) {
      setShareToken(token);
    }
  }, []);
  
  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    setLocation("/login");
    return null;
  }

  // Fetch shared booking details if share token exists
  const { data: sharedBooking } = useQuery({
    queryKey: ['/api/carpool/bookings/shared', shareToken],
    enabled: !!shareToken,
  });

  // Fetch available routes
  const { data: routes = [], isLoading: loadingRoutes } = useQuery<CarpoolRoute[]>({
    queryKey: ['/api/carpool/routes'],
  });

  // Fetch pickup points for selected route
  const { data: pickupPoints = [], isLoading: loadingPickupPoints } = useQuery<CarpoolPickupPoint[]>({
    queryKey: [`/api/carpool/routes/${selectedRoute}/pickup-points`],
    enabled: !!selectedRoute,
  });

  // Fetch time slots for selected route
  const { data: timeSlots = [], isLoading: loadingTimeSlots } = useQuery<CarpoolTimeSlot[]>({
    queryKey: [`/api/carpool/routes/${selectedRoute}/time-slots`],
    enabled: !!selectedRoute,
  });

  // Fetch booking counts for selected route
  const { data: bookingCounts = {} } = useQuery<Record<string, number>>({
    queryKey: [`/api/carpool/routes/${selectedRoute}/booking-counts`],
    enabled: !!selectedRoute,
  });

  // Get selected route details
  const selectedRouteDetails = routes.find(r => r.id === selectedRoute);

  // Get selected time slot details
  const selectedTimeSlotDetails = timeSlots.find(ts => ts.id === selectedTimeSlot);

  // Form schema with validation
  const bookingFormSchema = insertCarpoolBookingSchema.extend({
    customerName: z.string().min(2, "Name must be at least 2 characters"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    email: z.string().email("Valid email is required").min(1, "Email is required"),
    travelDate: z.string().min(1, "Travel date is required"),
  });

  const form = useForm<z.infer<typeof bookingFormSchema>>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      routeId: "",
      timeSlotId: "",
      boardingPointId: "",
      dropOffPointId: "",
      customerName: "",
      phone: "",
      email: "",
      travelDate: "",
    },
  });

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof bookingFormSchema>) => {
      const response = await apiRequest('POST', '/api/carpool/bookings', data);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/carpool/routes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my/carpool-bookings'] });
      
      // Store booking response data
      setBookingResponse({
        referenceId: data.referenceId,
        shareToken: data.shareToken,
        shareUrl: `${window.location.origin}/carpool?share=${data.shareToken}`
      });
      
      toast({ 
        title: "Success", 
        description: "Your carpool booking has been confirmed! You'll receive an email with details." 
      });
      setBookingComplete(true);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create booking. Please try again.", 
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (data: z.infer<typeof bookingFormSchema>) => {
    createBookingMutation.mutate(data);
  };

  const handleRouteChange = (routeId: string) => {
    setSelectedRoute(routeId);
    setSelectedTimeSlot(null);
    form.setValue('routeId', routeId);
    form.setValue('timeSlotId', '');
    form.setValue('boardingPointId', '');
    form.setValue('dropOffPointId', '');
  };

  const handleTimeSlotChange = (timeSlotId: string) => {
    setSelectedTimeSlot(timeSlotId);
    form.setValue('timeSlotId', timeSlotId);
  };

  // Pre-populate form from shared booking
  useEffect(() => {
    if (sharedBooking && routes.length > 0) {
      const booking = sharedBooking as any;
      
      // Set route
      if (booking.routeId) {
        setSelectedRoute(booking.routeId);
        form.setValue('routeId', booking.routeId);
      }
      
      // Set time slot
      if (booking.timeSlotId) {
        setSelectedTimeSlot(booking.timeSlotId);
        form.setValue('timeSlotId', booking.timeSlotId);
      }
      
      // Set travel date
      if (booking.travelDate) {
        form.setValue('travelDate', booking.travelDate);
      }
      
      // Set pickup and drop-off points
      if (booking.boardingPointId) {
        form.setValue('boardingPointId', booking.boardingPointId);
      }
      if (booking.dropOffPointId) {
        form.setValue('dropOffPointId', booking.dropOffPointId);
      }
      
      toast({
        title: "Booking pre-filled",
        description: "Form has been pre-filled from shared link. Update your details and confirm.",
      });
    }
  }, [sharedBooking, routes, form, toast]);

  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center" data-testid="booking-success-card">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <CardTitle className="text-2xl">Booking Confirmed!</CardTitle>
              <CardDescription className="text-base mt-2">
                Your carpool seat has been reserved. We'll send you an email confirmation shortly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookingResponse && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Booking Reference</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white" data-testid="text-reference-id">
                        {bookingResponse.referenceId}
                      </p>
                    </div>
                    
                    <div className="border-t pt-3">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Share this trip</p>
                      <p className="text-xs text-gray-500 mb-2">Invite friends or colleagues to join you on this route!</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={bookingResponse.shareUrl}
                          className="flex-1 px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                          data-testid="input-share-url"
                        />
                        <Button
                          onClick={() => {
                            navigator.clipboard.writeText(bookingResponse.shareUrl);
                            toast({
                              title: "Link copied!",
                              description: "Share this link with others to join your ride",
                            });
                          }}
                          variant="outline"
                          data-testid="button-copy-link"
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                <p className="text-sm text-muted-foreground">
                  Please note: Your trip will be confirmed once we have at least 3 passengers. 
                  You'll receive an email 2 hours before departure if the minimum isn't met.
                </p>
                <Button 
                  onClick={() => {
                    setBookingComplete(false);
                    setBookingResponse(null);
                  }} 
                  className="w-full"
                  data-testid="button-book-another"
                >
                  Book Another Ride
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4" data-testid="heading-carpool">
            Office Carpool Service
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Share your commute with colleagues. Save money, reduce traffic, and help the environment.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Route Selection */}
          <div className="md:col-span-2">
            <Card data-testid="card-route-selection">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Select Your Route
                </CardTitle>
                <CardDescription>Choose a route that matches your commute</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingRoutes ? (
                  <div className="text-center py-8" data-testid="loading-routes">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
                  </div>
                ) : routes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="no-routes">
                    No routes available at the moment. Please check back later.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {routes.map((route) => (
                      <div
                        key={route.id}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedRoute === route.id
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                        onClick={() => handleRouteChange(route.id)}
                        data-testid={`card-route-${route.id}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg" data-testid={`text-route-name-${route.id}`}>
                              {route.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {route.fromLocation} → {route.toLocation}
                            </p>
                            {route.description && (
                              <p className="text-sm text-muted-foreground mt-2">{route.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-3 text-sm">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {route.estimatedDistance} km
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                BDT {route.pricePerSeat} per seat
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Booking Form */}
            {selectedRoute && (
              <Card className="mt-8" data-testid="card-booking-form">
                <CardHeader>
                  <CardTitle>Book Your Seat</CardTitle>
                  <CardDescription>Complete the form to reserve your seat</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="timeSlotId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Office Entry Time *</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                handleTimeSlotChange(value);
                              }} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-timeslot">
                                  <SelectValue placeholder="Select office entry time" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {loadingTimeSlots ? (
                                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : timeSlots.length === 0 ? (
                                  <SelectItem value="none" disabled>No office entry times available</SelectItem>
                                ) : (
                                  timeSlots.map((slot) => {
                                    const bookingCount = bookingCounts[slot.id] || 0;
                                    return (
                                      <SelectItem key={slot.id} value={slot.id} data-testid={`option-timeslot-${slot.id}`}>
                                        <div className="flex items-center justify-between w-full">
                                          <span>Departure: {slot.departureTime}</span>
                                          {bookingCount > 0 && (
                                            <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                                              {bookingCount} {bookingCount === 1 ? 'booking' : 'bookings'}
                                            </span>
                                          )}
                                        </div>
                                      </SelectItem>
                                    );
                                  })
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="boardingPointId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pickup Point *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                              <FormControl>
                                <SelectTrigger data-testid="select-pickup">
                                  <SelectValue placeholder="Select pickup location" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {loadingPickupPoints ? (
                                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : pickupPoints.length === 0 ? (
                                  <SelectItem value="none" disabled>No pickup points available</SelectItem>
                                ) : (
                                  pickupPoints.map((point) => (
                                    <SelectItem key={point.id} value={point.id} data-testid={`option-pickup-${point.id}`}>
                                      {point.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dropOffPointId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Drop-off Point *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                              <FormControl>
                                <SelectTrigger data-testid="select-dropoff">
                                  <SelectValue placeholder="Select drop-off location" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {loadingPickupPoints ? (
                                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                                ) : pickupPoints.length === 0 ? (
                                  <SelectItem value="none" disabled>No drop-off points available</SelectItem>
                                ) : (
                                  pickupPoints.map((point) => (
                                    <SelectItem key={point.id} value={point.id} data-testid={`option-dropoff-${point.id}`}>
                                      {point.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="travelDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Travel Date *</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                    data-testid="button-travel-date"
                                  >
                                    {field.value ? (
                                      format(new Date(field.value), "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={field.value ? new Date(field.value) : undefined}
                                  onSelect={(date) => {
                                    field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                                  }}
                                  disabled={(date) =>
                                    date < new Date(new Date().setHours(0, 0, 0, 0))
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="customerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Your Name *</FormLabel>
                              <FormControl>
                                <input
                                  {...field}
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  placeholder="Enter your full name"
                                  data-testid="input-customer-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number *</FormLabel>
                              <FormControl>
                                <input
                                  {...field}
                                  type="tel"
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  placeholder="e.g., 01712345678"
                                  data-testid="input-phone"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email *</FormLabel>
                            <FormControl>
                              <input
                                {...field}
                                value={field.value || ''}
                                type="email"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="your.email@example.com"
                                data-testid="input-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={createBookingMutation.isPending}
                        data-testid="button-submit-booking"
                      >
                        {createBookingMutation.isPending ? "Booking..." : "Confirm Booking"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Info Sidebar */}
          <div className="space-y-6">
            <Card data-testid="card-how-it-works">
              <CardHeader>
                <CardTitle className="text-lg">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Choose a route</p>
                    <p className="text-muted-foreground">Select a route that matches your commute</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Book your seat</p>
                    <p className="text-muted-foreground">Select time, pickup/drop-off points</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Get confirmation</p>
                    <p className="text-muted-foreground">Receive email with trip details</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    4
                  </div>
                  <div>
                    <p className="font-medium">Share the ride</p>
                    <p className="text-muted-foreground">Enjoy a comfortable commute</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedRoute && selectedRouteDetails && (
              <Card data-testid="card-booking-summary">
                <CardHeader>
                  <CardTitle className="text-lg">Booking Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Route</p>
                    <p className="font-medium">{selectedRouteDetails.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">From → To</p>
                    <p className="font-medium">
                      {selectedRouteDetails.fromLocation} → {selectedRouteDetails.toLocation}
                    </p>
                  </div>
                  {selectedTimeSlotDetails && (
                    <div>
                      <p className="text-muted-foreground">Departure</p>
                      <p className="font-medium">
                        Time: {selectedTimeSlotDetails.departureTime}
                      </p>
                    </div>
                  )}
                  <div className="pt-3 border-t">
                    <p className="text-muted-foreground">Price per seat</p>
                    <p className="text-lg font-bold text-primary">BDT {selectedRouteDetails.pricePerSeat}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card data-testid="card-important-info">
              <CardHeader>
                <CardTitle className="text-lg">Important Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-start gap-2">
                  <Users className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Minimum 3 passengers required per trip</span>
                </p>
                <p className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>You'll be notified 2 hours before if trip is cancelled</span>
                </p>
                <p className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Book at least 4 hours before departure</span>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
