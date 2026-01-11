import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, Download, Search, Users, TrendingUp, Filter, CreditCard, Eye, XCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, formatDistance, differenceInDays } from "date-fns";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { useAuth } from "@/hooks/useAuth";

interface Subscription {
  id: string;
  userId: string;
  routeId: string;
  timeSlotId: string;
  boardingPointId: string;
  dropOffPointId: string;
  startDate: string;
  endDate: string;
  pricePerTrip: string;
  totalMonthlyPrice: string;
  discountAmount: string;
  status: 'active' | 'cancelled' | 'expired' | 'pending_cancellation';
  cancellationDate: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined fields from API
  userName?: string;
  userPhone?: string;
  userEmail?: string;
  routeName?: string;
  fromLocation?: string;
  toLocation?: string;
  timeSlot?: string;
  weekdays?: string[];
}

interface SubscriptionInvoice {
  id: string;
  subscriptionId: string;
  userId: string;
  invoiceNumber: string;
  billingMonth: string;
  amountDue: string;
  amountPaid: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
}

interface SubscriptionStats {
  totalActive: number;
  totalCancelled: number;
  totalExpired: number;
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  averageSubscriptionValue: number;
  subscriptionsByRoute: Array<{
    routeId: string;
    routeName: string;
    count: number;
    revenue: number;
  }>;
}

