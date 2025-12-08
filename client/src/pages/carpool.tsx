import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Clock, Calendar, CheckCircle2, AlertCircle, Wallet, ChevronRight, ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation as useWouterLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  useWallet, 
  usePurchaseSubscription, 
  useCalculateCost, 
  useTopUpWallet,
  type PurchaseSubscriptionData 
} from "@/hooks/useSubscriptions";

import type { 
  CarpoolRoute, 
  CarpoolPickupPoint, 
  CarpoolTimeSlot 
} from "@shared/schema";

// Form schema
const subscriptionFormSchema = z.object({
  routeId: z.string().min(1, "Route is required"),
  weekdays: z.array(z.string()).min(1, "At least one weekday must be selected"),
  timeSlotId: z.string().min(1, "Time slot is required"),
  pickupPointId: z.string().min(1, "Pickup point is required"),
  dropOffPointId: z.string().min(1, "Drop-off point is required"),
});

type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>;

const weekdayOptions = [
  { value: 'monday', label: 'Monday', short: 'Mon' },
  { value: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { value: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { value: 'thursday', label: 'Thursday', short: 'Thu' },
  { value: 'friday', label: 'Friday', short: 'Fri' },
];

export default function CarpoolPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useWouterLocation();
  const { toast } = useToast();
  const { wallet, balance, isLoading: walletLoading } = useWallet();
  const purchaseSubscription = usePurchaseSubscription();
  const topUpWallet = useTopUpWallet();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [showTopUpDialog, setShowTopUpDialog] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [selectedRoute, setSelectedRoute] = useState<string>("");
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);
  const [purchaseComplete, setPurchaseComplete] = useState(false);

  // Fetch available routes
  const { data: routes = [], isLoading: loadingRoutes } = useQuery<CarpoolRoute[]>({
    queryKey: ['/api/carpool/routes'],
  });

  // Fetch pickup points for selected route
  const { data: pickupPoints = [], isLoading: loadingPickupPoints } = useQuery<CarpoolPickupPoint[]>({
    queryKey: [`/api/carpool/routes/${selectedRoute}/pickup-points`],
    enabled: !!selectedRoute,
  });

  // Fetch time slots for selected route
  const { data: timeSlots = [], isLoading: loadingTimeSlots } = useQuery<CarpoolTimeSlot[]>({
    queryKey: [`/api/carpool/routes/${selectedRoute}/time-slots`],
    enabled: !!selectedRoute,
  });

  // Calculate cost when route and weekdays are selected
  const { monthlyTotal, isLoading: calculatingCost } = useCalculateCost(
    selectedRoute,
    selectedWeekdays
  );

  // Get selected route details
  const selectedRouteDetails = routes.find(r => r.id === selectedRoute);

  // Form setup
  const form = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      routeId: "",
      weekdays: [],
      timeSlotId: "",
      pickupPointId: "",
      dropOffPointId: "",
    },
  });

  // Handle route selection
  const handleRouteSelection = (routeId: string) => {
    setSelectedRoute(routeId);
    form.setValue('routeId', routeId);
    // Reset dependent fields
    form.setValue('weekdays', []);
    form.setValue('timeSlotId', '');
    form.setValue('pickupPointId', '');
    form.setValue('dropOffPointId', '');
    setSelectedWeekdays([]);
  };

  // Handle weekday selection
  const handleWeekdayToggle = (weekday: string) => {
    const currentWeekdays = form.getValues('weekdays');
    let newWeekdays: string[];
    
    if (currentWeekdays.includes(weekday)) {
      newWeekdays = currentWeekdays.filter(w => w !== weekday);
    } else {
      newWeekdays = [...currentWeekdays, weekday];
    }
    
    form.setValue('weekdays', newWeekdays);
    setSelectedWeekdays(newWeekdays);
  };

  // Handle step navigation
  const goToNextStep = () => {
    const currentValues = form.getValues();
    
    // Validate current step before proceeding
    if (currentStep === 1 && !currentValues.routeId) {
      toast({
        title: "Please select a route",
        variant: "destructive",
      });
      return;
    }
    
    // Require login to proceed past step 1
    if (currentStep === 1 && !user) {
      toast({
        title: "Login Required",
        description: "Please log in to subscribe to a route",
      });
      setLocation("/login?redirect=/carpool");
      return;
    }
    
    if (currentStep === 2 && currentValues.weekdays.length === 0) {
      toast({
        title: "Please select at least one weekday",
        variant: "destructive",
      });
      return;
    }
    
    if (currentStep === 3 && !currentValues.timeSlotId) {
      toast({
        title: "Please select a time slot",
        variant: "destructive",
      });
      return;
    }
    
    if (currentStep === 4 && (!currentValues.pickupPointId || !currentValues.dropOffPointId)) {
      toast({
        title: "Please select both pickup and drop-off points",
        variant: "destructive",
      });
      return;
    }
    
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle subscription purchase
  const handlePurchase = async () => {
    const formData = form.getValues();
    
    // Check wallet balance
    if (balance < monthlyTotal) {
      setShowTopUpDialog(true);
      return;
    }
    
    try {
      // Add startDate (start of next month or today if it's the 1st)
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().split('T')[0];
      
      await purchaseSubscription.mutateAsync({
        ...formData,
        startDate,
      });
      setPurchaseComplete(true);
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  // Handle wallet top-up
  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await topUpWallet.mutateAsync(amount);
      setShowTopUpDialog(false);
      setTopUpAmount("");
      toast({
        title: "Wallet topped up successfully",
        description: "You can now proceed with your subscription purchase",
      });
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  // Step progress indicator
  const steps = [
    { number: 1, title: "Route" },
    { number: 2, title: "Weekdays" },
    { number: 3, title: "Time Slot" },
    { number: 4, title: "Pickup & Drop" },
    { number: 5, title: "Review & Pay" },
  ];

  if (purchaseComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center" data-testid="subscription-success-card">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl">Subscription Activated!</CardTitle>
              <CardDescription className="text-base mt-2">
                Your carpool subscription has been successfully activated. You'll receive an email confirmation shortly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Monthly Fee</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">৳{monthlyTotal.toFixed(2)}</p>
              </div>
              
              <div className="flex gap-4 justify-center pt-4">
                <Button
                  onClick={() => setLocation("/my-subscriptions")}
                  data-testid="button-view-subscriptions"
                >
                  View My Subscriptions
                </Button>
                <Button
                  onClick={() => setLocation("/")}
                  variant="outline"
                  data-testid="button-go-home"
                >
                  Go to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {steps.map((step, index) => (
              <div key={step.number} className="flex-1 flex items-center">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm",
                      currentStep >= step.number
                        ? "bg-primary text-primary-foreground"
                        : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                    )}
                  >
                    {currentStep > step.number ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <span className="text-xs mt-2 text-gray-600 dark:text-gray-400">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-1 flex-1 mx-2",
                      currentStep > step.number
                        ? "bg-primary"
                        : "bg-gray-200 dark:bg-gray-700"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Subscribe to Carpool Service</CardTitle>
            <CardDescription>
              Set up your monthly carpool subscription in just a few steps
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              {/* Step 1: Select Route */}
              {currentStep === 1 && (
                <div className="space-y-6" data-testid="step-select-route">
                  <h3 className="text-lg font-semibold">Select Your Route</h3>
                  
                  {loadingRoutes ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : (
                    <RadioGroup
                      value={form.watch('routeId')}
                      onValueChange={handleRouteSelection}
                    >
                      {routes.map((route) => (
                        <div key={route.id} className="mb-3">
                          <Label
                            htmlFor={route.id}
                            className="flex items-start space-x-3 cursor-pointer p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800"
                            data-testid={`route-option-${route.id}`}
                          >
                            <RadioGroupItem value={route.id} id={route.id} />
                            <div className="flex-1">
                              <div className="font-medium">{route.name}</div>
                              <div className="text-sm text-gray-500 mt-1">
                                {route.fromLocation} → {route.toLocation}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                Available: {route.weekdays?.map(d => weekdayOptions[d]?.short || d).join(', ') || 'Mon-Fri'}
                              </div>
                              <div className="text-sm font-medium text-primary mt-2">
                                ৳{route.pricePerSeat}/day
                              </div>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                </div>
              )}

              {/* Step 2: Select Weekdays */}
              {currentStep === 2 && (
                <div className="space-y-6" data-testid="step-select-weekdays">
                  <h3 className="text-lg font-semibold">Choose Your Weekdays</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Select the days you want to use the carpool service
                  </p>
                  
                  <div className="space-y-3">
                    {weekdayOptions.map((weekday) => {
                      const weekdayIndex = weekdayOptions.findIndex(w => w.value === weekday.value);
                      const isAvailable = selectedRouteDetails?.weekdays?.includes(weekdayIndex) ?? true;
                      
                      return (
                        <div key={weekday.value} className="flex items-center space-x-3">
                          <Checkbox
                            id={weekday.value}
                            checked={form.watch('weekdays').includes(weekday.value)}
                            onCheckedChange={() => handleWeekdayToggle(weekday.value)}
                            disabled={!isAvailable}
                            data-testid={`checkbox-weekday-${weekday.value}`}
                          />
                          <Label
                            htmlFor={weekday.value}
                            className={cn(
                              "cursor-pointer",
                              !isAvailable && "text-gray-400 line-through"
                            )}
                          >
                            {weekday.label}
                          </Label>
                        </div>
                      );
                    })}
                  </div>

                  {selectedWeekdays.length > 0 && !calculatingCost && (
                    <Alert>
                      <Wallet className="h-4 w-4" />
                      <AlertDescription>
                        Estimated monthly cost: <strong>৳{monthlyTotal.toFixed(2)}</strong>
                        <br />
                        <span className="text-xs text-gray-500">
                          ({selectedWeekdays.length} days × 4.33 weeks × ৳{selectedRouteDetails?.pricePerSeat})
                        </span>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Step 3: Select Time Slot */}
              {currentStep === 3 && (
                <div className="space-y-6" data-testid="step-select-timeslot">
                  <h3 className="text-lg font-semibold">Select Office Entry Time</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Choose your preferred time slot for reaching the office
                  </p>
                  
                  {loadingTimeSlots ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : (
                    <RadioGroup
                      value={form.watch('timeSlotId')}
                      onValueChange={(value) => form.setValue('timeSlotId', value)}
                    >
                      {timeSlots.map((slot) => (
                        <div key={slot.id} className="mb-3">
                          <Label
                            htmlFor={`slot-${slot.id}`}
                            className="flex items-center space-x-3 cursor-pointer p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800"
                            data-testid={`timeslot-option-${slot.id}`}
                          >
                            <RadioGroupItem value={slot.id} id={`slot-${slot.id}`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span className="font-medium">Departure: {slot.departureTime}</span>
                              </div>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                </div>
              )}

              {/* Step 4: Select Pickup and Drop Points */}
              {currentStep === 4 && (
                <div className="space-y-6" data-testid="step-select-points">
                  <h3 className="text-lg font-semibold">Select Pickup and Drop-off Points</h3>
                  
                  {loadingPickupPoints ? (
                    <div className="space-y-3">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : (
                    <>
                      <FormField
                        control={form.control}
                        name="pickupPointId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pickup Point</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-pickup-point">
                                  <SelectValue placeholder="Select pickup point" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {pickupPoints.map((point) => (
                                  <SelectItem
                                    key={point.id}
                                    value={point.id}
                                    data-testid={`pickup-point-${point.id}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <MapPin className="w-3 h-3" />
                                      {point.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dropOffPointId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Drop-off Point</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-dropoff-point">
                                  <SelectValue placeholder="Select drop-off point" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {pickupPoints.map((point) => (
                                  <SelectItem
                                    key={point.id}
                                    value={point.id}
                                    data-testid={`dropoff-point-${point.id}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <MapPin className="w-3 h-3" />
                                      {point.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
              )}

              {/* Step 5: Review and Confirm */}
              {currentStep === 5 && (
                <div className="space-y-6" data-testid="step-review">
                  <h3 className="text-lg font-semibold">Review Your Subscription</h3>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Route:</span>
                        <span className="font-medium">{selectedRouteDetails?.name}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Weekdays:</span>
                        <span className="font-medium">
                          {form.watch('weekdays').map(w => 
                            weekdayOptions.find(opt => opt.value === w)?.short
                          ).join(', ')}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Time Slot:</span>
                        <span className="font-medium">
                          {timeSlots.find(ts => ts.id === form.watch('timeSlotId'))?.departureTime}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Pickup:</span>
                        <span className="font-medium">
                          {pickupPoints.find(p => p.id === form.watch('pickupPointId'))?.name}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Drop-off:</span>
                        <span className="font-medium">
                          {pickupPoints.find(p => p.id === form.watch('dropOffPointId'))?.name}
                        </span>
                      </div>
                      
                      <div className="border-t pt-3 mt-3">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Monthly Fee:</span>
                          <span className="text-2xl font-bold text-primary">
                            ৳{monthlyTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Wallet Balance Check */}
                    <div className="border rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-5 h-5 text-gray-500" />
                          <span className="text-gray-600 dark:text-gray-400">Wallet Balance:</span>
                        </div>
                        <span className={cn(
                          "font-semibold",
                          balance >= monthlyTotal ? "text-green-600" : "text-red-600"
                        )}>
                          ৳{balance.toFixed(2)}
                        </span>
                      </div>
                      
                      {balance < monthlyTotal && (
                        <Alert className="mt-3">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Insufficient balance. You need ৳{(monthlyTotal - balance).toFixed(2)} more.
                            <Button
                              variant="link"
                              className="p-0 h-auto ml-1"
                              onClick={() => setShowTopUpDialog(true)}
                              data-testid="button-topup-inline"
                            >
                              Top up now
                            </Button>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Form>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={goToPreviousStep}
              disabled={currentStep === 1}
              data-testid="button-previous-step"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            {currentStep < 5 ? (
              <Button
                onClick={goToNextStep}
                data-testid="button-next-step"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handlePurchase}
                disabled={purchaseSubscription.isPending || balance < monthlyTotal}
                data-testid="button-confirm-purchase"
              >
                {purchaseSubscription.isPending ? "Processing..." : "Confirm & Subscribe"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Top-up Dialog */}
      <Dialog open={showTopUpDialog} onOpenChange={setShowTopUpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Top Up Wallet</DialogTitle>
            <DialogDescription>
              Add funds to your wallet to complete the subscription purchase
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topup-amount">Amount (৳)</Label>
              <Input
                id="topup-amount"
                type="number"
                placeholder="Enter amount"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                min="1"
                step="0.01"
                data-testid="input-topup-amount"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {[500, 1000, 2000].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setTopUpAmount(amount.toString())}
                  data-testid={`button-quick-amount-${amount}`}
                >
                  ৳{amount}
                </Button>
              ))}
            </div>
            
            <Alert>
              <AlertDescription>
                <strong>Note:</strong> This is a mock payment system. Funds will be added instantly to your wallet.
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTopUpDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTopUp}
              disabled={topUpWallet.isPending}
              data-testid="button-confirm-topup"
            >
              {topUpWallet.isPending ? "Processing..." : "Add Funds"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}