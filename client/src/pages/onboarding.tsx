import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  
  // Get token from URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  
  // Redirect if no token
  useEffect(() => {
    if (!token) {
      setLocation("/login");
    }
  }, [token, setLocation]);
  
  // Verify token on load
  const { data: verifyData, isLoading: isVerifying, error: verifyError } = useQuery({
    queryKey: ["/api/onboarding/verify", token],
    queryFn: async () => {
      const response = await fetch(`/api/onboarding/verify?token=${token}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to verify token");
      }
      return response.json();
    },
    enabled: !!token,
    retry: false
  });
  
  // Complete onboarding mutation
  const completeMutation = useMutation({
    mutationFn: async (data: { token: string; password: string }) => {
      const response = await apiRequest("POST", "/api/onboarding/complete", data);
      return await response.json();
    },
    onSuccess: () => {
      setTimeout(() => {
        setLocation("/admin");
      }, 2000);
    },
    onError: (error: any) => {
      setError(error.message || "Failed to complete onboarding");
    }
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validate passwords
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (!token) {
      setError("Invalid onboarding token");
      return;
    }
    
    completeMutation.mutate({ token, password });
  };
  
  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return { strength: 0, label: "", color: "" };
    if (pwd.length < 8) return { strength: 25, label: "Too short", color: "bg-red-500" };
    
    let strength = 25;
    if (pwd.length >= 8) strength += 25;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength += 25;
    if (/\d/.test(pwd)) strength += 12.5;
    if (/[^a-zA-Z\d]/.test(pwd)) strength += 12.5;
    
    if (strength < 50) return { strength, label: "Weak", color: "bg-orange-500" };
    if (strength < 75) return { strength, label: "Medium", color: "bg-yellow-500" };
    return { strength, label: "Strong", color: "bg-green-500" };
  };
  
  const passwordStrength = getPasswordStrength(password);
  
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-[#4c9096]" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Verifying onboarding link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (verifyError || !verifyData?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-6 w-6" />
              <CardTitle>Invalid Onboarding Link</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                {(verifyError as Error)?.message || "This onboarding link is invalid or has expired"}
              </AlertDescription>
            </Alert>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Please contact your administrator to request a new onboarding link.
            </p>
            <Button
              onClick={() => setLocation("/login")}
              className="w-full bg-[#4c9096] hover:bg-[#4c9096]/90"
              data-testid="button-back-to-login"
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (completeMutation.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              <CardTitle>Account Setup Complete!</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your password has been set successfully. Redirecting to the admin panel...
            </p>
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#4c9096]" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Account Setup</CardTitle>
          <CardDescription>
            Welcome, <strong>{verifyData?.user?.name}</strong>! Set your password to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Account Details</Label>
              <div className="rounded-md bg-gray-50 dark:bg-gray-800 p-3 space-y-1 text-sm">
                <p><span className="text-gray-600 dark:text-gray-400">Email:</span> <strong>{verifyData?.user?.email}</strong></p>
                <p><span className="text-gray-600 dark:text-gray-400">Phone:</span> <strong>{verifyData?.user?.phone}</strong></p>
                <p><span className="text-gray-600 dark:text-gray-400">Role:</span> <strong className="capitalize">{verifyData?.user?.role}</strong></p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Create Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  minLength={8}
                  data-testid="input-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Password strength:</span>
                    <span className={`font-medium ${
                      passwordStrength.label === "Strong" ? "text-green-600" :
                      passwordStrength.label === "Medium" ? "text-yellow-600" :
                      "text-red-600"
                    }`}>{passwordStrength.label}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${passwordStrength.color}`}
                      style={{ width: `${passwordStrength.strength}%` }}
                    />
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500">
                Password must be at least 8 characters long
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  data-testid="input-confirm-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  data-testid="button-toggle-confirm-password"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-600">Passwords do not match</p>
              )}
            </div>
            
            {error && (
              <Alert variant="destructive" data-testid="alert-error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button
              type="submit"
              className="w-full bg-[#4c9096] hover:bg-[#4c9096]/90"
              disabled={completeMutation.isPending || password !== confirmPassword || password.length < 8}
              data-testid="button-complete-setup"
            >
              {completeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up your account...
                </>
              ) : (
                "Complete Setup"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
