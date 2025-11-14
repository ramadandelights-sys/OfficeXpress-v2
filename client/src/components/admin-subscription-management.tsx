import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, Download, Search, Users, TrendingUp, Filter, CreditCard, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, formatDistance } from "date-fns";
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
  user?: {
    name: string;
    phone: string;
    email: string;
  };
  route?: {
    name: string;
    fromArea: string;
    toArea: string;
    weekdays: string[];
  };
  timeSlot?: {
    pickupTime: string;
    dropOffTime: string;
  };
  boardingPoint?: {
    name: string;
  };
  dropOffPoint?: {
    name: string;
  };
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
  const [groupByRoute, setGroupByRoute] = useState(false);

  // Fetch subscriptions
  const { data: subscriptions = [], isLoading } = useQuery<Subscription[]>({
    queryKey: ['/api/admin/subscriptions', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      return apiRequest(`/api/admin/subscriptions?${params.toString()}`);
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
    queryFn: async () => {
      if (!selectedSubscription) return [];
      return apiRequest(`/api/admin/subscriptions/${selectedSubscription.id}/invoices`);
    },
    enabled: !!selectedSubscription && showInvoiceDialog
  });

  // Filter subscriptions based on search
  const filteredSubscriptions = subscriptions.filter(sub => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      sub.user?.name?.toLowerCase().includes(query) ||
      sub.user?.phone?.includes(query) ||
      sub.route?.name?.toLowerCase().includes(query)
    );
  });

  // Group subscriptions by route if needed
  const groupedSubscriptions = groupByRoute
    ? filteredSubscriptions.reduce((acc, sub) => {
        const routeKey = sub.routeId;
        if (!acc[routeKey]) {
          acc[routeKey] = {
            route: sub.route,
            subscriptions: []
          };
        }
        acc[routeKey].subscriptions.push(sub);
        return acc;
      }, {} as Record<string, { route: any; subscriptions: Subscription[] }>)
    : null;

  // Export to CSV
  const exportToCSV = () => {
    if (!hasPermission('subscriptionManagement', 'downloadCsv')) {
      toast({ title: "Permission denied", variant: "destructive" });
      return;
    }

    const data = filteredSubscriptions.map(sub => ({
      id: sub.id,
      userName: sub.user?.name || '',
      userPhone: formatPhoneNumber(sub.user?.phone || ''),
      userEmail: sub.user?.email || '',
      route: sub.route?.name || '',
      fromArea: sub.route?.fromArea || '',
      toArea: sub.route?.toArea || '',
      weekdays: sub.route?.weekdays?.join(', ') || '',
      boardingPoint: sub.boardingPoint?.name || '',
      dropOffPoint: sub.dropOffPoint?.name || '',
      pickupTime: sub.timeSlot?.pickupTime || '',
      dropOffTime: sub.timeSlot?.dropOffTime || '',
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
    const variants = {
      active: "success",
      cancelled: "destructive",
      expired: "secondary",
      pending_cancellation: "warning"
    } as const;
    return (
      <Badge variant={variants[status as keyof typeof variants] || "default"}>
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
                      {group.route?.name || 'Unknown Route'}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {group.route?.fromArea} → {group.route?.toArea} • {group.subscriptions.length} subscriptions
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Time Slot</TableHead>
                          <TableHead>Monthly Fee</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.subscriptions.map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell>{sub.user?.name}</TableCell>
                            <TableCell>{formatPhoneNumber(sub.user?.phone || '')}</TableCell>
                            <TableCell>
                              {sub.timeSlot?.pickupTime} - {sub.timeSlot?.dropOffTime}
                            </TableCell>
                            <TableCell>৳{sub.totalMonthlyPrice}</TableCell>
                            <TableCell>{getStatusBadge(sub.status)}</TableCell>
                            <TableCell>
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
                        <TableCell>{sub.user?.name}</TableCell>
                        <TableCell>{formatPhoneNumber(sub.user?.phone || '')}</TableCell>
                        <TableCell>{sub.route?.name}</TableCell>
                        <TableCell>
                          {sub.timeSlot?.pickupTime} - {sub.timeSlot?.dropOffTime}
                        </TableCell>
                        <TableCell>{sub.route?.weekdays?.join(', ')}</TableCell>
                        <TableCell>৳{sub.totalMonthlyPrice}</TableCell>
                        <TableCell>{getStatusBadge(sub.status)}</TableCell>
                        <TableCell>{format(new Date(sub.startDate), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{format(new Date(sub.endDate), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
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
                  <p>User: {selectedSubscription.user?.name} ({formatPhoneNumber(selectedSubscription.user?.phone || '')})</p>
                  <p>Route: {selectedSubscription.route?.name}</p>
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
                        <Badge variant={
                          invoice.status === 'paid' ? 'success' :
                          invoice.status === 'failed' ? 'destructive' :
                          invoice.status === 'refunded' ? 'secondary' :
                          'default'
                        }>
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
    </div>
  );
}