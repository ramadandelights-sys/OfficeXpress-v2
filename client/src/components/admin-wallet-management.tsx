import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Wallet, Download, Search, CreditCard, TrendingUp, TrendingDown, DollarSign, Eye, Plus, Minus, RefreshCw, RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface UserWallet {
  id: string;
  userId: string;
  balance: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields from API
  user?: {
    name: string;
    phone: string;
    email: string;
  };
  transactionCount?: number;
  lastTransactionDate?: string;
}

interface WalletTransaction {
  id: string;
  walletId: string;
  amount: string;
  type: 'credit' | 'debit';
  reason: string;
  description?: string;
  metadata?: any;
  createdAt: string;
  // Additional info from API
  performedBy?: {
    id: string;
    name: string;
  };
}

interface WalletStats {
  totalWallets: number;
  totalSystemBalance: number;
  averageBalance: number;
  walletsWithPositiveBalance: number;
  walletsWithZeroBalance: number;
  totalCredits: number;
  totalDebits: number;
  recentTransactions: number;
}

// Form schema for manual adjustments
const adjustmentSchema = z.object({
  type: z.enum(['credit', 'debit']),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format'),
  reason: z.string().min(3, 'Reason must be at least 3 characters'),
  description: z.string().optional()
});

export default function AdminWalletManagement() {
  const { hasPermission, user } = useAuth();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWallet, setSelectedWallet] = useState<UserWallet | null>(null);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [resetReason, setResetReason] = useState("");

  // Form for manual adjustments
  const adjustmentForm = useForm({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      type: 'credit' as 'credit' | 'debit',
      amount: '',
      reason: '',
      description: ''
    }
  });

  // Fetch wallets
  const { data: wallets = [], isLoading } = useQuery<UserWallet[]>({
    queryKey: ['/api/admin/wallets'],
    enabled: hasPermission('walletManagement', 'view')
  });

  // Fetch wallet stats
  const { data: stats } = useQuery<WalletStats>({
    queryKey: ['/api/admin/wallets/stats'],
    enabled: hasPermission('walletManagement', 'view')
  });

  // Fetch transactions for selected wallet
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<WalletTransaction[]>({
    queryKey: ['/api/admin/wallets', selectedWallet?.id, 'transactions'],
    queryFn: async (): Promise<WalletTransaction[]> => {
      if (!selectedWallet) return [];
      const response = await apiRequest('GET', `/api/admin/wallets/${selectedWallet.id}/transactions`);
      return response.json();
    },
    enabled: !!selectedWallet && showTransactionDialog
  });

  // Manual adjustment mutation
  const adjustmentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof adjustmentSchema>) => {
      if (!selectedWallet) throw new Error('No wallet selected');
      return apiRequest('POST', `/api/admin/wallets/${selectedWallet.id}/adjust`, {
        ...data,
        amount: parseFloat(data.amount),
        adminUserId: user?.id
      });
    },
    onSuccess: () => {
      toast({ title: "Wallet adjustment successful" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/wallets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/wallets', selectedWallet?.id, 'transactions'] });
      setShowAdjustmentDialog(false);
      adjustmentForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Adjustment failed",
        description: error.message || 'An error occurred',
        variant: "destructive"
      });
    }
  });

  // Issue refund mutation
  const refundMutation = useMutation({
    mutationFn: async (data: { userId: string; amount: number; reason: string }) => {
      const response = await apiRequest('POST', '/api/admin/refunds', {
        ...data,
        adminUserId: user?.id
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Refund issued successfully",
        description: `৳${parseFloat(refundAmount).toFixed(2)} has been credited to the wallet.`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/wallets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/wallets', selectedWallet?.id, 'transactions'] });
      setShowRefundDialog(false);
      setRefundAmount("");
      setRefundReason("");
      setSelectedWallet(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to issue refund",
        description: error.message || 'An error occurred',
        variant: "destructive"
      });
    }
  });

  // Reset wallet mutation
  const resetMutation = useMutation({
    mutationFn: async (data: { walletId: string; reason: string }) => {
      const response = await apiRequest('POST', `/api/admin/wallets/${data.walletId}/reset`, {
        reason: data.reason
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Wallet reset successfully",
        description: `Previous balance of ৳${data.previousBalance?.toFixed(2) || '0.00'} has been zeroed out.`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/wallets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/wallets/stats'] });
      setShowResetDialog(false);
      setResetReason("");
      setSelectedWallet(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to reset wallet",
        description: error.message || 'An error occurred',
        variant: "destructive"
      });
    }
  });

  // Filter wallets based on search
  const filteredWallets = wallets.filter(wallet => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      wallet.user?.name?.toLowerCase().includes(query) ||
      wallet.user?.phone?.includes(query) ||
      wallet.user?.email?.toLowerCase().includes(query)
    );
  });

  // Export to CSV
  const exportToCSV = () => {
    if (!hasPermission('walletManagement', 'downloadCsv')) {
      toast({ title: "Permission denied", variant: "destructive" });
      return;
    }

    const data = filteredWallets.map(wallet => ({
      walletId: wallet.id,
      userId: wallet.userId,
      userName: wallet.user?.name || '',
      userPhone: formatPhoneNumber(wallet.user?.phone || ''),
      userEmail: wallet.user?.email || '',
      balance: wallet.balance,
      transactionCount: wallet.transactionCount || 0,
      lastTransactionDate: wallet.lastTransactionDate ? format(new Date(wallet.lastTransactionDate), 'yyyy-MM-dd HH:mm:ss') : '',
      createdAt: format(new Date(wallet.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      updatedAt: format(new Date(wallet.updatedAt), 'yyyy-MM-dd HH:mm:ss')
    }));

    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header as keyof typeof row];
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `wallets_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: "Wallets exported successfully" });
  };

  // Export transactions to CSV
  const exportTransactionsToCSV = () => {
    if (!hasPermission('walletManagement', 'downloadCsv') || !transactions.length) {
      toast({ title: "Permission denied or no data", variant: "destructive" });
      return;
    }

    const data = transactions.map(tx => ({
      transactionId: tx.id,
      walletId: tx.walletId,
      amount: tx.amount,
      type: tx.type,
      reason: tx.reason,
      description: tx.description || '',
      performedBy: tx.performedBy?.name || 'System',
      createdAt: format(new Date(tx.createdAt), 'yyyy-MM-dd HH:mm:ss')
    }));

    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header as keyof typeof row];
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `wallet_${selectedWallet?.id}_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: "Transactions exported successfully" });
  };

  const getBalanceColor = (balance: string) => {
    const amount = parseFloat(balance);
    if (amount > 0) return 'text-green-600 dark:text-green-400';
    if (amount < 0) return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  };

  const getTransactionIcon = (type: string, reason: string) => {
    if (type === 'credit') {
      return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />;
    } else {
      return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />;
    }
  };

  if (!hasPermission('walletManagement', 'view')) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">You don't have permission to view wallets.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total System Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">৳{stats.totalSystemBalance.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {stats.totalWallets} wallets
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">৳{stats.averageBalance.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Per wallet
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Wallets</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.walletsWithPositiveBalance}</div>
              <p className="text-xs text-muted-foreground mt-1">
                With positive balance
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Activity</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ৳{(stats.totalCredits - stats.totalDebits).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Net flow (credits - debits)
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Wallets List */}
      <Card>
        <CardHeader>
          <CardTitle>Wallet Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="relative w-[300px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
                data-testid="input-wallet-search"
              />
            </div>
            <Button
              onClick={exportToCSV}
              disabled={!hasPermission('walletManagement', 'downloadCsv')}
              data-testid="button-export-wallets"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-center">Transactions</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWallets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <p className="text-muted-foreground">No wallets found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWallets.map((wallet) => (
                    <TableRow key={wallet.id} data-testid={`row-wallet-${wallet.id}`}>
                      <TableCell className="font-medium">{wallet.user?.name || 'Unknown'}</TableCell>
                      <TableCell>{formatPhoneNumber(wallet.user?.phone || '')}</TableCell>
                      <TableCell>{wallet.user?.email || '-'}</TableCell>
                      <TableCell className={`text-right font-semibold ${getBalanceColor(wallet.balance)}`}>
                        ৳{parseFloat(wallet.balance).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{wallet.transactionCount || 0}</Badge>
                      </TableCell>
                      <TableCell>
                        {wallet.lastTransactionDate
                          ? format(new Date(wallet.lastTransactionDate), 'MMM dd, yyyy')
                          : 'No activity'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedWallet(wallet);
                              setShowTransactionDialog(true);
                            }}
                            data-testid={`button-view-transactions-${wallet.id}`}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Button>
                          {hasPermission('walletManagement', 'edit') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedWallet(wallet);
                                setShowAdjustmentDialog(true);
                              }}
                              data-testid={`button-adjust-wallet-${wallet.id}`}
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              Adjust
                            </Button>
                          )}
                          {hasPermission('walletRefunds') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => {
                                setSelectedWallet(wallet);
                                setShowRefundDialog(true);
                              }}
                              data-testid={`button-issue-refund-${wallet.id}`}
                            >
                              <RefreshCw className="mr-1 h-3 w-3" />
                              Refund
                            </Button>
                          )}
                          {hasPermission('walletManagement', 'edit') && parseFloat(wallet.balance) > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => {
                                setSelectedWallet(wallet);
                                setShowResetDialog(true);
                              }}
                              data-testid={`button-reset-wallet-${wallet.id}`}
                            >
                              <RotateCcw className="mr-1 h-3 w-3" />
                              Reset
                            </Button>
                          )}
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

      {/* Transaction History Dialog */}
      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction History</DialogTitle>
            <DialogDescription>
              {selectedWallet && (
                <div className="mt-2 space-y-1">
                  <p>User: {selectedWallet.user?.name} ({formatPhoneNumber(selectedWallet.user?.phone || '')})</p>
                  <p className={`font-semibold ${getBalanceColor(selectedWallet.balance)}`}>
                    Current Balance: ৳{parseFloat(selectedWallet.balance).toFixed(2)}
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {transactionsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No transactions found</p>
            ) : (
              <>
                <div className="flex justify-end mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportTransactionsToCSV}
                    disabled={!hasPermission('walletManagement', 'downloadCsv')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Transactions
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Performed By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{format(new Date(tx.createdAt), 'MMM dd, yyyy HH:mm')}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTransactionIcon(tx.type, tx.reason)}
                            <span className="capitalize">{tx.type}</span>
                          </div>
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${
                          tx.type === 'credit' 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {tx.type === 'credit' ? '+' : '-'}৳{Math.abs(parseFloat(tx.amount)).toFixed(2)}
                        </TableCell>
                        <TableCell>{tx.reason}</TableCell>
                        <TableCell>{tx.description || '-'}</TableCell>
                        <TableCell>{tx.performedBy?.name || 'System'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Adjustment Dialog */}
      <Dialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Wallet Adjustment</DialogTitle>
            <DialogDescription>
              {selectedWallet && (
                <div className="mt-2 space-y-1">
                  <p>User: {selectedWallet.user?.name} ({formatPhoneNumber(selectedWallet.user?.phone || '')})</p>
                  <p>Current Balance: ৳{parseFloat(selectedWallet.balance).toFixed(2)}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <Form {...adjustmentForm}>
            <form onSubmit={adjustmentForm.handleSubmit((data) => adjustmentMutation.mutate(data))} className="space-y-4">
              <FormField
                control={adjustmentForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adjustment Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-adjustment-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="credit">Credit (Add Money)</SelectItem>
                        <SelectItem value="debit">Debit (Remove Money)</SelectItem>
                      </SelectContent>
                    </Select>
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
                        {...field}
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="Enter amount"
                        data-testid="input-adjustment-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={adjustmentForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Refund for cancelled trip, Compensation, etc."
                        data-testid="input-adjustment-reason"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={adjustmentForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Details (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Any additional information about this adjustment"
                        className="resize-none"
                        data-testid="textarea-adjustment-description"
                      />
                    </FormControl>
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
                  disabled={adjustmentMutation.isPending}
                  data-testid="button-submit-adjustment"
                >
                  {adjustmentMutation.isPending ? 'Processing...' : 'Apply Adjustment'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Issue Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={(open) => {
        if (!open) {
          setShowRefundDialog(false);
          setRefundAmount("");
          setRefundReason("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Refund</DialogTitle>
            <DialogDescription>
              {selectedWallet && (
                <div className="mt-2 space-y-1">
                  <p>User: {selectedWallet.user?.name} ({formatPhoneNumber(selectedWallet.user?.phone || '')})</p>
                  <p className={`font-semibold ${getBalanceColor(selectedWallet.balance)}`}>
                    Current Balance: ৳{parseFloat(selectedWallet.balance).toFixed(2)}
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label htmlFor="refundAmount" className="text-sm font-medium">Amount (৳) *</label>
              <Input
                id="refundAmount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Enter refund amount"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                data-testid="input-refund-amount"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="refundReason" className="text-sm font-medium">Reason *</label>
              <Textarea
                id="refundReason"
                placeholder="Enter the reason for this refund..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="min-h-[100px]"
                data-testid="textarea-refund-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRefundDialog(false);
                setRefundAmount("");
                setRefundReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!refundAmount || parseFloat(refundAmount) <= 0 || !refundReason.trim() || refundMutation.isPending}
              onClick={() => {
                if (selectedWallet && refundAmount && refundReason.trim()) {
                  refundMutation.mutate({
                    userId: selectedWallet.userId,
                    amount: parseFloat(refundAmount),
                    reason: refundReason.trim()
                  });
                }
              }}
              data-testid="button-confirm-refund"
            >
              {refundMutation.isPending ? "Processing..." : "Issue Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Wallet Dialog */}
      <Dialog open={showResetDialog} onOpenChange={(open) => {
        if (!open) {
          setShowResetDialog(false);
          setResetReason("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Reset Wallet Balance
            </DialogTitle>
            <DialogDescription>
              {selectedWallet && (
                <div className="mt-2 space-y-1">
                  <p>User: {selectedWallet.user?.name} ({formatPhoneNumber(selectedWallet.user?.phone || '')})</p>
                  <p className="font-semibold text-red-600">
                    Current Balance: ৳{parseFloat(selectedWallet.balance).toFixed(2)}
                  </p>
                  <p className="text-red-500 mt-2">
                    This will set the wallet balance to ৳0.00. This action cannot be undone.
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label htmlFor="resetReason" className="text-sm font-medium">Reason for reset *</label>
              <Textarea
                id="resetReason"
                placeholder="E.g., Test account cleanup, Fixing incorrect balance from bug..."
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                className="min-h-[100px]"
                data-testid="textarea-reset-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowResetDialog(false);
                setResetReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!resetReason.trim() || resetMutation.isPending}
              onClick={() => {
                if (selectedWallet && resetReason.trim()) {
                  resetMutation.mutate({
                    walletId: selectedWallet.id,
                    reason: resetReason.trim()
                  });
                }
              }}
              data-testid="button-confirm-reset"
            >
              {resetMutation.isPending ? "Resetting..." : "Reset to ৳0.00"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}