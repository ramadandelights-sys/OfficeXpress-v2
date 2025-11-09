import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import type { UserPermissions } from "@/components/permission-matrix";

export interface AuthUser {
  id: string;
  phone: string;
  email: string | null;
  name: string;
  role: 'customer' | 'employee' | 'superadmin';
  permissions?: UserPermissions;
  temporaryPassword?: boolean;
  officeLocation?: string | null;
  homeLocation?: string | null;
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
    retry: false,
    meta: {
      skipAuth: true // Don't show error toast on 401
    }
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isSuperAdmin: user?.role === 'superadmin',
    isEmployee: user?.role === 'employee',
    isCustomer: user?.role === 'customer',
    hasPermission: (permission: keyof UserPermissions, action?: 'view' | 'edit' | 'downloadCsv') => {
      if (!user) return false;
      if (user.role === 'superadmin') return true;
      if (!user.permissions) return false;
      
      const perm = user.permissions[permission];
      if (!perm) return false;
      
      // Handle boolean permissions (e.g., driverAssignment)
      if (typeof perm === 'boolean') return perm;
      
      // Handle granular permissions - perm is now typed as PermissionLevel
      if (action && typeof perm === 'object') {
        return perm[action] || false;
      }
      
      // Default: check if user has any permission (view, edit, or downloadCsv)
      if (typeof perm === 'object') {
        return !!perm.view || !!perm.edit || !!perm.downloadCsv;
      }
      
      return false;
    },
    needsPasswordChange: user?.temporaryPassword || false
  };
}

export function useLogin() {
  return useMutation({
    mutationFn: async ({ phone, password }: { phone: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", { phone, password });
      return await response.json() as AuthUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    }
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.clear();
    }
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      await apiRequest("POST", "/api/auth/change-password", { currentPassword, newPassword });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    }
  });
}
