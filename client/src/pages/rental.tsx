import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Car, Calendar, Clock, MapPin } from "lucide-react";
import { DayPicker, type DateRange } from "react-day-picker";
import { format, addDays, differenceInDays } from "date-fns";
import rentalImage from "@/assets/rental-illustration.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertRentalBookingSchema, type InsertRentalBooking } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

// Extended schema for the new rental form
const extendedRentalBookingSchema = insertRentalBookingSchema.extend({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
});

type ExtendedRentalBooking = z.infer<typeof extendedRentalBookingSchema>;

export default function Rental() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Fetch Bangladesh locations from database
  const { data: locations = [] } = useQuery({
    queryKey: ['/api/bangladesh-locations'],
    select: (data: any[]) => data.map(location => location.fullName).sort()
  });
  
  // Calculate number of months to show - 2 months if current date > 28th, otherwise 1
  const getNumberOfMonths = () => {
    const today = new Date();
    const dayOfMonth = today.getDate();
    return dayOfMonth > 28 ? 2 : 1;
  };
  
  const form = useForm<ExtendedRentalBooking>({
    resolver: zodResolver(extendedRentalBookingSchema),
    defaultValues: {
      customerName: "",
      phone: "",
      email: "",
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
      duration: "",
      serviceType: "",
      vehicleType: "",
      vehicleCapacity: "",
      pickupLocation: "",
      dropoffLocation: "",
    },
  });

  const watchedStartDate = form.watch("startDate");
  const watchedEndDate = form.watch("endDate");

  // Calculate if rental is single day and show/hide duration field
  const isSingleDay = watchedStartDate && watchedEndDate && watchedStartDate === watchedEndDate;

  // Update form when date range changes
  useEffect(() => {
    if (selectedRange?.from) {
      form.setValue("startDate", format(selectedRange.from, "yyyy-MM-dd"));
    }
    if (selectedRange?.to) {
      form.setValue("endDate", format(selectedRange.to, "yyyy-MM-dd"));
    } else if (selectedRange?.from) {
      // If only start date is selected, set end date to same day
      form.setValue("endDate", format(selectedRange.from, "yyyy-MM-dd"));
    }
  }, [selectedRange, form]);

  // Quick day selector handler
  const handleQuickDaySelect = (days: number) => {
    const startDate = new Date();
    const endDate = addDays(startDate, days - 1);
    
    setSelectedRange({ from: startDate, to: endDate });
    setIsCalendarOpen(false);
  };

  const mutation = useMutation({
    mutationFn: async (data: ExtendedRentalBooking) => {
      const response = await apiRequest("POST", "/api/rental-bookings", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Rental Booking Submitted",
        description: "Thank you for your rental request. We will contact you shortly to confirm the details.",
      });
      form.reset();
      setSelectedRange(undefined);
      queryClient.invalidateQueries({ queryKey: ["/api/rental-bookings"] });
    },
    onError: () => {
      toast({
        title: "Booking Failed",
        description: "Please check your information and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ExtendedRentalBooking) => {
    // Convert empty email to undefined for optional field
    const submitData = {
      ...data,
      email: data.email || undefined,
    };
    mutation.mutate(submitData);
  };

  const formatDateRange = () => {
    if (!selectedRange?.from) return "Select rental dates";
    if (!selectedRange.to) return format(selectedRange.from, "MMM dd, yyyy");
    if (selectedRange.from.getTime() === selectedRange.to.getTime()) {
      return format(selectedRange.from, "MMM dd, yyyy");
    }
    return `${format(selectedRange.from, "MMM dd")} - ${format(selectedRange.to, "MMM dd, yyyy")}`;
  };

  const getDayCount = () => {
    if (!selectedRange?.from || !selectedRange?.to) return 0;
    return differenceInDays(selectedRange.to, selectedRange.from) + 1;
  };

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
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <img 
                src={rentalImage} 
                alt="Professional rental service illustration" 
                className="rounded-xl shadow-lg w-full h-auto"
                data-testid="rental-fleet-image"
              />
            </div>

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
                            <FormLabel>Full Name *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your full name" 
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
                              <Input 
                                placeholder="Enter your phone number" 
                                {...field} 
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
                          <FormLabel>Email Address (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="Enter your email address" 
                              {...field} 
                              data-testid="input-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Date Selection */}
                    <div className="space-y-4">
                      <FormLabel>Rental Period *</FormLabel>
                      
                      {/* Date Display and Calendar Toggle */}
                      <div className="space-y-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                          data-testid="button-date-selector"
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          {formatDateRange()}
                          {getDayCount() > 0 && (
                            <span className="ml-auto text-primary font-medium">
                              {getDayCount()} day{getDayCount() !== 1 ? "s" : ""}
                            </span>
                          )}
                        </Button>


                        {/* Calendar */}
                        {isCalendarOpen && (
                          <div className="border rounded-lg p-6 bg-background shadow-lg">
                            <DayPicker
                              mode="range"
                              selected={selectedRange}
                              onSelect={setSelectedRange}
                              disabled={{ before: new Date() }}
                              numberOfMonths={getNumberOfMonths()}
                              className="w-full"
                              classNames={{
                                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                                month: "space-y-4",
                                caption: "flex justify-center pt-1 relative items-center",
                                caption_label: "text-sm font-medium",
                                nav: "space-x-1 flex items-center",
                                nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                                nav_button_previous: "absolute left-1",
                                nav_button_next: "absolute right-1",
                                table: "w-full border-collapse space-y-1",
                                head_row: "flex",
                                head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                                row: "flex w-full mt-2",
                                cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md",
                                day_range_end: "day-range-end",
                                day_range_start: "day-range-start",
                                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                                day_today: "bg-accent text-accent-foreground",
                                day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                                day_disabled: "text-muted-foreground opacity-50",
                                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                                day_hidden: "invisible",
                              }}
                            />
                            
                            {/* Confirm Button */}
                            <div className="flex justify-end mt-4 pt-4 border-t">
                              <Button
                                type="button"
                                onClick={() => setIsCalendarOpen(false)}
                                disabled={!selectedRange?.from || !selectedRange?.to}
                                data-testid="button-confirm-dates"
                              >
                                Confirm Dates
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Hidden date fields for form validation */}
                      <div className="hidden">
                        <FormField
                          control={form.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} />
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
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Time Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Start Time
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="time" 
                                {...field} 
                                value={field.value || ""}
                                data-testid="input-start-time"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              End Time
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="time" 
                                {...field} 
                                value={field.value || ""}
                                data-testid="input-end-time"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Duration field - only show for single day rentals */}
                    {isSingleDay && (
                      <FormField
                        control={form.control}
                        name="duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration (for single day rental)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-duration">
                                  <SelectValue placeholder="Select duration" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="half-day">Half Day (4 hours)</SelectItem>
                                <SelectItem value="full-day">Full Day (8 hours)</SelectItem>
                                <SelectItem value="custom">Custom Duration</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Service Type */}
                    <FormField
                      control={form.control}
                      name="serviceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-service-type">
                                <SelectValue placeholder="Select service type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="personal">Personal Use</SelectItem>
                              <SelectItem value="business">Business</SelectItem>
                              <SelectItem value="airport">Airport Transfer</SelectItem>
                              <SelectItem value="wedding">Wedding</SelectItem>
                              <SelectItem value="event">Special Event</SelectItem>
                              <SelectItem value="tourism">Tourism</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Vehicle Type */}
                    <FormField
                      control={form.control}
                      name="vehicleType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-vehicle-type">
                                <SelectValue placeholder="Select vehicle type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="super-economy">Super Economy (Cars before 2000)</SelectItem>
                              <SelectItem value="economy">Economy (Cars 2001-2005)</SelectItem>
                              <SelectItem value="standard">Standard (Cars 2006-2010)</SelectItem>
                              <SelectItem value="premium">Premium (Cars 2011-2015)</SelectItem>
                              <SelectItem value="luxury">Luxury (Cars 2016-2020)</SelectItem>
                              <SelectItem value="ultra-luxury">Ultra Luxury (Cars 2021-2025)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Vehicle Capacity */}
                    <FormField
                      control={form.control}
                      name="vehicleCapacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle Capacity</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-vehicle-capacity">
                                <SelectValue placeholder="Select vehicle capacity" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="4-sedan">4 seater (sedan)</SelectItem>
                              <SelectItem value="7-microbus">7 seater (microbus)</SelectItem>
                              <SelectItem value="11-microbus">11 seater (microbus)</SelectItem>
                              <SelectItem value="28-coaster">28 seater (coaster)</SelectItem>
                              <SelectItem value="32-coaster">32 seater (coaster)</SelectItem>
                              <SelectItem value="40-bus">40 seater (bus)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Location Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="pickupLocation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              Pickup Location
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-pickup-location">
                                  <SelectValue placeholder="Select pickup location" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-60">
                                {locations.map((location) => (
                                  <SelectItem key={location} value={location}>
                                    {location}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dropoffLocation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              Drop-off Location
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-dropoff-location">
                                  <SelectValue placeholder="Select drop-off location" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-60">
                                {locations.map((location) => (
                                  <SelectItem key={location} value={location}>
                                    {location}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

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

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Our Rental Service?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We provide reliable, professional transportation solutions for all your needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="bg-primary/10 text-primary w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Car className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Quality Fleet</h3>
              <p className="text-muted-foreground">
                Well-maintained vehicles with professional drivers for your safety and comfort
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-primary/10 text-primary w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Flexible Scheduling</h3>
              <p className="text-muted-foreground">
                Book for single days or extended periods with flexible timing options
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-primary/10 text-primary w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Convenient Locations</h3>
              <p className="text-muted-foreground">
                Pickup and drop-off at your preferred locations across the city
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}