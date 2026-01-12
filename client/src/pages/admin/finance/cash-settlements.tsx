import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  CheckCircle, 
  RefreshCw, 
  Banknote,
  MapPin,
  Calendar,
  User,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface PendingCashSettlement {
  id: string;
  subscriptionId: string;
  serviceDate: string;
  status: string;
  createdAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  subscription: {
    id: string;
    userId: string;
    routeId: string;
    paymentMethod: string;
    pricePerTrip: string;
  };
  user: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  };
  route: {
    id: string;
    name: string;
    description: string | null;
  };
}

export default function AdminCashSettlementsPage() {
  const { toast } = useToast();
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  const { data: settlements, isLoading, error, refetch } = useQuery<PendingCashSettlement[]>({
    queryKey: ["/api/admin/cash-settlements/pending"],
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admin/cash-settlements/${id}/acknowledge`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cash-settlements/pending"] });
      toast({
        title: "Settlement Acknowledged",
        description: "The cash settlement has been marked as reviewed.",
      });
      setAcknowledging(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to acknowledge settlement",
        variant: "destructive",
      });
      setAcknowledging(null);
    },
  });

  const handleAcknowledge = (id: string) => {
    setAcknowledging(id);
    acknowledgeMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load cash settlements. Please try again.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Pending Cash Settlements
              </CardTitle>
              <CardDescription className="mt-1">
                Cash subscribers whose trips were not generated and don't require wallet refunds. 
                Review and acknowledge to track that no payment was collected for these dates.
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!settlements || settlements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-sm">No pending cash settlements to review.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subscriber</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Service Date</TableHead>
                    <TableHead>Amount (Per Trip)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlements.map((settlement) => (
                    <TableRow key={settlement.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{settlement.user?.name || "Unknown"}</div>
                            <div className="text-sm text-muted-foreground">
                              {settlement.user?.phone || "No phone"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{settlement.route?.name || "Unknown Route"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {settlement.serviceDate 
                              ? format(new Date(settlement.serviceDate), "MMM d, yyyy") 
                              : "Unknown"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          ₹{settlement.subscription?.pricePerTrip || "0"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                          No Payment Collected
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleAcknowledge(settlement.id)}
                          disabled={acknowledging === settlement.id || acknowledgeMutation.isPending}
                        >
                          {acknowledging === settlement.id ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Acknowledge
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">About Cash Settlements</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Cash subscribers</strong> pay the driver directly for each trip. When a trip cannot be generated 
            (due to insufficient passengers or other reasons), they don't need a wallet refund since no prepayment was made.
          </p>
          <p>
            However, the admin should acknowledge these cases to maintain accurate records that no payment was 
            collected for those service days.
          </p>
          <p>
            Once acknowledged, the record will be removed from this pending list but kept in the database for 
            audit purposes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
