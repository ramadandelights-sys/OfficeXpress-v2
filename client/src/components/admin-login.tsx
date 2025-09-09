import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { HoneypotFields } from "@/components/HoneypotFields";
import { RecaptchaField } from "@/components/RecaptchaField";

const adminLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  // Honeypot fields
  email_confirm: z.string().optional(),
  website: z.string().optional(),
  company_url: z.string().optional(),
  phone_secondary: z.string().optional(),
  // reCAPTCHA field
  recaptcha: z.string().min(1, "Please complete the security verification")
});

type AdminLoginForm = z.infer<typeof adminLoginSchema>;

interface AdminLoginProps {
  onLogin: () => void;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<AdminLoginForm>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      username: "",
      password: "",
      // Honeypot fields
      email_confirm: "",
      website: "",
      company_url: "",
      phone_secondary: "",
      recaptcha: ""
    },
  });

  const handleLogin = async (data: AdminLoginForm) => {
    // Client-side honeypot validation
    const honeypotFields = ['email_confirm', 'website', 'company_url', 'phone_secondary'];
    const hasHoneypotValue = honeypotFields.some(field => data[field as keyof typeof data] && data[field as keyof typeof data]?.toString().trim() !== '');
    
    if (hasHoneypotValue) {
      // Silently prevent submission - don't show error to avoid alerting bots
      console.log('Bot detected - honeypot field filled');
      return;
    }

    setIsLoading(true);

    // Simple hardcoded authentication
    if (data.username === "admin_OxP" && data.password === "expresspass1234") {
      // Store login status in session storage
      sessionStorage.setItem("adminAuthenticated", "true");
      onLogin();
      toast({
        title: "Login Successful",
        description: "Welcome to OfficeXpress Admin Panel",
      });
    } else {
      toast({
        title: "Login Failed", 
        description: "Invalid username or password",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img 
            src="/logo.jpg" 
            alt="OfficeXpress Logo" 
            className="h-20 w-auto mx-auto mb-4"
          />
          <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
          <p className="text-muted-foreground">Access the OfficeXpress Admin Panel</p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Enter admin username"
                        {...field}
                        data-testid="admin-username"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter admin password"
                        {...field}
                        data-testid="admin-password"
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
                className="w-full bg-[#4c9096] text-white hover:bg-[#4c9096]/90"
                disabled={isLoading}
                data-testid="admin-login-btn"
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}