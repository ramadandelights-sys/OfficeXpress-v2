import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, Trash2, Plus, Save, X, Building, Car, Users, MessageSquare, LogOut } from "lucide-react";
import AdminLogin from "@/components/admin-login";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { 
  BlogPost, 
  PortfolioClient, 
  UpdateBlogPost, 
  UpdatePortfolioClient,
  CorporateBooking,
  RentalBooking,
  VendorRegistration,
  ContactMessage
} from "@shared/schema";
import { updateBlogPostSchema, updatePortfolioClientSchema } from "@shared/schema";

export default function Admin() {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [editingBlogPost, setEditingBlogPost] = useState<string | null>(null);
  const [editingPortfolioClient, setEditingPortfolioClient] = useState<string | null>(null);

  useEffect(() => {
    const authStatus = sessionStorage.getItem("adminAuthenticated");
    setIsAuthenticated(authStatus === "true");
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("adminAuthenticated");
    setIsAuthenticated(false);
    toast({
      title: "Logged out successfully",
      description: "You have been logged out of the admin panel",
    });
  };

  if (!isAuthenticated) {
    return <AdminLogin onLogin={() => setIsAuthenticated(true)} />;
  }

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

  const updateBlogPostMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBlogPost }) => {
      return await apiRequest(`/api/admin/blog-posts/${id}`, "PUT", data);
    },
    onSuccess: () => {
      toast({ title: "Blog post updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog-posts"] });
      setEditingBlogPost(null);
    },
    onError: () => {
      toast({ title: "Failed to update blog post", variant: "destructive" });
    },
  });

  const deleteBlogPostMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/admin/blog-posts/${id}`, "DELETE");
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
      return await apiRequest(`/api/admin/portfolio-clients/${id}`, "PUT", data);
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

  const deletePortfolioClientMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/admin/portfolio-clients/${id}`, "DELETE");
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
            <CardTitle className="flex items-center gap-2" data-testid="heading-blog-management">
              <Edit className="h-5 w-5" />
              Blog Posts Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPosts ? (
              <div className="text-center py-8" data-testid="loading-blog-posts">Loading blog posts...</div>
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
            <CardTitle className="flex items-center gap-2" data-testid="heading-portfolio-management">
              <Edit className="h-5 w-5" />
              Portfolio Clients Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingClients ? (
              <div className="text-center py-8" data-testid="loading-portfolio-clients">Loading portfolio clients...</div>
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

        {/* Corporate Bookings */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="heading-corporate-bookings">
              <Building className="h-5 w-5" />
              Corporate Booking Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCorporate ? (
              <div className="text-center py-8" data-testid="loading-corporate-bookings">Loading corporate bookings...</div>
            ) : corporateBookings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No corporate bookings yet</div>
            ) : (
              <div className="space-y-4">
                {corporateBookings.map((booking) => (
                  <div key={booking.id} className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg" data-testid={`corporate-company-${booking.id}`}>
                          {booking.companyName}
                        </h3>
                        <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Contact:</span> {booking.customerName}
                          </div>
                          <div>
                            <span className="font-medium">Phone:</span> {booking.phone}
                          </div>
                          <div>
                            <span className="font-medium">Email:</span> {booking.email}
                          </div>
                          <div>
                            <span className="font-medium">Service:</span> {booking.serviceType || "Not specified"}
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          Submitted: {new Date(booking.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rental Bookings */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="heading-rental-bookings">
              <Car className="h-5 w-5" />
              Rental Booking Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRental ? (
              <div className="text-center py-8" data-testid="loading-rental-bookings">Loading rental bookings...</div>
            ) : rentalBookings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No rental bookings yet</div>
            ) : (
              <div className="space-y-4">
                {rentalBookings.map((booking) => (
                  <div key={booking.id} className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg" data-testid={`rental-customer-${booking.id}`}>
                          {booking.customerName}
                        </h3>
                        <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Phone:</span> {booking.phone}
                          </div>
                          <div>
                            <span className="font-medium">Email:</span> {booking.email}
                          </div>
                          <div>
                            <span className="font-medium">Service:</span> {booking.serviceType || "Not specified"}
                          </div>
                          <div>
                            <span className="font-medium">Duration:</span> {booking.duration || "Not specified"}
                          </div>
                          <div>
                            <span className="font-medium">Pickup Date:</span> {booking.pickupDate || "Not specified"}
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          Submitted: {new Date(booking.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vendor Registrations */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="heading-vendor-registrations">
              <Users className="h-5 w-5" />
              Vendor Registration Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingVendors ? (
              <div className="text-center py-8" data-testid="loading-vendor-registrations">Loading vendor registrations...</div>
            ) : vendorRegistrations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No vendor applications yet</div>
            ) : (
              <div className="space-y-4">
                {vendorRegistrations.map((vendor) => (
                  <div key={vendor.id} className="border rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg" data-testid={`vendor-company-${vendor.id}`}>
                          {vendor.fullName}
                        </h3>
                        <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Phone:</span> {vendor.phone}
                          </div>
                          <div>
                            <span className="font-medium">Email:</span> {vendor.email}
                          </div>
                          <div>
                            <span className="font-medium">Location:</span> {vendor.location}
                          </div>
                          <div>
                            <span className="font-medium">Service:</span> {vendor.serviceModality}
                          </div>
                          <div>
                            <span className="font-medium">Experience:</span> {vendor.experience || "Not specified"}
                          </div>
                          <div>
                            <span className="font-medium">Vehicle Types:</span> {vendor.vehicleTypes?.join(", ") || "Not specified"}
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Additional Info:</span> {vendor.additionalInfo || "None"}
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          Applied: {new Date(vendor.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="heading-contact-messages">
              <MessageSquare className="h-5 w-5" />
              Contact Form Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingMessages ? (
              <div className="text-center py-8" data-testid="loading-contact-messages">Loading contact messages...</div>
            ) : contactMessages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No contact messages yet</div>
            ) : (
              <div className="space-y-4">
                {contactMessages.map((message) => (
                  <div key={message.id} className="border rounded-lg p-4 bg-orange-50 dark:bg-orange-900/20">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg" data-testid={`message-name-${message.id}`}>
                          {message.name}
                        </h3>
                        <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Phone:</span> {message.phone}
                          </div>
                          <div>
                            <span className="font-medium">Email:</span> {message.email}
                          </div>
                          <div className="col-span-2">
                            <span className="font-medium">Subject:</span> {message.subject}
                          </div>
                        </div>
                        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Message:</span>
                          <p className="mt-1 whitespace-pre-wrap">{message.message}</p>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          Received: {new Date(message.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      featuredImage: post.featuredImage || "",
      published: post.published || false,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
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