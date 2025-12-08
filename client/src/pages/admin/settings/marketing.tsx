import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MarketingSettingsForm, MarketingSettingsDisplay } from "@/components/marketing-settings";
import { Target, Plus, Settings } from "lucide-react";
import type { MarketingSettings, InsertMarketingSettings, UpdateMarketingSettings } from "@shared/schema";

export default function AdminMarketingPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const { data: marketingSettings, isLoading } = useQuery<MarketingSettings | null>({
    queryKey: ["/api/admin/marketing-settings"],
    enabled: hasPermission('marketingSettings', 'view'),
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertMarketingSettings) => {
      return await apiRequest("POST", "/api/admin/marketing-settings", data);
    },
    onSuccess: () => {
      toast({ title: "Marketing settings created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing-settings"] });
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: "Failed to create marketing settings", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateMarketingSettings }) => {
      return await apiRequest("PUT", `/api/admin/marketing-settings/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Marketing settings updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing-settings"] });
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: "Failed to update marketing settings", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">Loading marketing settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2" data-testid="heading-marketing-settings">
              <Target className="h-5 w-5" />
              Marketing Settings
            </CardTitle>
            {!marketingSettings && !isEditing && hasPermission('marketingSettings', 'edit') && (
              <Button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-[#4c9096] hover:bg-[#4c9096]/90 text-white w-full sm:w-auto"
                data-testid="button-create-marketing"
              >
                <Plus className="h-4 w-4" />
                Setup Marketing Settings
              </Button>
            )}
            {marketingSettings && !isEditing && hasPermission('marketingSettings', 'edit') && (
              <Button 
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="flex items-center gap-2 w-full sm:w-auto"
                data-testid="button-edit-marketing"
              >
                <Settings className="h-4 w-4" />
                Edit Settings
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <MarketingSettingsForm
              settings={marketingSettings}
              onSave={(data) => {
                if (marketingSettings) {
                  updateMutation.mutate({ id: marketingSettings.id, data });
                } else {
                  createMutation.mutate(data);
                }
              }}
              onCancel={() => setIsEditing(false)}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          ) : marketingSettings ? (
            <MarketingSettingsDisplay settings={marketingSettings} />
          ) : (
            <div className="text-center py-8">
              <Target className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Marketing Settings Configured
              </h3>
              <p className="text-gray-500">
                Set up your Facebook Pixel, Google Analytics, and other marketing tools to track your website performance.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
