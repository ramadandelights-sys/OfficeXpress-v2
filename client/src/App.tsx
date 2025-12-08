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
import Carpool from "@/pages/carpool";
import Portfolio from "@/pages/portfolio";
import Vendor from "@/pages/vendor";
import Contact from "@/pages/contact";
import Blog from "@/pages/blog";
import BlogPost from "@/pages/blog-post";
import AdminRouter from "@/pages/admin/index";
import LegalPageView from "@/pages/legal-page";
import LoginPage from "@/pages/login";
import SetupSuperAdminPage from "@/pages/setup-superadmin";
import ChangePasswordPage from "@/pages/change-password";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import OnboardingPage from "@/pages/onboarding";
import CustomerDashboard from "@/pages/dashboard";
import Survey from "@/pages/survey";
import WalletPage from "@/pages/wallet";
import MySubscriptionsPage from "@/pages/my-subscriptions";
import ComplaintsPage from "@/pages/complaints";
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
      <Route path="/carpool" component={Carpool} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/vendor" component={Vendor} />
      <Route path="/contact" component={Contact} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:slug" component={BlogPost} />
      <Route path="/admin" component={AdminRouter} />
      <Route path="/admin/:rest*" component={AdminRouter} />
      <Route path="/login" component={LoginPage} />
      <Route path="/setup-superadmin" component={SetupSuperAdminPage} />
      <Route path="/change-password" component={ChangePasswordPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/dashboard" component={CustomerDashboard} />
      <Route path="/wallet" component={WalletPage} />
      <Route path="/my-subscriptions" component={MySubscriptionsPage} />
      <Route path="/complaints" component={ComplaintsPage} />
      <Route path="/survey" component={Survey} />
      <Route path="/terms-and-conditions" component={LegalPageView} />
      <Route path="/privacy-policy" component={LegalPageView} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ConditionalHeader() {
  const [location] = useLocation();
  const authPages = ["/login", "/setup-superadmin", "/change-password", "/forgot-password", "/reset-password", "/onboarding", "/survey"];
  const isAdminPage = location.startsWith("/admin");
  
  if (authPages.includes(location) || isAdminPage) {
    return null;
  }
  
  return <Header />;
}

function ConditionalFooter() {
  const [location] = useLocation();
  const isAdminPage = location.startsWith("/admin");
  const isLegalPage = location === "/terms-and-conditions" || location === "/privacy-policy";
  const authPages = ["/login", "/setup-superadmin", "/change-password", "/forgot-password", "/reset-password", "/onboarding", "/survey"];
  
  if (authPages.includes(location) || isAdminPage) {
    return null;
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
