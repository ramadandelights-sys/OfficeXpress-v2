import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, Trash2, Plus, Save, X, Building, Car, Users, MessageSquare, LogOut, Download, Filter, Search, Calendar, ChevronDown, ChevronUp, Settings, Target, Globe, Scale, Star, Palette, Shield, UserCog, Truck } from "lucide-react";
import { useLocation } from "wouter";
import BlogPostCreator from "@/components/blog-post-creator";
import LegalPageCreator from "@/components/legal-page-creator";
import { MarketingSettingsForm, MarketingSettingsDisplay } from "@/components/marketing-settings";
import { WebsiteSettingsForm, WebsiteSettingsDisplay } from "@/components/website-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { generateSlug } from "@/lib/slugUtils";
import { PermissionMatrix, type UserPermissions } from "@/components/permission-matrix";
import type { 
  BlogPost, 
  PortfolioClient, 
  UpdateBlogPost, 
  UpdatePortfolioClient,
  InsertPortfolioClient,
  CorporateBooking,
  RentalBooking,
  VendorRegistration,
  ContactMessage,
  MarketingSettings,
  InsertMarketingSettings,
  UpdateMarketingSettings,
  WebsiteSettings,
  InsertWebsiteSettings,
  UpdateWebsiteSettings,
  LegalPage,
  InsertLegalPage,
  UpdateLegalPage,
  User,
  Driver,
  InsertDriver,
  UpdateDriver
} from "@shared/schema";
import { updateBlogPostSchema, updatePortfolioClientSchema, insertPortfolioClientSchema, insertMarketingSettingsSchema, updateMarketingSettingsSchema, insertWebsiteSettingsSchema, updateWebsiteSettingsSchema, insertLegalPageSchema, updateLegalPageSchema, insertDriverSchema, updateDriverSchema } from "@shared/schema";

export default function Admin() {
  const { user, isLoading, hasPermission } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== 'employee' && user.role !== 'superadmin'))) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== 'employee' && user.role !== 'superadmin')) {
    return null;
  }

  return <AdminDashboard user={user} />;
}

