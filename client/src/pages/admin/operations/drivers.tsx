import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Car, Edit, Trash2, Plus, Phone, User } from "lucide-react";
import type { Driver, InsertDriver, UpdateDriver } from "@shared/schema";
import { insertDriverSchema, updateDriverSchema } from "@shared/schema";

export default function AdminDriversPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [showCreator, setShowCreator] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  const { data: drivers = [], isLoading } = useQuery<Driver[]>({
    queryKey: ["/api/drivers"],
    enabled: hasPermission('driverManagement', 'view'),
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertDriver) => {
      return await apiRequest("POST", "/api/drivers", data);
    },
    onSuccess: () => {
      toast({ title: "Driver created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers/active"] });
      setShowCreator(false);
    },
    onError: () => {
      toast({ title: "Failed to create driver", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateDriver) => {
      return await apiRequest("PUT", `/api/drivers/${data.id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Driver updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drivers/active"] });
      setEditingDriver(null);
    },
    onError: () => {
      toast({ title: "Failed to update driver", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">Loading drivers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2" data-testid="heading-drivers">
              <Car className="h-5 w-5" />
              Driver Management ({drivers.length})
            </CardTitle>
            {hasPermission('driverManagement', 'edit') && (
              <Button 
                onClick={() => setShowCreator(true)}
                className="flex items-center gap-2 bg-[#4c9096] hover:bg-[#4c9096]/90 text-white w-full sm:w-auto"
                data-testid="button-create-driver"
              >
                <Plus className="h-4 w-4" />
                Add Driver
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {drivers.length === 0 ? (
            <div className="text-center py-8">
              <Car className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Drivers Yet
              </h3>
              <p className="text-gray-500">
                Add drivers to assign them to bookings.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Phone</TableHead>
                    <TableHead className="hidden lg:table-cell">Vehicle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium" data-testid={`text-driver-name-${driver.id}`}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          {driver.name}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          {driver.phone}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {driver.vehicleMake} {driver.vehicleModel} - {driver.licensePlate}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${driver.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                          {driver.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {hasPermission('driverManagement', 'edit') && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingDriver(driver)}
                              data-testid={`button-edit-driver-${driver.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteMutation.mutate(driver.id)}
                              className="text-red-600 hover:text-red-700"
                              data-testid={`button-delete-driver-${driver.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreator} onOpenChange={setShowCreator}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Driver</DialogTitle>
          </DialogHeader>
          <DriverForm
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
            onCancel={() => setShowCreator(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingDriver} onOpenChange={() => setEditingDriver(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Driver</DialogTitle>
          </DialogHeader>
          {editingDriver && (
            <DriverForm
              initialData={editingDriver}
              onSubmit={(data) => updateMutation.mutate({ ...data, id: editingDriver.id })}
              isLoading={updateMutation.isPending}
              onCancel={() => setEditingDriver(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface DriverFormProps {
  initialData?: Driver;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  onCancel: () => void;
}

function DriverForm({ initialData, onSubmit, isLoading, onCancel }: DriverFormProps) {
  const form = useForm({
    resolver: zodResolver(initialData ? updateDriverSchema : insertDriverSchema),
    defaultValues: {
      name: initialData?.name || "",
      phone: initialData?.phone || "",
      licensePlate: initialData?.licensePlate || "",
      vehicleMake: initialData?.vehicleMake || "",
      vehicleModel: initialData?.vehicleModel || "",
      vehicleYear: initialData?.vehicleYear || "",
      vehicleCapacity: initialData?.vehicleCapacity || "4",
      isActive: initialData?.isActive ?? true,
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
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-driver-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-driver-phone" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="vehicleMake"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle Make</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., Toyota" data-testid="input-driver-vehicle-make" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vehicleModel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle Model</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., Corolla" data-testid="input-driver-vehicle-model" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="vehicleYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle Year</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., 2022" data-testid="input-driver-vehicle-year" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vehicleCapacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacity</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., 4" data-testid="input-driver-capacity" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="licensePlate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>License Plate</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-driver-license" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Active</FormLabel>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Driver is available for assignments
                </div>
              </div>
              <FormControl>
                <Switch 
                  checked={field.value} 
                  onCheckedChange={field.onChange}
                  data-testid="switch-driver-active" 
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={isLoading} className="flex-1" data-testid="button-save-driver">
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
