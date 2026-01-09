import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PermissionMatrix, type UserPermissions } from "@/components/permission-matrix";
import { UserCog, Edit, Trash2, Plus, Shield, Ban, UserCheck, Users } from "lucide-react";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import type { User } from "@shared/schema";

export default function AdminEmployeesPage() {
  const { user: currentUser, isSuperAdmin, hasPermission } = useAuth();
  const { toast } = useToast();
  const [showCreator, setShowCreator] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [selectedUserForBan, setSelectedUserForBan] = useState<User | null>(null);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showUnbanDialog, setShowUnbanDialog] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [activeTab, setActiveTab] = useState("employees");

  const { data: allUsers = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isSuperAdmin || hasPermission('userBanManagement'),
  });

  const employees = allUsers.filter((u) => u.role === "employee");
  const customers = allUsers.filter((u) => u.role === "customer");

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/users", data);
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.emailSent) {
        toast({ 
          title: "Employee created successfully",
          description: `Login credentials have been sent to ${data.user?.email}.`
        });
      } else {
        toast({ title: "Employee created successfully" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowCreator(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to create employee", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PUT", `/api/users/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Employee updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingEmployee(null);
    },
    onError: () => {
      toast({ title: "Failed to update employee", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
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

  const banMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      return await apiRequest("POST", `/api/admin/users/${userId}/ban`, { reason });
    },
    onSuccess: () => {
      toast({ title: "User banned successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowBanDialog(false);
      setSelectedUserForBan(null);
      setBanReason("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to ban user", 
        description: error.message || 'An error occurred',
        variant: "destructive" 
      });
    },
  });

  const unbanMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("POST", `/api/admin/users/${userId}/unban`);
    },
    onSuccess: () => {
      toast({ title: "User unbanned successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowUnbanDialog(false);
      setSelectedUserForBan(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to unban user", 
        description: error.message || 'An error occurred',
        variant: "destructive" 
      });
    },
  });

  // Check if user can manage bans
  const canManageBans = isSuperAdmin || hasPermission('userBanManagement');

  if (!isSuperAdmin && !hasPermission('userBanManagement')) {
    return (
      <div className="text-center py-8">
        <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Access Denied
        </h3>
        <p className="text-gray-500">
          Only super administrators can manage employees.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">Loading employees...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Employees ({employees.length})
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Customers ({customers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="flex items-center gap-2" data-testid="heading-employees">
                  <UserCog className="h-5 w-5" />
                  Employee Management
                </CardTitle>
                {isSuperAdmin && (
                  <Button 
                    onClick={() => setShowCreator(true)}
                    className="flex items-center gap-2 bg-[#4c9096] hover:bg-[#4c9096]/90 text-white w-full sm:w-auto"
                    data-testid="button-create-employee"
                  >
                    <Plus className="h-4 w-4" />
                    Add Employee
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <div className="text-center py-8">
                  <UserCog className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Employees Yet
                  </h3>
                  <p className="text-gray-500">
                    Add employees to give them access to the admin panel.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden md:table-cell">Email</TableHead>
                        <TableHead className="hidden lg:table-cell">Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((emp) => (
                        <TableRow key={emp.id}>
                          <TableCell className="font-medium" data-testid={`text-employee-name-${emp.id}`}>
                            {emp.name || "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {emp.email || "—"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {formatPhoneNumber(emp.phone || '')}
                          </TableCell>
                          <TableCell>
                            {emp.isBanned ? (
                              <Badge variant="destructive">Banned</Badge>
                            ) : (
                              <Badge variant="secondary">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {isSuperAdmin && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingEmployee(emp)}
                                    data-testid={`button-edit-employee-${emp.id}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => deleteMutation.mutate(emp.id)}
                                    className="text-red-600 hover:text-red-700"
                                    data-testid={`button-delete-employee-${emp.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {canManageBans && emp.id !== currentUser?.id && (
                                emp.isBanned ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-green-600 hover:text-green-700"
                                    onClick={() => {
                                      setSelectedUserForBan(emp);
                                      setShowUnbanDialog(true);
                                    }}
                                    data-testid={`button-unban-${emp.id}`}
                                  >
                                    <UserCheck className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => {
                                      setSelectedUserForBan(emp);
                                      setShowBanDialog(true);
                                    }}
                                    data-testid={`button-ban-${emp.id}`}
                                  >
                                    <Ban className="h-4 w-4" />
                                  </Button>
                                )
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
        </TabsContent>

        <TabsContent value="customers" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-testid="heading-customers">
                <Users className="h-5 w-5" />
                Customer Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Customers Yet
                  </h3>
                  <p className="text-gray-500">
                    Customers will appear here once they sign up.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden md:table-cell">Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.map((customer) => (
                        <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                          <TableCell className="font-medium">
                            {customer.name || "—"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {customer.email || "—"}
                          </TableCell>
                          <TableCell>
                            {formatPhoneNumber(customer.phone || '')}
                          </TableCell>
                          <TableCell>
                            {customer.isBanned ? (
                              <Badge variant="destructive">Banned</Badge>
                            ) : (
                              <Badge variant="secondary">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {canManageBans && (
                              customer.isBanned ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => {
                                    setSelectedUserForBan(customer);
                                    setShowUnbanDialog(true);
                                  }}
                                  data-testid={`button-unban-${customer.id}`}
                                >
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Unban
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => {
                                    setSelectedUserForBan(customer);
                                    setShowBanDialog(true);
                                  }}
                                  data-testid={`button-ban-${customer.id}`}
                                >
                                  <Ban className="mr-2 h-4 w-4" />
                                  Ban
                                </Button>
                              )
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
        </TabsContent>
      </Tabs>

      {/* Create Employee Dialog */}
      <Dialog open={showCreator} onOpenChange={setShowCreator}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
          </DialogHeader>
          <EmployeeForm
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
            onCancel={() => setShowCreator(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={!!editingEmployee} onOpenChange={() => setEditingEmployee(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          {editingEmployee && (
            <EmployeeForm
              initialData={editingEmployee}
              onSubmit={(data) => updateMutation.mutate({ id: editingEmployee.id, data })}
              isLoading={updateMutation.isPending}
              onCancel={() => setEditingEmployee(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Ban User Dialog */}
      <Dialog open={showBanDialog} onOpenChange={(open) => {
        if (!open) {
          setShowBanDialog(false);
          setBanReason("");
          setSelectedUserForBan(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              {selectedUserForBan && (
                <div className="mt-2">
                  <p>Are you sure you want to ban <strong>{selectedUserForBan.name || selectedUserForBan.phone}</strong>?</p>
                  <p className="text-sm text-muted-foreground mt-1">This will prevent them from logging in and using the service.</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label htmlFor="banReason" className="text-sm font-medium">Ban Reason *</label>
              <Textarea
                id="banReason"
                placeholder="Enter the reason for banning this user..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="min-h-[100px]"
                data-testid="textarea-ban-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBanDialog(false);
                setBanReason("");
                setSelectedUserForBan(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!banReason.trim() || banMutation.isPending}
              onClick={() => {
                if (selectedUserForBan && banReason.trim()) {
                  banMutation.mutate({
                    userId: selectedUserForBan.id,
                    reason: banReason.trim()
                  });
                }
              }}
              data-testid="button-confirm-ban"
            >
              {banMutation.isPending ? "Banning..." : "Ban User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unban User Dialog */}
      <Dialog open={showUnbanDialog} onOpenChange={(open) => {
        if (!open) {
          setShowUnbanDialog(false);
          setSelectedUserForBan(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unban User</DialogTitle>
            <DialogDescription>
              {selectedUserForBan && (
                <div className="mt-2">
                  <p>Are you sure you want to unban <strong>{selectedUserForBan.name || selectedUserForBan.phone}</strong>?</p>
                  <p className="text-sm text-muted-foreground mt-1">This will restore their access to the platform.</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowUnbanDialog(false);
                setSelectedUserForBan(null);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={unbanMutation.isPending}
              onClick={() => {
                if (selectedUserForBan) {
                  unbanMutation.mutate(selectedUserForBan.id);
                }
              }}
              data-testid="button-confirm-unban"
            >
              {unbanMutation.isPending ? "Unbanning..." : "Unban User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface EmployeeFormProps {
  initialData?: User;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  onCancel: () => void;
}

function EmployeeForm({ initialData, onSubmit, isLoading, onCancel }: EmployeeFormProps) {
  const [permissions, setPermissions] = useState<UserPermissions>(
    (initialData?.permissions as UserPermissions) || {}
  );

  const form = useForm({
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      password: "",
    },
  });

  const handleSubmit = (data: any) => {
    const submitData: any = {
      ...data,
      role: "employee",
      permissions,
    };
    
    if (!initialData && !data.password) {
      submitData.password = Math.random().toString(36).slice(-8);
      submitData.temporaryPassword = true;
    }
    
    if (initialData && !data.password) {
      delete submitData.password;
    }
    
    onSubmit(submitData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-employee-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" data-testid="input-employee-email" />
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
                  <Input {...field} data-testid="input-employee-phone" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{initialData ? "New Password (optional)" : "Password"}</FormLabel>
                <FormControl>
                  <Input {...field} type="password" data-testid="input-employee-password" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <h3 className="text-lg font-medium mb-4">Permissions</h3>
          <PermissionMatrix
            permissions={permissions}
            onChange={setPermissions}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={isLoading} className="flex-1" data-testid="button-save-employee">
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
