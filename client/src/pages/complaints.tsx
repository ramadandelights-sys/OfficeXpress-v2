import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { 
  AlertTriangle, 
  FileWarning, 
  Car, 
  Clock, 
  MapPin, 
  Shield, 
  Info,
  ChevronRight,
  Plus,
  Eye,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Complaint, TripBooking } from "@shared/schema";

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

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  investigating: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

// Form validation schema
const complaintFormSchema = z.object({
  tripBookingId: z.string().optional().nullable(),
  category: z.string().min(1, "Category is required"),
  severity: z.string().min(1, "Severity is required"),
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().min(20, "Description must be at least 20 characters").max(2000, "Description must be less than 2000 characters"),
});

type ComplaintFormData = z.infer<typeof complaintFormSchema>;

// Extended types for API responses
interface TripBookingWithDetails extends TripBooking {
  tripDate: string;
  routeName: string;
  fromLocation: string;
  toLocation: string;
  timeSlot: string;
  boardingPoint: string;
  dropOffPoint: string;
  driverName: string;
  driverPhone: string;
}

interface ComplaintWithDetails extends Complaint {
  tripDetails: {
    tripDate: string;
    routeName: string;
    fromLocation: string;
    toLocation: string;
    timeSlot: string;
  } | null;
}

export default function ComplaintsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintWithDetails | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  // Fetch user's recent trip bookings
  const { data: tripBookings, isLoading: bookingsLoading } = useQuery<TripBookingWithDetails[]>({
    queryKey: ["/api/my/trip-bookings"],
    enabled: !!user,
  });

  // Fetch user's complaints
  const { data: complaints, isLoading: complaintsLoading } = useQuery<ComplaintWithDetails[]>({
    queryKey: ["/api/my/complaints"],
    enabled: !!user,
  });

  // Form setup
  const form = useForm<ComplaintFormData>({
    resolver: zodResolver(complaintFormSchema),
    defaultValues: {
      tripBookingId: null,
      category: "",
      severity: "",
      title: "",
      description: "",
    },
  });

  // Create complaint mutation
  const createComplaint = useMutation({
    mutationFn: (data: ComplaintFormData) => 
      apiRequest("/api/complaints", "POST", data),
    onSuccess: () => {
      toast({
        title: "Complaint filed successfully",
        description: "Your complaint has been submitted and will be reviewed soon.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my/complaints"] });
      setShowComplaintForm(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error filing complaint",
        description: error.message || "Failed to submit complaint",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ComplaintFormData) => {
    createComplaint.mutate(data);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Count pending complaints
  const pendingComplaints = complaints?.filter(c => c.status === 'pending').length || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Complaint Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Report issues with your trips and track complaint status
          </p>
        </div>

        {pendingComplaints > 0 && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have <strong>{pendingComplaints}</strong> pending complaint{pendingComplaints > 1 ? 's' : ''} under review.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="my-complaints" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my-complaints" data-testid="tab-my-complaints">
              My Complaints
              {pendingComplaints > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {pendingComplaints}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="file-complaint" data-testid="tab-file-complaint">
              File New Complaint
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-complaints" className="space-y-4">
            {complaintsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-6 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : complaints && complaints.length > 0 ? (
              <div className="space-y-4">
                {complaints.map((complaint) => {
                  const CategoryIcon = complaintCategories.find(c => c.value === complaint.category)?.icon || Info;
                  
                  return (
                    <Card 
                      key={complaint.id}
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => setSelectedComplaint(complaint)}
                      data-testid={`complaint-card-${complaint.id}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                              <CategoryIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  #{complaint.referenceId}
                                </span>
                                <Badge className={severityLevels.find(s => s.value === complaint.severity)?.color}>
                                  {complaint.severity}
                                </Badge>
                                <Badge className={statusColors[complaint.status as keyof typeof statusColors]}>
                                  {complaint.status}
                                </Badge>
                              </div>
                              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                {complaint.title}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                {complaint.description}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedComplaint(complaint);
                            }}
                            data-testid={`view-complaint-${complaint.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                        {complaint.tripDetails && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                              <span>
                                <strong>Trip:</strong> {complaint.tripDetails.routeName}
                              </span>
                              <span>
                                <strong>Date:</strong> {complaint.tripDetails.tripDate}
                              </span>
                              <span>
                                <strong>Time:</strong> {complaint.tripDetails.timeSlot}
                              </span>
                            </div>
                          </div>
                        )}
                        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                          Filed on {format(new Date(complaint.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileWarning className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No complaints filed
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    You haven't filed any complaints yet. If you experience any issues with your trips, you can file a complaint here.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="file-complaint">
            <Card>
              <CardHeader>
                <CardTitle>File a New Complaint</CardTitle>
                <CardDescription>
                  Report an issue with one of your recent trips or file a general complaint
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                    {/* Trip Selection */}
                    <FormField
                      control={form.control}
                      name="tripBookingId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Trip (Optional)</FormLabel>
                          <FormDescription>
                            Choose a specific trip this complaint relates to, or leave blank for general complaints
                          </FormDescription>
                          <Select
                            value={field.value || "none"}
                            onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-trip">
                                <SelectValue placeholder="Select a trip" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No specific trip (General complaint)</SelectItem>
                              {bookingsLoading ? (
                                <SelectItem value="loading" disabled>Loading trips...</SelectItem>
                              ) : tripBookings && tripBookings.length > 0 ? (
                                tripBookings.map((booking) => (
                                  <SelectItem key={booking.id} value={booking.id}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {booking.routeName} - {booking.tripDate}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {booking.timeSlot} | {booking.boardingPoint} → {booking.dropOffPoint}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-trips" disabled>No recent trips found</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Category */}
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Complaint Category</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger data-testid="select-category">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {complaintCategories.map((category) => (
                                  <SelectItem key={category.value} value={category.value}>
                                    <div className="flex items-center gap-2">
                                      <category.icon className="h-4 w-4" />
                                      <span>{category.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Severity */}
                      <FormField
                        control={form.control}
                        name="severity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Severity Level</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger data-testid="select-severity">
                                  <SelectValue placeholder="Select severity" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {severityLevels.map((level) => (
                                  <SelectItem key={level.value} value={level.value}>
                                    <div className="flex items-center gap-2">
                                      <Badge className={level.color} variant="secondary">
                                        {level.label}
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
                    </div>

                    {/* Title */}
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complaint Title</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Brief summary of the issue"
                              data-testid="input-title"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Description */}
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Detailed Description</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Please provide a detailed description of the issue (minimum 20 characters)"
                              rows={6}
                              data-testid="textarea-description"
                            />
                          </FormControl>
                          <FormDescription>
                            {field.value?.length || 0}/2000 characters
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => form.reset()}
                        data-testid="button-reset"
                      >
                        Reset
                      </Button>
                      <Button
                        type="submit"
                        disabled={createComplaint.isPending}
                        data-testid="button-submit-complaint"
                      >
                        {createComplaint.isPending ? "Submitting..." : "Submit Complaint"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Complaint Details Dialog */}
        <Dialog open={!!selectedComplaint} onOpenChange={() => setSelectedComplaint(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            {selectedComplaint && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    Complaint #{selectedComplaint.referenceId}
                  </DialogTitle>
                  <DialogDescription>
                    Filed on {format(new Date(selectedComplaint.createdAt), "MMMM dd, yyyy 'at' HH:mm")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="flex gap-2">
                    <Badge className={severityLevels.find(s => s.value === selectedComplaint.severity)?.color}>
                      {selectedComplaint.severity} Severity
                    </Badge>
                    <Badge className={statusColors[selectedComplaint.status as keyof typeof statusColors]}>
                      Status: {selectedComplaint.status}
                    </Badge>
                    <Badge variant="outline">
                      {selectedComplaint.category}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">{selectedComplaint.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {selectedComplaint.description}
                    </p>
                  </div>

                  {selectedComplaint.tripDetails && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <h4 className="font-medium mb-2">Trip Details</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Route:</span>
                          <p className="font-medium">{selectedComplaint.tripDetails.routeName}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Date:</span>
                          <p className="font-medium">{selectedComplaint.tripDetails.tripDate}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Time:</span>
                          <p className="font-medium">{selectedComplaint.tripDetails.timeSlot}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Route:</span>
                          <p className="font-medium">
                            {selectedComplaint.tripDetails.fromLocation} → {selectedComplaint.tripDetails.toLocation}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedComplaint.resolution && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                      <h4 className="font-medium mb-2">Resolution</h4>
                      <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {selectedComplaint.resolution}
                      </p>
                      {selectedComplaint.resolvedAt && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          Resolved on {format(new Date(selectedComplaint.resolvedAt), "MMMM dd, yyyy 'at' HH:mm")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}