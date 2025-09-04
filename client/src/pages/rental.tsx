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
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Car className="w-4 h-4" />
            Premium Vehicle Rental
          </div>
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

                        {/* Quick Day Selector */}
                        <div className="flex flex-wrap gap-2">
                          <span className="text-sm text-muted-foreground mr-2">Quick select:</span>
                          {[1, 2, 3, 5, 7].map(days => (
                            <Button
                              key={days}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuickDaySelect(days)}
                              data-testid={`button-quick-${days}-day`}
                            >
                              {days} day{days !== 1 ? "s" : ""}
                            </Button>
                          ))}
                        </div>

                        {/* Calendar */}
                        {isCalendarOpen && (
                          <div className="border rounded-md p-4 bg-background">
                            <DayPicker
                              mode="range"
                              selected={selectedRange}
                              onSelect={setSelectedRange}
                              disabled={{ before: new Date() }}
                              className="w-full"
                            />
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
                            <FormControl>
                              <Input 
                                placeholder="Enter pickup address" 
                                {...field} 
                                value={field.value || ""}
                                data-testid="input-pickup-location"
                              />
                            </FormControl>
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
                            <FormControl>
                              <Input 
                                placeholder="Enter drop-off address" 
                                {...field} 
                                value={field.value || ""}
                                data-testid="input-dropoff-location"
                              />
                            </FormControl>
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