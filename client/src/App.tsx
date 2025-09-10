import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FacebookPixelProvider } from "@/contexts/FacebookPixelContext";
import { GoogleAnalyticsProvider } from "@/contexts/GoogleAnalyticsContext";
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
      <Route path="/terms" component={LegalPageView} />
      <Route path="/privacy" component={LegalPageView} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ConditionalFooter() {
  const [location] = useLocation();
  const isAdminPage = location === "/admin";
  const isLegalPage = location === "/terms" || location === "/privacy";
  
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
  // Facebook Pixel configuration
  const facebookPixelConfig = {
    pixelId: import.meta.env.VITE_FACEBOOK_PIXEL_ID || '',
    accessToken: import.meta.env.VITE_FACEBOOK_ACCESS_TOKEN,
  };

  // Google Analytics configuration
  const googleAnalyticsConfig = {
    measurementId: import.meta.env.VITE_GOOGLE_ANALYTICS_ID || 'GA_MEASUREMENT_ID',
  };

  return (
    <QueryClientProvider client={queryClient}>
      <FacebookPixelProvider config={facebookPixelConfig}>
        <GoogleAnalyticsProvider config={googleAnalyticsConfig}>
          <TooltipProvider>
            <div className="min-h-screen bg-background">
              <Header />
              <main>
                <Router />
              </main>
              <ConditionalFooter />
              <Toaster />
            </div>
          </TooltipProvider>
        </GoogleAnalyticsProvider>
      </FacebookPixelProvider>
    </QueryClientProvider>
  );
}

export default App;
