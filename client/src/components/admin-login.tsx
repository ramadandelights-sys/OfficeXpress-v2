import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface AdminLoginProps {
  onLogin: () => void;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simple hardcoded authentication
    if (username === "admin_OxP" && password === "expresspass1234") {
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
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                required
                data-testid="admin-username"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
                data-testid="admin-password"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-[#4c9096] text-white hover:bg-[#4c9096]/90"
              disabled={isLoading}
              data-testid="admin-login-btn"
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}