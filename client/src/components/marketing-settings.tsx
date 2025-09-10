import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Globe, Target, Settings, Upload, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import type { 
  MarketingSettings,
  InsertMarketingSettings,
  UpdateMarketingSettings
} from "@shared/schema";
import { insertMarketingSettingsSchema, updateMarketingSettingsSchema } from "@shared/schema";

interface MarketingSettingsFormProps {
  settings: MarketingSettings | null;
  onSave: (data: InsertMarketingSettings | UpdateMarketingSettings) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function MarketingSettingsForm({ settings, onSave, onCancel, isLoading }: MarketingSettingsFormProps) {
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
          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
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

  const form = useForm<InsertMarketingSettings>({
    resolver: zodResolver(settings ? updateMarketingSettingsSchema.omit({ id: true }) : insertMarketingSettingsSchema),
    defaultValues: {
      facebookPixelId: settings?.facebookPixelId || "",
      facebookAccessToken: settings?.facebookAccessToken || "",
      facebookAppId: settings?.facebookAppId || "",
      facebookPageId: settings?.facebookPageId || "",
      facebookEnabled: settings?.facebookEnabled || false,
      googleAnalyticsId: settings?.googleAnalyticsId || "",
      googleTagManagerId: settings?.googleTagManagerId || "",
      googleAdsConversionId: settings?.googleAdsConversionId || "",
      googleSearchConsoleId: settings?.googleSearchConsoleId || "",
      googleEnabled: settings?.googleEnabled || false,
      utmSource: settings?.utmSource || "officexpress",
      utmMedium: settings?.utmMedium || "website",
      utmCampaign: settings?.utmCampaign || "default",
      cookieConsentEnabled: settings?.cookieConsentEnabled || true,
      gdprCompliance: settings?.gdprCompliance || true,
      trackingEnabled: settings?.trackingEnabled || true,
      logoPath: settings?.logoPath || "",
      conversionGoals: settings?.conversionGoals || []
    }
  });

  const onSubmit = (data: InsertMarketingSettings) => {
    onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="marketing-settings-form">
        <Tabs defaultValue="facebook" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="facebook" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Facebook
            </TabsTrigger>
            <TabsTrigger value="google" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Google
            </TabsTrigger>
            <TabsTrigger value="utm" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              UTM Defaults
            </TabsTrigger>
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
          </TabsList>

          <TabsContent value="facebook" className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="facebookEnabled"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-facebook-enabled"
                      />
                      <FormLabel>Enable Facebook Tracking</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="facebookPixelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facebook Pixel ID</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="123456789012345"
                        data-testid="input-facebook-pixel-id"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="facebookAccessToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facebook Access Token</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="password"
                        placeholder="EAAxxxxxxxxxxxxxxx"
                        data-testid="input-facebook-access-token"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="facebookAppId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facebook App ID</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="123456789012345"
                        data-testid="input-facebook-app-id"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="facebookPageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facebook Page ID</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="123456789012345"
                        data-testid="input-facebook-page-id"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          <TabsContent value="google" className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="googleEnabled"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-google-enabled"
                      />
                      <FormLabel>Enable Google Tracking</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="googleAnalyticsId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Google Analytics 4 ID</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="G-XXXXXXXXXX"
                        data-testid="input-google-analytics-id"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="googleTagManagerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Google Tag Manager ID</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="GTM-XXXXXXX"
                        data-testid="input-google-tag-manager-id"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="googleAdsConversionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Google Ads Conversion ID</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="AW-123456789"
                        data-testid="input-google-ads-conversion-id"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="googleSearchConsoleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Google Search Console ID</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="sc-domain:example.com"
                        data-testid="input-google-search-console-id"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          <TabsContent value="utm" className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="utmSource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UTM Source</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="officexpress"
                        data-testid="input-utm-source"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="utmMedium"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UTM Medium</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="website"
                        data-testid="input-utm-medium"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="utmCampaign"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UTM Campaign</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="default"
                        data-testid="input-utm-campaign"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          <TabsContent value="general" className="mt-6 space-y-4">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="trackingEnabled"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-tracking-enabled"
                      />
                      <FormLabel>Enable All Tracking</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cookieConsentEnabled"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-cookie-consent-enabled"
                      />
                      <FormLabel>Enable Cookie Consent Banner</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gdprCompliance"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-gdpr-compliance"
                      />
                      <FormLabel>GDPR Compliance Mode</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {/* Logo Upload Section */}
              <div className="border-t pt-4">
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
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="button-cancel-marketing"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-[#4c9096] hover:bg-[#4c9096]/90 text-white"
            data-testid="button-save-marketing"
          >
            {isLoading ? "Saving..." : settings ? "Update Settings" : "Save Settings"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

interface MarketingSettingsDisplayProps {
  settings: MarketingSettings;
}

export function MarketingSettingsDisplay({ settings }: MarketingSettingsDisplayProps) {
  return (
    <div className="space-y-6" data-testid="marketing-settings-display">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Facebook Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5" />
              Facebook Tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                settings.facebookEnabled 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
              }`}>
                {settings.facebookEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            {settings.facebookPixelId && (
              <div>
                <span className="text-sm font-medium">Pixel ID:</span>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                  {settings.facebookPixelId}
                </p>
              </div>
            )}
            {settings.facebookAppId && (
              <div>
                <span className="text-sm font-medium">App ID:</span>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                  {settings.facebookAppId}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Google Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5" />
              Google Tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                settings.googleEnabled 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
              }`}>
                {settings.googleEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            {settings.googleAnalyticsId && (
              <div>
                <span className="text-sm font-medium">Analytics ID:</span>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                  {settings.googleAnalyticsId}
                </p>
              </div>
            )}
            {settings.googleTagManagerId && (
              <div>
                <span className="text-sm font-medium">Tag Manager ID:</span>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                  {settings.googleTagManagerId}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5" />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tracking</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                settings.trackingEnabled 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
              }`}>
                {settings.trackingEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cookie Consent</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                settings.cookieConsentEnabled 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
              }`}>
                {settings.cookieConsentEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">GDPR Compliance</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                settings.gdprCompliance 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
              }`}>
                {settings.gdprCompliance ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* UTM Defaults */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            UTM Campaign Defaults
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-sm font-medium">Source:</span>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                {settings.utmSource}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium">Medium:</span>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                {settings.utmMedium}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium">Campaign:</span>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                {settings.utmCampaign}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}