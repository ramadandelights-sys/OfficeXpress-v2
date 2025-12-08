import { useAuth } from "@/hooks/useAuth";
import AdminComplaintManagement from "@/components/admin-complaint-management";

export default function AdminComplaintsPage() {
  const { hasPermission } = useAuth();
  
  return <AdminComplaintManagement hasPermission={hasPermission} />;
}