function AdminDashboard({ user }: { user: any }) {
  const { hasPermission } = useAuth();
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
  
  // Marketing settings state
  const [editingMarketingSettings, setEditingMarketingSettings] = useState(false);
  
  // Website settings state
  const [editingWebsiteSettings, setEditingWebsiteSettings] = useState(false);
  
  // Legal pages state
  const [editingLegalPage, setEditingLegalPage] = useState<string | null>(null);
  const [showLegalPageCreator, setShowLegalPageCreator] = useState(false);

  // Employee management state
  const [showEmployeeCreator, setShowEmployeeCreator] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);

  // Driver management state
  const [showDriverCreator, setShowDriverCreator] = useState(false);
  const [editingDriver, setEditingDriver] = useState<string | null>(null);

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
          referenceId: booking.referenceId || "",
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
          referenceId: booking.referenceId || "",
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
          referenceId: vendor.referenceId || "",
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
          referenceId: message.referenceId || "",
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

  const { data: blogPosts = [], isLoading: loadingPosts } = useQuery<BlogPost[]>({
    queryKey: ["/api/admin/blog-posts"],
    enabled: user ? hasPermission('blogPosts', 'view') : false,
  });

  const { data: portfolioClients = [], isLoading: loadingClients } = useQuery<PortfolioClient[]>({
    queryKey: ["/api/portfolio-clients"],
    enabled: user ? hasPermission('portfolioClients', 'view') : false,
  });

  const { data: corporateBookings = [], isLoading: loadingCorporate } = useQuery<CorporateBooking[]>({
    queryKey: ["/api/admin/corporate-bookings"],
    enabled: user ? hasPermission('corporateBookings', 'view') : false,
  });

  const { data: rentalBookings = [], isLoading: loadingRental } = useQuery<RentalBooking[]>({
    queryKey: ["/api/admin/rental-bookings"],
    enabled: user ? hasPermission('rentalBookings', 'view') : false,
  });

  const { data: vendorRegistrations = [], isLoading: loadingVendors } = useQuery<VendorRegistration[]>({
    queryKey: ["/api/admin/vendor-registrations"],
    enabled: user ? hasPermission('vendorRegistrations', 'view') : false,
  });

  const { data: contactMessages = [], isLoading: loadingMessages } = useQuery<ContactMessage[]>({
    queryKey: ["/api/admin/contact-messages"],
    enabled: user ? hasPermission('contactMessages', 'view') : false,
  });

  const { data: marketingSettings = null, isLoading: loadingMarketingSettings } = useQuery<MarketingSettings | null>({
    queryKey: ["/api/admin/marketing-settings"],
    enabled: user ? hasPermission('marketingSettings', 'view') : false,
  });

  const { data: websiteSettings = null, isLoading: loadingWebsiteSettings } = useQuery<WebsiteSettings | null>({
    queryKey: ["/api/admin/website-settings"],
    enabled: user ? hasPermission('websiteSettings', 'view') : false,
  });

  const { data: legalPages = [], isLoading: loadingLegalPages } = useQuery<LegalPage[]>({
    queryKey: ["/api/admin/legal-pages"],
    enabled: user ? hasPermission('legalPages', 'view') : false,
  });

  // User (Employee) Management queries - only for superadmin
  const { data: allUsers = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: user.role === 'superadmin',
  });

  // Driver Management queries
  const { data: allDrivers = [], isLoading: loadingDrivers } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
    enabled: user ? hasPermission('driverManagement', 'view') : false,
  });

  const { data: activeDrivers = [], isLoading: loadingActiveDrivers } = useQuery<Driver[]>({
    queryKey: ["/api/drivers/active"],
    enabled: hasPermission('driverAssignment'),
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

  // Marketing Settings Mutations
  const createMarketingSettingsMutation = useMutation({
    mutationFn: async (data: InsertMarketingSettings) => {
      return await apiRequest("POST", "/api/admin/marketing-settings", data);
    },
    onSuccess: () => {
      toast({ title: "Marketing settings created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing-settings"] });
      setEditingMarketingSettings(false);
    },
    onError: () => {
      toast({ title: "Failed to create marketing settings", variant: "destructive" });
    },
  });

  const updateMarketingSettingsMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateMarketingSettings }) => {
      return await apiRequest("PUT", `/api/admin/marketing-settings/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Marketing settings updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing-settings"] });
      setEditingMarketingSettings(false);
    },
    onError: () => {
      toast({ title: "Failed to update marketing settings", variant: "destructive" });
    },
  });

  // Website Settings Mutations
  const createWebsiteSettingsMutation = useMutation({
    mutationFn: async (data: InsertWebsiteSettings) => {
      return await apiRequest("POST", "/api/admin/website-settings", data);
    },
    onSuccess: () => {
      toast({ title: "Website settings created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/website-settings"] });
      setEditingWebsiteSettings(false);
    },
    onError: () => {
      toast({ title: "Failed to create website settings", variant: "destructive" });
    },
  });

  const updateWebsiteSettingsMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWebsiteSettings }) => {
      return await apiRequest("PUT", `/api/admin/website-settings/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Website settings updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/website-settings"] });
      setEditingWebsiteSettings(false);
    },
    onError: () => {
      toast({ title: "Failed to update website settings", variant: "destructive" });
    },
  });

  // Legal Pages Mutations
  const createLegalPageMutation = useMutation({
    mutationFn: async (data: InsertLegalPage) => {
      return await apiRequest("POST", "/api/admin/legal-pages", data);
    },
    onSuccess: () => {
      toast({ title: "Legal page created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/legal-pages"] });
      setEditingLegalPage(null);
      setShowLegalPageCreator(false);
    },
    onError: () => {
      toast({ title: "Failed to create legal page", variant: "destructive" });
    },
  });

  const updateLegalPageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateLegalPage }) => {
      return await apiRequest("PUT", `/api/admin/legal-pages/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Legal page updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/legal-pages"] });
      setEditingLegalPage(null);
    },
    onError: () => {
      toast({ title: "Failed to update legal page", variant: "destructive" });
    },
  });

  const deleteLegalPageMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/legal-pages/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Legal page deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/legal-pages"] });
    },
    onError: () => {
      toast({ title: "Failed to delete legal page", variant: "destructive" });
    },
  });

  // Employee/User Management mutations
  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/users", data);
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.emailSent) {
        toast({ 
          title: "Employee created successfully",
          description: `Login credentials have been sent to ${data.user?.email}. The employee can now log in using the provided temporary password.`
        });
      } else {
        toast({ 
          title: "Employee created successfully"
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create employee", description: error.message, variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PUT", `/api/users/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Employee updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: () => {
      toast({ title: "Failed to update employee", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Employee deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: () => {
      toast({ title: "Failed to delete employee", variant: "destructive" });
    },
  });

  // Driver Management mutations
  const createDriverMutation = useMutation({
    mutationFn: async (data: InsertDriver) => {
      return await apiRequest("POST", "/api/drivers", data);
    },
    onSuccess: () => {
      toast({ title: "Driver created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers/active"] });
    },
    onError: () => {
      toast({ title: "Failed to create driver", variant: "destructive" });
    },
  });

  const updateDriverMutation = useMutation({
    mutationFn: async (data: UpdateDriver) => {
      return await apiRequest("PUT", `/api/drivers/${data.id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Driver updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers/active"] });
    },
    onError: () => {
      toast({ title: "Failed to update driver", variant: "destructive" });
    },
  });

  const deleteDriverMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/drivers/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Driver deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers/active"] });
    },
    onError: () => {
      toast({ title: "Failed to delete driver", variant: "destructive" });
    },
  });

  // Driver Assignment mutation
  const assignDriverMutation = useMutation({
    mutationFn: async ({ rentalId, driverId }: { rentalId: string; driverId: string }) => {
      return await apiRequest("PUT", `/api/rental-bookings/${rentalId}/assign-driver`, { driverId });
    },
    onSuccess: () => {
      toast({ title: "Driver assigned successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rental-bookings"] });
    },
    onError: () => {
      toast({ title: "Failed to assign driver", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="heading-admin">
            Admin Panel
          </h1>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Logged in as: <span className="font-semibold">{user.phone}</span> ({user.role})
          </div>
        </div>

        {/* Blog Posts Management */}
        {(hasPermission('blogPosts', 'view')) && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2" data-testid="heading-blog-management">
                <Edit className="h-5 w-5" />
                Blog Posts Management
              </CardTitle>
              {(hasPermission('blogPosts', 'edit')) && (
              <Button 
                onClick={() => setShowBlogCreator(true)}
                className="flex items-center gap-2 bg-[#4c9096] hover:bg-[#4c9096]/90 text-white"
                data-testid="button-create-blog"
              >
                <Plus className="h-4 w-4" />
                Create New Post
              </Button>
              )}
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
                          {hasPermission('blogPosts', 'edit') && (
                          <>
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
                          </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Portfolio Clients Management */}
        {(hasPermission('portfolioClients', 'view')) && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2" data-testid="heading-portfolio-management">
                <Edit className="h-5 w-5" />
                Portfolio Clients Management
              </CardTitle>
              {(hasPermission('portfolioClients', 'edit')) && (
              <Button 
                onClick={() => setShowPortfolioCreator(true)}
                className="flex items-center gap-2 bg-[#4c9096] hover:bg-[#4c9096]/90 text-white"
                data-testid="button-create-portfolio-client"
              >
                <Plus className="h-4 w-4" />
                Add New Client
              </Button>
              )}
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
                          {hasPermission('portfolioClients', 'edit') && (
                          <>
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
                          </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Form Submissions Management */}
        {(hasPermission('corporateBookings', 'view') || hasPermission('rentalBookings', 'view') || hasPermission('vendorRegistrations', 'view') || hasPermission('contactMessages', 'view')) && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="heading-form-submissions">
              <MessageSquare className="h-5 w-5" />
              Form Submissions Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={(hasPermission('corporateBookings', 'view')) ? "corporate" : (hasPermission('rentalBookings', 'view')) ? "rental" : (hasPermission('vendorRegistrations', 'view')) ? "vendor" : "contact"} className="w-full">
              <TabsList className={`grid w-full ${
                [
                  hasPermission('corporateBookings', 'view'),
                  hasPermission('rentalBookings', 'view'),
                  hasPermission('vendorRegistrations', 'view'),
                  hasPermission('contactMessages', 'view')
                ].filter(Boolean).length === 4 ? 'grid-cols-4' :
                [
                  hasPermission('corporateBookings', 'view'),
                  hasPermission('rentalBookings', 'view'),
                  hasPermission('vendorRegistrations', 'view'),
                  hasPermission('contactMessages', 'view')
                ].filter(Boolean).length === 3 ? 'grid-cols-3' :
                [
                  hasPermission('corporateBookings', 'view'),
                  hasPermission('rentalBookings', 'view'),
                  hasPermission('vendorRegistrations', 'view'),
                  hasPermission('contactMessages', 'view')
                ].filter(Boolean).length === 2 ? 'grid-cols-2' : 'grid-cols-1'
              }`}>
                {hasPermission('corporateBookings', 'view') && (
                  <TabsTrigger value="corporate" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Corporate ({corporateBookings.length})
                  </TabsTrigger>
                )}
                {hasPermission('rentalBookings', 'view') && (
                  <TabsTrigger value="rental" className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Rental ({rentalBookings.length})
                  </TabsTrigger>
                )}
                {hasPermission('vendorRegistrations', 'view') && (
                  <TabsTrigger value="vendor" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Vendor ({vendorRegistrations.length})
                  </TabsTrigger>
                )}
                {hasPermission('contactMessages', 'view') && (
                  <TabsTrigger value="contact" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Contact ({contactMessages.length})
                  </TabsTrigger>
                )}
              </TabsList>

              {hasPermission('corporateBookings', 'view') && (
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
              )}

              {hasPermission('rentalBookings', 'view') && (
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
                  activeDrivers={activeDrivers}
                  assignDriverMutation={assignDriverMutation}
                  showDriverAssignment={hasPermission('driverAssignment')}
                />
                </TabsContent>
              )}

              {hasPermission('vendorRegistrations', 'view') && (
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
              )}

              {hasPermission('contactMessages', 'view') && (
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
              )}
            </Tabs>
          </CardContent>
        </Card>
        )}

        {/* Marketing Settings Management */}
        {(hasPermission('marketingSettings', 'view')) && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2" data-testid="heading-marketing-settings">
                <Target className="h-5 w-5" />
                Marketing Settings
              </CardTitle>
              {!marketingSettings && !editingMarketingSettings && (hasPermission('marketingSettings', 'edit')) && (
                <Button 
                  onClick={() => setEditingMarketingSettings(true)}
                  className="flex items-center gap-2 bg-[#4c9096] hover:bg-[#4c9096]/90 text-white"
                  data-testid="button-create-marketing"
                >
                  <Plus className="h-4 w-4" />
                  Setup Marketing
                </Button>
              )}
              {marketingSettings && !editingMarketingSettings && (hasPermission('marketingSettings', 'edit')) && (
                <Button 
                  onClick={() => setEditingMarketingSettings(true)}
                  className="flex items-center gap-2"
                  variant="outline"
                  data-testid="button-edit-marketing"
                >
                  <Settings className="h-4 w-4" />
                  Edit Settings
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingMarketingSettings ? (
              <div className="flex justify-center py-8">
                <div className="text-gray-500">Loading marketing settings...</div>
              </div>
            ) : editingMarketingSettings ? (
              <MarketingSettingsForm
                settings={marketingSettings}
                onSave={(data) => {
                  if (marketingSettings) {
                    updateMarketingSettingsMutation.mutate({ id: marketingSettings.id, data });
                  } else {
                    createMarketingSettingsMutation.mutate(data);
                  }
                }}
                onCancel={() => setEditingMarketingSettings(false)}
                isLoading={createMarketingSettingsMutation.isPending || updateMarketingSettingsMutation.isPending}
              />
            ) : marketingSettings ? (
              <MarketingSettingsDisplay settings={marketingSettings} />
            ) : (
              <div className="text-center py-8">
                <Target className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Marketing Settings Configured
                </h3>
                <p className="text-gray-500 mb-4">
                  Set up your Facebook Pixel, Google Analytics, and other marketing tools to track your website performance.
                </p>
                <Button 
                  onClick={() => setEditingMarketingSettings(true)}
                  className="bg-[#4c9096] hover:bg-[#4c9096]/90 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Setup Marketing Settings
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Website Settings Management */}
        {(hasPermission('websiteSettings', 'view')) && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2" data-testid="heading-website-settings">
                <Palette className="h-5 w-5" />
                Website Settings
              </CardTitle>
              {!websiteSettings && !editingWebsiteSettings && (hasPermission('websiteSettings', 'edit')) && (
                <Button 
                  onClick={() => setEditingWebsiteSettings(true)}
                  className="flex items-center gap-2 bg-[#4c9096] hover:bg-[#4c9096]/90 text-white"
                  data-testid="button-create-website"
                >
                  <Plus className="h-4 w-4" />
                  Setup Website Customization
                </Button>
              )}
              {websiteSettings && !editingWebsiteSettings && (hasPermission('websiteSettings', 'edit')) && (
                <Button 
                  onClick={() => setEditingWebsiteSettings(true)}
                  className="flex items-center gap-2"
                  variant="outline"
                  data-testid="button-edit-website"
                >
                  <Settings className="h-4 w-4" />
                  Edit Settings
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingWebsiteSettings ? (
              <div className="flex justify-center py-8">
                <div className="text-gray-500">Loading website settings...</div>
              </div>
            ) : editingWebsiteSettings ? (
              <WebsiteSettingsForm
                settings={websiteSettings}
                onSave={(data) => {
                  if (websiteSettings) {
                    updateWebsiteSettingsMutation.mutate({ id: websiteSettings.id, data });
                  } else {
                    createWebsiteSettingsMutation.mutate(data);
                  }
                }}
                onCancel={() => setEditingWebsiteSettings(false)}
                isLoading={createWebsiteSettingsMutation.isPending || updateWebsiteSettingsMutation.isPending}
              />
            ) : websiteSettings ? (
              <WebsiteSettingsDisplay settings={websiteSettings} />
            ) : (
              <div className="text-center py-8">
                <Palette className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Website Settings Configured
                </h3>
                <p className="text-gray-500 mb-4">
                  Customize your website's appearance with colors, fonts, logo, and branding elements.
                </p>
                <Button 
                  onClick={() => setEditingWebsiteSettings(true)}
                  className="bg-[#4c9096] hover:bg-[#4c9096]/90 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Setup Website Settings
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Employee Management (Superadmin Only) */}
        {user.role === 'superadmin' && (
          <EmployeeManagementSection
            allUsers={allUsers}
            loadingUsers={loadingUsers}
            showEmployeeCreator={showEmployeeCreator}
            setShowEmployeeCreator={setShowEmployeeCreator}
            editingEmployee={editingEmployee}
            setEditingEmployee={setEditingEmployee}
            createUserMutation={createUserMutation}
            updateUserMutation={updateUserMutation}
            deleteUserMutation={deleteUserMutation}
          />
        )}

        {/* Driver Management (Drivers Permission) */}
        {(hasPermission('driverManagement', 'view')) && (
          <DriverManagementSection
            allDrivers={allDrivers}
            loadingDrivers={loadingDrivers}
            showDriverCreator={showDriverCreator}
            setShowDriverCreator={setShowDriverCreator}
            editingDriver={editingDriver}
            setEditingDriver={setEditingDriver}
            createDriverMutation={createDriverMutation}
            updateDriverMutation={updateDriverMutation}
            deleteDriverMutation={deleteDriverMutation}
          />
        )}

        {/* Legal Pages Management */}
        {(hasPermission('legalPages', 'view')) && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2" data-testid="heading-legal-pages">
                <Scale className="h-5 w-5" />
                Legal Pages
              </CardTitle>
              {(hasPermission('legalPages', 'edit')) && (
              <Button 
                onClick={() => setShowLegalPageCreator(true)}
                className="flex items-center gap-2 bg-[#4c9096] hover:bg-[#4c9096]/90 text-white"
                data-testid="button-create-legal"
              >
                <Plus className="h-4 w-4" />
                Create Legal Page
              </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingLegalPages ? (
              <div className="flex justify-center py-8">
                <div className="text-gray-500">Loading legal pages...</div>
              </div>
            ) : legalPages.length === 0 ? (
              <div className="text-center py-8">
                <Scale className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Legal Pages Found
                </h3>
                <p className="text-gray-500 mb-4">
                  Create Terms & Conditions, Privacy Policy, and other legal pages for your website.
                </p>
                <Button 
                  onClick={() => setShowLegalPageCreator(true)}
                  className="bg-[#4c9096] hover:bg-[#4c9096]/90 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Legal Page
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {legalPages.map((page) => (
                  <div key={page.id} className="border rounded-lg p-4 bg-white dark:bg-gray-800">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white" data-testid={`text-legal-title-${page.id}`}>
                          {page.title}
                        </h3>
                        <p className="text-sm text-gray-500 mb-2">
                          Type: <span className="capitalize font-medium">{page.type}</span>
                        </p>
                        <p className="text-sm text-gray-500">
                          Last Updated: {new Date(page.lastUpdated).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {hasPermission('legalPages', 'edit') && (
                        <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingLegalPage(page)}
                          data-testid={`button-edit-legal-${page.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteLegalPageMutation.mutate(page.id)}
                          className="text-red-600 hover:text-red-700"
                          data-testid={`button-delete-legal-${page.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Legal Page Creator Modal */}
        {(user.role === 'superadmin' || user.permissions?.legalPages) && showLegalPageCreator && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <LegalPageCreator
                onSave={(data) => createLegalPageMutation.mutate(data)}
                isLoading={createLegalPageMutation.isPending}
                onCancel={() => setShowLegalPageCreator(false)}
              />
            </div>
          </div>
        )}

        {/* Legal Page Editor Modal */}
        {(user.role === 'superadmin' || user.permissions?.legalPages) && editingLegalPage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <LegalPageCreator
                initialData={legalPages.find(page => page.id === editingLegalPage)}
                onSave={(data) => updateLegalPageMutation.mutate({ id: editingLegalPage, data })}
                isLoading={updateLegalPageMutation.isPending}
                onCancel={() => setEditingLegalPage(null)}
              />
            </div>
          </div>
        )}

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
              <FormLabel>Rating</FormLabel>
              <FormControl>
                <div className="flex gap-1" data-testid="star-rating-edit">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => field.onChange(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star 
                        className={`w-6 h-6 ${
                          star <= (field.value || 5) 
                            ? 'text-yellow-400 fill-current' 
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-muted-foreground">
                    {field.value || 5} star{(field.value || 5) !== 1 ? 's' : ''}
                  </span>
                </div>
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
              <FormLabel>Rating</FormLabel>
              <FormControl>
                <div className="flex gap-1" data-testid="star-rating-create">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => field.onChange(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star 
                        className={`w-6 h-6 ${
                          star <= (field.value || 5) 
                            ? 'text-yellow-400 fill-current' 
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-muted-foreground">
                    {field.value || 5} star{(field.value || 5) !== 1 ? 's' : ''}
                  </span>
                </div>
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

interface DriverAssignmentDialogProps {
  booking: RentalBooking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function DriverAssignmentDialog({ booking, open, onOpenChange, onSuccess }: DriverAssignmentDialogProps) {
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [searchedDriver, setSearchedDriver] = useState<Driver | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setPhoneNumber('');
      setSearchedDriver(null);
      setSearchError(null);
      setShowCreateForm(false);
    }
  }, [open]);

  // Driver creation form
  const driverForm = useForm<InsertDriver>({
    resolver: zodResolver(insertDriverSchema),
    defaultValues: {
      name: '',
      phone: phoneNumber,
      licensePlate: '',
      vehicleMake: '',
      vehicleModel: '',
      vehicleYear: '',
      isActive: true,
    },
  });

  // Update phone in form when phone number changes
  useEffect(() => {
    if (phoneNumber && showCreateForm) {
      driverForm.setValue('phone', phoneNumber);
    }
  }, [phoneNumber, showCreateForm]);

  // Search for driver by phone
  const handleSearchDriver = async () => {
    if (!phoneNumber.trim()) {
      setSearchError('Please enter a phone number');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchedDriver(null);

    try {
      const response = await apiRequest('GET', `/api/drivers/search?phone=${encodeURIComponent(phoneNumber)}`);
      const driver = await response.json();
      setSearchedDriver(driver);
      setShowCreateForm(false);
    } catch (error: any) {
      if (error.status === 404) {
        // Driver not found, show create form
        setShowCreateForm(true);
        setSearchError('Driver not found. Please enter driver details below to create and assign.');
      } else {
        setSearchError('Failed to search for driver. Please try again.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Assign existing driver to booking
  const assignExistingDriverMutation = useMutation({
    mutationFn: async (driverId: string) => {
      if (!booking) throw new Error('No booking selected');
      return await apiRequest('PUT', `/api/rental-bookings/${booking.id}/assign-driver`, { driverId });
    },
    onSuccess: () => {
      toast({ title: 'Driver assigned successfully!' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/rental-bookings'] });
      onSuccess();
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Failed to assign driver', variant: 'destructive' });
    },
  });

  // Create new driver and assign to booking
  const createAndAssignDriverMutation = useMutation({
    mutationFn: async (driverData: InsertDriver) => {
      if (!booking) throw new Error('No booking selected');
      return await apiRequest('POST', `/api/rental-bookings/${booking.id}/create-and-assign-driver`, driverData);
    },
    onSuccess: () => {
      toast({ title: 'Driver created and assigned successfully!' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/rental-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/active'] });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: any) => {
      const message = error.message || 'Failed to create and assign driver';
      toast({ title: message, variant: 'destructive' });
    },
  });

  const onSubmitCreateDriver = (data: InsertDriver) => {
    createAndAssignDriverMutation.mutate(data);
  };

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Driver to Booking</DialogTitle>
          <DialogDescription>
            Booking Ref: <span className="font-semibold">{booking.referenceId}</span> - {booking.customerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Phone number search */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Driver Phone Number</label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter phone number (e.g., 01XXXXXXXXX)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchDriver();
                  }
                }}
                data-testid="input-driver-phone"
              />
              <Button
                onClick={handleSearchDriver}
                disabled={isSearching || !phoneNumber.trim()}
                data-testid="button-search-driver"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>
            {searchError && (
              <p className="text-sm text-orange-600 dark:text-orange-400">{searchError}</p>
            )}
          </div>

          {/* Existing driver found */}
          {searchedDriver && (
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardContent className="pt-4">
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-3">Driver Found!</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Name:</span>
                    <p className="font-medium">{searchedDriver.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                    <p className="font-medium">{searchedDriver.phone}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">License Plate:</span>
                    <p className="font-medium">{searchedDriver.licensePlate}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Vehicle:</span>
                    <p className="font-medium">{searchedDriver.vehicleMake} {searchedDriver.vehicleModel} ({searchedDriver.vehicleYear})</p>
                  </div>
                </div>
                <Button
                  className="w-full mt-4"
                  onClick={() => assignExistingDriverMutation.mutate(searchedDriver.id)}
                  disabled={assignExistingDriverMutation.isPending}
                  data-testid="button-assign-existing-driver"
                >
                  {assignExistingDriverMutation.isPending ? 'Assigning...' : 'Assign to Booking'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Create new driver form */}
          {showCreateForm && (
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">Create New Driver</h3>
                <Form {...driverForm}>
                  <form onSubmit={driverForm.handleSubmit(onSubmitCreateDriver)} className="space-y-4">
                    <FormField
                      control={driverForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Driver Name *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Full name" data-testid="input-driver-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={driverForm.control}
                      name="licensePlate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License Plate *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., LA 22-1122" data-testid="input-license-plate" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={driverForm.control}
                        name="vehicleMake"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vehicle Make *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., Toyota" data-testid="input-vehicle-make" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={driverForm.control}
                        name="vehicleModel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vehicle Model *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., Hiace" data-testid="input-vehicle-model" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={driverForm.control}
                      name="vehicleYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle Year *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 2022" data-testid="input-vehicle-year" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={createAndAssignDriverMutation.isPending}
                      data-testid="button-create-and-assign-driver"
                    >
                      {createAndAssignDriverMutation.isPending ? 'Creating...' : 'Create Driver & Assign to Booking'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
  activeDrivers?: Driver[];
  assignDriverMutation?: any;
  showDriverAssignment?: boolean;
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
  exportToCSV,
  activeDrivers = [],
  assignDriverMutation,
  showDriverAssignment = false
}: FormSectionTableProps) {
  // State for driver assignment dialog
  const [assigningBooking, setAssigningBooking] = useState<RentalBooking | null>(null);
  
  // Helper function to get all fields for each form type
  const getFormFields = (type: string) => {
    switch (type) {
      case 'corporate':
        return [
          { key: 'referenceId', label: 'Reference ID' },
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
        const rentalFields = [
          { key: 'referenceId', label: 'Reference ID' },
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
        if (showDriverAssignment) {
          rentalFields.push({ key: 'driver', label: 'Driver' });
        }
        return rentalFields;
      case 'vendor':
        return [
          { key: 'referenceId', label: 'Reference ID' },
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
          { key: 'referenceId', label: 'Reference ID' },
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
  const formatValue = (value: any, key: string, item?: any) => {
    if (value === null || value === undefined) {
      if (key === 'driver' && item) {
        return '-';
      }
      return '-';
    }
    
    if (key === 'referenceId') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
          #{value}
        </span>
      );
    }
    
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
    
    if (key === 'driver' && item && showDriverAssignment) {
      const assignedDriver = activeDrivers.find(d => d.id === item.driverId);
      return (
        <div className="flex flex-col gap-1">
          <div className="text-sm mb-1">
            {assignedDriver ? (
              <span className="font-medium text-green-700 dark:text-green-400">
                {assignedDriver.name}
              </span>
            ) : (
              <span className="text-gray-500">Unassigned</span>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setAssigningBooking(item as RentalBooking)}
            data-testid={`button-assign-driver-${item.id}`}
          >
            <Truck className="h-3 w-3 mr-1" />
            {assignedDriver ? 'Reassign' : 'Assign Driver'}
          </Button>
        </div>
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
                        {formatValue(item[field.key], field.key, item)}
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

      {/* Driver Assignment Dialog */}
      {showDriverAssignment && (
        <DriverAssignmentDialog
          booking={assigningBooking}
          open={!!assigningBooking}
          onOpenChange={(open) => !open && setAssigningBooking(null)}
          onSuccess={() => {
            // Refresh data after successful assignment
            queryClient.invalidateQueries({ queryKey: ['/api/admin/rental-bookings'] });
          }}
        />
      )}
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

// Employee Management Section Component
interface EmployeeManagementSectionProps {
  allUsers: User[];
  loadingUsers: boolean;
  showEmployeeCreator: boolean;
  setShowEmployeeCreator: (show: boolean) => void;
  editingEmployee: string | null;
  setEditingEmployee: (id: string | null) => void;
  createUserMutation: any;
  updateUserMutation: any;
  deleteUserMutation: any;
}

function EmployeeManagementSection({
  allUsers,
  loadingUsers,
  showEmployeeCreator,
  setShowEmployeeCreator,
  editingEmployee,
  setEditingEmployee,
  createUserMutation,
  updateUserMutation,
  deleteUserMutation,
}: EmployeeManagementSectionProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'employee' as 'employee' | 'customer',
    permissions: {
      blogPosts: { view: false, edit: false },
      portfolioClients: { view: false, edit: false },
      corporateBookings: { view: false, edit: false, downloadCsv: false },
      rentalBookings: { view: false, edit: false, downloadCsv: false },
      vendorRegistrations: { view: false, edit: false, downloadCsv: false },
      contactMessages: { view: false, edit: false, downloadCsv: false },
      marketingSettings: { view: false, edit: false },
      websiteSettings: { view: false, edit: false },
      legalPages: { view: false, edit: false },
      driverManagement: { view: false, edit: false, downloadCsv: false },
      driverAssignment: false,
      employeeManagement: { view: false, edit: false },
    } as UserPermissions
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      role: 'employee',
      permissions: {
        blogPosts: { view: false, edit: false },
        portfolioClients: { view: false, edit: false },
        corporateBookings: { view: false, edit: false, downloadCsv: false },
        rentalBookings: { view: false, edit: false, downloadCsv: false },
        vendorRegistrations: { view: false, edit: false, downloadCsv: false },
        contactMessages: { view: false, edit: false, downloadCsv: false },
        marketingSettings: { view: false, edit: false },
        websiteSettings: { view: false, edit: false },
        legalPages: { view: false, edit: false },
        driverManagement: { view: false, edit: false, downloadCsv: false },
        driverAssignment: false,
        employeeManagement: { view: false, edit: false },
      } as UserPermissions
    });
    setShowEmployeeCreator(false);
    setEditingEmployee(null);
  };

  const handleEditEmployee = (employee: User) => {
    setFormData({
      name: employee.name || '',
      phone: employee.phone,
      email: employee.email || '',
      role: employee.role,
      permissions: (employee.permissions as UserPermissions) || {
        blogPosts: { view: false, edit: false },
        portfolioClients: { view: false, edit: false },
        corporateBookings: { view: false, edit: false, downloadCsv: false },
        rentalBookings: { view: false, edit: false, downloadCsv: false },
        vendorRegistrations: { view: false, edit: false, downloadCsv: false },
        contactMessages: { view: false, edit: false, downloadCsv: false },
        marketingSettings: { view: false, edit: false },
        websiteSettings: { view: false, edit: false },
        legalPages: { view: false, edit: false },
        driverManagement: { view: false, edit: false, downloadCsv: false },
        driverAssignment: false,
        employeeManagement: { view: false, edit: false },
      } as UserPermissions
    });
    setEditingEmployee(employee.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEmployee) {
      updateUserMutation.mutate({ id: editingEmployee, data: { permissions: formData.permissions } }, {
        onSuccess: () => resetForm()
      });
    } else {
      createUserMutation.mutate(formData, {
        onSuccess: () => resetForm()
      });
    }
  };

  const getPermissionsSummary = (permissions: any) => {
    if (!permissions) return 'No permissions';
    
    const activePerms: string[] = [];
    Object.entries(permissions).forEach(([key, value]) => {
      if (key === 'driverAssignment' && value === true) {
        activePerms.push('Driver Assignment');
      } else if (typeof value === 'object' && value !== null) {
        const perm = value as any;
        if (perm.view || perm.edit || perm.downloadCsv) {
          const actions = [];
          if (perm.view) actions.push('view');
          if (perm.edit) actions.push('edit');
          if (perm.downloadCsv) actions.push('csv');
          const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
          activePerms.push(`${formattedKey} (${actions.join(', ')})`);
        }
      }
    });
    
    return activePerms.length > 0 ? activePerms.join(' | ') : 'No permissions';
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2" data-testid="heading-employee-management">
            <Shield className="h-5 w-5" />
            Employee Management
          </CardTitle>
          {!showEmployeeCreator && !editingEmployee && (
            <Button
              onClick={() => setShowEmployeeCreator(true)}
              className="flex items-center gap-2 bg-[#4c9096] hover:bg-[#4c9096]/90 text-white"
              data-testid="button-create-employee"
            >
              <Plus className="h-4 w-4" />
              Create Employee
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {showEmployeeCreator || editingEmployee ? (
          <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
            <h3 className="font-semibold text-lg mb-4">
              {editingEmployee ? 'Edit Employee Permissions' : 'Create New Employee'}
            </h3>
            
            {!editingEmployee && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Employee name"
                    required
                    data-testid="input-employee-name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Phone *</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => {
                      // Only allow digits and limit to 11 characters
                      const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setFormData({ ...formData, phone: value });
                    }}
                    placeholder="01XXXXXXXXX (11 digits)"
                    required
                    pattern="^01\d{9}$"
                    title="Phone number must start with 01 and be exactly 11 digits"
                    data-testid="input-employee-phone"
                  />
                  {formData.phone && !/^01\d{9}$/.test(formData.phone) && formData.phone.length > 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      Phone must start with 01 and be exactly 11 digits
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="employee@example.com"
                    required
                    data-testid="input-employee-email"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Login credentials will be sent to this email address
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Role *</label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: 'employee' | 'customer') => setFormData({ ...formData, role: value })}
                    data-testid="select-employee-role"
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium mb-4">Permissions</label>
              <PermissionMatrix
                permissions={formData.permissions}
                onChange={(newPermissions) => setFormData({ ...formData, permissions: newPermissions })}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={createUserMutation.isPending || updateUserMutation.isPending}
                data-testid="button-save-employee"
              >
                <Save className="h-4 w-4 mr-2" />
                {editingEmployee ? 'Update Permissions' : 'Create Employee'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                data-testid="button-cancel-employee"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </form>
        ) : loadingUsers ? (
          <div className="text-center py-8" data-testid="loading-employees">Loading employees...</div>
        ) : allUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No employees yet. Create your first employee!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Permissions Summary</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allUsers.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name || 'N/A'}</TableCell>
                    <TableCell>{employee.phone}</TableCell>
                    <TableCell className="capitalize">{employee.role}</TableCell>
                    <TableCell className="max-w-[300px] truncate" title={getPermissionsSummary(employee.permissions)}>
                      {getPermissionsSummary(employee.permissions)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditEmployee(employee)}
                          data-testid={`button-edit-employee-${employee.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {showDeleteConfirm === employee.id ? (
                          <div className="flex gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                deleteUserMutation.mutate(employee.id);
                                setShowDeleteConfirm(null);
                              }}
                            >
                              Confirm
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowDeleteConfirm(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setShowDeleteConfirm(employee.id)}
                            data-testid={`button-delete-employee-${employee.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Driver Management Section Component
interface DriverManagementSectionProps {
  allDrivers: Driver[];
  loadingDrivers: boolean;
  showDriverCreator: boolean;
  setShowDriverCreator: (show: boolean) => void;
  editingDriver: string | null;
  setEditingDriver: (id: string | null) => void;
  createDriverMutation: any;
  updateDriverMutation: any;
  deleteDriverMutation: any;
}

function DriverManagementSection({
  allDrivers,
  loadingDrivers,
  showDriverCreator,
  setShowDriverCreator,
  editingDriver,
  setEditingDriver,
  createDriverMutation,
  updateDriverMutation,
  deleteDriverMutation,
}: DriverManagementSectionProps) {
  const [formData, setFormData] = useState<InsertDriver>({
    name: '',
    phone: '',
    licensePlate: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    isActive: true,
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      licensePlate: '',
      vehicleMake: '',
      vehicleModel: '',
      vehicleYear: '',
      isActive: true,
    });
    setShowDriverCreator(false);
    setEditingDriver(null);
  };

  const handleEditDriver = (driver: Driver) => {
    setFormData({
      name: driver.name,
      phone: driver.phone,
      licensePlate: driver.licensePlate,
      vehicleMake: driver.vehicleMake,
      vehicleModel: driver.vehicleModel,
      vehicleYear: driver.vehicleYear,
      isActive: driver.isActive,
    });
    setEditingDriver(driver.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDriver) {
      updateDriverMutation.mutate({ id: editingDriver, ...formData }, {
        onSuccess: () => resetForm()
      });
    } else {
      createDriverMutation.mutate(formData, {
        onSuccess: () => resetForm()
      });
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2" data-testid="heading-driver-management">
            <Truck className="h-5 w-5" />
            Driver Management
          </CardTitle>
          {!showDriverCreator && !editingDriver && (
            <Button
              onClick={() => setShowDriverCreator(true)}
              className="flex items-center gap-2 bg-[#4c9096] hover:bg-[#4c9096]/90 text-white"
              data-testid="button-create-driver"
            >
              <Plus className="h-4 w-4" />
              Create Driver
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {showDriverCreator || editingDriver ? (
          <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
            <h3 className="font-semibold text-lg mb-4">
              {editingDriver ? 'Edit Driver' : 'Create New Driver'}
            </h3>
            
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Driver name"
                required
                data-testid="input-driver-name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone *</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone number"
                required
                data-testid="input-driver-phone"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">License Plate *</label>
              <Input
                value={formData.licensePlate}
                onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                placeholder="License plate number"
                required
                data-testid="input-driver-license-plate"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Vehicle Make *</label>
              <Input
                value={formData.vehicleMake}
                onChange={(e) => setFormData({ ...formData, vehicleMake: e.target.value })}
                placeholder="e.g., Toyota"
                required
                data-testid="input-driver-make"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Vehicle Model *</label>
              <Input
                value={formData.vehicleModel}
                onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                placeholder="e.g., Corolla"
                required
                data-testid="input-driver-model"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Vehicle Year *</label>
              <Input
                value={formData.vehicleYear}
                onChange={(e) => setFormData({ ...formData, vehicleYear: e.target.value })}
                placeholder="e.g., 2020"
                required
                data-testid="input-driver-year"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-driver-active"
              />
              <label className="text-sm font-medium">Active</label>
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={createDriverMutation.isPending || updateDriverMutation.isPending}
                data-testid="button-save-driver"
              >
                <Save className="h-4 w-4 mr-2" />
                {editingDriver ? 'Update Driver' : 'Create Driver'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                data-testid="button-cancel-driver"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </form>
        ) : loadingDrivers ? (
          <div className="text-center py-8" data-testid="loading-drivers">Loading drivers...</div>
        ) : allDrivers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No drivers yet. Create your first driver!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>License Plate</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allDrivers.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell>{driver.phone}</TableCell>
                    <TableCell>{driver.licensePlate}</TableCell>
                    <TableCell>{driver.vehicleMake} {driver.vehicleModel} ({driver.vehicleYear})</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${driver.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {driver.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditDriver(driver)}
                          data-testid={`button-edit-driver-${driver.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {showDeleteConfirm === driver.id ? (
                          <div className="flex gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                deleteDriverMutation.mutate(driver.id);
                                setShowDeleteConfirm(null);
                              }}
                            >
                              Confirm
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowDeleteConfirm(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setShowDeleteConfirm(driver.id)}
                            data-testid={`button-delete-driver-${driver.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}