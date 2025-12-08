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
import { UserPlus, Search, Calendar, Download } from "lucide-react";
import type { VendorRegistration } from "@shared/schema";

export default function AdminVendorPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const { data: registrations = [], isLoading } = useQuery<VendorRegistration[]>({
    queryKey: ["/api/admin/vendor-registrations"],
    enabled: hasPermission('vendorRegistrations', 'view'),
  });

  const filteredRegistrations = registrations.filter((reg) => {
    const matchesSearch = searchQuery === "" || 
      reg.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.referenceId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.location?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const regDate = new Date(reg.createdAt);
    const matchesDateFrom = !dateFrom || regDate >= dateFrom;
    const matchesDateTo = !dateTo || regDate <= dateTo;
    
    return matchesSearch && matchesDateFrom && matchesDateTo;
  });

  const exportToCSV = () => {
    if (filteredRegistrations.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const headers = ["Reference ID", "Name", "Email", "Phone", "Location", "Experience", "Vehicle Types", "Created At"];
    const csvContent = [
      headers.join(','),
      ...filteredRegistrations.map(r => [
        r.referenceId || "",
        `"${r.fullName || ""}"`,
        r.email || "",
        r.phone || "",
        `"${r.location || ""}"`,
        r.experience || "",
        `"${r.vehicleTypes?.join(', ') || ""}"`,
        new Date(r.createdAt).toLocaleString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vendor_registrations_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: "Vendor registrations exported successfully" });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">Loading vendor registrations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="flex items-center gap-2" data-testid="heading-vendor">
                <UserPlus className="h-5 w-5" />
                Vendor Registrations ({filteredRegistrations.length})
              </CardTitle>
              {hasPermission('vendorRegistrations', 'downloadCsv') && (
                <Button 
                  onClick={exportToCSV}
                  variant="outline"
                  className="flex items-center gap-2 w-full sm:w-auto"
                  data-testid="button-export-vendor"
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
                  placeholder="Search by name, email, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-vendor"
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
          {filteredRegistrations.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No vendor registrations found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead className="hidden lg:table-cell">Location</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegistrations.map((reg) => (
                    <TableRow key={reg.id}>
                      <TableCell className="font-mono text-sm" data-testid={`text-ref-${reg.id}`}>
                        {reg.referenceId}
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-name-${reg.id}`}>
                        {reg.fullName}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {reg.email}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {reg.phone}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {reg.location}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(reg.createdAt).toLocaleDateString()}
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
