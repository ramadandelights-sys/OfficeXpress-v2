import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HoneypotFields } from "@/components/HoneypotFields";
import { RecaptchaField } from "@/components/RecaptchaField";

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
  vehicleType: z.enum(["super-economy", "economy", "standard", "premium", "luxury", "ultra-luxury"]),
  vehicleCapacity: z.enum(["4", "7", "11", "28", "32", "40"]),
  fromLocation: z.string().min(3, "From location is required"),
  toLocation: z.string().min(3, "To location is required"),
  isReturnTrip: z.boolean().default(false),
  // Honeypot fields
  email_confirm: z.string().optional(),
  website: z.string().optional(),
  company_url: z.string().optional(),
  phone_secondary: z.string().optional(),
  // reCAPTCHA field
  recaptcha: z.string().min(1, "Please complete the security verification")
});

type NewRentalBooking = z.infer<typeof newRentalBookingSchema>;

// Time options for 12-hour format
const timeOptions = [
  "1:00 AM", "2:00 AM", "3:00 AM", "4:00 AM", "5:00 AM", "6:00 AM",
  "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", 
  "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM", "12:00 AM"
];

// Vehicle capacity options (all available for any vehicle type)
const vehicleCapacityOptions = [
  { value: "4", label: "4 seater" },
  { value: "7", label: "7 seater" },
  { value: "11", label: "11 seater" },
  { value: "28", label: "28 seater" },
  { value: "32", label: "32 seater" },
  { value: "40", label: "40 seater" }
];

import toyotaCorollaImg from '@assets/generated_images/Toyota_Corolla_no_background_58143ea8.png';
import nissanXTrailImg from '@assets/generated_images/Nissan_X-Trail_no_background_9afd440e.png';
import toyotaNoahImg from '@assets/generated_images/Toyota_Noah_no_background_818e72bc.png';
import toyotaHiaceImg from '@assets/generated_images/Toyota_Hiace_no_background_dc94ebb5.png';
import toyotaCoasterImg from '@assets/generated_images/Toyota_Coaster_no_background_fa225ee4.png';

// Vehicle images based on capacity
const vehicleImages = {
  "4": toyotaCorollaImg,
  "7": toyotaNoahImg,
  "11": toyotaHiaceImg,
  "28": toyotaCoasterImg,
  "32": toyotaCoasterImg,
  "40": toyotaCoasterImg
};

// Progress Indicator Component
function ProgressIndicator({ currentStep, onStepClick }: { 
  currentStep: number; 
  onStepClick: (step: number) => void;
}) {
  const steps = [
    { number: 1, label: "User Information" },
    { number: 2, label: "Service Information" },
    { number: 3, label: "Trip Information" }
  ];

  // Auto-determine completed steps based on current step
  const isCompleted = (stepNumber: number) => stepNumber < currentStep;
  const isCurrent = (stepNumber: number) => stepNumber === currentStep;
  const canNavigate = (stepNumber: number) => isCompleted(stepNumber) || isCurrent(stepNumber);

  return (
    <div className="mb-8">
      {/* Progress Bars */}
      <div className="flex items-center gap-3 mb-6">
        {steps.map((step) => (
          <button
            key={step.number}
            type="button"
            onClick={() => {
              if (canNavigate(step.number)) {
                onStepClick(step.number);
              }
            }}
            disabled={!canNavigate(step.number)}
            className={`
              flex-1 h-2 rounded-full transition-all duration-200
              ${isCurrent(step.number)
                ? 'bg-primary' 
                : isCompleted(step.number)
                ? 'bg-primary opacity-50'
                : 'border-2 border-muted-foreground/40 bg-transparent'
              }
              ${canNavigate(step.number)
                ? 'cursor-pointer hover:opacity-80' 
                : 'cursor-not-allowed'
              }
            `}
          />
        ))}
      </div>
      
      {/* Step Title - Centered */}
      <h3 className="text-xl font-semibold text-center mb-6">
        {steps.find(s => s.number === currentStep)?.label}
      </h3>
    </div>
  );
}

