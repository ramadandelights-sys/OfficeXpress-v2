import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertRentalBookingSchema, type InsertRentalBooking } from "@shared/schema";

export default function Rental() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<InsertRentalBooking>({
    resolver: zodResolver(insertRentalBookingSchema),
    defaultValues: {
      customerName: "",
      phone: "",
      email: "",
      pickupDate: "",
      duration: "",
      serviceType: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertRentalBooking) => {
      const response = await apiRequest("POST", "/api/rental-bookings", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Rental Booking Submitted",
        description: "Thank you for your rental request. We will contact you shortly to confirm the details.",
      });
      form.reset();
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

  const onSubmit = (data: InsertRentalBooking) => {
    mutation.mutate(data);
  };

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <section className="py-16 bg-gradient-to-br from-brand-secondary to-brand-accent">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
              Vehicle Rental Services
            </h1>
            <p className="text-xl text-primary-foreground/80 max-w-3xl mx-auto">
              We provide quality cars at affordable rates across Bangladesh. Includes city tours for foreigners with professional chauffeur support and local expertise.
            </p>
          </div>
        </div>
      </section>

      {/* Service Details & Booking Form */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <img 
                src="/attached_assets/rental_illustration_1756953496199.png" 
                alt="Professional rental service illustration" 
                className="rounded-xl shadow-lg w-full h-auto"
                data-testid="rental-fleet-image"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-6 h-6" />
                  Book Rental Service
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Name *</FormLabel>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone *</FormLabel>
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
                            <FormLabel>Email *</FormLabel>
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
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="pickupDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pickup Date</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field} 
                                data-testid="input-pickup-date"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="duration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-duration">
                                  <SelectValue placeholder="Select duration" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="half-day">Half Day (4 hours)</SelectItem>
                                <SelectItem value="full-day">Full Day (8 hours)</SelectItem>
                                <SelectItem value="2-3-days">2-3 Days</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="serviceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-service-type">
                                <SelectValue placeholder="Select service" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="city-tour">City Tour with Chauffeur</SelectItem>
                              <SelectItem value="business-travel">Business Travel</SelectItem>
                              <SelectItem value="airport-transfer">Airport Transfer</SelectItem>
                              <SelectItem value="special-events">Special Events</SelectItem>
                              <SelectItem value="custom-package">Custom Package</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full text-white transition-all duration-200 hover:opacity-90 active:scale-95" 
                      style={{ 
                        backgroundColor: mutation.isPending ? "#7db8bd" : "#4c9096",
                        transform: mutation.isPending ? "scale(0.98)" : "scale(1)"
                      }}
                      disabled={mutation.isPending}
                      data-testid="button-submit-rental"
                    >
                      {mutation.isPending ? "Booking..." : "Book Rental"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-card-foreground mb-4">Why Choose Our Rental Service?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Experience the best in vehicle rental with our comprehensive service offerings.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-md border border-border text-center">
              <div className="w-16 h-16 bg-brand-secondary/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🌟</span>
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">Premium Fleet</h3>
              <p className="text-muted-foreground text-sm">Well-maintained, modern vehicles for every occasion.</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-border text-center">
              <div className="w-16 h-16 bg-brand-accent/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🗣️</span>
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">English Speaking</h3>
              <p className="text-muted-foreground text-sm">Professional drivers fluent in English for international guests.</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-border text-center">
              <div className="w-16 h-16 bg-brand-primary/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🏛️</span>
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">Local Expertise</h3>
              <p className="text-muted-foreground text-sm">Knowledgeable guides for city tours and local attractions.</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-border text-center">
              <div className="w-16 h-16 bg-brand-highlight/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">Affordable Rates</h3>
              <p className="text-muted-foreground text-sm">Competitive pricing with transparent cost structure.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