export default function AdminSubscriptionManagement() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancelled' | 'expired' | 'pending_cancellation'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [groupByRoute, setGroupByRoute] = useState(false);
  const [showEditDatesDialog, setShowEditDatesDialog] = useState(false);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  // Fetch subscriptions
  const { data: subscriptions = [], isLoading } = useQuery<Subscription[]>({
    queryKey: ['/api/admin/subscriptions', statusFilter],
    queryFn: async (): Promise<Subscription[]> => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const response = await apiRequest('GET', `/api/admin/subscriptions?${params.toString()}`);
      return response.json();
    },
    enabled: hasPermission('subscriptionManagement', 'view')
  });

  // Fetch subscription stats
  const { data: stats } = useQuery<SubscriptionStats>({
    queryKey: ['/api/admin/subscriptions/stats'],
    enabled: hasPermission('subscriptionManagement', 'view')
  });

  // Fetch invoices for selected subscription
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<SubscriptionInvoice[]>({
    queryKey: ['/api/admin/subscriptions', selectedSubscription?.id, 'invoices'],
    queryFn: async (): Promise<SubscriptionInvoice[]> => {
      if (!selectedSubscription) return [];
      const response = await apiRequest('GET', `/api/admin/subscriptions/${selectedSubscription.id}/invoices`);
      return response.json();
    },
    enabled: !!selectedSubscription && showInvoiceDialog
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ subscriptionId, reason }: { subscriptionId: string; reason: string }) => {
      const response = await apiRequest('POST', `/api/admin/subscriptions/${subscriptionId}/cancel`, { reason });
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Subscription cancelled successfully",
        description: data.refundAmount ? `Refund of ৳${data.refundAmount.toFixed(2)} has been processed.` : undefined
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/wallets'] });
      setShowCancelDialog(false);
      setSelectedSubscription(null);
      setCancelReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to cancel subscription",
        description: error.message || 'An error occurred',
        variant: "destructive"
      });
    }
  });

  // Update subscription dates mutation (superadmin only)
  const updateDatesMutation = useMutation({
    mutationFn: async ({ subscriptionId, startDate, endDate }: { subscriptionId: string; startDate: string; endDate: string }) => {
      const response = await apiRequest('PATCH', `/api/admin/subscriptions/${subscriptionId}/dates`, { startDate, endDate });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Subscription dates updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
      setShowEditDatesDialog(false);
      setSelectedSubscription(null);
      setEditStartDate("");
      setEditEndDate("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update dates",
        description: error.message || 'An error occurred',
        variant: "destructive"
      });
    }
  });

  // Open edit dates dialog
  const openEditDatesDialog = (sub: Subscription) => {
    setSelectedSubscription(sub);
    setEditStartDate(format(new Date(sub.startDate), 'yyyy-MM-dd'));
    setEditEndDate(format(new Date(sub.endDate), 'yyyy-MM-dd'));
    setShowEditDatesDialog(true);
  };

  // Calculate estimated refund for a subscription
  const calculateEstimatedRefund = (subscription: Subscription): number => {
    const endDate = new Date(subscription.endDate);
    const today = new Date();
    const remainingDays = Math.max(0, differenceInDays(endDate, today));
    const totalDays = differenceInDays(endDate, new Date(subscription.startDate));
    if (totalDays <= 0) return 0;
    const dailyRate = parseFloat(subscription.totalMonthlyPrice) / totalDays;
    return dailyRate * remainingDays;
  };

  // Filter subscriptions based on search
  const filteredSubscriptions = subscriptions.filter(sub => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      sub.userName?.toLowerCase().includes(query) ||
      sub.userPhone?.includes(query) ||
      sub.routeName?.toLowerCase().includes(query)
    );
  });

  // Group subscriptions by route if needed
  const groupedSubscriptions = groupByRoute
    ? filteredSubscriptions.reduce((acc, sub) => {
        const routeKey = sub.routeId;
        if (!acc[routeKey]) {
          acc[routeKey] = {
            routeName: sub.routeName,
            subscriptions: []
          };
        }
        acc[routeKey].subscriptions.push(sub);
        return acc;
      }, {} as Record<string, { routeName: string | undefined; subscriptions: Subscription[] }>)
    : null;

  // Export to CSV
  const exportToCSV = () => {
    if (!hasPermission('subscriptionManagement', 'downloadCsv')) {
      toast({ title: "Permission denied", variant: "destructive" });
      return;
    }

    const data = filteredSubscriptions.map(sub => ({
      id: sub.id,
      userName: sub.userName || '',
      userPhone: formatPhoneNumber(sub.userPhone || ''),
      userEmail: sub.userEmail || '',
      route: sub.routeName || '',
      fromArea: sub.fromLocation || '',
      toArea: sub.toLocation || '',
      weekdays: sub.weekdays?.join(', ') || '',
      pricePerTrip: sub.pricePerTrip,
      monthlyPrice: sub.totalMonthlyPrice,
      discount: sub.discountAmount,
      status: sub.status,
      startDate: format(new Date(sub.startDate), 'yyyy-MM-dd'),
      endDate: format(new Date(sub.endDate), 'yyyy-MM-dd'),
      cancellationDate: sub.cancellationDate ? format(new Date(sub.cancellationDate), 'yyyy-MM-dd') : '',
      createdAt: format(new Date(sub.createdAt), 'yyyy-MM-dd HH:mm:ss')
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
    link.download = `subscriptions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: "Subscriptions exported successfully" });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      active: "default",
      cancelled: "destructive",
      expired: "secondary",
      pending_cancellation: "outline"
    };
    return (
      <Badge variant={variants[status] || "default"} className={status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  if (!hasPermission('subscriptionManagement', 'view')) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">You don't have permission to view subscriptions.</p>
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
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalActive}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">৳{stats.monthlyRecurringRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Subscription Value</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">৳{stats.averageSubscriptionValue.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">৳{stats.totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-[180px]" data-testid="select-subscription-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="pending_cancellation">Pending Cancellation</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, or route"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-[300px]"
                  data-testid="input-subscription-search"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGroupByRoute(!groupByRoute)}
                data-testid="button-group-by-route"
              >
                <Filter className="mr-2 h-4 w-4" />
                {groupByRoute ? 'Ungroup' : 'Group by Route'}
              </Button>
            </div>
            <Button
              onClick={exportToCSV}
              disabled={!hasPermission('subscriptionManagement', 'downloadCsv')}
              data-testid="button-export-subscriptions"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Subscriptions Table/List */}
          {groupByRoute && groupedSubscriptions ? (
            <div className="space-y-4">
              {Object.entries(groupedSubscriptions).map(([routeId, group]) => (
                <Card key={routeId}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">
                      {group.routeName || 'Unknown Route'}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {group.subscriptions[0]?.fromLocation} → {group.subscriptions[0]?.toLocation} • {group.subscriptions.length} subscriptions
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead>Time Slot</TableHead>
                          <TableHead>Monthly Fee</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.subscriptions.map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell>{sub.userName}</TableCell>
                            <TableCell>{formatPhoneNumber(sub.userPhone || '')}</TableCell>
                            <TableCell>{sub.routeName}</TableCell>
                            <TableCell>
                              {sub.timeSlot}
                            </TableCell>
                            <TableCell>৳{sub.totalMonthlyPrice}</TableCell>
                            <TableCell>{getStatusBadge(sub.status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedSubscription(sub);
                                    setShowInvoiceDialog(true);
                                  }}
                                  data-testid={`button-view-invoices-${sub.id}`}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Invoices
                                </Button>
                                {sub.status === 'active' && hasPermission('subscriptionCancellation') && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => {
                                      setSelectedSubscription(sub);
                                      setShowCancelDialog(true);
                                    }}
                                    data-testid={`button-cancel-subscription-${sub.id}`}
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Cancel
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Time Slot</TableHead>
                    <TableHead>Weekdays</TableHead>
                    <TableHead>Monthly Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <p className="text-muted-foreground">No subscriptions found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSubscriptions.map((sub) => (
                          <TableRow key={sub.id} data-testid={`row-subscription-${sub.id}`}>
                            <TableCell>{sub.userName}</TableCell>
                            <TableCell>{formatPhoneNumber(sub.userPhone || '')}</TableCell>
                            <TableCell>{sub.routeName}</TableCell>
                            <TableCell>
                              {sub.timeSlot}
                            </TableCell>
                            <TableCell>{sub.weekdays?.join(', ')}</TableCell>
                            <TableCell>৳{sub.totalMonthlyPrice}</TableCell>
                            <TableCell>{getStatusBadge(sub.status)}</TableCell>
                            <TableCell>{format(new Date(sub.startDate), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>{format(new Date(sub.endDate), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedSubscription(sub);
                                    setShowInvoiceDialog(true);
                                  }}
                                  data-testid={`button-view-invoices-${sub.id}`}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Invoices
                                </Button>
                                {hasPermission('subscriptionManagement', 'edit') && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditDatesDialog(sub)}
                                    data-testid={`button-edit-dates-${sub.id}`}
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit Dates
                                  </Button>
                                )}
                                {sub.status === 'active' && hasPermission('subscriptionCancellation') && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => {
                                      setSelectedSubscription(sub);
                                      setShowCancelDialog(true);
                                    }}
                                    data-testid={`button-cancel-subscription-${sub.id}`}
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Cancel
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
          )}
        </CardContent>
      </Card>

      {/* Invoice Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Subscription Invoice History</DialogTitle>
            <DialogDescription>
              {selectedSubscription && (
                <div className="mt-2 space-y-1">
                  <p>User: {selectedSubscription.userName} ({formatPhoneNumber(selectedSubscription.userPhone || '')})</p>
                  <p>Route: {selectedSubscription.routeName}</p>
                  <p>Monthly Fee: ৳{selectedSubscription.totalMonthlyPrice}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {invoicesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : invoices.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No invoices found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Billing Month</TableHead>
                    <TableHead>Amount Due</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Paid At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.billingMonth}</TableCell>
                      <TableCell>৳{invoice.amountDue}</TableCell>
                      <TableCell>৳{invoice.amountPaid}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            invoice.status === 'failed' ? 'destructive' :
                            invoice.status === 'refunded' ? 'secondary' :
                            'default'
                          }
                          className={invoice.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}
                        >
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(invoice.dueDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        {invoice.paidAt ? format(new Date(invoice.paidAt), 'MMM dd, yyyy HH:mm') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCancelDialog(false);
          setCancelReason("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              {selectedSubscription && (
                <div className="mt-2 space-y-1">
                  <p>User: {selectedSubscription.userName} ({formatPhoneNumber(selectedSubscription.userPhone || '')})</p>
                  <p>Route: {selectedSubscription.routeName}</p>
                  <p>Monthly Fee: ৳{selectedSubscription.totalMonthlyPrice}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {selectedSubscription && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Estimated Refund: ৳{calculateEstimatedRefund(selectedSubscription).toFixed(2)}
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Based on {differenceInDays(new Date(selectedSubscription.endDate), new Date())} remaining days
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="cancelReason">Cancellation Reason *</Label>
              <Textarea
                id="cancelReason"
                placeholder="Enter the reason for cancellation..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="min-h-[100px]"
                data-testid="textarea-cancel-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false);
                setCancelReason("");
              }}
            >
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              disabled={!cancelReason.trim() || cancelMutation.isPending}
              onClick={() => {
                if (selectedSubscription && cancelReason.trim()) {
                  cancelMutation.mutate({
                    subscriptionId: selectedSubscription.id,
                    reason: cancelReason.trim()
                  });
                }
              }}
              data-testid="button-confirm-cancel-subscription"
            >
              {cancelMutation.isPending ? "Cancelling..." : "Cancel Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dates Dialog */}
      <Dialog open={showEditDatesDialog} onOpenChange={(open) => {
        if (!open) {
          setShowEditDatesDialog(false);
          setEditStartDate("");
          setEditEndDate("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subscription Dates</DialogTitle>
            <DialogDescription>
              {selectedSubscription && (
                <div className="mt-2 space-y-1">
                  <p>User: {selectedSubscription.userName} ({formatPhoneNumber(selectedSubscription.userPhone || '')})</p>
                  <p>Route: {selectedSubscription.routeName}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200 mt-2">
            <p className="font-medium">Important:</p>
            <p>Changing subscription dates will not automatically recalculate existing invoices or billing. Use this for correcting data entry errors only.</p>
          </div>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="editStartDate">Start Date</Label>
              <Input
                id="editStartDate"
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                data-testid="input-edit-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEndDate">End Date</Label>
              <Input
                id="editEndDate"
                type="date"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                data-testid="input-edit-end-date"
              />
            </div>
          </div>
          {editStartDate && editEndDate && new Date(editStartDate) >= new Date(editEndDate) && (
            <p className="text-sm text-red-500 mt-2">Start date must be before end date</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDatesDialog(false);
                setEditStartDate("");
                setEditEndDate("");
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!editStartDate || !editEndDate || new Date(editStartDate) >= new Date(editEndDate) || updateDatesMutation.isPending}
              onClick={() => {
                if (selectedSubscription && editStartDate && editEndDate && new Date(editStartDate) < new Date(editEndDate)) {
                  updateDatesMutation.mutate({
                    subscriptionId: selectedSubscription.id,
                    startDate: editStartDate,
                    endDate: editEndDate
                  });
                }
              }}
              data-testid="button-confirm-edit-dates"
            >
              {updateDatesMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}