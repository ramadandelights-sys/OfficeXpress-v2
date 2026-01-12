import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { insertVendorRegistrationSchema, type InsertVendorRegistration } from "@shared/schema";
import { HoneypotFields } from "@/components/HoneypotFields";
import { RecaptchaField } from "@/components/RecaptchaField";
import { z } from "zod";
import { useTranslation } from "react-i18next";

const vehicleTypes = [
  { id: "sedan", labelKey: "vendor.vehicleOwnership_sedan" },
  { id: "suv", labelKey: "vendor.vehicleOwnership_suv" },
  { id: "microbus", labelKey: "vendor.vehicleOwnership_microbus" },
  { id: "van", labelKey: "vendor.vehicleOwnership_van" },
  { id: "bus", labelKey: "vendor.vehicleOwnership_bus" },
  { id: "luxury-car", labelKey: "vendor.vehicleOwnership_luxuryCar" },
];

export default function Vendor() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const vendorRegistrationWithAntiSpam = insertVendorRegistrationSchema.extend({
    // Honeypot fields
    email_confirm: z.string().optional(),
    website: z.string().optional(),
    company_url: z.string().optional(),
    phone_secondary: z.string().optional(),
    // reCAPTCHA field
    recaptcha: z.string().min(1, "Please complete the security verification")
  });

  const form = useForm<z.infer<typeof vendorRegistrationWithAntiSpam>>({
    resolver: zodResolver(vendorRegistrationWithAntiSpam),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      location: "",
      vehicleTypes: [],
      serviceModality: "",
      experience: "",
      additionalInfo: "",
      // Honeypot fields
      email_confirm: "",
      website: "",
      company_url: "",
      phone_secondary: "",
      recaptcha: ""
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof vendorRegistrationWithAntiSpam>) => {
      // Extract only the actual registration data (remove honeypot and recaptcha fields)
      const { email_confirm, website, company_url, phone_secondary, recaptcha, ...registrationData } = data;
      const response = await apiRequest("POST", "/api/vendor-registrations", { ...registrationData, recaptcha });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Registration Submitted Successfully",
        description: "Thank you for your interest in partnering with us. We will review your application and contact you soon.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-registrations"] });
    },
    onError: () => {
      toast({
        title: "Registration Failed",
        description: "Please check your information and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof vendorRegistrationWithAntiSpam>) => {
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
    <div className="min-h-screen">
      {/* Header Section */}
      <section className="pt-16 pb-32 md:pb-48 lg:py-16 bg-gradient-to-br from-brand-accent to-brand-highlight">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
              {t('vendor.heroTitle')}
            </h1>
            <p className="text-xl text-primary-foreground/80 max-w-3xl mx-auto">
              {t('vendor.heroDescription')}
            </p>
          </div>
        </div>
      </section>

      {/* Registration Form */}
      <section className="pb-16 bg-muted lg:bg-muted lg:py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:grid lg:grid-cols-[1fr_450px] gap-8 lg:items-start max-w-7xl mx-auto -mt-24 md:-mt-40 lg:mt-0">
            <div className="hidden lg:block space-y-8">
              <div className="relative overflow-hidden rounded-2xl shadow-xl aspect-video bg-brand-primary/10 flex items-center justify-center">
                <Handshake className="w-32 h-32 text-brand-primary opacity-20" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-8 text-white">
                  <h3 className="text-2xl font-bold mb-2">Join Our Network</h3>
                  <p className="text-white/80">Become a certified OfficeXpress vendor and grow your business with us.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background p-4 rounded-xl border border-border shadow-sm">
                  <div className="text-2xl mb-2">💼</div>
                  <h4 className="font-semibold mb-1">Steady Income</h4>
                  <p className="text-xs text-muted-foreground">Regular bookings from corporate clients.</p>
                </div>
                <div className="bg-background p-4 rounded-xl border border-border shadow-sm">
                  <div className="text-2xl mb-2">🤝</div>
                  <h4 className="font-semibold mb-1">Support</h4>
                  <p className="text-xs text-muted-foreground">Professional training and 24/7 support.</p>
                </div>
              </div>
            </div>

            <div className="w-full">
            <Card className="shadow-lg border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Handshake className="w-6 h-6" />
                  {t('vendor.formTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('vendor.fullName')} *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder={t('vendor.fullNamePlaceholder')} 
                                {...field} 
                                data-testid="input-full-name"
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
                            <FormLabel>{t('vendor.phoneNumber')} *</FormLabel>
                            <FormControl>
                              <div className="flex flex-col gap-1">
                                <Input 
                                  placeholder={t('rental.phonePlaceholder')}
                                  {...field}
                                  onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                                  data-testid="input-phone"
                                />
                                <p className="text-xs text-muted-foreground">
                                  {t('rental.phoneHelper')}
                                </p>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('form.emailAddress')} *</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder={t('form.emailPlaceholder')} 
                                {...field} 
                                data-testid="input-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('common.location')} *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder={t('form.locationPlaceholder')} 
                                {...field} 
                                data-testid="input-location"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="vehicleTypes"
                      render={() => (
                        <FormItem>
                          <FormLabel>{t('vendor.vehicleOwnership')} *</FormLabel>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {vehicleTypes.map((vehicle) => (
                              <FormField
                                key={vehicle.id}
                                control={form.control}
                                name="vehicleTypes"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={vehicle.id}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(vehicle.id)}
                                          onCheckedChange={(checked) => {
                                            const currentValues = field.value || [];
                                            if (checked) {
                                              field.onChange([...currentValues, vehicle.id]);
                                            } else {
                                              field.onChange(
                                                currentValues.filter((value) => value !== vehicle.id)
                                              );
                                            }
                                          }}
                                          data-testid={`checkbox-${vehicle.id}`}
                                        />
                                      </FormControl>
                                      <FormLabel className="text-sm font-normal cursor-pointer">
                                        {t(vehicle.labelKey)}
                                      </FormLabel>
                                    </FormItem>
                                  );
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="serviceModality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('vendor.serviceModality')} *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-service-modality">
                                <SelectValue placeholder={t('vendor.selectServiceType')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="driver-vehicle">Driver + Vehicle</SelectItem>
                              <SelectItem value="vehicle-only">Vehicle Only</SelectItem>
                              <SelectItem value="driver-only">Driver Only</SelectItem>
                              <SelectItem value="fleet-services">Fleet Services</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="experience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('vendor.yearsOfExperience')} *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-experience">
                                <SelectValue placeholder={t('vendor.selectExperience')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="less-than-1">Less than 1 year</SelectItem>
                              <SelectItem value="1-3">1-3 years</SelectItem>
                              <SelectItem value="3-5">3-5 years</SelectItem>
                              <SelectItem value="5-10">5-10 years</SelectItem>
                              <SelectItem value="more-than-10">More than 10 years</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="additionalInfo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('form.additionalInfo')}</FormLabel>
                          <FormControl>
                            <Textarea 
                              className="h-24" 
                              placeholder={t('form.additionalInfoPlaceholder')}
                              {...field}
                              value={field.value || ""}
                              data-testid="textarea-additional-info"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                      data-testid="button-submit-vendor"
                    >
                      {mutation.isPending ? t('common.loading') : t('common.submitRegistration')}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-card-foreground mb-4">Why Partner With OfficeXpress?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join our growing network and benefit from our established client base and professional support.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-md border border-border text-center">
              <div className="w-16 h-16 bg-brand-primary/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💼</span>
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">Steady Income</h3>
              <p className="text-muted-foreground text-sm">Regular bookings from our established corporate clients.</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-border text-center">
              <div className="w-16 h-16 bg-brand-secondary/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤝</span>
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">Professional Support</h3>
              <p className="text-muted-foreground text-sm">Training and ongoing support to maintain service standards.</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-border text-center">
              <div className="w-16 h-16 bg-brand-accent/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📈</span>
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">Business Growth</h3>
              <p className="text-muted-foreground text-sm">Expand your business with our growing client network.</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-border text-center">
              <div className="w-16 h-16 bg-brand-highlight/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🏆</span>
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">Brand Recognition</h3>
              <p className="text-muted-foreground text-sm">Be part of a trusted and recognized transportation brand.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
