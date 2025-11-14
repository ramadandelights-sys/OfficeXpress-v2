import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Wallet, 
  Search, 
  Download, 
  CreditCard,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Eye,
  Plus,
  Minus,
  RefreshCw,
  History,
  DollarSign
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import type { UserWallet, WalletTransaction } from "@shared/schema";

type EnhancedWallet = UserWallet & {
  userName: string;
  userPhone: string;
  lastTransactionDate: Date | null;
  totalCredits: number;
  totalDebits: number;
};

// Form schema for wallet adjustment
const adjustmentSchema = z.object({
  type: z.enum(["credit", "debit"]),
  amount: z.number().positive("Amount must be positive"),
  reason: z.string().min(1, "Reason is required").max(500, "Reason too long"),
});

type AdjustmentFormData = z.infer<typeof adjustmentSchema>;

export default function WalletManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWallet, setSelectedWallet] = useState<EnhancedWallet | null>(null);
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [selectedWalletTransactions, setSelectedWalletTransactions] = useState<WalletTransaction[]>([]);

  // Form for wallet adjustment
  const adjustmentForm = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      type: "credit",
      amount: 0,
      reason: "",
    },
  });

  // Fetch wallets
  const { data: walletsData, isLoading: isLoadingWallets } = useQuery({
    queryKey: ["/api/admin/wallets"],
    queryFn: async () => {
      const response = await fetch("/api/admin/wallets");
      if (!response.ok) throw new Error("Failed to fetch wallets");
      const data = await response.json();
      return data.wallets as EnhancedWallet[];
    }
  });

  // Fetch transactions for a specific wallet
  const fetchTransactions = async (walletId: string) => {
    const response = await fetch(`/api/admin/wallets/${walletId}/transactions`);
    if (!response.ok) throw new Error("Failed to fetch transactions");
    const data = await response.json();
    return data.transactions as WalletTransaction[];
  };

  // Wallet adjustment mutation
  const adjustWalletMutation = useMutation({
    mutationFn: async (data: { walletId: string } & AdjustmentFormData) => {
      return await apiRequest(`/api/admin/wallets/${data.walletId}/adjust`, {
        method: "POST",
        body: JSON.stringify({
          amount: data.amount,
          type: data.type,
          reason: data.reason,
        }),
      });
    },
    onSuccess: () => {
      toast({ title: "Wallet adjusted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallets"] });
      setShowAdjustmentDialog(false);
      adjustmentForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to adjust wallet",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter wallets
  const filteredWallets = walletsData?.filter(wallet => {
    const matchesSearch = 
      wallet.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wallet.userPhone.includes(searchQuery);
    
    return matchesSearch;
  }) || [];

  // Calculate statistics
  const stats = walletsData ? {
    totalWallets: walletsData.length,
    totalBalance: walletsData.reduce((sum, w) => sum + w.balance, 0),
    averageBalance: walletsData.length > 0 
      ? walletsData.reduce((sum, w) => sum + w.balance, 0) / walletsData.length 
      : 0,
    lowBalanceCount: walletsData.filter(w => w.balance < 100).length,
  } : null;

  // Export to CSV
  const exportToCSV = () => {
    if (!filteredWallets.length) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const csvData = filteredWallets.map(wallet => ({
      "Wallet ID": wallet.id,
      "User Name": wallet.userName,
      "Phone": wallet.userPhone,
      "Current Balance": wallet.balance,
      "Total Credits": wallet.totalCredits,
      "Total Debits": wallet.totalDebits,
      "Last Transaction": wallet.lastTransactionDate 
        ? format(new Date(wallet.lastTransactionDate), "yyyy-MM-dd HH:mm")
        : "N/A",
      "Created": format(new Date(wallet.createdAt), "yyyy-MM-dd HH:mm"),
      "Last Updated": format(new Date(wallet.updatedAt), "yyyy-MM-dd HH:mm"),
    }));

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(","),
      ...csvData.map(row =>
        headers
          .map(header => {
            const value = row[header as keyof typeof row];
            if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `wallets_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Wallets exported successfully" });
  };

  // Handle viewing transaction history
  const viewTransactionHistory = async (wallet: EnhancedWallet) => {
    setSelectedWallet(wallet);
    try {
      const transactions = await fetchTransactions(wallet.id);
      setSelectedWalletTransactions(transactions);
      setShowTransactionHistory(true);
    } catch (error) {
      toast({
        title: "Failed to fetch transaction history",
        variant: "destructive",
      });
    }
  };

  // Handle adjustment form submit
  const onAdjustmentSubmit = (data: AdjustmentFormData) => {
    if (selectedWallet) {
      adjustWalletMutation.mutate({
        walletId: selectedWallet.id,
        ...data,
      });
    }
  };

  // Get transaction type badge
  const getTransactionTypeBadge = (type: string, category?: string) => {
    if (category === "admin_adjustment") {
      return <Badge variant="outline" className="border-purple-500 text-purple-600">Admin</Badge>;
    }
    return type === "credit" 
      ? <Badge variant="default" className="bg-green-500">Credit</Badge>
      : <Badge variant="destructive">Debit</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Wallets</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-wallets">
              {isLoadingWallets ? <Skeleton className="h-8 w-20" /> : stats?.totalWallets || 0}
            </div>
            <p className="text-xs text-muted-foreground">Active user wallets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-balance">
              {isLoadingWallets ? <Skeleton className="h-8 w-20" /> : `৳${stats?.totalBalance?.toFixed(2) || 0}`}
            </div>
            <p className="text-xs text-muted-foreground">Sum of all wallet balances</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-average-balance">
              {isLoadingWallets ? <Skeleton className="h-8 w-20" /> : `৳${stats?.averageBalance?.toFixed(2) || 0}`}
            </div>
            <p className="text-xs text-muted-foreground">Per wallet average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Balance</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-low-balance">
              {isLoadingWallets ? <Skeleton className="h-8 w-20" /> : stats?.lowBalanceCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">Wallets below ৳100</p>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Management */}
      <Card>
        <CardHeader>
          <CardTitle>Wallet Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                  data-testid="input-search"
                />
              </div>
            </div>
            <Button onClick={exportToCSV} variant="outline" data-testid="button-export">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Wallets Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Current Balance</TableHead>
                  <TableHead>Total Credits</TableHead>
                  <TableHead>Total Debits</TableHead>
                  <TableHead>Last Transaction</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingWallets ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Loading wallets...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredWallets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <p className="text-muted-foreground">No wallets found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWallets.map((wallet) => (
                    <TableRow 
                      key={wallet.id}
                      data-testid={`row-wallet-${wallet.id}`}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{wallet.userName}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatPhoneNumber(wallet.userPhone)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          ৳{wallet.balance.toFixed(2)}
                          {wallet.balance < 100 && (
                            <Badge variant="outline" className="ml-2 border-yellow-500 text-yellow-600">
                              Low
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-green-600">
                        +৳{wallet.totalCredits.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-red-600">
                        -৳{wallet.totalDebits.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {wallet.lastTransactionDate ? (
                          <div className="text-sm">
                            {format(new Date(wallet.lastTransactionDate), "MMM dd, yyyy")}
                            <br />
                            <span className="text-muted-foreground">
                              {format(new Date(wallet.lastTransactionDate), "HH:mm")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No transactions</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewTransactionHistory(wallet)}
                            data-testid={`button-history-${wallet.id}`}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedWallet(wallet);
                              setShowAdjustmentDialog(true);
                            }}
                            data-testid={`button-adjust-${wallet.id}`}
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Adjustment Dialog */}
      <Dialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Wallet Balance</DialogTitle>
            <DialogDescription>
              Perform an admin adjustment to the user's wallet balance
            </DialogDescription>
          </DialogHeader>
          {selectedWallet && (
            <>
              <div className="space-y-2 py-4">
                <p className="text-sm">
                  <strong>User:</strong> {selectedWallet.userName}
                </p>
                <p className="text-sm">
                  <strong>Phone:</strong> {formatPhoneNumber(selectedWallet.userPhone)}
                </p>
                <p className="text-sm">
                  <strong>Current Balance:</strong> ৳{selectedWallet.balance.toFixed(2)}
                </p>
              </div>
              <Form {...adjustmentForm}>
                <form onSubmit={adjustmentForm.handleSubmit(onAdjustmentSubmit)} className="space-y-4">
                  <FormField
                    control={adjustmentForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transaction Type</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex space-x-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="credit" id="credit" />
                              <label htmlFor="credit" className="flex items-center cursor-pointer">
                                <Plus className="h-4 w-4 mr-1 text-green-600" />
                                Credit (Add Money)
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="debit" id="debit" />
                              <label htmlFor="debit" className="flex items-center cursor-pointer">
                                <Minus className="h-4 w-4 mr-1 text-red-600" />
                                Debit (Remove Money)
                              </label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={adjustmentForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (৳)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            data-testid="input-amount"
                          />
                        </FormControl>
                        <FormDescription>
                          Enter the amount to {adjustmentForm.watch("type")} to/from the wallet
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={adjustmentForm.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason for Adjustment</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter the reason for this adjustment..."
                            {...field}
                            data-testid="textarea-reason"
                          />
                        </FormControl>
                        <FormDescription>
                          This will be logged for audit purposes
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAdjustmentDialog(false);
                        adjustmentForm.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={adjustWalletMutation.isPending}
                      data-testid="button-submit-adjustment"
                    >
                      {adjustWalletMutation.isPending ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Adjust Balance"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog open={showTransactionHistory} onOpenChange={setShowTransactionHistory}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Transaction History</DialogTitle>
            <DialogDescription>
              {selectedWallet && (
                <span>
                  Showing transactions for {selectedWallet.userName} ({formatPhoneNumber(selectedWallet.userPhone)})
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] w-full rounded-md border p-4">
            {selectedWalletTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No transactions found</p>
            ) : (
              <div className="space-y-4">
                {selectedWalletTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex justify-between items-start p-3 rounded-lg border"
                    data-testid={`transaction-${transaction.id}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        {transaction.type === "credit" ? (
                          <Plus className="h-4 w-4 text-green-600" />
                        ) : (
                          <Minus className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium">
                          {transaction.type === "credit" ? "+" : "-"}৳{transaction.amount.toFixed(2)}
                        </span>
                        {getTransactionTypeBadge(transaction.type, transaction.category)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(transaction.createdAt), "PPpp")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        Balance: ৳{transaction.balanceAfter.toFixed(2)}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}