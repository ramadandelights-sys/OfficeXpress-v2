import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Route, Building, Calendar, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertCorporateBookingSchema, type InsertCorporateBooking } from "@shared/schema";
import { HoneypotFields } from "@/components/HoneypotFields";
import { RecaptchaField } from "@/components/RecaptchaField";
import { z } from "zod";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

// Services data
const services = [
  {
    icon: Route,
    iconBg: "bg-brand-primary/20",
    iconColor: "text-brand-primary",
    title: "Daily Employee Commutes",
    description: "Guarantee operational excellence and seamless team mobility. We provide structured, daily transportation with fixed routes, precise scheduling, and live location tracking, ensuring your entire team arrives on time, every time, and ready for peak productivity."
  },
  {
    icon: Calendar,
    iconBg: "bg-brand-secondary/20",
    iconColor: "text-brand-secondary",
    title: "Flexible Monthly Pay-Per-Use Contracts",
    description: "Dedicated fleet access designed for maximum flexibility and integrated control. Our packages offer highly cost-effective monthly transportation for businesses, featuring flexible scheduling and dedicated vehicles that primarily serve fixed routing needs while offering limited ad hoc support. To simplify management, clients gain Vehicle Tracking System (VTS) access and the flexibility to customize in-car amenities for optimal employee comfort."
  },
  {
    icon: Building,
    iconBg: "bg-brand-primary/20",
    iconColor: "text-brand-primary",
    title: "On-Demand (Ad Hoc) Car Requirements",
    description: "Instant, reliable service for your immediate, unscheduled business needs. Access our professional fleet and chauffeurs anytime for last-minute meetings, emergency client transport, or urgent logistical support. This service is billed purely on a pay-per-use basis, providing rapid response without contractual commitment."
  },
  {
    icon: Plane,
    iconBg: "bg-brand-accent/20",
    iconColor: "text-accent-foreground",
    title: "Executive & VIP Airport Transfers",
    description: "Ensure a flawless welcome and departure for your most valuable travelers. We provide premium, professional airport services with a focus on discretion and personalized care for C-suite professionals and foreign client delegations. Enjoy the comfort of our premium vehicles driven by professional chauffeurs trained for executive-level service and absolute confidentiality."
  }
];

