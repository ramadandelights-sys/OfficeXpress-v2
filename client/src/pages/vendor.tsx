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
import { insertVendorRegistrationSchema, type InsertVendorRegistration } from "@shared/schema";

const vehicleTypes = [
  { id: "sedan", label: "Sedan" },
  { id: "suv", label: "SUV" },
  { id: "microbus", label: "Microbus" },
  { id: "van", label: "Van" },
  { id: "bus", label: "Bus" },
  { id: "luxury-car", label: "Luxury Car" },
];

export default function Vendor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<InsertVendorRegistration>({
    resolver: zodResolver(insertVendorRegistrationSchema.extend({
      vehicleTypes: insertVendorRegistrationSchema.shape.vehicleTypes.default([]),
    })),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      location: "",
      vehicleTypes: [],
      serviceModality: "",
      experience: "",
      additionalInfo: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertVendorRegistration) => {
      const response = await apiRequest("POST", "/api/vendor-registrations", data);
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

  const onSubmit = (data: InsertVendorRegistration) => {
    mutation.mutate(data);
  };

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <section className="py-16 bg-gradient-to-br from-brand-accent to-brand-highlight">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
              Partner With Us
            </h1>
            <p className="text-xl text-primary-foreground/80 max-w-3xl mx-auto">
              Join our network of professional drivers and vehicle owners. Expand your business opportunities with OfficeXpress and serve our growing client base.
            </p>
          </div>
        </div>
      </section>

      {/* Registration Form */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Handshake className="w-6 h-6" />
                  Vendor Registration Form
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
                            <FormLabel>Full Name *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your full name" 
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
                            <FormLabel>Phone Number *</FormLabel>
                            <FormControl>
                              <Input 
                                type="tel" 
                                placeholder="+880 1XXXXXXXXX" 
                                {...field} 
                                data-testid="input-phone"
                              />
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
                            <FormLabel>Email Address *</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="your@email.com" 
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
                            <FormLabel>Location/City *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your city" 
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
                          <FormLabel>Vehicle Ownership (Select all that apply)</FormLabel>
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
                                        {vehicle.label}
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
                          <FormLabel>Service Modality *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-service-modality">
                                <SelectValue placeholder="Select service type" />
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
                          <FormLabel>Years of Experience</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-experience">
                                <SelectValue placeholder="Select experience" />
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
                          <FormLabel>Additional Information</FormLabel>
                          <FormControl>
                            <Textarea 
                              className="h-24" 
                              placeholder="Tell us about your experience, special services, or any additional information..."
                              {...field} 
                              data-testid="textarea-additional-info"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full bg-brand-slate text-white hover:bg-brand-slate/90" 
                      disabled={mutation.isPending}
                      data-testid="button-submit-vendor"
                    >
                      {mutation.isPending ? "Submitting..." : "Submit Registration"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
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
