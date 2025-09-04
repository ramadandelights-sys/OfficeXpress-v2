import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Car, Calendar, Clock, MapPin, Users, ArrowLeftRight, Info } from "lucide-react";
import { format, addDays, differenceInDays, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { SimpleLocationDropdown } from "@/components/simple-location-dropdown";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

// New rental booking schema matching the new requirements
const newRentalBookingSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().regex(/^01[3-9]\d{8}$/, "Please enter a valid phone number (01XXXXXXXX)"),
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().optional(),
  serviceType: z.enum(["personal", "business", "airport", "wedding", "event", "tourism"]),
  vehicleType: z.enum(["standard", "premium", "suv", "microbus", "coaster"]),
  vehicleCapacity: z.enum(["4-sedan", "4-suv", "7-microbus", "15-microbus", "20-coaster", "25-coaster", "28-coaster", "32-coaster", "40-bus"]),
  fromLocation: z.string().min(3, "From location is required"),
  toLocation: z.string().min(3, "To location is required"),
  isReturnTrip: z.boolean().default(false),
});

type NewRentalBooking = z.infer<typeof newRentalBookingSchema>;

// Time options for 12-hour format
const timeOptions = [
  "1:00 AM", "2:00 AM", "3:00 AM", "4:00 AM", "5:00 AM", "6:00 AM",
  "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", 
  "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM", "12:00 AM"
];

// Vehicle capacity options by type
const vehicleCapacityOptions = {
  standard: [
    { value: "4-sedan", label: "4 seater (sedan)" }
  ],
  premium: [
    { value: "4-sedan", label: "4 seater (sedan)" }
  ],
  suv: [
    { value: "4-suv", label: "4 seater (SUV)" }
  ],
  microbus: [
    { value: "7-microbus", label: "7 seater (microbus)" },
    { value: "15-microbus", label: "15 seater (microbus)" }
  ],
  coaster: [
    { value: "20-coaster", label: "20 seater (coaster)" },
    { value: "25-coaster", label: "25 seater (coaster)" },
    { value: "28-coaster", label: "28 seater (coaster)" },
    { value: "32-coaster", label: "32 seater (coaster)" },
    { value: "40-bus", label: "40 seater (bus)" }
  ]
};

import toyotaCorollaImg from '@assets/generated_images/Toyota_Corolla_sedan_Bangladesh_a3630964.png';
import nissanXTrailImg from '@assets/generated_images/Nissan_X-Trail_SUV_Bangladesh_b2b5d75d.png';
import toyotaNoahImg from '@assets/generated_images/Toyota_Noah_microbus_Bangladesh_6c155568.png';
import toyotaHiaceImg from '@assets/generated_images/Toyota_Hiace_microbus_Bangladesh_768af3f9.png';
import toyotaCoasterImg from '@assets/generated_images/Toyota_Coaster_bus_Bangladesh_33049011.png';

// Vehicle images based on type and capacity
const vehicleImages = {
  "4-sedan": toyotaCorollaImg,
  "4-suv": nissanXTrailImg,
  "7-microbus": toyotaNoahImg,
  "15-microbus": toyotaHiaceImg,
  "20-coaster": toyotaCoasterImg,
  "25-coaster": toyotaCoasterImg,
  "28-coaster": toyotaCoasterImg,
  "32-coaster": toyotaCoasterImg,
  "40-bus": toyotaCoasterImg
};

