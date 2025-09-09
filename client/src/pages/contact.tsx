import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Phone, Mail, Send, Facebook, Linkedin, Instagram, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertContactMessageSchema, type InsertContactMessage } from "@shared/schema";
import { HoneypotFields } from "@/components/HoneypotFields";
import { RecaptchaField } from "@/components/RecaptchaField";
import { z } from "zod";

export default function Contact() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const contactMessageWithAntiSpam = insertContactMessageSchema.extend({
    // Honeypot fields
    email_confirm: z.string().optional(),
    website: z.string().optional(),
    company_url: z.string().optional(),
    phone_secondary: z.string().optional(),
    // reCAPTCHA field
    recaptcha: z.string().min(1, "Please complete the security verification")
  });

  const form = useForm<z.infer<typeof contactMessageWithAntiSpam>>({
    resolver: zodResolver(contactMessageWithAntiSpam),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
      // Honeypot fields
      email_confirm: "",
      website: "",
      company_url: "",
      phone_secondary: "",
      recaptcha: ""
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof contactMessageWithAntiSpam>) => {
      // Extract only the actual message data (remove honeypot and recaptcha fields)
      const { email_confirm, website, company_url, phone_secondary, recaptcha, ...messageData } = data;
      const response = await apiRequest("POST", "/api/contact-messages", { ...messageData, recaptcha });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Message Sent Successfully",
        description: "Thank you for contacting us. We will get back to you within 24 hours.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/contact-messages"] });
    },
    onError: (error) => {
      toast({
        title: "Message Failed to Send",
        description: error.message || "Please check your information and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof contactMessageWithAntiSpam>) => {
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
      <section className="py-16 bg-gradient-to-br from-brand-primary to-brand-secondary">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
              Get in Touch
            </h1>
            <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto">
              Ready to book our services or have questions? Contact us today and let's discuss how we can meet your transportation needs.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Information & Form */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Information */}
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-brand-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="text-brand-primary w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-card-foreground mb-2">Office Address</h3>
                  <p className="text-muted-foreground">
                    House #123, Road #45<br />
                    Dhanmondi, Dhaka 1205<br />
                    Bangladesh
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-brand-secondary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="text-brand-secondary w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-card-foreground mb-2">Phone Numbers</h3>
                  <p className="text-muted-foreground">
                    +880 1XXX-XXXXXX (Main)<br />
                    +880 1XXX-XXXXXX (Emergency)
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-brand-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="text-accent-foreground w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-card-foreground mb-2">Email Address</h3>
                  <p className="text-muted-foreground">
                    info@officexpress.org<br />
                    booking@officexpress.org
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-brand-highlight/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Share2 className="text-brand-highlight w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-card-foreground mb-4">Follow Us</h3>
                  <div className="flex space-x-4">
                    <a
                      href="#"
                      className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
                      data-testid="social-facebook"
                    >
                      <Facebook className="w-5 h-5" />
                    </a>
                    <a
                      href="#"
                      className="w-10 h-10 bg-blue-500 text-white rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors"
                      data-testid="social-linkedin"
                    >
                      <Linkedin className="w-5 h-5" />
                    </a>
                    <a
                      href="#"
                      className="w-10 h-10 bg-pink-600 text-white rounded-lg flex items-center justify-center hover:bg-pink-700 transition-colors"
                      data-testid="social-instagram"
                    >
                      <Instagram className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-6 h-6" />
                  Send us a Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Your full name" 
                                {...field} 
                                data-testid="input-name"
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
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-subject">
                                <SelectValue placeholder="Select inquiry type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="corporate-services">Corporate Services</SelectItem>
                              <SelectItem value="rental-services">Rental Services</SelectItem>
                              <SelectItem value="airport-transfer">Airport Transfer</SelectItem>
                              <SelectItem value="vendor-partnership">Vendor Partnership</SelectItem>
                              <SelectItem value="general-inquiry">General Inquiry</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message *</FormLabel>
                          <FormControl>
                            <Textarea 
                              className="h-32" 
                              placeholder="Tell us about your transportation needs or ask any questions..."
                              {...field} 
                              data-testid="textarea-message"
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
                      data-testid="button-submit-contact"
                    >
                      {mutation.isPending ? "Sending..." : "Send Message"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Business Hours & Additional Info */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-brand-primary/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🕒</span>
                </div>
                <h3 className="text-lg font-semibold text-card-foreground mb-2">Business Hours</h3>
                <p className="text-muted-foreground text-sm">
                  Monday - Friday: 8:00 AM - 8:00 PM<br />
                  Saturday: 9:00 AM - 6:00 PM<br />
                  Sunday: 10:00 AM - 4:00 PM
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-brand-secondary/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📞</span>
                </div>
                <h3 className="text-lg font-semibold text-card-foreground mb-2">24/7 Emergency</h3>
                <p className="text-muted-foreground text-sm">
                  Emergency transportation services available 24/7 for urgent requirements and airport transfers.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-brand-accent/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚡</span>
                </div>
                <h3 className="text-lg font-semibold text-card-foreground mb-2">Quick Response</h3>
                <p className="text-muted-foreground text-sm">
                  We typically respond to inquiries within 2 hours during business hours.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
