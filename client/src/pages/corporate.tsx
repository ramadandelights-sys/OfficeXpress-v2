import { useState } from "react";
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

export default function Corporate() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<InsertCorporateBooking>({
    resolver: zodResolver(insertCorporateBookingSchema),
    defaultValues: {
      companyName: "",
      customerName: "",
      phone: "",
      email: "",
      officeAddress: "",
      serviceType: "",
      contractType: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertCorporateBooking) => {
      const response = await apiRequest("POST", "/api/corporate-bookings", data);
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
    onError: () => {
      toast({
        title: "Submission Failed",
        description: "Please check your information and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertCorporateBooking) => {
    mutation.mutate(data);
  };

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <section className="py-16 bg-gradient-to-br from-brand-primary to-brand-secondary">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
              Corporate Transportation Services
            </h1>
            <p className="text-xl text-primary-foreground/80 max-w-3xl mx-auto">
              Streamline your company's transportation needs with our reliable corporate services including employee pick & drop, monthly contracts, and special airport transfers.
            </p>
          </div>
        </div>
      </section>

      {/* Services Details & Form */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <div className="space-y-8">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-brand-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Route className="text-brand-primary w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-card-foreground mb-2">Employee Pick & Drop</h3>
                    <p className="text-muted-foreground">Daily transportation for your employees with fixed routes and timings. Reliable and punctual service that ensures your team arrives on time.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-brand-secondary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="text-brand-secondary w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-card-foreground mb-2">Monthly Contracts</h3>
                    <p className="text-muted-foreground">Cost-effective monthly transportation packages for businesses. Flexible scheduling and dedicated vehicles for your corporate needs.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-brand-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Plane className="text-accent-foreground w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-card-foreground mb-2">Airport Transfers</h3>
                    <p className="text-muted-foreground">Professional airport pickup and drop services for business travelers. Premium vehicles with professional chauffeurs.</p>
                  </div>
                </div>
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
