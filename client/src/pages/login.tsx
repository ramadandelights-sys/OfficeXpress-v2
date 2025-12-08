import { useState, useEffect } from "react";
import { useLogin } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Car, UserPlus, LogIn, Sparkles, MapPin, Clock, Shield, Phone, Mail, User, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const login = useLogin();

  // Sign In state
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Sign Up state
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Get redirect URL from query params
  const getRedirectUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('redirect') || '/dashboard';
  };

  // Registration mutation
  const register = useMutation({
    mutationFn: async (data: { phone: string; email: string; name: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return res.json();
    },
    onSuccess: async (data) => {
      // Wait for the auth query to be invalidated and refetched to ensure session is persisted
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // Small delay to ensure cookie is properly set
      await new Promise(resolve => setTimeout(resolve, 100));
      toast({
        title: "Welcome aboard! 🎉",
        description: `Great to have you, ${data.user.name}!`,
      });
      setLocation(getRedirectUrl());
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Please check your details and try again",
        variant: "destructive",
      });
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const user = await login.mutateAsync({ phone: loginPhone, password: loginPassword });
      
      toast({
        title: "Welcome back! 👋",
        description: `Good to see you, ${user.name}!`,
      });
      
      if (user.temporaryPassword) {
        setLocation("/change-password");
      } else {
        setLocation(getRedirectUrl());
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid phone or password",
        variant: "destructive",
      });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    register.mutate({
      phone: signupPhone,
      email: signupEmail,
      name: signupName,
      password: signupPassword,
    });
  };

  const features = [
    { icon: MapPin, text: "Daily commute routes", color: "text-green-500" },
    { icon: Clock, text: "Flexible scheduling", color: "text-blue-500" },
    { icon: Shield, text: "Safe & reliable", color: "text-purple-500" },
    { icon: Car, text: "Premium vehicles", color: "text-orange-500" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding & Features (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-primary via-green-600 to-teal-700 p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <Link href="/">
            <div className="flex items-center gap-3 mb-8 cursor-pointer hover:opacity-90 transition-opacity">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <Car className="w-7 h-7 text-brand-primary" />
              </div>
              <span className="text-2xl font-bold text-white">OfficeXpress</span>
            </div>
          </Link>
          
          <h1 className="text-4xl font-bold text-white mb-4">
            Your Daily Commute,<br />
            <span className="text-yellow-300">Simplified</span>
          </h1>
          <p className="text-white/80 text-lg max-w-md">
            Join thousands of professionals who trust OfficeXpress for their daily office transportation needs.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 + 0.3 }}
              className="flex items-center gap-3 text-white"
            >
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <feature.icon className="w-5 h-5" />
              </div>
              <span className="text-lg">{feature.text}</span>
            </motion.div>
          ))}
        </div>

        <div className="relative z-10 text-white/60 text-sm">
          © 2024 OfficeXpress. Professional transportation services.
        </div>
      </div>

      {/* Right side - Auth Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center">
              <Car className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-800 dark:text-white">OfficeXpress</span>
          </div>

          <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center justify-center mb-2">
                <div className="w-14 h-14 bg-gradient-to-br from-brand-primary to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl text-center">
                {activeTab === "signin" ? "Welcome Back!" : "Join Us!"}
              </CardTitle>
              <CardDescription className="text-center">
                {activeTab === "signin" 
                  ? "Sign in to access your account" 
                  : "Create an account to get started"}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "signin" | "signup")} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="signin" className="flex items-center gap-2" data-testid="tab-signin">
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="flex items-center gap-2" data-testid="tab-signup">
                    <UserPlus className="w-4 h-4" />
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                <AnimatePresence mode="wait">
                  <TabsContent value="signin" className="mt-0">
                    <motion.form
                      key="signin"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      onSubmit={handleLogin}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="login-phone" className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-500" />
                          Phone Number
                        </Label>
                        <Input
                          id="login-phone"
                          type="tel"
                          placeholder="01XXXXXXXXX"
                          value={loginPhone}
                          onChange={(e) => setLoginPhone(e.target.value)}
                          required
                          className="h-12"
                          data-testid="input-login-phone"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="login-password" className="flex items-center gap-2">
                            <Lock className="w-4 h-4 text-gray-500" />
                            Password
                          </Label>
                          <Link href="/forgot-password" className="text-sm text-primary hover:underline" data-testid="link-forgot-password">
                            Forgot password?
                          </Link>
                        </div>
                        <div className="relative">
                          <Input
                            id="login-password"
                            type={showLoginPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                            className="h-12 pr-10"
                            data-testid="input-login-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-12 text-base font-semibold bg-gradient-to-r from-brand-primary to-green-600 hover:from-brand-primary/90 hover:to-green-600/90"
                        disabled={login.isPending}
                        data-testid="button-login"
                      >
                        {login.isPending ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Signing in...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <LogIn className="w-4 h-4" />
                            Sign In
                          </span>
                        )}
                      </Button>
                    </motion.form>
                  </TabsContent>

                  <TabsContent value="signup" className="mt-0">
                    <motion.form
                      key="signup"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      onSubmit={handleSignup}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="signup-name" className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          Full Name
                        </Label>
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Your full name"
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          required
                          className="h-12"
                          data-testid="input-signup-name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-phone" className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-500" />
                          Phone Number
                        </Label>
                        <Input
                          id="signup-phone"
                          type="tel"
                          placeholder="01XXXXXXXXX"
                          value={signupPhone}
                          onChange={(e) => setSignupPhone(e.target.value)}
                          required
                          className="h-12"
                          data-testid="input-signup-phone"
                        />
                        <p className="text-xs text-gray-500">Bangladesh format: 11 digits starting with 01</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-500" />
                          Email Address
                        </Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="your@email.com"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          required
                          className="h-12"
                          data-testid="input-signup-email"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-gray-500" />
                          Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="signup-password"
                            type={showSignupPassword ? "text" : "password"}
                            placeholder="Create a password (min 6 chars)"
                            value={signupPassword}
                            onChange={(e) => setSignupPassword(e.target.value)}
                            required
                            minLength={6}
                            className="h-12 pr-10"
                            data-testid="input-signup-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignupPassword(!showSignupPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-12 text-base font-semibold bg-gradient-to-r from-brand-primary to-green-600 hover:from-brand-primary/90 hover:to-green-600/90"
                        disabled={register.isPending}
                        data-testid="button-signup"
                      >
                        {register.isPending ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Creating account...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Create Account
                          </span>
                        )}
                      </Button>

                      <p className="text-xs text-center text-gray-500 mt-4">
                        By signing up, you agree to our Terms of Service and Privacy Policy
                      </p>
                    </motion.form>
                  </TabsContent>
                </AnimatePresence>
              </Tabs>
            </CardContent>
          </Card>

          {/* Back to home link */}
          <div className="text-center mt-6">
            <Link href="/" className="text-sm text-gray-600 dark:text-gray-400 hover:text-brand-primary transition-colors">
              ← Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
