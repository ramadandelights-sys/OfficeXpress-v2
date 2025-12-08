import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, Edit, Trash2, Plus, Star } from "lucide-react";
import type { PortfolioClient, InsertPortfolioClient, UpdatePortfolioClient } from "@shared/schema";
import { insertPortfolioClientSchema, updatePortfolioClientSchema } from "@shared/schema";

export default function AdminPortfolioPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [showCreator, setShowCreator] = useState(false);
  const [editingClient, setEditingClient] = useState<PortfolioClient | null>(null);

  const { data: portfolioClients = [], isLoading } = useQuery<PortfolioClient[]>({
    queryKey: ["/api/portfolio-clients"],
    enabled: hasPermission('portfolioClients', 'view'),
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertPortfolioClient) => {
      return await apiRequest("POST", "/api/admin/portfolio-clients", data);
    },
    onSuccess: () => {
      toast({ title: "Portfolio client created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio-clients"] });
      setShowCreator(false);
    },
    onError: () => {
      toast({ title: "Failed to create portfolio client", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePortfolioClient }) => {
      return await apiRequest("PUT", `/api/admin/portfolio-clients/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Portfolio client updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio-clients"] });
      setEditingClient(null);
    },
    onError: () => {
      toast({ title: "Failed to update portfolio client", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">Loading portfolio clients...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2" data-testid="heading-portfolio">
              <Users className="h-5 w-5" />
              Portfolio Clients
            </CardTitle>
            {hasPermission('portfolioClients', 'edit') && (
              <Button 
                onClick={() => setShowCreator(true)}
                className="flex items-center gap-2 bg-[#4c9096] hover:bg-[#4c9096]/90 text-white w-full sm:w-auto"
                data-testid="button-create-portfolio"
              >
                <Plus className="h-4 w-4" />
                Add Client
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {portfolioClients.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Portfolio Clients Yet
              </h3>
              <p className="text-gray-500">
                Add your first client to showcase on the portfolio page.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {portfolioClients.map((client) => (
                <div key={client.id} className="border rounded-lg p-4 bg-white dark:bg-gray-800">
                  <div className="flex items-start gap-3">
                    {client.logo && (
                      <img src={client.logo} alt={client.name} className="w-12 h-12 rounded object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate" data-testid={`text-client-name-${client.id}`}>
                        {client.name}
                      </h3>
                      {client.clientRepresentative && (
                        <p className="text-sm text-gray-500">{client.clientRepresentative}</p>
                      )}
                      {client.rating && (
                        <div className="flex items-center gap-1 mt-1">
                          {[...Array(client.rating)].map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {hasPermission('portfolioClients', 'edit') && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingClient(client)}
                        className="flex-1"
                        data-testid={`button-edit-client-${client.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(client.id)}
                        className="text-red-600 hover:text-red-700 flex-1"
                        data-testid={`button-delete-client-${client.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreator} onOpenChange={setShowCreator}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Portfolio Client</DialogTitle>
          </DialogHeader>
          <PortfolioForm
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
            onCancel={() => setShowCreator(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingClient} onOpenChange={() => setEditingClient(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Portfolio Client</DialogTitle>
          </DialogHeader>
          {editingClient && (
            <PortfolioForm
              initialData={editingClient}
              onSubmit={(data) => updateMutation.mutate({ id: editingClient.id, data: { ...data, id: editingClient.id } })}
              isLoading={updateMutation.isPending}
              onCancel={() => setEditingClient(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface PortfolioFormProps {
  initialData?: PortfolioClient;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  onCancel: () => void;
}

function PortfolioForm({ initialData, onSubmit, isLoading, onCancel }: PortfolioFormProps) {
  const form = useForm({
    resolver: zodResolver(initialData ? updatePortfolioClientSchema : insertPortfolioClientSchema),
    defaultValues: {
      name: initialData?.name || "",
      logo: initialData?.logo || "",
      testimonial: initialData?.testimonial || "",
      clientRepresentative: initialData?.clientRepresentative || "",
      position: initialData?.position || "",
      rating: initialData?.rating || 5,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client Name</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-client-name" />
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
                <Input {...field} data-testid="input-client-logo" />
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
              <FormLabel>Representative Name</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-client-rep" />
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
                <Input {...field} data-testid="input-client-position" />
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
                <Textarea {...field} rows={3} data-testid="input-client-testimonial" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={isLoading} className="flex-1" data-testid="button-save-client">
            {isLoading ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
