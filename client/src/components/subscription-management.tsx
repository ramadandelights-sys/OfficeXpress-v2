import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Calendar, 
  Search, 
  Download, 
  Filter, 
  DollarSign, 
  Users,
  TrendingUp,
  AlertTriangle,
  Eye,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import type { Subscription } from "@shared/schema";

type EnhancedSubscription = Subscription & {
  userName: string;
  userPhone: string;
  routeName: string;
  fromLocation: string;
  toLocation: string;
  timeSlot: string;
  weekdays: string[];
};

export default function SubscriptionManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSubscription, setSelectedSubscription] = useState<EnhancedSubscription | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Fetch subscriptions
  const { data: subscriptionsData, isLoading: isLoadingSubscriptions } = useQuery({
    queryKey: ["/api/admin/subscriptions"],
    queryFn: async () => {
      const response = await fetch("/api/admin/subscriptions");
      if (!response.ok) throw new Error("Failed to fetch subscriptions");
      const data = await response.json();
      return data.subscriptions as EnhancedSubscription[];
    }
  });

  // Fetch subscription stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/admin/subscription-stats"],
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      return await apiRequest('POST', `/api/admin/subscriptions/${subscriptionId}/cancel`);
    },
    onSuccess: () => {
      toast({ title: "Subscription cancelled successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-stats"] });
      setShowCancelConfirm(false);
      setSelectedSubscription(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to cancel subscription",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter subscriptions
  const filteredSubscriptions = subscriptionsData?.filter(sub => {
    const matchesSearch = 
      sub.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.userPhone.includes(searchQuery) ||
      sub.routeName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Export to CSV
  const exportToCSV = () => {
    if (!filteredSubscriptions.length) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const csvData = filteredSubscriptions.map(sub => ({
      "Subscription ID": sub.id,
      "User Name": sub.userName,
      "Phone": sub.userPhone,
      "Route": sub.routeName,
      "From": sub.fromLocation,
      "To": sub.toLocation,
      "Time Slot": sub.timeSlot,
      "Weekdays": sub.weekdays.join(", "),
      "Monthly Fee": sub.monthlyFee,
      "Status": sub.status,
      "Start Date": format(new Date(sub.startDate), "yyyy-MM-dd"),
      "End Date": format(new Date(sub.endDate), "yyyy-MM-dd"),
      "Created": format(new Date(sub.createdAt), "yyyy-MM-dd HH:mm"),
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
    link.setAttribute("download", `subscriptions_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Subscriptions exported successfully" });
  };

  // Toggle row expansion
  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-500">{status}</Badge>;
      case "pending_cancellation":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">{status}</Badge>;
      case "cancelled":
        return <Badge variant="destructive">{status}</Badge>;
      case "expired":
        return <Badge variant="secondary">{status}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-active">
              {isLoadingStats ? <Skeleton className="h-8 w-20" /> : stats?.totalActive || 0}
            </div>
            <p className="text-xs text-muted-foreground">Currently active plans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-revenue">
              {isLoadingStats ? <Skeleton className="h-8 w-20" /> : `৳${stats?.monthlyRevenue?.toFixed(2) || 0}`}
            </div>
            <p className="text-xs text-muted-foreground">Recurring monthly income</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Cancellations</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-pending">
              {isLoadingStats ? <Skeleton className="h-8 w-20" /> : stats?.totalPendingCancellation || 0}
            </div>
            <p className="text-xs text-muted-foreground">Will cancel at month end</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-revenue">
              {isLoadingStats ? <Skeleton className="h-8 w-20" /> : `৳${stats?.totalRevenue?.toFixed(2) || 0}`}
            </div>
            <p className="text-xs text-muted-foreground">All-time subscription revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user name, phone, or route..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                  data-testid="input-search"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending_cancellation">Pending Cancellation</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportToCSV} variant="outline" data-testid="button-export">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Subscriptions Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Time Slot</TableHead>
                  <TableHead>Weekdays</TableHead>
                  <TableHead>Monthly Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingSubscriptions ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Loading subscriptions...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredSubscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <p className="text-muted-foreground">No subscriptions found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubscriptions.map((subscription) => (
                    <>
                      <TableRow 
                        key={subscription.id}
                        data-testid={`row-subscription-${subscription.id}`}
                      >
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRow(subscription.id)}
                            data-testid={`button-expand-${subscription.id}`}
                          >
                            {expandedRows.has(subscription.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{subscription.userName}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatPhoneNumber(subscription.userPhone)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{subscription.routeName}</p>
                            <p className="text-sm text-muted-foreground">
                              {subscription.fromLocation} → {subscription.toLocation}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{subscription.timeSlot}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {subscription.weekdays.map(day => (
                              <Badge key={day} variant="outline" className="text-xs">
                                {day.slice(0, 3)}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">৳{subscription.monthlyFee}</TableCell>
                        <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{format(new Date(subscription.startDate), "MMM dd, yyyy")}</p>
                            <p className="text-muted-foreground">to</p>
                            <p>{format(new Date(subscription.endDate), "MMM dd, yyyy")}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedSubscription(subscription);
                                setShowDetails(true);
                              }}
                              data-testid={`button-view-${subscription.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {subscription.status === "active" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => {
                                  setSelectedSubscription(subscription);
                                  setShowCancelConfirm(true);
                                }}
                                data-testid={`button-cancel-${subscription.id}`}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(subscription.id) && (
                        <TableRow>
                          <TableCell colSpan={9} className="bg-muted/50">
                            <div className="p-4 space-y-2">
                              <p className="text-sm">
                                <strong>Subscription ID:</strong> {subscription.id}
                              </p>
                              <p className="text-sm">
                                <strong>Created:</strong> {format(new Date(subscription.createdAt), "PPpp")}
                              </p>
                              {subscription.cancellationDate && (
                                <p className="text-sm">
                                  <strong>Cancellation Date:</strong> {format(new Date(subscription.cancellationDate), "PPpp")}
                                </p>
                              )}
                              {subscription.cancellationReason && (
                                <p className="text-sm">
                                  <strong>Cancellation Reason:</strong> {subscription.cancellationReason}
                                </p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscription Details</DialogTitle>
            <DialogDescription>
              Complete information about the subscription
            </DialogDescription>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">User Information</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Name:</strong> {selectedSubscription.userName}</p>
                  <p><strong>Phone:</strong> {formatPhoneNumber(selectedSubscription.userPhone)}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Route Details</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Route:</strong> {selectedSubscription.routeName}</p>
                  <p><strong>From:</strong> {selectedSubscription.fromLocation}</p>
                  <p><strong>To:</strong> {selectedSubscription.toLocation}</p>
                  <p><strong>Time:</strong> {selectedSubscription.timeSlot}</p>
                  <p><strong>Days:</strong> {selectedSubscription.weekdays.join(", ")}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Subscription Details</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Status:</strong> {getStatusBadge(selectedSubscription.status)}</p>
                  <p><strong>Monthly Fee:</strong> ৳{selectedSubscription.monthlyFee}</p>
                  <p><strong>Start Date:</strong> {format(new Date(selectedSubscription.startDate), "PPP")}</p>
                  <p><strong>End Date:</strong> {format(new Date(selectedSubscription.endDate), "PPP")}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this subscription? This will mark it for cancellation at the end of the current billing period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedSubscription) {
                  cancelSubscriptionMutation.mutate(selectedSubscription.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-cancel"
            >
              Confirm Cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}