import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { 
  AlertTriangle, 
  FileWarning, 
  Car, 
  Clock, 
  MapPin, 
  Shield, 
  Info,
  Download,
  Filter,
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
  Search,
  Calendar,
  ChevronDown,
  User,
  Phone,
  Mail,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Complaint } from "@shared/schema";

const complaintCategories = [
  { value: "Driver Issue", label: "Driver Issue", icon: Car },
  { value: "Vehicle Condition", label: "Vehicle Condition", icon: AlertTriangle },
  { value: "Route Deviation", label: "Route Deviation", icon: MapPin },
  { value: "Delay", label: "Delay", icon: Clock },
  { value: "Safety Concern", label: "Safety Concern", icon: Shield },
  { value: "Other", label: "Other", icon: Info },
];

const severityLevels = [
  { value: "Low", label: "Low", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "Medium", label: "Medium", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  { value: "High", label: "High", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "Critical", label: "Critical", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
];

const statusOptions = [
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  { value: "investigating", label: "Investigating", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "resolved", label: "Resolved", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  { value: "closed", label: "Closed", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
];

// Extended complaint type with additional details
interface ComplaintWithDetails extends Complaint {
  userName: string;
  userPhone: string;
  userEmail: string;
  tripDetails?: {
    tripDate: string;
    routeName: string;
    fromLocation: string;
    toLocation: string;
    timeSlot: string;
    driverName: string;
    boardingPoint?: string;
    dropOffPoint?: string;
    driverPhone?: string;
  } | null;
  resolvedByName?: string | null;
}

interface ComplaintStats {
  total: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  resolutionRate: number;
}

// Update status form schema
const updateStatusSchema = z.object({
  status: z.string().min(1, "Status is required"),
  resolution: z.string().optional(),
});

type UpdateStatusData = z.infer<typeof updateStatusSchema>;

interface AdminComplaintManagementProps {
  hasPermission: (section: string, action: string) => boolean;
}

export default function AdminComplaintManagement({ hasPermission }: AdminComplaintManagementProps) {
  const { toast } = useToast();
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintWithDetails | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");

  // Build query parameters for filtering
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.append("status", statusFilter);
    if (severityFilter !== "all") params.append("severity", severityFilter);
    if (dateFrom) params.append("dateFrom", dateFrom.toISOString());
    if (dateTo) params.append("dateTo", dateTo.toISOString());
    return params.toString();
  };

  // Fetch complaints with filters
  const { data: complaints, isLoading: complaintsLoading } = useQuery<ComplaintWithDetails[]>({
    queryKey: ["/api/admin/complaints", buildQueryParams()],
    enabled: hasPermission('complaintManagement', 'view'),
  });

  // Fetch complaint statistics
  const { data: stats, isLoading: statsLoading } = useQuery<ComplaintStats>({
    queryKey: ["/api/admin/complaints/stats"],
    enabled: hasPermission('complaintManagement', 'view'),
  });

  // Form for updating complaint status
  const updateForm = useForm<UpdateStatusData>({
    resolver: zodResolver(updateStatusSchema),
    defaultValues: {
      status: "",
      resolution: "",
    },
  });

  // Update complaint mutation
  const updateComplaint = useMutation({
    mutationFn: (data: { id: string; status: string; resolution?: string }) =>
      apiRequest(`/api/admin/complaints/${data.id}`, "PUT", {
        status: data.status,
        resolution: data.resolution,
      }),
    onSuccess: () => {
      toast({
        title: "Complaint updated",
        description: "The complaint status has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/complaints"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/complaints/stats"] });
      setShowUpdateDialog(false);
      setSelectedComplaint(null);
      updateForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update complaint status",
        variant: "destructive",
      });
    },
  });

  const handleUpdateStatus = (data: UpdateStatusData) => {
    if (selectedComplaint) {
      updateComplaint.mutate({
        id: selectedComplaint.id,
        status: data.status,
        resolution: data.resolution,
      });
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!complaints || complaints.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const headers = [
      "Reference ID",
      "Status",
      "Severity",
      "Category",
      "Title",
      "Description",
      "User Name",
      "User Phone",
      "User Email",
      "Trip Date",
      "Route",
      "Driver",
      "Created Date",
      "Resolved Date",
      "Resolution",
      "Resolved By",
    ];

    const csvContent = [
      headers.join(','),
      ...complaints.map(complaint => {
        const row = [
          complaint.referenceId,
          complaint.status,
          complaint.severity,
          complaint.category,
          `"${complaint.title.replace(/"/g, '""')}"`,
          `"${complaint.description.replace(/"/g, '""')}"`,
          complaint.userName,
          complaint.userPhone,
          complaint.userEmail,
          complaint.tripDetails?.tripDate || '',
          complaint.tripDetails ? `${complaint.tripDetails.fromLocation} to ${complaint.tripDetails.toLocation}` : '',
          complaint.tripDetails?.driverName || '',
          format(new Date(complaint.createdAt), "yyyy-MM-dd HH:mm"),
          complaint.resolvedAt ? format(new Date(complaint.resolvedAt), "yyyy-MM-dd HH:mm") : '',
          complaint.resolution ? `"${complaint.resolution.replace(/"/g, '""')}"` : '',
          complaint.resolvedByName || '',
        ];
        return row.join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `complaints_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export successful",
      description: `Exported ${complaints.length} complaints to CSV`,
    });
  };

  // Filter complaints based on search query
  const filteredComplaints = complaints?.filter(complaint => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      complaint.referenceId.toLowerCase().includes(query) ||
      complaint.title.toLowerCase().includes(query) ||
      complaint.userName.toLowerCase().includes(query) ||
      complaint.userPhone.includes(query) ||
      complaint.category.toLowerCase().includes(query)
    );
  });

  // Critical complaints count
  const criticalCount = complaints?.filter(c => c.severity === "Critical" && c.status === "pending").length || 0;

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {hasPermission('complaintManagement', 'view') && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Complaints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats?.byStatus?.pending || 0}
              </div>
              {criticalCount > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  {criticalCount} critical
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats?.resolutionRate ? `${stats.resolutionRate.toFixed(1)}%` : '0%'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Top Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {stats?.byCategory && Object.keys(stats.byCategory).length > 0
                  ? Object.entries(stats.byCategory)
                      .sort(([, a], [, b]) => b - a)[0][0]
                  : 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Critical Complaints Alert */}
      {criticalCount > 0 && (
        <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            <strong>{criticalCount} critical complaint{criticalCount > 1 ? 's' : ''}</strong> pending review. 
            These require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Complaint Management</CardTitle>
            <div className="flex gap-2">
              {hasPermission('complaintManagement', 'downloadCsv') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  disabled={!complaints || complaints.length === 0}
                  data-testid="button-export-csv"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search complaints..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-complaints"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOptions.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger data-testid="select-severity-filter">
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  {severityLevels.map(level => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateFrom && dateTo ? (
                      `${format(dateFrom, "MMM dd")} - ${format(dateTo, "MMM dd")}`
                    ) : dateFrom ? (
                      `From ${format(dateFrom, "MMM dd")}`
                    ) : dateTo ? (
                      `Until ${format(dateTo, "MMM dd")}`
                    ) : (
                      "Date Range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="text-sm font-medium">From Date</label>
                      <CalendarComponent
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        initialFocus
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">To Date</label>
                      <CalendarComponent
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDateFrom(undefined);
                        setDateTo(undefined);
                      }}
                    >
                      Clear Dates
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Complaints Table */}
            {complaintsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-4 py-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredComplaints && filteredComplaints.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredComplaints.map((complaint) => (
                      <TableRow
                        key={complaint.id}
                        className={complaint.severity === "Critical" && complaint.status === "pending" ? "bg-red-50 dark:bg-red-900/10" : ""}
                        data-testid={`complaint-row-${complaint.id}`}
                      >
                        <TableCell className="font-medium">
                          #{complaint.referenceId}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{complaint.userName}</div>
                            <div className="text-xs text-gray-500">{complaint.userPhone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {complaint.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {complaint.title}
                        </TableCell>
                        <TableCell>
                          <Badge className={severityLevels.find(s => s.value === complaint.severity)?.color}>
                            {complaint.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusOptions.find(s => s.value === complaint.status)?.color}>
                            {complaint.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(complaint.createdAt), "MMM dd, HH:mm")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedComplaint(complaint)}
                            data-testid={`button-view-${complaint.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No complaints found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* View Complaint Dialog */}
      <Dialog open={!!selectedComplaint && !showUpdateDialog} onOpenChange={() => setSelectedComplaint(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedComplaint && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Complaint #{selectedComplaint.referenceId}
                  {selectedComplaint.severity === "Critical" && (
                    <Badge className="ml-2 bg-red-100 text-red-800">Critical</Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  Filed on {format(new Date(selectedComplaint.createdAt), "MMMM dd, yyyy 'at' HH:mm")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                {/* Status and Category Badges */}
                <div className="flex gap-2 flex-wrap">
                  <Badge className={statusOptions.find(s => s.value === selectedComplaint.status)?.color}>
                    Status: {selectedComplaint.status}
                  </Badge>
                  <Badge className={severityLevels.find(s => s.value === selectedComplaint.severity)?.color}>
                    {selectedComplaint.severity} Severity
                  </Badge>
                  <Badge variant="outline">
                    {selectedComplaint.category}
                  </Badge>
                </div>

                {/* User Information */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium mb-3">User Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <span className="text-gray-500">Name:</span>
                        <p className="font-medium">{selectedComplaint.userName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <div>
                        <span className="text-gray-500">Phone:</span>
                        <p className="font-medium">{selectedComplaint.userPhone}</p>
                      </div>
                    </div>
                    {selectedComplaint.userEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <div>
                          <span className="text-gray-500">Email:</span>
                          <p className="font-medium">{selectedComplaint.userEmail}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Trip Details */}
                {selectedComplaint.tripDetails && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h4 className="font-medium mb-3">Trip Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Date:</span>
                        <p className="font-medium">{selectedComplaint.tripDetails.tripDate}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Time:</span>
                        <p className="font-medium">{selectedComplaint.tripDetails.timeSlot}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Route:</span>
                        <p className="font-medium">{selectedComplaint.tripDetails.routeName}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Journey:</span>
                        <p className="font-medium">
                          {selectedComplaint.tripDetails.fromLocation} → {selectedComplaint.tripDetails.toLocation}
                        </p>
                      </div>
                      {selectedComplaint.tripDetails.boardingPoint && (
                        <div>
                          <span className="text-gray-500">Boarding:</span>
                          <p className="font-medium">{selectedComplaint.tripDetails.boardingPoint}</p>
                        </div>
                      )}
                      {selectedComplaint.tripDetails.dropOffPoint && (
                        <div>
                          <span className="text-gray-500">Drop-off:</span>
                          <p className="font-medium">{selectedComplaint.tripDetails.dropOffPoint}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Driver:</span>
                        <p className="font-medium">{selectedComplaint.tripDetails.driverName}</p>
                      </div>
                      {selectedComplaint.tripDetails.driverPhone && (
                        <div>
                          <span className="text-gray-500">Driver Phone:</span>
                          <p className="font-medium">{selectedComplaint.tripDetails.driverPhone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Complaint Details */}
                <div>
                  <h4 className="font-medium mb-2">Complaint Details</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Title:</p>
                      <p className="font-medium">{selectedComplaint.title}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Description:</p>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {selectedComplaint.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Resolution Details */}
                {selectedComplaint.resolution && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Resolution</h4>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-2">
                      {selectedComplaint.resolution}
                    </p>
                    <div className="text-sm text-gray-500 space-y-1">
                      {selectedComplaint.resolvedAt && (
                        <p>
                          Resolved on: {format(new Date(selectedComplaint.resolvedAt), "MMMM dd, yyyy 'at' HH:mm")}
                        </p>
                      )}
                      {selectedComplaint.resolvedByName && (
                        <p>Resolved by: {selectedComplaint.resolvedByName}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {hasPermission('complaintManagement', 'edit') && (
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedComplaint(null)}
                    >
                      Close
                    </Button>
                    <Button
                      onClick={() => setShowUpdateDialog(true)}
                      disabled={selectedComplaint.status === 'closed'}
                      data-testid="button-update-status"
                    >
                      Update Status
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Complaint Status</DialogTitle>
            <DialogDescription>
              Update the status and add resolution notes for complaint #{selectedComplaint?.referenceId}
            </DialogDescription>
          </DialogHeader>
          <Form {...updateForm}>
            <form onSubmit={updateForm.handleSubmit(handleUpdateStatus)} className="space-y-4">
              <FormField
                control={updateForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-new-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map(status => (
                          <SelectItem key={status.value} value={status.value}>
                            <div className="flex items-center gap-2">
                              <Badge className={status.color} variant="secondary">
                                {status.label}
                              </Badge>
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
                control={updateForm.control}
                name="resolution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Resolution Notes 
                      {(updateForm.watch("status") === "resolved" || updateForm.watch("status") === "closed") && 
                        <span className="text-red-500 ml-1">*</span>
                      }
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Add resolution notes or update details..."
                        rows={4}
                        data-testid="textarea-resolution"
                      />
                    </FormControl>
                    {(updateForm.watch("status") === "resolved" || updateForm.watch("status") === "closed") && (
                      <p className="text-sm text-gray-500">
                        Resolution notes are required when resolving or closing a complaint
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowUpdateDialog(false);
                    updateForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateComplaint.isPending}
                  data-testid="button-submit-update"
                >
                  {updateComplaint.isPending ? "Updating..." : "Update Status"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}