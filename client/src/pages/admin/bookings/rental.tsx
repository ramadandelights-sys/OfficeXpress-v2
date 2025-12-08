import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Car, Search, Calendar, Download } from "lucide-react";
import type { RentalBooking } from "@shared/schema";

export default function AdminRentalPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const { data: bookings = [], isLoading } = useQuery<RentalBooking[]>({
    queryKey: ["/api/admin/rental-bookings"],
    enabled: hasPermission('rentalBookings', 'view'),
  });

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch = searchQuery === "" || 
      booking.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.referenceId?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const bookingDate = new Date(booking.createdAt);
    const matchesDateFrom = !dateFrom || bookingDate >= dateFrom;
    const matchesDateTo = !dateTo || bookingDate <= dateTo;
    
    return matchesSearch && matchesDateFrom && matchesDateTo;
  });

  const exportToCSV = () => {
    if (filteredBookings.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const headers = ["Reference ID", "Customer", "Email", "Phone", "Service Type", "Duration", "Pickup Date", "Created At"];
    const csvContent = [
      headers.join(','),
      ...filteredBookings.map(b => [
        b.referenceId || "",
        `"${b.customerName || ""}"`,
        b.email || "",
        b.phone || "",
        b.serviceType || "",
        b.duration || "",
        b.pickupDate || "",
        new Date(b.createdAt).toLocaleString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rental_bookings_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: "Rental bookings exported successfully" });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">Loading rental bookings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="flex items-center gap-2" data-testid="heading-rental">
                <Car className="h-5 w-5" />
                Rental Bookings ({filteredBookings.length})
              </CardTitle>
              {hasPermission('rentalBookings', 'downloadCsv') && (
                <Button 
                  onClick={exportToCSV}
                  variant="outline"
                  className="flex items-center gap-2 w-full sm:w-auto"
                  data-testid="button-export-rental"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by customer, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-rental"
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Calendar className="h-4 w-4 mr-2" />
                    {dateFrom ? format(dateFrom, "PP") : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Calendar className="h-4 w-4 mr-2" />
                    {dateTo ? format(dateTo, "PP") : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <div className="text-center py-8">
              <Car className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No rental bookings found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead className="hidden lg:table-cell">Service</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-mono text-sm" data-testid={`text-ref-${booking.id}`}>
                        {booking.referenceId}
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-customer-${booking.id}`}>
                        {booking.customerName}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {booking.email}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {booking.phone}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {booking.serviceType}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(booking.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
