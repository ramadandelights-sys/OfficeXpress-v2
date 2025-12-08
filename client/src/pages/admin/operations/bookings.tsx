import { useAuth } from "@/hooks/useAuth";
import CarpoolBookingManagement from "@/components/carpool-booking-management";

export default function AdminCarpoolBookingsPage() {
  const { hasPermission } = useAuth();
  
  return <CarpoolBookingManagement showDriverAssignment={hasPermission('driverAssignment')} />;
}
