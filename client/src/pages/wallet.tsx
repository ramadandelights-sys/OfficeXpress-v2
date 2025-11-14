import { useState } from "react";
import { Wallet, TrendingUp, TrendingDown, Plus, Clock, CreditCard } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation as useWouterLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useWallet, useWalletTransactions, useTopUpWallet } from "@/hooks/useSubscriptions";

export default function WalletPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useWouterLocation();
  const { toast } = useToast();
  const { balance, isLoading: walletLoading } = useWallet();
  const { transactions, isLoading: transactionsLoading } = useWalletTransactions();
  const topUpWallet = useTopUpWallet();
  
  const [showTopUpDialog, setShowTopUpDialog] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  
  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    setLocation("/login");
    return null;
  }
  
  // Handle wallet top-up
  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await topUpWallet.mutateAsync(amount);
      setShowTopUpDialog(false);
      setTopUpAmount("");
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };
  
  // Quick amount buttons
  const quickAmounts = [500, 1000, 2000, 5000];
  
  // Calculate total credits and debits
  const totalCredits = transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalDebits = transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2" data-testid="heading-wallet">
            My Wallet
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Manage your wallet balance and view transaction history
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Wallet Balance Card */}
          <div className="md:col-span-1">
            <Card data-testid="card-wallet-balance">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Wallet Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {walletLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <>
                    <div className="mb-6">
                      <p className="text-3xl font-bold text-primary" data-testid="text-balance">
                        ৳{balance.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Available balance
                      </p>
                    </div>

                    <Button 
                      className="w-full"
                      onClick={() => setShowTopUpDialog(true)}
                      data-testid="button-topup-wallet"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Top Up Wallet
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Statistics Cards */}
            <Card className="mt-4" data-testid="card-statistics">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Credits</span>
                  </div>
                  <span className="font-semibold text-green-600" data-testid="text-total-credits">
                    ৳{totalCredits.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Debits</span>
                  </div>
                  <span className="font-semibold text-red-600" data-testid="text-total-debits">
                    ৳{totalDebits.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction History */}
          <div className="md:col-span-2">
            <Card data-testid="card-transaction-history">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Transaction History
                </CardTitle>
                <CardDescription>
                  View all your wallet transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No transactions yet</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                      Top up your wallet to get started
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((transaction) => (
                          <TableRow key={transaction.id} data-testid={`transaction-row-${transaction.id}`}>
                            <TableCell className="whitespace-nowrap">
                              <div>
                                <p className="font-medium">
                                  {format(new Date(transaction.createdAt), 'MMM dd, yyyy')}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {format(new Date(transaction.createdAt), 'hh:mm a')}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{transaction.description}</p>
                                {transaction.referenceId && (
                                  <p className="text-xs text-gray-500">
                                    Ref: {transaction.referenceId}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={transaction.type === 'credit' ? 'default' : 'secondary'}
                                className={cn(
                                  transaction.type === 'credit'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                )}
                              >
                                {transaction.type === 'credit' ? (
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                )}
                                {transaction.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={cn(
                                  "font-semibold",
                                  transaction.type === 'credit'
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                                )}
                              >
                                {transaction.type === 'credit' ? '+' : '-'}৳{transaction.amount.toFixed(2)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Top-up Dialog */}
      <Dialog open={showTopUpDialog} onOpenChange={setShowTopUpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Top Up Wallet</DialogTitle>
            <DialogDescription>
              Add funds to your wallet for subscription payments
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topup-amount">Amount (৳)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  ৳
                </span>
                <Input
                  id="topup-amount"
                  type="number"
                  placeholder="0.00"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  min="1"
                  step="0.01"
                  className="pl-8"
                  data-testid="input-topup-amount"
                />
              </div>
            </div>
            
            {/* Quick Amount Buttons */}
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Quick amounts</p>
              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((amount) => (
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
            </div>
            
            {/* Mock Payment Notice */}
            <Alert>
              <CreditCard className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> This is a mock payment system. In production, this would integrate with a real payment gateway. Funds will be added instantly to your wallet.
              </AlertDescription>
            </Alert>
            
            {/* Payment Method Selection (Mock) */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-20" disabled>
                  <div className="text-center">
                    <CreditCard className="h-6 w-6 mx-auto mb-1" />
                    <p className="text-xs">Credit/Debit Card</p>
                  </div>
                </Button>
                <Button variant="outline" className="h-20" disabled>
                  <div className="text-center">
                    <Wallet className="h-6 w-6 mx-auto mb-1" />
                    <p className="text-xs">Mobile Banking</p>
                  </div>
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Payment methods are disabled in demo mode
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowTopUpDialog(false);
                setTopUpAmount("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTopUp}
              disabled={topUpWallet.isPending || !topUpAmount || parseFloat(topUpAmount) <= 0}
              data-testid="button-confirm-topup"
            >
              {topUpWallet.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Funds
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}