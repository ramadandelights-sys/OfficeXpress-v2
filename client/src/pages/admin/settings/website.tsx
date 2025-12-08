import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { WebsiteSettingsForm, WebsiteSettingsDisplay } from "@/components/website-settings";
import { Palette, Plus, Settings } from "lucide-react";
import type { WebsiteSettings, InsertWebsiteSettings, UpdateWebsiteSettings } from "@shared/schema";

export default function AdminWebsitePage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const { data: websiteSettings, isLoading } = useQuery<WebsiteSettings | null>({
    queryKey: ["/api/admin/website-settings"],
    enabled: hasPermission('websiteSettings', 'view'),
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertWebsiteSettings) => {
      return await apiRequest("POST", "/api/admin/website-settings", data);
    },
    onSuccess: () => {
      toast({ title: "Website settings created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/website-settings"] });
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: "Failed to create website settings", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWebsiteSettings }) => {
      return await apiRequest("PUT", `/api/admin/website-settings/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Website settings updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/website-settings"] });
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: "Failed to update website settings", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">Loading website settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2" data-testid="heading-website-settings">
              <Palette className="h-5 w-5" />
              Website Settings
            </CardTitle>
            {!websiteSettings && !isEditing && hasPermission('websiteSettings', 'edit') && (
              <Button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-[#4c9096] hover:bg-[#4c9096]/90 text-white w-full sm:w-auto"
                data-testid="button-create-website"
              >
                <Plus className="h-4 w-4" />
                Setup Website Customization
              </Button>
            )}
            {websiteSettings && !isEditing && hasPermission('websiteSettings', 'edit') && (
              <Button 
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="flex items-center gap-2 w-full sm:w-auto"
                data-testid="button-edit-website"
              >
                <Settings className="h-4 w-4" />
                Edit Settings
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <WebsiteSettingsForm
              settings={websiteSettings}
              onSave={(data) => {
                if (websiteSettings) {
                  updateMutation.mutate({ id: websiteSettings.id, data });
                } else {
                  createMutation.mutate(data);
                }
              }}
              onCancel={() => setIsEditing(false)}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          ) : websiteSettings ? (
            <WebsiteSettingsDisplay settings={websiteSettings} />
          ) : (
            <div className="text-center py-8">
              <Palette className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Website Settings Configured
              </h3>
              <p className="text-gray-500">
                Customize your website's appearance with colors, fonts, logo, and branding elements.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