export default function Corporate() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Carousel for mobile
  const [emblaRef] = useEmblaCarousel(
    { loop: true },
    [Autoplay({ delay: 4000, stopOnInteraction: false })]
  );
  
  const corporateBookingWithAntiSpam = insertCorporateBookingSchema.extend({
    email: insertCorporateBookingSchema.shape.email.refine((email) => {
      if (!email) return true; // Allow empty email since it's optional
      const personalDomains = [
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
        'icloud.com', 'me.com', 'protonmail.com', 'aol.com', 'mail.com',
        'yandex.com', 'zoho.com', 'rediffmail.com'
      ];
      const domain = email.split('@')[1]?.toLowerCase();
      return !personalDomains.includes(domain);
    }, "Please enter a company email address, not a personal email"),
    // Honeypot fields
    email_confirm: z.string().optional(),
    website: z.string().optional(),
    company_url: z.string().optional(),
    phone_secondary: z.string().optional(),
    // reCAPTCHA field
    recaptcha: z.string().min(1, "Please complete the security verification")
  });

  const form = useForm<z.infer<typeof corporateBookingWithAntiSpam>>({
    resolver: zodResolver(corporateBookingWithAntiSpam),
    defaultValues: {
      companyName: "",
      customerName: "",
      phone: "",
      email: "",
      officeAddress: "",
      serviceType: "",
      contractType: "",
      // Honeypot fields
      email_confirm: "",
      website: "",
      company_url: "",
      phone_secondary: "",
      recaptcha: ""
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof corporateBookingWithAntiSpam>) => {
      // Extract only the actual booking data (remove honeypot and recaptcha fields)
      const { email_confirm, website, company_url, phone_secondary, recaptcha, ...bookingData } = data;
      const response = await apiRequest("POST", "/api/corporate-bookings", { ...bookingData, recaptcha });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Booking Submitted Successfully",
        description: "We will contact you soon to confirm your corporate transportation service.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/corporate-bookings"] });
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Please check your information and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof corporateBookingWithAntiSpam>) => {
    // Client-side honeypot validation
    const honeypotFields = ['email_confirm', 'website', 'company_url', 'phone_secondary'];
    const hasHoneypotValue = honeypotFields.some(field => data[field as keyof typeof data] && data[field as keyof typeof data]?.toString().trim() !== '');
    
    if (hasHoneypotValue) {
      // Silently prevent submission - don't show error to avoid alerting bots
      console.log('Bot detected - honeypot field filled');
      return;
    }
    
    mutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header Section */}
      <section className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent leading-tight">
              Corporate Transportation Services
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Streamline your company's operations and elevate your professional image with our dedicated transportation portfolio. Our core offerings include reliable Employee Pick & Drop commutes, highly flexible monthly pay-per-use contracts, immediate On-Demand (Ad Hoc) Car Requirements, and specialized VIP airport transfers.
            </p>
          </div>
        </div>
      </section>

      {/* Services Details & Form */}
      <section className="py-8 md:py-12 bg-muted">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 lg:gap-8 lg:items-start">
            {/* Mobile Carousel - visible only on mobile */}
            <div className="lg:hidden">
              <div className="overflow-hidden -mx-2" ref={emblaRef}>
                <div className="flex">
                  {services.map((service, index) => {
                    const IconComponent = service.icon;
                    return (
                      <div key={index} className="flex-[0_0_100%] min-w-0 px-2">
                        <div className="bg-background rounded-lg p-4 border border-border">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 ${service.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                              <IconComponent className={`${service.iconColor} w-5 h-5`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-semibold text-card-foreground mb-2">{service.title}</h3>
                              <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Carousel indicators */}
              <div className="flex justify-center gap-2 mt-4">
                {services.map((_, index) => (
                  <div key={index} className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                ))}
              </div>
            </div>

            {/* Desktop List - visible only on desktop */}
            <div className="hidden lg:block">
              <div className="space-y-6">
                {services.map((service, index) => {
                  const IconComponent = service.icon;
                  return (
                    <div key={index} className="flex items-start space-x-4">
                      <div className={`w-12 h-12 ${service.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <IconComponent className={`${service.iconColor} w-6 h-6`} />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-card-foreground mb-2">{service.title}</h3>
                        <p className="text-muted-foreground">{service.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-6 h-6" />
                  Request Corporate Service
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your company name" 
                              {...field} 
                              data-testid="input-company-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="officeAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Office Address</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter office address" 
                              {...field}
                              value={field.value || ""}
                              data-testid="input-office-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Contact Person's Name *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Contact person full name" 
                              {...field} 
                              data-testid="input-customer-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Contact Person's Phone Number *</FormLabel>
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

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Email Address *</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="company@example.com" 
                                {...field} 
                                data-testid="input-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="serviceType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Type *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-service-type">
                                  <SelectValue placeholder="Select service type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="office-pick-drop">Office Pick & Drop</SelectItem>
                                <SelectItem value="rental">Rental</SelectItem>
                                <SelectItem value="airport-transfer">Airport Transfer</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="contractType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contract Type *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-contract-type">
                                  <SelectValue placeholder="Select contract type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="ad-hoc">Ad Hoc Basis</SelectItem>
                                <SelectItem value="monthly">Monthly Contract</SelectItem>
                                <SelectItem value="custom-dates">Custom Dates</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Honeypot Fields - Hidden from users, trap for bots */}
                    <HoneypotFields control={form.control} />

                    {/* reCAPTCHA */}
                    <RecaptchaField 
                      control={form.control} 
                      name="recaptcha" 
                      siteKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                      required={true}
                    />

                    <Button 
                      type="submit" 
                      className="w-full text-white transition-all duration-200 hover:opacity-90 active:scale-95" 
                      style={{ 
                        backgroundColor: mutation.isPending ? "#7db8bd" : "#4c9096",
                        transform: mutation.isPending ? "scale(0.98)" : "scale(1)"
                      }}
                      disabled={mutation.isPending}
                      data-testid="button-submit-corporate"
                    >
                      {mutation.isPending ? "Submitting..." : "Submit Request"}
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
