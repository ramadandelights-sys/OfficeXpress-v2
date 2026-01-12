import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  AlertCircle,
  Download,
  Calendar,
  DollarSign,
  CreditCard,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { format } from "date-fns";

interface PendingRefunds {
  tripRefunds: Array<{
    bookingId: string;
    tripId: string;
    userId: string;
    userName: string;
    tripDate: string;
    route: string;
    reason: string;
    amount: number;
  }>;
  subscriptionRefunds: Array<{
    subscriptionId: string;
    userId: string;
    userName: string;
    route: string;
    remainingDays: number;
    amount: number;
  }>;
}

interface GroupedTripRefund {
  tripId: string;
  tripDate: string;
  route: string;
  reason: string;
  totalAmount: number;
  refunds: Array<PendingRefunds['tripRefunds'][0]>;
}

interface RefundHistory {
  id: string;
  amount: number;
  type: string;
  reason: string;
  description: string;
  metadata: any;
  createdAt: string;
  userName: string;
  userPhone: string;
}

interface RefundStats {
  totalRefunded: number;
  refundsByReason: Record<string, { count: number; amount: number }>;
  monthlyTrends: Array<{ month: string; count: number; amount: number }>;
}

export default function AdminRefundManagement() {
  const [selectedTab, setSelectedTab] = useState("pending");
  const [confirmProcessDialog, setConfirmProcessDialog] = useState(false);
  const [selectedRefundType, setSelectedRefundType] = useState<"all" | "trips" | "subscriptions">("all");
  const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set());
  const [historyFilters, setHistoryFilters] = useState({
    startDate: "",
    endDate: "",
    userId: ""
  });

  const toggleTrip = (tripId: string) => {
    const newExpanded = new Set(expandedTrips);
    if (newExpanded.has(tripId)) {
      newExpanded.delete(tripId);
    } else {
      newExpanded.add(tripId);
    }
    setExpandedTrips(newExpanded);
  };

  // Group trip refunds by tripId
  const groupedTripRefunds = pendingRefunds?.tripRefunds.reduce((acc, refund) => {
    if (!acc[refund.tripId]) {
      acc[refund.tripId] = {
        tripId: refund.tripId,
        tripDate: refund.tripDate,
        route: refund.route,
        reason: refund.reason,
        totalAmount: 0,
        refunds: []
      };
    }
    acc[refund.tripId].refunds.push(refund);
    acc[refund.tripId].totalAmount += refund.amount;
    return acc;
  }, {} as Record<string, GroupedTripRefund>) || {};

  const groupedTripsArray = Object.values(groupedTripRefunds);

  // Fetch pending refunds
  const { data: pendingRefunds, isLoading: loadingPending } = useQuery<PendingRefunds>({
    queryKey: ["/api/admin/refunds/pending"],
    enabled: selectedTab === "pending"
  });

  // Fetch refund history
  const { data: refundHistory, isLoading: loadingHistory } = useQuery<RefundHistory[]>({
    queryKey: ["/api/admin/refunds/history", historyFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (historyFilters.startDate) params.append("startDate", historyFilters.startDate);
      if (historyFilters.endDate) params.append("endDate", historyFilters.endDate);
      if (historyFilters.userId) params.append("userId", historyFilters.userId);
      
      const response = await fetch(`/api/admin/refunds/history?${params}`);
      if (!response.ok) throw new Error("Failed to fetch refund history");
      return response.json();
    },
    enabled: selectedTab === "history"
  });

  // Fetch refund statistics
  const { data: refundStats, isLoading: loadingStats } = useQuery<RefundStats>({
    queryKey: ["/api/admin/refunds/stats"],
    enabled: selectedTab === "statistics"
  });

  // Process refunds mutation
  const processRefundsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/refunds/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to process refunds");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/refunds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallets"] });
      alert(`Refunds processed successfully! ${data.processed} refunds completed, ${data.failed} failed. Total amount: ৳${data.totalAmount.toFixed(2)}`);
      setConfirmProcessDialog(false);
    },
    onError: (error) => {
      alert(`Error processing refunds: ${error.message}`);
    }
  });

  // Export to CSV
  const exportToCSV = (data: any[], filename: string) => {
    const csvContent = convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return "";
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(item => Object.values(item).join(","));
    return [headers, ...rows].join("\n");
  };

  // Calculate totals for pending refunds
  const pendingTripTotal = pendingRefunds?.tripRefunds.reduce((sum, r) => sum + r.amount, 0) || 0;
  const pendingSubscriptionTotal = pendingRefunds?.subscriptionRefunds.reduce((sum, r) => sum + r.amount, 0) || 0;
  const pendingTotal = pendingTripTotal + pendingSubscriptionTotal;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Refund Management</h2>
        <div className="flex gap-2">
          {selectedTab === "pending" && (
            <Button 
              onClick={() => setConfirmProcessDialog(true)}
              disabled={!pendingRefunds || (pendingRefunds.tripRefunds.length === 0 && pendingRefunds.subscriptionRefunds.length === 0) || processRefundsMutation.isPending}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${processRefundsMutation.isPending ? 'animate-spin' : ''}`} />
              Process Refunds
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Summary */}
      {selectedTab === "statistics" && refundStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Refunded
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">৳{refundStats.totalRefunded.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ৳{refundStats.monthlyTrends.length > 0 ? 
                  refundStats.monthlyTrends[refundStats.monthlyTrends.length - 1].amount.toFixed(2) : 
                  "0.00"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Refund Count
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {Object.values(refundStats.refundsByReason).reduce((sum, r) => sum + r.count, 0)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="pending">
            Pending
            {pendingRefunds && (pendingRefunds.tripRefunds.length + pendingRefunds.subscriptionRefunds.length) > 0 && (
              <Badge className="ml-2" variant="destructive">
                {pendingRefunds.tripRefunds.length + pendingRefunds.subscriptionRefunds.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
        </TabsList>

        {/* Pending Refunds */}
        <TabsContent value="pending" className="space-y-4">
          {loadingPending ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : pendingRefunds ? (
            <>
              {/* Summary Card */}
              {(pendingRefunds.tripRefunds.length > 0 || pendingRefunds.subscriptionRefunds.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Pending Refunds Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Trip Refunds</p>
                        <p className="text-lg font-semibold">{pendingRefunds.tripRefunds.length} (৳{pendingTripTotal.toFixed(2)})</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Subscription Refunds</p>
                        <p className="text-lg font-semibold">{pendingRefunds.subscriptionRefunds.length} (৳{pendingSubscriptionTotal.toFixed(2)})</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Amount</p>
                        <p className="text-lg font-semibold text-primary">৳{pendingTotal.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Filter */}
              <div className="flex gap-2">
                <Select value={selectedRefundType} onValueChange={(value: any) => setSelectedRefundType(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter refunds" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Refunds</SelectItem>
                    <SelectItem value="trips">Trip Refunds Only</SelectItem>
                    <SelectItem value="subscriptions">Subscription Refunds Only</SelectItem>
                  </SelectContent>
                </Select>
                
                {(selectedRefundType === "all" || selectedRefundType === "trips") && pendingRefunds.tripRefunds.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => exportToCSV(pendingRefunds.tripRefunds, "pending_trip_refunds.csv")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Trip Refunds
                  </Button>
                )}
              </div>

              {/* Trip Refunds Table */}
              {(selectedRefundType === "all" || selectedRefundType === "trips") && groupedTripsArray.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Trip Refunds (Grouped by Trip)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]"></TableHead>
                          <TableHead>Trip ID</TableHead>
                          <TableHead>Trip Date</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Users</TableHead>
                          <TableHead className="text-right">Total Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupedTripsArray.map((group) => (
                          <React.Fragment key={group.tripId}>
                            <TableRow 
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => toggleTrip(group.tripId)}
                            >
                              <TableCell>
                                {expandedTrips.has(group.tripId) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{group.tripId}</TableCell>
                              <TableCell>{group.tripDate}</TableCell>
                              <TableCell>{group.route}</TableCell>
                              <TableCell>
                                <Badge variant={group.reason.includes("no-show") ? "destructive" : "secondary"}>
                                  {group.reason}
                                </Badge>
                              </TableCell>
                              <TableCell>{group.refunds.length} users</TableCell>
                              <TableCell className="text-right font-bold text-primary">৳{group.totalAmount.toFixed(2)}</TableCell>
                            </TableRow>
                            {expandedTrips.has(group.tripId) && group.refunds.map((refund) => (
                              <TableRow key={refund.bookingId} className="bg-muted/30">
                                <TableCell></TableCell>
                                <TableCell colSpan={2} className="pl-8 text-sm text-muted-foreground">
                                  {refund.userName}
                                </TableCell>
                                <TableCell colSpan={3} className="text-sm text-muted-foreground">
                                  User ID: {refund.userId}
                                </TableCell>
                                <TableCell className="text-right text-sm font-medium">৳{refund.amount.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </React.Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Subscription Refunds Table */}
              {(selectedRefundType === "all" || selectedRefundType === "subscriptions") && pendingRefunds.subscriptionRefunds.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Subscription Refunds</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead>Remaining Days</TableHead>
                          <TableHead className="text-right">Refund Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingRefunds.subscriptionRefunds.map((refund) => (
                          <TableRow key={refund.subscriptionId}>
                            <TableCell>{refund.userName}</TableCell>
                            <TableCell>{refund.route}</TableCell>
                            <TableCell>{refund.remainingDays} days</TableCell>
                            <TableCell className="text-right font-medium">৳{refund.amount.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {pendingRefunds.tripRefunds.length === 0 && pendingRefunds.subscriptionRefunds.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No pending refunds at this time. The system automatically checks for refunds every hour.
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Failed to load pending refunds</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filter History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={historyFilters.startDate}
                    onChange={(e) => setHistoryFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={historyFilters.endDate}
                    onChange={(e) => setHistoryFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="userId">User ID</Label>
                  <Input
                    id="userId"
                    placeholder="Filter by user ID"
                    value={historyFilters.userId}
                    onChange={(e) => setHistoryFilters(prev => ({ ...prev, userId: e.target.value }))}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => setHistoryFilters({ startDate: "", endDate: "", userId: "" })}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* History Table */}
          {loadingHistory ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : refundHistory && refundHistory.length > 0 ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Refund History</CardTitle>
                <Button
                  variant="outline"
                  onClick={() => exportToCSV(refundHistory, "refund_history.csv")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {refundHistory.map((refund) => (
                      <TableRow key={refund.id}>
                        <TableCell>{format(new Date(refund.createdAt), "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell>{refund.userName}</TableCell>
                        <TableCell>{refund.userPhone}</TableCell>
                        <TableCell>{refund.description}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          +৳{refund.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No refund history found for the selected filters</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Statistics */}
        <TabsContent value="statistics" className="space-y-4">
          {loadingStats ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : refundStats ? (
            <>
              {/* Refunds by Reason */}
              <Card>
                <CardHeader>
                  <CardTitle>Refunds by Reason</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reason</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(refundStats.refundsByReason).map(([reason, data]) => (
                        <TableRow key={reason}>
                          <TableCell>{reason}</TableCell>
                          <TableCell className="text-right">{data.count}</TableCell>
                          <TableCell className="text-right font-medium">₹{data.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Monthly Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Refund Count</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {refundStats.monthlyTrends.map((trend) => (
                        <TableRow key={trend.month}>
                          <TableCell>{format(new Date(trend.month + "-01"), "MMMM yyyy")}</TableCell>
                          <TableCell className="text-right">{trend.count}</TableCell>
                          <TableCell className="text-right font-medium">₹{trend.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Failed to load statistics</AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>

      {/* Process Confirmation Dialog */}
      <Dialog open={confirmProcessDialog} onOpenChange={setConfirmProcessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Pending Refunds</DialogTitle>
            <DialogDescription>
              Are you sure you want to process all pending refunds? This will:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 py-4">
            <p className="text-sm">• Process {pendingRefunds?.tripRefunds.length || 0} trip refunds</p>
            <p className="text-sm">• Process {pendingRefunds?.subscriptionRefunds.length || 0} subscription refunds</p>
            <p className="text-sm font-semibold">• Total amount: ৳{pendingTotal.toFixed(2)}</p>
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This action cannot be undone. The refunds will be credited to user wallets immediately.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmProcessDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => processRefundsMutation.mutate()}
              disabled={processRefundsMutation.isPending}
            >
              {processRefundsMutation.isPending ? "Processing..." : "Process Refunds"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}