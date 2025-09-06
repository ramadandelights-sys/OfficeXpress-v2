import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Globe, Target, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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