export default function Rental() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [tempSelectedDate, setTempSelectedDate] = useState<Date | undefined>();
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  
  // Track search string for reactive query param handling
  const [searchString, setSearchString] = useState(window.location.search);
  
  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1);
  const [showThankYou, setShowThankYou] = useState(false);
  const [submittedData, setSubmittedData] = useState<NewRentalBooking | null>(null);
  
  const form = useForm<NewRentalBooking>({
    resolver: zodResolver(newRentalBookingSchema),
    shouldUnregister: false, // Keep form values when fields are hidden
    defaultValues: {
      customerName: "",
      phone: "",
      email: "",
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
      serviceType: "business",
      vehicleType: "economy",
      vehicleCapacity: "4",
      fromLocation: "",
      toLocation: "",
      isReturnTrip: false,
      // Honeypot fields
      email_confirm: "",
      website: "",
      company_url: "",
      phone_secondary: "",
      recaptcha: ""
    },
  });
  
  // Sync step with URL on mount and handle navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const stepParam = urlParams.get('step');
    const stepNumber = parseInt(stepParam || '1');
    
    if (stepNumber >= 1 && stepNumber <= 3) {
      setCurrentStep(stepNumber);
    }
  }, []);

  // Listen for navigation changes to update search string
  useEffect(() => {
    const handleLocationChange = () => {
      setSearchString(window.location.search);
      
      // Also update step from URL
      const urlParams = new URLSearchParams(window.location.search);
      const stepParam = urlParams.get('step');
      const stepNumber = parseInt(stepParam || '1');
      
      if (stepNumber >= 1 && stepNumber <= 3) {
        setCurrentStep(stepNumber);
      }
    };
    
    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', handleLocationChange);
    
    // Also check periodically for programmatic navigation
    const intervalId = setInterval(handleLocationChange, 100);
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      clearInterval(intervalId);
    };
  }, []);
  
  // Pre-select service type from URL query parameter (updates when on step 2)
  useEffect(() => {
    if (currentStep === 2) {
      const urlParams = new URLSearchParams(searchString);
      const serviceParam = urlParams.get('service');
      const validServices = ["personal", "business", "airport", "wedding", "event", "tourism"];
      
      if (serviceParam && validServices.includes(serviceParam)) {
        form.setValue('serviceType', serviceParam as any);
      } else if (!form.getValues('serviceType')) {
        // Only reset to default if no service type is set
        form.setValue('serviceType', 'business');
      }
    }
  }, [currentStep, searchString, form]);

  const watchedVehicleType = form.watch("vehicleType");
  const watchedVehicleCapacity = form.watch("vehicleCapacity");
  const watchedStartDate = form.watch("startDate");
  const watchedEndDate = form.watch("endDate");
  const watchedStartTime = form.watch("startTime");

  // Check if it's a single day rental
  const isSingleDayRental = watchedStartDate && watchedEndDate && watchedStartDate === watchedEndDate;

  // Step validation logic
  const validateStep = async (step: number): Promise<boolean> => {
    let fieldsToValidate: (keyof NewRentalBooking)[] = [];
    
    switch (step) {
      case 1:
        fieldsToValidate = ['customerName', 'phone', 'email'];
        break;
      case 2:
        fieldsToValidate = ['serviceType', 'vehicleType', 'vehicleCapacity'];
        break;
      case 3:
        fieldsToValidate = ['startDate', 'endDate', 'startTime', 'fromLocation', 'toLocation', 'recaptcha'];
        // Add endTime only for single-day rentals
        if (isSingleDayRental) {
          fieldsToValidate.push('endTime');
        }
        break;
    }
    
    const result = await form.trigger(fieldsToValidate);
    return result;
  };

  // Navigate to a specific step with URL update
  const navigateToStep = (step: number) => {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('step', step.toString());
    
    // Preserve service parameter if present
    const currentService = urlParams.get('service');
    const newUrl = currentService 
      ? `/rental?service=${currentService}&step=${step}`
      : `/rental?step=${step}`;
    
    window.history.pushState({}, '', newUrl);
    setCurrentStep(step);
  };

  // Handle next step
  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    
    if (isValid) {
      // Move to next step
      navigateToStep(currentStep + 1);
    }
  };

  // Handle back step
  const handleBack = () => {
    navigateToStep(currentStep - 1);
  };

  // Handle progress bar click
  const handleStepClick = (step: number) => {
    navigateToStep(step);
  };

  // Get filtered end time options (only times after start time for same-day rentals)
  const getFilteredEndTimeOptions = () => {
    if (!isSingleDayRental || !watchedStartTime) {
      return timeOptions;
    }
    
    const startIndex = timeOptions.findIndex(time => time === watchedStartTime);
    if (startIndex === -1) {
      return timeOptions;
    }
    
    // Return only times after the selected start time
    return timeOptions.slice(startIndex + 1);
  };

  // Don't auto-select dates - let users pick their own dates

  // Clear end time when start time changes for same-day rentals to avoid invalid combinations
  useEffect(() => {
    if (isSingleDayRental && watchedStartTime) {
      const currentEndTime = form.getValues("endTime");
      const filteredOptions = getFilteredEndTimeOptions();
      
      // If current end time is not in the filtered options, clear it
      if (currentEndTime && !filteredOptions.includes(currentEndTime)) {
        form.setValue("endTime", "");
      }
    }
  }, [watchedStartTime, isSingleDayRental, form]);

  // No need to change capacity options based on vehicle type anymore

  const mutation = useMutation({
    mutationFn: async (data: NewRentalBooking) => {
      // Extract only the actual booking data (remove honeypot and recaptcha fields)
      const { email_confirm, website, company_url, phone_secondary, recaptcha, ...bookingData } = data;
      const response = await apiRequest("POST", "/api/rental-bookings", { 
        ...bookingData,
        recaptcha,
        serviceType: 'rental' as const,
        capacity: data.vehicleCapacity,
        vehicleCapacity: data.vehicleCapacity,
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Save submitted data and show thank you screen
      setSubmittedData(variables);
      setShowThankYou(true);
      queryClient.invalidateQueries({ queryKey: ["/api/rental-bookings"] });
      
      // Redirect back to rental form after 5 seconds
      setTimeout(() => {
        setShowThankYou(false);
        setSubmittedData(null);
        form.reset();
        setSelectedDate(undefined);
        setEndDate(undefined);
        setCurrentStep(1);
        setLocation('/rental?step=1');
      }, 5000);
    },
    onError: (error) => {
      console.error('Booking submission error:', error);
      toast({
        title: "Booking Failed",
        description: error.message || "Please check your information and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: NewRentalBooking) => {
    // Client-side honeypot validation
    const honeypotFields = ['email_confirm', 'website', 'company_url', 'phone_secondary'];
    const hasHoneypotValue = honeypotFields.some(field => data[field as keyof typeof data] && data[field as keyof typeof data]?.toString().trim() !== '');
    
    if (hasHoneypotValue) {
      // Silently prevent submission - don't show error to avoid alerting bots
      console.log('Bot detected - honeypot field filled');
      return;
    }

    // Convert empty email to undefined for optional field and prepare data
    const submitData = {
      ...data,
      email: data.email || "",
      startDate: selectedDate?.toISOString().split('T')[0] || '',
      endDate: endDate?.toISOString().split('T')[0] || '',
      // For multi-day rentals, don't send endTime (backend will set default)
      endTime: isSingleDayRental ? data.endTime : undefined,
    };
    
    mutation.mutate(submitData);
  };

  const formatDateRange = () => {
    if (!selectedDate) return "Select rental dates";
    if (!endDate || isSameDay(selectedDate, endDate)) {
      return format(selectedDate, "MMM dd, yyyy");
    }
    return `${format(selectedDate, "MMM dd")} - ${format(endDate, "MMM dd, yyyy")}`;
  };
  
  const formatTempDateRange = () => {
    if (!tempSelectedDate) return "Select rental dates";
    if (!tempEndDate || isSameDay(tempSelectedDate, tempEndDate)) {
      return format(tempSelectedDate, "MMM dd, yyyy");
    }
    return `${format(tempSelectedDate, "MMM dd")} - ${format(tempEndDate, "MMM dd, yyyy")}`;
  };

  const getDayCount = () => {
    if (!selectedDate || !endDate) return 0;
    return differenceInDays(endDate, selectedDate) + 1;
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    if (!tempSelectedDate || (tempSelectedDate && tempEndDate && !isSameDay(tempSelectedDate, tempEndDate))) {
      // First selection or reset range
      setTempSelectedDate(date);
      setTempEndDate(date);
    } else if (date > tempSelectedDate) {
      // Second selection for range
      setTempEndDate(date);
    } else if (date < tempSelectedDate) {
      // Earlier date selected, make it start date
      setTempEndDate(tempSelectedDate);
      setTempSelectedDate(date);
    } else {
      // Same date clicked
      setTempSelectedDate(date);
      setTempEndDate(date);
    }
  };
  
  const confirmDateSelection = () => {
    if (tempSelectedDate) {
      setSelectedDate(tempSelectedDate);
      setEndDate(tempEndDate || tempSelectedDate);
      form.setValue("startDate", format(tempSelectedDate, "yyyy-MM-dd"));
      form.setValue("endDate", format(tempEndDate || tempSelectedDate, "yyyy-MM-dd"));
      setIsCalendarOpen(false);
    }
  };
  
  const cancelDateSelection = () => {
    setTempSelectedDate(selectedDate);
    setTempEndDate(endDate);
    setIsCalendarOpen(false);
  };

  const currentVehicleImage = vehicleImages[watchedVehicleCapacity as keyof typeof vehicleImages];
  
  // Handle image loading state
  useEffect(() => {
    setImageLoading(true);
    const timer = setTimeout(() => setImageLoading(false), 100);
    return () => clearTimeout(timer);
  }, [watchedVehicleCapacity, watchedVehicleType]);

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
          <div className="max-w-2xl mx-auto">

            {showThankYou && submittedData ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center space-y-6">
                    <div className="flex justify-center">
                      <div className="rounded-full bg-primary/10 p-6">
                        <svg className="w-16 h-16 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <h2 className="text-3xl font-bold">Thank You!</h2>
                    <p className="text-lg text-muted-foreground">
                      Your rental booking has been submitted successfully.
                    </p>
                    
                    <div className="max-w-md mx-auto bg-muted/50 rounded-lg p-6 space-y-4 text-left">
                      <h3 className="font-semibold text-center mb-4">Booking Summary</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Name:</span>
                          <span className="font-medium">{submittedData.customerName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Phone:</span>
                          <span className="font-medium">{submittedData.phone}</span>
                        </div>
                        {submittedData.email && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="font-medium">{submittedData.email}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Service:</span>
                          <span className="font-medium capitalize">{submittedData.serviceType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Vehicle:</span>
                          <span className="font-medium capitalize">{submittedData.vehicleCapacity} seater - {submittedData.vehicleType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">From:</span>
                          <span className="font-medium">{submittedData.fromLocation}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">To:</span>
                          <span className="font-medium">{submittedData.toLocation}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Return Trip:</span>
                          <span className="font-medium">{submittedData.isReturnTrip ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      We will contact you shortly to confirm the details.<br />
                      Redirecting you back to the form in a moment...
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
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
                  {/* Progress Indicator */}
                  <ProgressIndicator 
                    currentStep={currentStep} 
                    onStepClick={handleStepClick}
                  />

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      {/* Step 1: User Information */}
                      {currentStep === 1 && (
                        <>
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
                              <div className="flex gap-1">
                                <div className="bg-muted rounded-md px-3 py-2 text-sm text-muted-foreground flex items-center">
                                  (+88)
                                </div>
                                <Input 
                                  placeholder="01XXXXXXXXX"
                                  className="flex-1"
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

                          {/* Honeypot Fields - Hidden from users */}
                          <HoneypotFields control={form.control} />

                          <Button 
                            type="button"
                            onClick={handleNext}
                            className="w-full"
                            data-testid="button-next-step-1"
                          >
                            Next
                          </Button>
                        </>
                      )}

                      {/* Step 2: Service Information */}
                      {currentStep === 2 && (
                        <>
                          {/* Service, Vehicle Type, Capacity */}
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
                                <SelectItem value="super-economy">Super Economy</SelectItem>
                                <SelectItem value="economy">Economy</SelectItem>
                                <SelectItem value="standard">Standard</SelectItem>
                                <SelectItem value="premium">Premium</SelectItem>
                                <SelectItem value="luxury">Luxury</SelectItem>
                                <SelectItem value="ultra-luxury">Ultra Luxury</SelectItem>
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
                                {vehicleCapacityOptions.map((option) => (
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

                          {/* Vehicle Image Preview */}
                          {currentVehicleImage && (
                            <div className="flex justify-center">
                              <div className="text-center">
                                <div className="relative w-[200px] h-[200px] mx-auto mb-2">
                                  {imageLoading && (
                                    <div className="absolute inset-0 bg-muted rounded-lg animate-pulse" />
                                  )}
                                  <img 
                                    src={currentVehicleImage}
                                    alt={`${watchedVehicleCapacity} vehicle`}
                                    className={`w-full h-full object-contain rounded-lg transition-opacity duration-200 ${
                                      imageLoading ? 'opacity-0' : 'opacity-100'
                                    }`}
                                    data-testid="vehicle-image"
                                    onLoad={() => setImageLoading(false)}
                                  />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {vehicleCapacityOptions.find(option => option.value === watchedVehicleCapacity)?.label} - {watchedVehicleType}
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-4">
                            <Button 
                              type="button"
                              onClick={handleBack}
                              variant="outline"
                              className="w-full"
                              data-testid="button-back-step-2"
                            >
                              Back
                            </Button>
                            <Button 
                              type="button"
                              onClick={handleNext}
                              className="w-full"
                              data-testid="button-next-step-2"
                            >
                              Next
                            </Button>
                          </div>
                        </>
                      )}

                      {/* Step 3: Trip Information */}
                      {currentStep === 3 && (
                        <>
                          {/* Rental Period */}
                    <div className="space-y-4">
                      <FormLabel>Rental Period *</FormLabel>
                      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            onClick={() => {
                              // Initialize temp dates to current selection (or undefined for first selection)
                              setTempSelectedDate(selectedDate || undefined);
                              setTempEndDate(endDate || undefined);
                              setIsCalendarOpen(true);
                            }}
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
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <div className="space-y-4 p-4">
                            <div className="text-center text-sm text-muted-foreground">
                              {formatTempDateRange()}
                            </div>
                            <CalendarComponent
                              mode="range"
                              selected={tempSelectedDate ? { from: tempSelectedDate, to: tempEndDate } : undefined}
                              onSelect={(range) => {
                                if (range?.from) {
                                  setTempSelectedDate(range.from);
                                  setTempEndDate(range.to || range.from);
                                }
                              }}
                              disabled={(date) => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                return date < today;
                              }}
                              className="rounded-md"
                              data-testid="calendar-component"
                            />
                            <div className="flex gap-2 justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={cancelDateSelection}
                                data-testid="button-cancel-date"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                onClick={confirmDateSelection}
                                disabled={!tempSelectedDate}
                                data-testid="button-confirm-date"
                              >
                                Confirm
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
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
                                        {getFilteredEndTimeOptions().map((time) => (
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

                          {/* Separator */}
                          <div className="border-t pt-6">
                            <h3 className="text-sm font-semibold mb-4">Security Verification</h3>
                            
                            {/* reCAPTCHA */}
                            <RecaptchaField 
                              control={form.control} 
                              name="recaptcha" 
                              siteKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                              required={true}
                            />
                          </div>

                          <div className="flex gap-4">
                            <Button 
                              type="button"
                              onClick={handleBack}
                              variant="outline"
                              className="w-full"
                              data-testid="button-back-step-3"
                            >
                              Back
                            </Button>
                            <Button 
                              type="submit" 
                              className="w-full" 
                              disabled={mutation.isPending}
                              data-testid="button-submit-rental"
                            >
                              {mutation.isPending ? "Submitting..." : "Submit Rental Request"}
                            </Button>
                          </div>
                        </>
                      )}
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}