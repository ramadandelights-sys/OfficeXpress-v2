import { useState, useEffect } from "react";
import { Calendar, MapPin, Clock, DollarSign, ChevronRight, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation as useWouterLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useSubscriptions, useCancelSubscription } from "@/hooks/useSubscriptions";

const weekdayMapping: { [key: string]: string } = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
};

export default function MySubscriptionsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useWouterLocation();
  const { toast } = useToast();
  const { subscriptions, activeSubscriptions, isLoading: subscriptionsLoading, error: subscriptionsError } = useSubscriptions();
  const cancelSubscription = useCancelSubscription();
  
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [hasRedirected, setHasRedirected] = useState(false);
  
  // Redirect to login if not authenticated (only once)
  useEffect(() => {
    if (!authLoading && !user && !hasRedirected) {
      setHasRedirected(true);
      setLocation("/login");
    }
  }, [authLoading, user, hasRedirected, setLocation]);

  // Show loading while checking auth or subscriptions
  if (authLoading || (!user && !hasRedirected)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-6 w-96 mb-8" />
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  // Show login message if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Please log in to view your subscriptions
          </h1>
          <Button onClick={() => setLocation("/login")}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Show error if subscriptions failed to load
  if (subscriptionsError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Failed to load subscriptions
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please try refreshing the page
          </p>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }
  
  // Handle subscription cancellation
  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      await cancelSubscription.mutateAsync(subscriptionId);
      setCancellingId(null);
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };
  
  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case 'pending_cancellation':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Ending Soon
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        );
      case 'expired':
        return (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
            <XCircle className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2" data-testid="heading-subscriptions">
            My Subscriptions
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Manage your carpool subscriptions
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card data-testid="card-active-subscriptions">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-600 dark:text-gray-400">Active Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptionsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-bold text-primary" data-testid="text-active-count">
                  {activeSubscriptions.length}
                </p>
              )}
            </CardContent>
          </Card>
          
          <Card data-testid="card-monthly-spending">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-600 dark:text-gray-400">Monthly Spending (Online)</CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptionsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-3xl font-bold text-primary" data-testid="text-monthly-total">
                  ৳{activeSubscriptions
                    .filter(sub => sub.paymentMethod === 'online' || !sub.paymentMethod)
                    .reduce((sum, sub) => sum + (typeof sub.monthlyFee === 'number' ? sub.monthlyFee : parseFloat(sub.monthlyFee) || 0), 0).toFixed(2)}
                </p>
              )}
            </CardContent>
          </Card>
          
          <Card data-testid="card-new-subscription">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-600 dark:text-gray-400">Need Another Route?</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setLocation("/carpool")}
                className="w-full"
                data-testid="button-new-subscription"
              >
                Add Subscription
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Subscriptions List */}
        {subscriptionsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : subscriptions.length === 0 ? (
          <Card className="text-center py-12" data-testid="card-no-subscriptions">
            <CardContent>
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Subscriptions Yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Start your daily commute with our convenient carpool subscription service. Save money and help the environment!
              </p>
              <Button 
                onClick={() => setLocation("/carpool")}
                size="lg"
                data-testid="button-get-started"
              >
                Get Started
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {subscriptions?.map((subscription) => (
              <Card 
                key={subscription.id} 
                className={cn(
                  "transition-all",
                  subscription.status === 'cancelled' || subscription.status === 'expired'
                    ? "opacity-75"
                    : ""
                )}
                data-testid={`card-subscription-${subscription.id}`}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{subscription.routeName}</CardTitle>
                      <CardDescription className="mt-2">
                        Subscription started on {format(new Date(subscription.startDate), 'MMMM dd, yyyy')}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {subscription.paymentMethod === 'cash' && (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                          Cash
                        </Badge>
                      )}
                      {getStatusBadge(subscription.status)}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Left Column - Details */}
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm text-gray-600 dark:text-gray-400">Weekdays</p>
                          <p className="text-sm">
                            {subscription.weekdays.map(day => weekdayMapping[day] || day).join(', ')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm text-gray-600 dark:text-gray-400">Time Slot</p>
                          <p className="text-sm">{subscription.timeSlot}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm text-gray-600 dark:text-gray-400">Pickup Point</p>
                          <p className="text-sm">{subscription.pickupPointName}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm text-gray-600 dark:text-gray-400">Drop-off Point</p>
                          <p className="text-sm">{subscription.dropOffPointName}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Column - Pricing and Actions */}
                    <div className="space-y-4">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        {subscription.paymentMethod === 'cash' ? (
                          <div className="text-center py-2">
                            <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                              Pay cash directly to driver for each trip
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Monthly Fee</span>
                            <span className="text-2xl font-bold text-primary">
                              ৳{subscription.monthlyFee.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {subscription.status === 'pending_cancellation' && subscription.endDate && (
                          <Alert className="mt-3">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              Subscription ends on {format(new Date(subscription.endDate), 'MMMM dd, yyyy')}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      {subscription.status === 'active' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => setCancellingId(subscription.id)}
                            data-testid={`button-cancel-${subscription.id}`}
                          >
                            Cancel Subscription
                          </Button>
                        </div>
                      )}
                      
                      {subscription.status === 'pending_cancellation' && (
                        <Alert>
                          <AlertDescription>
                            This subscription has been cancelled and will remain active until the end of the current billing period.
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {(subscription.status === 'cancelled' || subscription.status === 'expired') && (
                        <div className="text-center">
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                            This subscription has ended
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => setLocation("/carpool")}
                            data-testid={`button-resubscribe-${subscription.id}`}
                          >
                            Subscribe Again
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Cancellation Confirmation Dialog */}
      <AlertDialog open={!!cancellingId} onOpenChange={() => setCancellingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this subscription? You'll continue to have access until the end of the current billing period, but it won't renew automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-dialog-no">
              Keep Subscription
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancellingId && handleCancelSubscription(cancellingId)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-cancel-dialog-yes"
            >
              Yes, Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}