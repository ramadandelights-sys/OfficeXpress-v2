import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, Trash2, Plus, Save, X, Building, Car, Users, MessageSquare, LogOut, Download, Filter, Search, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import AdminLogin from "@/components/admin-login";
import BlogPostCreator from "@/components/blog-post-creator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { generateSlug } from "@/lib/slugUtils";
import type { 
  BlogPost, 
  PortfolioClient, 
  UpdateBlogPost, 
  UpdatePortfolioClient,
  InsertPortfolioClient,
  CorporateBooking,
  RentalBooking,
  VendorRegistration,
  ContactMessage
} from "@shared/schema";
import { updateBlogPostSchema, updatePortfolioClientSchema, insertPortfolioClientSchema } from "@shared/schema";

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const authStatus = sessionStorage.getItem("adminAuthenticated");
    setIsAuthenticated(authStatus === "true");
  }, []);

  if (!isAuthenticated) {
    return <AdminLogin onLogin={() => setIsAuthenticated(true)} />;
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const { toast } = useToast();
  const [editingBlogPost, setEditingBlogPost] = useState<string | null>(null);
  const [editingPortfolioClient, setEditingPortfolioClient] = useState<string | null>(null);
  const [showBlogCreator, setShowBlogCreator] = useState(false);
  const [showPortfolioCreator, setShowPortfolioCreator] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formTypeFilter, setFormTypeFilter] = useState("all");
  
  // Individual search queries for each form type
  const [corporateSearchQuery, setCorporateSearchQuery] = useState("");
  const [rentalSearchQuery, setRentalSearchQuery] = useState("");
  const [vendorSearchQuery, setVendorSearchQuery] = useState("");
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  
  // Individual date ranges for each form type
  const [corporateDateFrom, setCorporateDateFrom] = useState<Date | undefined>(undefined);
  const [corporateDateTo, setCorporateDateTo] = useState<Date | undefined>(undefined);
  const [rentalDateFrom, setRentalDateFrom] = useState<Date | undefined>(undefined);
  const [rentalDateTo, setRentalDateTo] = useState<Date | undefined>(undefined);
  const [vendorDateFrom, setVendorDateFrom] = useState<Date | undefined>(undefined);
  const [vendorDateTo, setVendorDateTo] = useState<Date | undefined>(undefined);
  const [contactDateFrom, setContactDateFrom] = useState<Date | undefined>(undefined);
  const [contactDateTo, setContactDateTo] = useState<Date | undefined>(undefined);

  // CSV Export functionality
  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle special characters and commas in values
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: `${filename} exported successfully` });
  };

  // Get all form data combined for export
  const getAllFormData = () => {
    const combined = [];
    
    // Add corporate bookings
    if (formTypeFilter === "all" || formTypeFilter === "corporate") {
      corporateBookings.forEach(booking => {
        combined.push({
          type: "Corporate",
          name: booking.customerName,
          email: booking.email,
          phone: booking.phone,
          company: booking.companyName,
          service: booking.serviceType || "",
          additionalInfo: booking.additionalInfo || "",
          submitted: new Date(booking.createdAt).toLocaleString()
        });
      });
    }

    // Add rental bookings
    if (formTypeFilter === "all" || formTypeFilter === "rental") {
      rentalBookings.forEach(booking => {
        combined.push({
          type: "Rental",
          name: booking.customerName,
          email: booking.email,
          phone: booking.phone,
          service: booking.serviceType || "",
          duration: booking.duration || "",
          pickupDate: booking.pickupDate || "",
          additionalInfo: booking.additionalInfo || "",
          submitted: new Date(booking.createdAt).toLocaleString()
        });
      });
    }

    // Add vendor registrations
    if (formTypeFilter === "all" || formTypeFilter === "vendor") {
      vendorRegistrations.forEach(vendor => {
        combined.push({
          type: "Vendor",
          name: vendor.fullName,
          email: vendor.email,
          phone: vendor.phone,
          location: vendor.location,
          experience: vendor.experience || "",
          vehicleTypes: vendor.vehicleTypes?.join(", ") || "",
          additionalInfo: vendor.additionalInfo || "",
          submitted: new Date(vendor.createdAt).toLocaleString()
        });
      });
    }

    // Add contact messages
    if (formTypeFilter === "all" || formTypeFilter === "contact") {
      contactMessages.forEach(message => {
        combined.push({
          type: "Contact",
          name: message.name,
          email: message.email,
          phone: message.phone,
          subject: message.subject,
          message: message.message,
          submitted: new Date(message.createdAt).toLocaleString()
        });
      });
    }

    // Filter by search query
    if (searchQuery) {
      return combined.filter(item => 
        Object.values(item).some(value => 
          String(value).toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    return combined;
  };

  const handleLogout = () => {
    sessionStorage.removeItem("adminAuthenticated");
    window.location.reload(); // Reload to reset the component state
  };

  const { data: blogPosts = [], isLoading: loadingPosts } = useQuery<BlogPost[]>({
    queryKey: ["/api/admin/blog-posts"],
  });

  const { data: portfolioClients = [], isLoading: loadingClients } = useQuery<PortfolioClient[]>({
    queryKey: ["/api/portfolio-clients"],
  });

  const { data: corporateBookings = [], isLoading: loadingCorporate } = useQuery<CorporateBooking[]>({
    queryKey: ["/api/admin/corporate-bookings"],
  });

  const { data: rentalBookings = [], isLoading: loadingRental } = useQuery<RentalBooking[]>({
    queryKey: ["/api/admin/rental-bookings"],
  });

  const { data: vendorRegistrations = [], isLoading: loadingVendors } = useQuery<VendorRegistration[]>({
    queryKey: ["/api/admin/vendor-registrations"],
  });

  const { data: contactMessages = [], isLoading: loadingMessages } = useQuery<ContactMessage[]>({
    queryKey: ["/api/admin/contact-messages"],
  });

  const createBlogPostMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/admin/blog-posts", data);
    },
    onSuccess: () => {
      toast({ title: "Blog post created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog-posts"] });
      setShowBlogCreator(false);
    },
    onError: () => {
      toast({ title: "Failed to create blog post", variant: "destructive" });
    },
  });

  const updateBlogPostMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBlogPost }) => {
      return await apiRequest("PUT", `/api/admin/blog-posts/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Blog post updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog-posts"] });
      setEditingBlogPost(null);
    },
    onError: (error) => {
      toast({ title: "Failed to update blog post", variant: "destructive" });
    },
  });

  const deleteBlogPostMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/blog-posts/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Blog post deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog-posts"] });
    },
    onError: () => {
      toast({ title: "Failed to delete blog post", variant: "destructive" });
    },
  });

  const updatePortfolioClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePortfolioClient }) => {
      return await apiRequest("PUT", `/api/admin/portfolio-clients/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Portfolio client updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio-clients"] });
      setEditingPortfolioClient(null);
    },
    onError: () => {
      toast({ title: "Failed to update portfolio client", variant: "destructive" });
    },
  });

  const createPortfolioClientMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/admin/portfolio-clients", data);
    },
    onSuccess: () => {
      toast({ title: "Portfolio client created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio-clients"] });
      setShowPortfolioCreator(false);
    },
    onError: () => {
      toast({ title: "Failed to create portfolio client", variant: "destructive" });
    },
  });

  const deletePortfolioClientMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/portfolio-clients/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Portfolio client deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio-clients"] });
    },
    onError: () => {
      toast({ title: "Failed to delete portfolio client", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="heading-admin">
            Admin Panel
          </h1>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="flex items-center gap-2"
            data-testid="logout-btn"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Blog Posts Management */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2" data-testid="heading-blog-management">
                <Edit className="h-5 w-5" />
                Blog Posts Management
              </CardTitle>
              <Button 
                onClick={() => setShowBlogCreator(true)}
                className="flex items-center gap-2 bg-[#4c9096] hover:bg-[#4c9096]/90 text-white"
                data-testid="button-create-blog"
              >
                <Plus className="h-4 w-4" />
                Create New Post
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showBlogCreator ? (
              <BlogPostCreator
                onSave={(data) => createBlogPostMutation.mutate(data)}
                isLoading={createBlogPostMutation.isPending}
                onCancel={() => setShowBlogCreator(false)}
              />
            ) : loadingPosts ? (
              <div className="text-center py-8" data-testid="loading-blog-posts">Loading blog posts...</div>
            ) : blogPosts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No blog posts yet. Create your first post!
              </div>
            ) : (
              <div className="space-y-4">
                {blogPosts.map((post) => (
                  <div key={post.id} className="border rounded-lg p-4">
                    {editingBlogPost === post.id ? (
                      <BlogPostEditForm 
                        post={post}
                        onSave={(data) => updateBlogPostMutation.mutate({ id: post.id, data })}
                        onCancel={() => setEditingBlogPost(null)}
                        isLoading={updateBlogPostMutation.isPending}
                      />
                    ) : (
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg" data-testid={`blog-title-${post.id}`}>{post.title}</h3>
                          <p className="text-gray-600 dark:text-gray-400 mt-1" data-testid={`blog-excerpt-${post.id}`}>
                            {post.excerpt}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span data-testid={`blog-status-${post.id}`}>
                              Status: {post.published ? "Published" : "Draft"}
                            </span>
                            <span data-testid={`blog-date-${post.id}`}>
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingBlogPost(post.id)}
                            data-testid={`button-edit-blog-${post.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteBlogPostMutation.mutate(post.id)}
                            disabled={deleteBlogPostMutation.isPending}
                            data-testid={`button-delete-blog-${post.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Portfolio Clients Management */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2" data-testid="heading-portfolio-management">
                <Edit className="h-5 w-5" />
                Portfolio Clients Management
              </CardTitle>
              <Button 
                onClick={() => setShowPortfolioCreator(true)}
                className="flex items-center gap-2 bg-[#4c9096] hover:bg-[#4c9096]/90 text-white"
                data-testid="button-create-portfolio-client"
              >
                <Plus className="h-4 w-4" />
                Add New Client
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showPortfolioCreator ? (
              <PortfolioClientCreateForm
                onSave={(data: InsertPortfolioClient) => createPortfolioClientMutation.mutate(data)}
                isLoading={createPortfolioClientMutation.isPending}
                onCancel={() => setShowPortfolioCreator(false)}
              />
            ) : loadingClients ? (
              <div className="text-center py-8" data-testid="loading-portfolio-clients">Loading portfolio clients...</div>
            ) : portfolioClients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No portfolio clients yet. Add your first client!
              </div>
            ) : (
              <div className="space-y-4">
                {portfolioClients.map((client) => (
                  <div key={client.id} className="border rounded-lg p-4">
                    {editingPortfolioClient === client.id ? (
                      <PortfolioClientEditForm 
                        client={client}
                        onSave={(data) => updatePortfolioClientMutation.mutate({ id: client.id, data })}
                        onCancel={() => setEditingPortfolioClient(null)}
                        isLoading={updatePortfolioClientMutation.isPending}
                      />
                    ) : (
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg" data-testid={`client-name-${client.id}`}>{client.name}</h3>
                          <p className="text-gray-600 dark:text-gray-400 mt-1" data-testid={`client-testimonial-${client.id}`}>
                            {client.testimonial || "No testimonial available"}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span data-testid={`client-representative-${client.id}`}>
                              Rep: {client.clientRepresentative || "N/A"}
                            </span>
                            <span data-testid={`client-date-${client.id}`}>
                              Added: {new Date(client.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingPortfolioClient(client.id)}
                            data-testid={`button-edit-client-${client.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deletePortfolioClientMutation.mutate(client.id)}
                            disabled={deletePortfolioClientMutation.isPending}
                            data-testid={`button-delete-client-${client.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Submissions Management */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="heading-form-submissions">
              <MessageSquare className="h-5 w-5" />
              Form Submissions Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="corporate" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="corporate" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Corporate ({corporateBookings.length})
                </TabsTrigger>
                <TabsTrigger value="rental" className="flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Rental ({rentalBookings.length})
                </TabsTrigger>
                <TabsTrigger value="vendor" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Vendor ({vendorRegistrations.length})
                </TabsTrigger>
                <TabsTrigger value="contact" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Contact ({contactMessages.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="corporate" className="mt-6">
                <FormSectionTable
                  title="Corporate Bookings"
                  data={corporateBookings}
                  searchQuery={corporateSearchQuery}
                  setSearchQuery={setCorporateSearchQuery}
                  dateFrom={corporateDateFrom}
                  setDateFrom={setCorporateDateFrom}
                  dateTo={corporateDateTo}
                  setDateTo={setCorporateDateTo}
                  loading={loadingCorporate}
                  type="corporate"
                  exportToCSV={exportToCSV}
                />
              </TabsContent>

              <TabsContent value="rental" className="mt-6">
                <FormSectionTable
                  title="Rental Bookings"
                  data={rentalBookings}
                  searchQuery={rentalSearchQuery}
                  setSearchQuery={setRentalSearchQuery}
                  dateFrom={rentalDateFrom}
                  setDateFrom={setRentalDateFrom}
                  dateTo={rentalDateTo}
                  setDateTo={setRentalDateTo}
                  loading={loadingRental}
                  type="rental"
                  exportToCSV={exportToCSV}
                />
              </TabsContent>

              <TabsContent value="vendor" className="mt-6">
                <FormSectionTable
                  title="Vendor Registrations"
                  data={vendorRegistrations}
                  searchQuery={vendorSearchQuery}
                  setSearchQuery={setVendorSearchQuery}
                  dateFrom={vendorDateFrom}
                  setDateFrom={setVendorDateFrom}
                  dateTo={vendorDateTo}
                  setDateTo={setVendorDateTo}
                  loading={loadingVendors}
                  type="vendor"
                  exportToCSV={exportToCSV}
                />
              </TabsContent>

              <TabsContent value="contact" className="mt-6">
                <FormSectionTable
                  title="Contact Messages"
                  data={contactMessages}
                  searchQuery={contactSearchQuery}
                  setSearchQuery={setContactSearchQuery}
                  dateFrom={contactDateFrom}
                  setDateFrom={setContactDateFrom}
                  dateTo={contactDateTo}
                  setDateTo={setContactDateTo}
                  loading={loadingMessages}
                  type="contact"
                  exportToCSV={exportToCSV}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>



      </div>
    </div>
  );
}

interface BlogPostEditFormProps {
  post: BlogPost;
  onSave: (data: UpdateBlogPost) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function BlogPostEditForm({ post, onSave, onCancel, isLoading }: BlogPostEditFormProps) {
  const form = useForm<UpdateBlogPost>({
    resolver: zodResolver(updateBlogPostSchema),
    defaultValues: {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      featuredImage: post.featuredImage || "",
      published: post.published || false,
    },
  });

  // Auto-generate slug when title changes
  const watchedTitle = form.watch("title");
  useEffect(() => {
    if (watchedTitle) {
      const newSlug = generateSlug(watchedTitle);
      form.setValue("slug", newSlug);
    }
  }, [watchedTitle, form]);

  const handleFormSubmit = (data: UpdateBlogPost) => {
    onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-edit-blog-title" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Auto-generated slug display */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            URL Slug (Auto-generated)
          </label>
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border rounded-md text-sm text-gray-600 dark:text-gray-400">
            {form.watch("slug") || "slug-will-appear-here"}
          </div>
        </div>

        {/* Hidden slug field for form submission */}
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <input type="hidden" {...field} />
          )}
        />

        <FormField
          control={form.control}
          name="excerpt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Excerpt</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} data-testid="input-edit-blog-excerpt" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea {...field} rows={8} data-testid="input-edit-blog-content" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-edit-blog-category" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="featuredImage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Featured Image URL</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} data-testid="input-edit-blog-image" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="published"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Published</FormLabel>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Make this post visible to the public
                </div>
              </div>
              <FormControl>
                <Switch 
                  checked={field.value || false} 
                  onCheckedChange={field.onChange}
                  data-testid="switch-edit-blog-published" 
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button type="submit" disabled={isLoading} data-testid="button-save-blog">
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-blog">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

interface PortfolioClientEditFormProps {
  client: PortfolioClient;
  onSave: (data: UpdatePortfolioClient) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function PortfolioClientEditForm({ client, onSave, onCancel, isLoading }: PortfolioClientEditFormProps) {
  const form = useForm<UpdatePortfolioClient>({
    resolver: zodResolver(updatePortfolioClientSchema),
    defaultValues: {
      id: client.id,
      name: client.name,
      logo: client.logo,
      images: client.images || [],
      testimonial: client.testimonial || "",
      clientRepresentative: client.clientRepresentative || "",
      position: client.position || "",
      rating: client.rating || 5,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client Name</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-edit-client-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="logo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logo URL</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-edit-client-logo" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="clientRepresentative"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client Representative</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} data-testid="input-edit-client-representative" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="position"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Position</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} data-testid="input-edit-client-position" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="testimonial"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Testimonial</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value || ""} rows={4} data-testid="input-edit-client-testimonial" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rating (1-5)</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  type="number" 
                  min="1" 
                  max="5" 
                  value={field.value || 5}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                  data-testid="input-edit-client-rating" 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button type="submit" disabled={isLoading} data-testid="button-save-client">
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-client">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

interface PortfolioClientCreateFormProps {
  onSave: (data: InsertPortfolioClient) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function PortfolioClientCreateForm({ onSave, onCancel, isLoading }: PortfolioClientCreateFormProps) {
  const form = useForm<InsertPortfolioClient>({
    resolver: zodResolver(insertPortfolioClientSchema),
    defaultValues: {
      name: "",
      logo: "",
      images: [],
      testimonial: "",
      clientRepresentative: "",
      position: "",
      rating: 5,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client Name *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter client name" data-testid="input-create-client-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="logo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logo URL *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="https://example.com/logo.png" data-testid="input-create-client-logo" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="clientRepresentative"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client Representative</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Representative name" data-testid="input-create-client-representative" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="position"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Position</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Position/Title" data-testid="input-create-client-position" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="testimonial"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Testimonial</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Client testimonial..." rows={4} data-testid="input-create-client-testimonial" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rating (1-5)</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  type="number" 
                  min="1" 
                  max="5" 
                  value={field.value || 5}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                  data-testid="input-create-client-rating" 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button type="submit" disabled={isLoading} data-testid="button-save-new-client">
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Creating..." : "Create Client"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-new-client">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

interface FormSectionTableProps {
  title: string;
  data: any[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  dateFrom: Date | undefined;
  setDateFrom: (date: Date | undefined) => void;
  dateTo: Date | undefined;
  setDateTo: (date: Date | undefined) => void;
  loading: boolean;
  type: 'corporate' | 'rental' | 'vendor' | 'contact';
  exportToCSV: (data: any[], filename: string) => void;
}

function FormSectionTable({
  title,
  data,
  searchQuery,
  setSearchQuery,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  loading,
  type,
  exportToCSV
}: FormSectionTableProps) {
  
  // Helper function to get all fields for each form type
  const getFormFields = (type: string) => {
    switch (type) {
      case 'corporate':
        return [
          { key: 'customerName', label: 'Customer Name' },
          { key: 'companyName', label: 'Company Name' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'officeAddress', label: 'Office Address' },
          { key: 'serviceType', label: 'Service Type' },
          { key: 'contractType', label: 'Contract Type' },
          { key: 'createdAt', label: 'Submitted' }
        ];
      case 'rental':
        return [
          { key: 'customerName', label: 'Customer Name' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'serviceType', label: 'Service Type' },
          { key: 'vehicleType', label: 'Vehicle Type' },
          { key: 'capacity', label: 'Capacity' },
          { key: 'vehicleCapacity', label: 'Vehicle Capacity' },
          { key: 'fromLocation', label: 'From Location' },
          { key: 'toLocation', label: 'To Location' },
          { key: 'startDate', label: 'Start Date' },
          { key: 'endDate', label: 'End Date' },
          { key: 'startTime', label: 'Start Time' },
          { key: 'endTime', label: 'End Time' },
          { key: 'pickupDate', label: 'Pickup Date' },
          { key: 'duration', label: 'Duration' },
          { key: 'isReturnTrip', label: 'Return Trip' },
          { key: 'createdAt', label: 'Submitted' }
        ];
      case 'vendor':
        return [
          { key: 'fullName', label: 'Full Name' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'location', label: 'Location' },
          { key: 'vehicleTypes', label: 'Vehicle Types' },
          { key: 'serviceModality', label: 'Service Modality' },
          { key: 'experience', label: 'Experience' },
          { key: 'additionalInfo', label: 'Additional Info' },
          { key: 'createdAt', label: 'Submitted' }
        ];
      case 'contact':
        return [
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'subject', label: 'Subject' },
          { key: 'message', label: 'Message' },
          { key: 'createdAt', label: 'Submitted' }
        ];
      default:
        return [];
    }
  };
  
  const fields = getFormFields(type);
  
  // Filter and process data
  const getFilteredData = () => {
    let filtered = [...data];
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(item => 
        Object.values(item).some(value => 
          String(value || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
    
    // Filter by date range
    if (dateFrom || dateTo) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.createdAt);
        const isAfterFrom = !dateFrom || itemDate >= dateFrom;
        const isBeforeTo = !dateTo || itemDate <= dateTo;
        return isAfterFrom && isBeforeTo;
      });
    }
    
    // Sort by submission date (newest first)
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };
  
  const filteredData = getFilteredData();
  
  // Format value for display
  const formatValue = (value: any, key: string) => {
    if (value === null || value === undefined) return '-';
    
    if (key === 'createdAt') {
      return new Date(value).toLocaleString();
    }
    
    if (key === 'isReturnTrip') {
      return value ? 'Yes' : 'No';
    }
    
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    if (key === 'email') {
      return (
        <a href={`mailto:${value}`} className="text-blue-600 hover:underline">
          {value}
        </a>
      );
    }
    
    if (key === 'phone') {
      return (
        <a href={`tel:${value}`} className="text-blue-600 hover:underline">
          {value}
        </a>
      );
    }
    
    return String(value);
  };
  
  // Export current filtered data
  const handleExport = () => {
    const exportData = filteredData.map(item => {
      const exportItem: any = {};
      fields.forEach(field => {
        const value = item[field.key];
        if (field.key === 'createdAt') {
          exportItem[field.label] = new Date(value).toLocaleString();
        } else if (field.key === 'isReturnTrip') {
          exportItem[field.label] = value ? 'Yes' : 'No';
        } else if (Array.isArray(value)) {
          exportItem[field.label] = value.join(', ');
        } else {
          exportItem[field.label] = value || '-';
        }
      });
      return exportItem;
    });
    exportToCSV(exportData, `${type}_submissions`);
  };
  
  if (loading) {
    return (
      <div className="text-center py-8" data-testid={`loading-${type}-submissions`}>
        Loading {type} submissions...
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder={`Search ${type} entries...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            data-testid={`input-search-${type}`}
          />
        </div>
        
        {/* Date Range Selector */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`justify-start text-left font-normal ${
                  !dateFrom && "text-muted-foreground"
                }`}
                data-testid={`button-date-from-${type}`}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "PPP") : "From date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`justify-start text-left font-normal ${
                  !dateTo && "text-muted-foreground"
                }`}
                data-testid={`button-date-to-${type}`}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, "PPP") : "To date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <Button
          onClick={handleExport}
          className="flex items-center gap-2"
          data-testid={`button-export-${type}`}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>
      
      {/* Table */}
      <div className="border rounded-lg">
        <div className="h-96 overflow-auto">
          {filteredData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery || dateFrom || dateTo ? `No ${type} submissions match your filters.` : `No ${type} submissions yet.`}
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                <TableRow>
                  {fields.map((field) => (
                    <TableHead key={field.key} className="whitespace-nowrap px-4 py-2">
                      {field.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item, index) => (
                  <TableRow key={item.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    {fields.map((field) => (
                      <TableCell key={field.key} className="whitespace-nowrap px-4 py-2 max-w-[200px] truncate" title={String(item[field.key] || '')}>
                        {formatValue(item[field.key], field.key)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
      
      <div className="text-sm text-gray-500 text-center">
        Showing {filteredData.length} of {data.length} {type} submission{filteredData.length !== 1 ? 's' : ''}
        {searchQuery && ` matching "${searchQuery}"`}
        {(dateFrom || dateTo) && ` within date range`}
      </div>
    </div>
  );
}

// Legacy function - will be removed
function FormSubmissionsTable({
  corporateBookings,
  rentalBookings,
  vendorRegistrations,
  contactMessages,
  searchQuery,
  formTypeFilter,
  loading,
}: FormSubmissionsTableProps) {
  
  const getAllFormDataForTable = () => {
    const combined = [];
    
    // Add corporate bookings
    if (formTypeFilter === "all" || formTypeFilter === "corporate") {
      corporateBookings.forEach(booking => {
        combined.push({
          id: booking.id,
          type: "Corporate",
          name: booking.customerName,
          email: booking.email,
          phone: booking.phone,
          details: `${booking.companyName} - ${booking.serviceType || 'No service specified'}`,
          submitted: new Date(booking.createdAt).toLocaleString(),
          rawDate: booking.createdAt
        });
      });
    }

    // Add rental bookings
    if (formTypeFilter === "all" || formTypeFilter === "rental") {
      rentalBookings.forEach(booking => {
        combined.push({
          id: booking.id,
          type: "Rental",
          name: booking.customerName,
          email: booking.email,
          phone: booking.phone,
          details: `${booking.serviceType || 'No service'} - ${booking.duration || 'No duration'} - Pickup: ${booking.pickupDate || 'TBD'}`,
          submitted: new Date(booking.createdAt).toLocaleString(),
          rawDate: booking.createdAt
        });
      });
    }

    // Add vendor registrations
    if (formTypeFilter === "all" || formTypeFilter === "vendor") {
      vendorRegistrations.forEach(vendor => {
        combined.push({
          id: vendor.id,
          type: "Vendor",
          name: vendor.fullName,
          email: vendor.email,
          phone: vendor.phone,
          details: `${vendor.location} - ${vendor.experience || 'No experience listed'} - ${vendor.vehicleTypes?.join(", ") || 'No vehicles'}`,
          submitted: new Date(vendor.createdAt).toLocaleString(),
          rawDate: vendor.createdAt
        });
      });
    }

    // Add contact messages
    if (formTypeFilter === "all" || formTypeFilter === "contact") {
      contactMessages.forEach(message => {
        combined.push({
          id: message.id,
          type: "Contact",
          name: message.name,
          email: message.email,
          phone: message.phone,
          details: `${message.subject} - ${message.message.substring(0, 100)}${message.message.length > 100 ? '...' : ''}`,
          submitted: new Date(message.createdAt).toLocaleString(),
          rawDate: message.createdAt
        });
      });
    }

    // Filter by search query
    let filtered = combined;
    if (searchQuery) {
      filtered = combined.filter(item => 
        Object.values(item).some(value => 
          String(value).toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Sort by submission date (newest first)
    return filtered.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
  };

  const tableData = getAllFormDataForTable();

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "Corporate":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "Rental":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "Vendor":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "Contact":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8" data-testid="loading-form-submissions">
        Loading form submissions...
      </div>
    );
  }

  if (tableData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {searchQuery ? "No form submissions match your search." : "No form submissions yet."}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Type</TableHead>
            <TableHead className="w-[150px]">Name</TableHead>
            <TableHead className="w-[200px]">Email</TableHead>
            <TableHead className="w-[120px]">Phone</TableHead>
            <TableHead>Details</TableHead>
            <TableHead className="w-[150px]">Submitted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableData.map((row) => (
            <TableRow key={`${row.type}-${row.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeStyle(row.type)}`}>
                  {row.type}
                </span>
              </TableCell>
              <TableCell className="font-medium" data-testid={`table-name-${row.id}`}>
                {row.name}
              </TableCell>
              <TableCell data-testid={`table-email-${row.id}`}>
                <a href={`mailto:${row.email}`} className="text-blue-600 hover:underline">
                  {row.email}
                </a>
              </TableCell>
              <TableCell data-testid={`table-phone-${row.id}`}>
                <a href={`tel:${row.phone}`} className="text-blue-600 hover:underline">
                  {row.phone}
                </a>
              </TableCell>
              <TableCell className="max-w-[300px] truncate" title={row.details} data-testid={`table-details-${row.id}`}>
                {row.details}
              </TableCell>
              <TableCell className="text-sm text-gray-500" data-testid={`table-submitted-${row.id}`}>
                {row.submitted}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-4 text-sm text-gray-500 text-center">
        Showing {tableData.length} form submission{tableData.length !== 1 ? 's' : ''}
        {searchQuery && ` matching "${searchQuery}"`}
        {formTypeFilter !== "all" && ` (${formTypeFilter} only)`}
      </div>
    </div>
  );
}