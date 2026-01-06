import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Types for wallet and subscription data
export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  referenceId?: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  routeId: string;
  routeName: string;
  weekdays: string[];
  timeSlotId: string;
  timeSlot: string;
  pickupPointId: string;
  pickupPointName: string;
  dropOffPointId: string;
  dropOffPointName: string;
  monthlyFee: number;
  status: 'active' | 'pending_cancellation' | 'cancelled' | 'expired';
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CostCalculation {
  pricePerSeat: number;
  selectedWeekdays: string[];
  daysPerWeek: number;
  estimatedDaysPerMonth: number;
  monthlyCost: number;
  currency: string;
}

// Schema for purchase subscription
const purchaseSubscriptionSchema = z.object({
  routeId: z.string().min(1, "Route is required"),
  weekdays: z.array(z.string()).min(1, "At least one weekday must be selected"),
  timeSlotId: z.string().min(1, "Time slot is required"),
  pickupPointId: z.string().min(1, "Pickup point is required"),
  dropOffPointId: z.string().min(1, "Drop-off point is required"),
  startDate: z.string().min(1, "Start date is required"),
  paymentMethod: z.enum(["online", "cash"]).default("online"),
});

export type PurchaseSubscriptionData = z.infer<typeof purchaseSubscriptionSchema>;

// Hook to get wallet information
export function useWallet() {
  const { data: wallet, isLoading, error } = useQuery<Wallet>({
    queryKey: ['/api/wallet'],
  });

  // Parse balance to number (API returns string from database)
  const balance = wallet?.balance ? parseFloat(String(wallet.balance)) : 0;

  return {
    wallet,
    isLoading,
    error,
    balance: isNaN(balance) ? 0 : balance,
  };
}

// Hook to get wallet transactions
export function useWalletTransactions() {
  const { data: rawTransactions = [], isLoading, error } = useQuery<WalletTransaction[]>({
    queryKey: ['/api/wallet/transactions'],
  });

  // Parse amounts to numbers (API returns strings from database)
  const transactions = rawTransactions.map(t => ({
    ...t,
    amount: typeof t.amount === 'string' ? parseFloat(t.amount) : (t.amount || 0),
  }));

  return {
    transactions,
    isLoading,
    error,
  };
}

// Hook to top up wallet
export function useTopUpWallet() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (amount: number) => {
      if (amount <= 0) {
        throw new Error("Amount must be greater than 0");
      }
      
      const response = await apiRequest('POST', '/api/wallet/topup', { amount });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/transactions'] });
      toast({
        title: "Success",
        description: `৳${data.amount.toFixed(2)} has been added to your wallet`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to top up wallet",
        variant: "destructive",
      });
    },
  });
}

// Hook to get all user subscriptions
export function useSubscriptions() {
  const { data: subscriptions = [], isLoading, error } = useQuery<Subscription[]>({
    queryKey: ['/api/subscriptions'],
  });

  return {
    subscriptions,
    activeSubscriptions: subscriptions.filter(s => s.status === 'active'),
    isLoading,
    error,
  };
}

// Hook to get active subscriptions only
export function useActiveSubscriptions() {
  const { data: subscriptions = [], isLoading, error } = useQuery<Subscription[]>({
    queryKey: ['/api/subscriptions/active'],
  });

  return {
    subscriptions,
    isLoading,
    error,
  };
}

// Hook to calculate subscription cost
export function useCalculateCost(routeId?: string, weekdays?: string[]) {
  const { data, isLoading, error } = useQuery<CostCalculation>({
    queryKey: ['/api/subscriptions/calculate-cost', routeId, weekdays],
    queryFn: async () => {
      if (!routeId || !weekdays || weekdays.length === 0) {
        throw new Error("Route and weekdays are required");
      }
      
      const response = await apiRequest('POST', '/api/subscriptions/calculate-cost', {
        routeId,
        weekdays,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to calculate cost");
      }
      
      return response.json();
    },
    enabled: !!routeId && !!weekdays && weekdays.length > 0,
  });

  return {
    costData: data,
    monthlyTotal: data?.monthlyCost ?? 0,
    isLoading,
    error,
  };
}

// Hook to purchase subscription
export function usePurchaseSubscription() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: PurchaseSubscriptionData) => {
      const response = await apiRequest('POST', '/api/subscriptions/purchase', data);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to purchase subscription");
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/wallet'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions/active'] });
      
      toast({
        title: "Subscription Purchased!",
        description: `Your subscription has been activated. Monthly fee: ৳${data.monthlyFee.toFixed(2)}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to purchase subscription",
        variant: "destructive",
      });
    },
  });
}

// Hook to cancel subscription
export function useCancelSubscription() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      const response = await apiRequest('POST', `/api/subscriptions/${subscriptionId}/cancel`, {});
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to cancel subscription");
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions/active'] });
      
      toast({
        title: "Subscription Cancelled",
        description: `Your subscription will end on ${new Date(data.endDate).toLocaleDateString()}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });
}