export default function Rental() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const form = useForm<NewRentalBooking>({
    resolver: zodResolver(newRentalBookingSchema),
    defaultValues: {
      customerName: "",
      phone: "",
      email: "",
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
      serviceType: "business",
      vehicleType: "standard",
      vehicleCapacity: "4-sedan",
      fromLocation: "",
      toLocation: "",
      isReturnTrip: false,
    },
  });

  const watchedVehicleType = form.watch("vehicleType");
  const watchedVehicleCapacity = form.watch("vehicleCapacity");
  const watchedStartDate = form.watch("startDate");
  const watchedEndDate = form.watch("endDate");

  // Check if it's a single day rental
  const isSingleDayRental = watchedStartDate && watchedEndDate && watchedStartDate === watchedEndDate;

  // Auto-set today as default date on mount
  useEffect(() => {
    const today = new Date();
    setSelectedDate(today);
    setEndDate(today);
    form.setValue("startDate", format(today, "yyyy-MM-dd"));
    form.setValue("endDate", format(today, "yyyy-MM-dd"));
  }, [form]);

  // Update vehicle capacity options when vehicle type changes
  useEffect(() => {
    if (watchedVehicleType && vehicleCapacityOptions[watchedVehicleType as keyof typeof vehicleCapacityOptions]) {
      const options = vehicleCapacityOptions[watchedVehicleType as keyof typeof vehicleCapacityOptions];
      form.setValue("vehicleCapacity", options[0].value as any);
    }
  }, [watchedVehicleType, form]);

  const mutation = useMutation({
    mutationFn: async (data: NewRentalBooking) => {
      const response = await apiRequest("POST", "/api/rental-bookings", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Rental Booking Submitted",
        description: "Thank you for your rental request. We will contact you shortly to confirm the details.",
      });
      form.reset();
      setSelectedDate(undefined);
      setEndDate(undefined);
      queryClient.invalidateQueries({ queryKey: ["/api/rental-bookings"] });
    },
    onError: (error) => {
      console.error('Booking submission error:', error);
      toast({
        title: "Booking Failed",
        description: "Please check your information and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: NewRentalBooking) => {
    console.log('Form data before submission:', data);
    console.log('Form validation errors:', form.formState.errors);
    
    // Convert empty email to undefined for optional field
    const submitData = {
      ...data,
      email: data.email || undefined,
    };
    
    console.log('Data being sent to API:', submitData);
    mutation.mutate(submitData);
  };

  const formatDateRange = () => {
    if (!selectedDate) return "Select rental dates";
    if (!endDate || isSameDay(selectedDate, endDate)) {
      return format(selectedDate, "MMM dd, yyyy");
    }
    return `${format(selectedDate, "MMM dd")} - ${format(endDate, "MMM dd, yyyy")}`;
  };

  const getDayCount = () => {
    if (!selectedDate || !endDate) return 0;
    return differenceInDays(endDate, selectedDate) + 1;
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    if (!selectedDate || (selectedDate && endDate && !isSameDay(selectedDate, endDate))) {
      // First selection or reset range
      setSelectedDate(date);
      setEndDate(date);
      form.setValue("startDate", format(date, "yyyy-MM-dd"));
      form.setValue("endDate", format(date, "yyyy-MM-dd"));
    } else if (date > selectedDate) {
      // Second selection for range
      setEndDate(date);
      form.setValue("endDate", format(date, "yyyy-MM-dd"));
    } else {
      // New first date
      setSelectedDate(date);
      setEndDate(date);
      form.setValue("startDate", format(date, "yyyy-MM-dd"));
      form.setValue("endDate", format(date, "yyyy-MM-dd"));
    }
    setIsCalendarOpen(false);
  };

  const currentVehicleImage = vehicleImages[watchedVehicleCapacity as keyof typeof vehicleImages];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Reliable Transportation<br />Solutions
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Book quality vehicles for your personal and business transportation needs. 
            From daily commutes to special events, we have the perfect solution.
          </p>
        </div>
      </section>

      {/* Booking Form Section */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Vehicle Image Display */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Your Selected Vehicle</CardTitle>
                </CardHeader>
                <CardContent>
                  <img 
                    src={currentVehicleImage}
                    alt={`${watchedVehicleCapacity} vehicle`}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                    data-testid="vehicle-image"
                  />
                  <div className="text-center">
                    <h3 className="font-semibold text-lg">
                      {vehicleCapacityOptions[watchedVehicleType as keyof typeof vehicleCapacityOptions]?.find(
                        option => option.value === watchedVehicleCapacity
                      )?.label}
                    </h3>
                    <p className="text-muted-foreground">
                      Popular {watchedVehicleType === 'standard' ? 'economy' : watchedVehicleType} vehicle in Bangladesh
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Booking Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-center">
                  Book Your Rental
                </CardTitle>
                <p className="text-muted-foreground text-center">
                  Fill out the form below to request your vehicle rental
                </p>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Customer Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="customerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your name"
                                {...field}
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
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                                  (+88)
                                </span>
                                <Input 
                                  placeholder="01XXXXXXXXX"
                                  className="pl-12"
                                  {...field}
                                  data-testid="input-phone"
                                />
                              </div>
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
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="your.email@example.com"
                              {...field}
                              data-testid="input-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Service, Vehicle Type, Capacity moved up */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="serviceType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Type *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-service-type">
                                  <SelectValue placeholder="Select service" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="personal">Personal</SelectItem>
                                <SelectItem value="business">Business</SelectItem>
                                <SelectItem value="airport">Airport Transfer</SelectItem>
                                <SelectItem value="wedding">Wedding</SelectItem>
                                <SelectItem value="event">Event</SelectItem>
                                <SelectItem value="tourism">Tourism</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="vehicleType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vehicle Type *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-vehicle-type">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="standard">Standard (Cars 2006-2010)</SelectItem>
                                <SelectItem value="premium">Premium (Cars 2011+)</SelectItem>
                                <SelectItem value="suv">SUV</SelectItem>
                                <SelectItem value="microbus">Microbus</SelectItem>
                                <SelectItem value="coaster">Coaster/Bus</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="vehicleCapacity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vehicle Capacity *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-vehicle-capacity">
                                  <SelectValue placeholder="Select capacity" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {watchedVehicleType && vehicleCapacityOptions[watchedVehicleType as keyof typeof vehicleCapacityOptions]?.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Rental Period */}
                    <div className="space-y-4">
                      <FormLabel>Rental Period *</FormLabel>
                      <div className="border rounded-lg p-4">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                          data-testid="button-calendar"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {formatDateRange()}
                          {getDayCount() > 1 && (
                            <span className="ml-auto text-primary">
                              {getDayCount()} days
                            </span>
                          )}
                        </Button>
                        {isCalendarOpen && (
                          <div className="mt-4">
                            <CalendarComponent
                              mode="single"
                              selected={selectedDate}
                              onSelect={handleDateSelect}
                              disabled={(date) => date < new Date()}
                              className="rounded-md border"
                              data-testid="calendar-component"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Time Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Start Time *
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-start-time">
                                  <SelectValue placeholder="Select start time" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {timeOptions.map((time) => (
                                  <SelectItem key={time} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {isSingleDayRental && (
                        <FormField
                          control={form.control}
                          name="endTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                End Time *
                              </FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-end-time">
                                    <SelectValue placeholder="Select end time" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {timeOptions.map((time) => (
                                    <SelectItem key={time} value={time}>
                                      {time}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    {/* Location Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="fromLocation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              From *
                            </FormLabel>
                            <FormControl>
                              <SimpleLocationDropdown
                                value={field.value}
                                placeholder="Type to search pickup location..."
                                onSelect={field.onChange}
                                error={!!form.formState.errors.fromLocation}
                              />
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
                            <FormLabel className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              To *
                            </FormLabel>
                            <FormControl>
                              <SimpleLocationDropdown
                                value={field.value}
                                placeholder="Type to search destination..."
                                onSelect={field.onChange}
                                error={!!form.formState.errors.toLocation}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Return Trip Checkbox */}
                    <FormField
                      control={form.control}
                      name="isReturnTrip"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-return-trip"
                              />
                            </FormControl>
                            <FormLabel className="text-sm flex items-center gap-2">
                              <ArrowLeftRight className="w-4 h-4" />
                              Both Way / Return Trip?
                            </FormLabel>
                          </div>
                          <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                              Check this if you need transportation back to your pickup location after reaching your destination.
                            </AlertDescription>
                          </Alert>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={mutation.isPending}
                      data-testid="button-submit-rental"
                    >
                      {mutation.isPending ? "Submitting..." : "Submit Rental Request"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}