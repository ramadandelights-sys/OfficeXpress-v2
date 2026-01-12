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
import { useTranslation } from "react-i18next";

export default function Corporate() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Services data with translations
  const services = [
    {
      icon: Route,
      iconBg: "bg-brand-primary/20",
      iconColor: "text-brand-primary",
      title: t('corporate.dailyCommutesTitle'),
      description: t('corporate.dailyCommutesDesc')
    },
    {
      icon: Calendar,
      iconBg: "bg-brand-secondary/20",
      iconColor: "text-brand-secondary",
      title: t('corporate.monthlyContractsTitle'),
      description: t('corporate.monthlyContractsDesc')
    },
    {
      icon: Building,
      iconBg: "bg-brand-primary/20",
      iconColor: "text-brand-primary",
      title: t('corporate.adHocTitle'),
      description: t('corporate.adHocDesc')
    },
    {
      icon: Plane,
      iconBg: "bg-brand-accent/20",
      iconColor: "text-accent-foreground",
      title: t('corporate.vipAirportTitle'),
      description: t('corporate.vipAirportDesc')
    }
  ];
  
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
        title: t('toast.corporateSuccess'),
        description: t('toast.corporateSuccessDesc'),
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/corporate-bookings"] });
    },
    onError: (error) => {
      toast({
        title: t('toast.submissionFailed'),
        description: error.message || t('toast.bookingFailedDesc'),
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
              {t('corporate.pageTitle')}
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {t('corporate.pageDescription')}
            </p>
          </div>
        </div>
      </section>

      {/* Services Details & Form */}
      <section className="py-8 md:py-12 bg-muted">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:grid lg:grid-cols-[1fr_450px] gap-4 lg:gap-8 lg:items-start">
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

            <Card className="shadow-lg border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-6 h-6" />
                  {t('corporate.formTitle')}
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
                          <FormLabel>{t('corporate.companyName')} *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={t('corporate.companyNamePlaceholder')}
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
                          <FormLabel>{t('corporate.officeAddress')}</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={t('corporate.officeAddressPlaceholder')}
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
                          <FormLabel>{t('corporate.primaryContactName')} *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={t('corporate.contactPersonPlaceholder')}
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
                            <FormLabel>{t('corporate.primaryContactPhone')} *</FormLabel>
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
                            <FormLabel>{t('corporate.companyEmail')} *</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder={t('corporate.companyEmailPlaceholder')}
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
                            <FormLabel>{t('corporate.serviceType')} *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-service-type">
                                  <SelectValue placeholder={t('corporate.selectServiceType')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="office-pick-drop">{t('corporate.serviceType_officePickDrop')}</SelectItem>
                                <SelectItem value="rental">{t('corporate.serviceType_rental')}</SelectItem>
                                <SelectItem value="airport-transfer">{t('corporate.serviceType_airportTransfer')}</SelectItem>
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
                            <FormLabel>{t('corporate.contractType')} *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-contract-type">
                                  <SelectValue placeholder={t('corporate.selectContractType')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="ad-hoc">{t('corporate.contractType_adHoc')}</SelectItem>
                                <SelectItem value="monthly">{t('corporate.contractType_monthly')}</SelectItem>
                                <SelectItem value="custom-dates">{t('corporate.contractType_customDates')}</SelectItem>
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
                      {mutation.isPending ? t('corporate.submitting') : t('corporate.submitRequest')}
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
