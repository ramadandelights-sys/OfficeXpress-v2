import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import LegalPageCreator from "@/components/legal-page-creator";
import { Scale, Edit, Trash2, Plus } from "lucide-react";
import type { LegalPage, InsertLegalPage, UpdateLegalPage } from "@shared/schema";

export default function AdminLegalPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [showCreator, setShowCreator] = useState(false);
  const [editingPage, setEditingPage] = useState<LegalPage | null>(null);

  const { data: legalPages = [], isLoading } = useQuery<LegalPage[]>({
    queryKey: ["/api/admin/legal-pages"],
    enabled: hasPermission('legalPages', 'view'),
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertLegalPage) => {
      return await apiRequest("POST", "/api/admin/legal-pages", data);
    },
    onSuccess: () => {
      toast({ title: "Legal page created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/legal-pages"] });
      setShowCreator(false);
    },
    onError: () => {
      toast({ title: "Failed to create legal page", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateLegalPage }) => {
      return await apiRequest("PUT", `/api/admin/legal-pages/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Legal page updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/legal-pages"] });
      setEditingPage(null);
    },
    onError: () => {
      toast({ title: "Failed to update legal page", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">Loading legal pages...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2" data-testid="heading-legal-pages">
              <Scale className="h-5 w-5" />
              Legal Pages
            </CardTitle>
            {hasPermission('legalPages', 'edit') && (
              <Button 
                onClick={() => setShowCreator(true)}
                className="flex items-center gap-2 bg-[#4c9096] hover:bg-[#4c9096]/90 text-white w-full sm:w-auto"
                data-testid="button-create-legal"
              >
                <Plus className="h-4 w-4" />
                Create Legal Page
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {legalPages.length === 0 ? (
            <div className="text-center py-8">
              <Scale className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Legal Pages Found
              </h3>
              <p className="text-gray-500 mb-4">
                Create Terms & Conditions, Privacy Policy, and other legal pages for your website.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {legalPages.map((page) => (
                <div key={page.id} className="border rounded-lg p-4 bg-white dark:bg-gray-800">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
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
                    {hasPermission('legalPages', 'edit') && (
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingPage(page)}
                          className="flex-1 sm:flex-initial"
                          data-testid={`button-edit-legal-${page.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate(page.id)}
                          className="text-red-600 hover:text-red-700 flex-1 sm:flex-initial"
                          data-testid={`button-delete-legal-${page.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showCreator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <LegalPageCreator
              onSave={(data) => createMutation.mutate(data)}
              isLoading={createMutation.isPending}
              onCancel={() => setShowCreator(false)}
            />
          </div>
        </div>
      )}

      {editingPage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <LegalPageCreator
              initialData={editingPage}
              onSave={(data) => updateMutation.mutate({ id: editingPage.id, data })}
              isLoading={updateMutation.isPending}
              onCancel={() => setEditingPage(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
