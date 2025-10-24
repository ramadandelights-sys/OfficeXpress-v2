import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MarketingProvider } from "@/contexts/MarketingContext";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import Home from "@/pages/home";
import About from "@/pages/about";
import Corporate from "@/pages/corporate";
import Rental from "@/pages/rental";
import Portfolio from "@/pages/portfolio";
import Vendor from "@/pages/vendor";
import Contact from "@/pages/contact";
import Blog from "@/pages/blog";
import BlogPost from "@/pages/blog-post";
import Admin from "@/pages/admin";
import LegalPageView from "@/pages/legal-page";
import LoginPage from "@/pages/login";
import SetupSuperAdminPage from "@/pages/setup-superadmin";
import ChangePasswordPage from "@/pages/change-password";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import OnboardingPage from "@/pages/onboarding";
import CustomerDashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";

function Router() {
  const [location] = useLocation();

  // Scroll to top whenever the route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/corporate" component={Corporate} />
      <Route path="/rental" component={Rental} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/vendor" component={Vendor} />
      <Route path="/contact" component={Contact} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:slug" component={BlogPost} />
      <Route path="/admin" component={Admin} />
      <Route path="/login" component={LoginPage} />
      <Route path="/setup-superadmin" component={SetupSuperAdminPage} />
      <Route path="/change-password" component={ChangePasswordPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/dashboard" component={CustomerDashboard} />
      <Route path="/terms-and-conditions" component={LegalPageView} />
      <Route path="/privacy-policy" component={LegalPageView} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ConditionalHeader() {
  const [location] = useLocation();
  const authPages = ["/login", "/setup-superadmin", "/change-password", "/forgot-password", "/reset-password", "/onboarding"];
  
  if (authPages.includes(location)) {
    return null;
  }
  
  return <Header />;
}

function ConditionalFooter() {
  const [location] = useLocation();
  const isAdminPage = location === "/admin";
  const isLegalPage = location === "/terms-and-conditions" || location === "/privacy-policy";
  const authPages = ["/login", "/setup-superadmin", "/change-password", "/forgot-password", "/reset-password", "/onboarding"];
  
  if (authPages.includes(location)) {
    return null;
  }
  
  if (isAdminPage) {
    return (
      <div className="bg-gray-100 dark:bg-gray-900 py-8">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          OfficeXpress Admin Panel
        </div>
      </div>
    );
  }
  
  if (isLegalPage) {
    return (
      <div className="bg-gray-100 dark:bg-gray-900 py-8">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          OfficeXpress Transportation Services © 2024
        </div>
      </div>
    );
  }
  
  return <Footer />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MarketingProvider>
        <TooltipProvider>
            <div className="min-h-screen bg-background">
              <ConditionalHeader />
              <main>
                <Router />
              </main>
              <ConditionalFooter />
              <Toaster />
            </div>
        </TooltipProvider>
      </MarketingProvider>
    </QueryClientProvider>
  );
}

export default App;
