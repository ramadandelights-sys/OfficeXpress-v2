import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Palette, Image as ImageIcon, Upload, X, Type, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { 
  WebsiteSettings,
  InsertWebsiteSettings,
  UpdateWebsiteSettings
} from "@shared/schema";
import { insertWebsiteSettingsSchema, updateWebsiteSettingsSchema } from "@shared/schema";

interface WebsiteSettingsFormProps {
  settings: WebsiteSettings | null;
  onSave: (data: InsertWebsiteSettings | UpdateWebsiteSettings) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function WebsiteSettingsForm({ settings, onSave, onCancel, isLoading }: WebsiteSettingsFormProps) {
  const [logoPreview, setLogoPreview] = useState<string>(settings?.logoPath || "");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>, onChange: (value: string) => void) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, GIF, etc.)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large", 
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setUploadingLogo(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        
        try {
          // Check admin authentication
          const isAdmin = sessionStorage.getItem('adminAuthenticated') === 'true';
          if (!isAdmin) {
            toast({
              title: "Authentication required",
              description: "Please log in as admin to upload logos",
              variant: "destructive"
            });
            return;
          }

          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Admin-Auth': 'true',
            },
            body: JSON.stringify({ image: base64Data }),
          });

          if (!response.ok) {
            throw new Error('Upload failed');
          }

          const data = await response.json();
          
          if (data.url) {
            setLogoPreview(data.url);
            onChange(data.url);
            
            // Invalidate website settings cache so the new logo appears immediately
            queryClient.invalidateQueries({ queryKey: ['/api/admin/website-settings'] });
            
            toast({
              title: "Logo uploaded successfully",
              description: "Your logo has been updated",
            });
          } else {
            throw new Error('No URL returned from upload');
          }
        } catch (error) {
          console.error('Upload error:', error);
          toast({
            title: "Upload failed",
            description: "Failed to upload logo. Please try again.",
            variant: "destructive"
          });
        } finally {
          setUploadingLogo(false);
        }
      };

      reader.onerror = () => {
        setUploadingLogo(false);
        toast({
          title: "Upload failed",
          description: "Failed to read image file.",
          variant: "destructive"
        });
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File processing error:', error);
      setUploadingLogo(false);
      toast({
        title: "Upload failed",
        description: "Failed to process image file.",
        variant: "destructive"
      });
    }

    // Reset file input
    if (event.target) {
      event.target.value = '';
    }
  };

  const form = useForm<InsertWebsiteSettings>({
    resolver: zodResolver(settings ? updateWebsiteSettingsSchema.omit({ id: true }) : insertWebsiteSettingsSchema),
    defaultValues: {
      // Logo Settings
      logoPath: settings?.logoPath ?? "",
      faviconPath: settings?.faviconPath ?? "",
      
      // Color Settings
      headerBackgroundColor: settings?.headerBackgroundColor ?? "#1e293b",
      headerTextColor: settings?.headerTextColor ?? "#ffffff",
      footerBackgroundColor: settings?.footerBackgroundColor ?? "#1e293b",
      footerTextColor: settings?.footerTextColor ?? "#ffffff",
      
      // Text Colors
      primaryTextColor: settings?.primaryTextColor ?? "#1f2937",
      secondaryTextColor: settings?.secondaryTextColor ?? "#6b7280",
      accentColor: settings?.accentColor ?? "#4c9096",
      linkColor: settings?.linkColor ?? "#3b82f6",
      linkHoverColor: settings?.linkHoverColor ?? "#2563eb",
      
      // Button Colors
      primaryButtonColor: settings?.primaryButtonColor ?? "#4c9096",
      primaryButtonTextColor: settings?.primaryButtonTextColor ?? "#ffffff",
      secondaryButtonColor: settings?.secondaryButtonColor ?? "#f3f4f6",
      secondaryButtonTextColor: settings?.secondaryButtonTextColor ?? "#1f2937",
      
      // Background Colors
      pageBackgroundColor: settings?.pageBackgroundColor ?? "#ffffff",
      sectionBackgroundColor: settings?.sectionBackgroundColor ?? "#f9fafb",
      cardBackgroundColor: settings?.cardBackgroundColor ?? "#ffffff",
      
      // Typography Settings
      fontFamily: settings?.fontFamily ?? "Inter, sans-serif",
      headingFontFamily: settings?.headingFontFamily ?? "Inter, sans-serif",
      
      // Site Information
      siteTitle: settings?.siteTitle ?? "OfficeXpress",
      siteTagline: settings?.siteTagline ?? "Professional Transportation Services",
      contactPhone: settings?.contactPhone ?? "",
      contactEmail: settings?.contactEmail ?? "",
      contactAddress: settings?.contactAddress ?? "",
      
      // Social Media Links
      facebookUrl: settings?.facebookUrl ?? "",
      twitterUrl: settings?.twitterUrl ?? "",
      linkedinUrl: settings?.linkedinUrl ?? "",
      instagramUrl: settings?.instagramUrl ?? "",
    }
  });

  const onSubmit = (data: InsertWebsiteSettings) => {
    onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="website-settings-form">
        <Tabs defaultValue="logo" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="logo" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Logo & Branding
            </TabsTrigger>
            <TabsTrigger value="colors" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Colors & Theme
            </TabsTrigger>
            <TabsTrigger value="typography" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Typography
            </TabsTrigger>
            <TabsTrigger value="site-info" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Site Information
            </TabsTrigger>
          </TabsList>

          <TabsContent value="logo" className="mt-6 space-y-4">
            <div className="space-y-6">
              {/* Website Logo Upload */}
              <FormField
                control={form.control}
                name="logoPath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Website Logo
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        {logoPreview && (
                          <div className="relative w-32 h-16 border border-border rounded-lg overflow-hidden bg-muted">
                            <img 
                              src={logoPreview} 
                              alt="Logo preview" 
                              className="w-full h-full object-contain"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0"
                              onClick={() => {
                                setLogoPreview("");
                                field.onChange("");
                              }}
                              data-testid="button-remove-logo"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingLogo}
                            className="flex items-center gap-2"
                            data-testid="button-upload-logo"
                          >
                            <Upload className="h-4 w-4" />
                            {uploadingLogo ? "Uploading..." : "Upload Logo"}
                          </Button>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(e, field.onChange)}
                          className="hidden"
                          data-testid="input-logo-file"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Site Title and Tagline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="siteTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="OfficeXpress" data-testid="input-site-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="siteTagline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site Tagline</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Professional Transportation Services" data-testid="input-site-tagline" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="colors" className="mt-6 space-y-4">
            <div className="space-y-6">
              {/* Header Colors */}
              <Card>
                <CardHeader>
                  <CardTitle>Header Colors</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="headerBackgroundColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Header Background</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input 
                              {...field} 
                              type="color"
                              className="w-16 h-10 p-1 rounded border"
                              data-testid="input-header-bg-color"
                            />
                            <Input 
                              {...field} 
                              placeholder="#1e293b"
                              className="flex-1"
                              data-testid="input-header-bg-color-text"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="headerTextColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Header Text</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input 
                              {...field} 
                              type="color"
                              className="w-16 h-10 p-1 rounded border"
                              data-testid="input-header-text-color"
                            />
                            <Input 
                              {...field} 
                              placeholder="#ffffff"
                              className="flex-1"
                              data-testid="input-header-text-color-text"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Footer Colors */}
              <Card>
                <CardHeader>
                  <CardTitle>Footer Colors</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="footerBackgroundColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Footer Background</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input 
                              {...field} 
                              type="color"
                              className="w-16 h-10 p-1 rounded border"
                              data-testid="input-footer-bg-color"
                            />
                            <Input 
                              {...field} 
                              placeholder="#1e293b"
                              className="flex-1"
                              data-testid="input-footer-bg-color-text"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="footerTextColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Footer Text</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input 
                              {...field} 
                              type="color"
                              className="w-16 h-10 p-1 rounded border"
                              data-testid="input-footer-text-color"
                            />
                            <Input 
                              {...field} 
                              placeholder="#ffffff"
                              className="flex-1"
                              data-testid="input-footer-text-color-text"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Text Colors */}
              <Card>
                <CardHeader>
                  <CardTitle>Text Colors</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="primaryTextColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Text</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input 
                              {...field} 
                              type="color"
                              className="w-16 h-10 p-1 rounded border"
                              data-testid="input-primary-text-color"
                            />
                            <Input 
                              {...field} 
                              placeholder="#1f2937"
                              className="flex-1"
                              data-testid="input-primary-text-color-text"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="secondaryTextColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secondary Text</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input 
                              {...field} 
                              type="color"
                              className="w-16 h-10 p-1 rounded border"
                              data-testid="input-secondary-text-color"
                            />
                            <Input 
                              {...field} 
                              placeholder="#6b7280"
                              className="flex-1"
                              data-testid="input-secondary-text-color-text"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accentColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Accent Color</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input 
                              {...field} 
                              type="color"
                              className="w-16 h-10 p-1 rounded border"
                              data-testid="input-accent-color"
                            />
                            <Input 
                              {...field} 
                              placeholder="#4c9096"
                              className="flex-1"
                              data-testid="input-accent-color-text"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="typography" className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fontFamily"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body Font Family</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Inter, sans-serif" data-testid="input-font-family" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="headingFontFamily"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heading Font Family</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Inter, sans-serif" data-testid="input-heading-font-family" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          <TabsContent value="site-info" className="mt-6 space-y-4">
            <div className="space-y-6">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Phone</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="+880 1234 567890" data-testid="input-contact-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Email</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="info@officexpress.com" data-testid="input-contact-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="contactAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Address</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Enter your business address" data-testid="input-contact-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Social Media Links */}
              <Card>
                <CardHeader>
                  <CardTitle>Social Media Links</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="facebookUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facebook URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://facebook.com/..." data-testid="input-facebook-url" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="twitterUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Twitter URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://twitter.com/..." data-testid="input-twitter-url" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="linkedinUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LinkedIn URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://linkedin.com/..." data-testid="input-linkedin-url" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="instagramUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://instagram.com/..." data-testid="input-instagram-url" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="button-cancel-website"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-[#4c9096] hover:bg-[#4c9096]/90 text-white"
            data-testid="button-save-website"
          >
            {isLoading ? "Saving..." : settings ? "Update Settings" : "Save Settings"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

interface WebsiteSettingsDisplayProps {
  settings: WebsiteSettings;
}

export function WebsiteSettingsDisplay({ settings }: WebsiteSettingsDisplayProps) {
  return (
    <div className="space-y-6" data-testid="website-settings-display">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Logo Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ImageIcon className="h-5 w-5" />
              Logo & Branding
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm font-medium">Site Title:</span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {settings.siteTitle || 'OfficeXpress'}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium">Tagline:</span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {settings.siteTagline || 'Professional Transportation Services'}
              </p>
            </div>
            {settings.logoPath && (
              <div>
                <span className="text-sm font-medium">Custom Logo:</span>
                <div className="mt-2 w-24 h-12 border border-border rounded overflow-hidden bg-muted">
                  <img 
                    src={settings.logoPath} 
                    alt="Current logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Color Theme */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Palette className="h-5 w-5" />
              Color Theme
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs font-medium">Header</span>
                <div className="flex gap-1">
                  <div 
                    className="w-6 h-6 rounded border border-gray-300"
                    style={{ backgroundColor: settings.headerBackgroundColor }}
                    title="Header Background"
                  />
                  <div 
                    className="w-6 h-6 rounded border border-gray-300"
                    style={{ backgroundColor: settings.headerTextColor }}
                    title="Header Text"
                  />
                </div>
              </div>
              <div>
                <span className="text-xs font-medium">Footer</span>
                <div className="flex gap-1">
                  <div 
                    className="w-6 h-6 rounded border border-gray-300"
                    style={{ backgroundColor: settings.footerBackgroundColor }}
                    title="Footer Background"
                  />
                  <div 
                    className="w-6 h-6 rounded border border-gray-300"
                    style={{ backgroundColor: settings.footerTextColor }}
                    title="Footer Text"
                  />
                </div>
              </div>
            </div>
            <div>
              <span className="text-xs font-medium">Accent Color</span>
              <div 
                className="w-full h-4 rounded border border-gray-300"
                style={{ backgroundColor: settings.accentColor }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {settings.contactPhone && (
              <div>
                <span className="text-sm font-medium">Phone:</span>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {settings.contactPhone}
                </p>
              </div>
            )}
            {settings.contactEmail && (
              <div>
                <span className="text-sm font-medium">Email:</span>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {settings.contactEmail}
                </p>
              </div>
            )}
            {settings.contactAddress && (
              <div>
                <span className="text-sm font-medium">Address:</span>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {settings.contactAddress}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}