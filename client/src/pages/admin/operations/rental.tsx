import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Car, Search, Calendar, Download, UserPlus, Eye } from "lucide-react";
import type { RentalBooking, Driver, InsertDriver } from "@shared/schema";
import { insertDriverSchema } from "@shared/schema";

interface DriverAssignmentDialogProps {
  booking: RentalBooking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function DriverAssignmentDialog({ booking, open, onOpenChange, onSuccess }: DriverAssignmentDialogProps) {
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [searchedDriver, setSearchedDriver] = useState<Driver | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: driverSuggestions = [] } = useQuery<Driver[]>({
    queryKey: [`/api/drivers/suggestions?phone=${encodeURIComponent(phoneNumber)}`],
    enabled: phoneNumber.length >= 3 && !searchedDriver && !showCreateForm,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!open) {
      setPhoneNumber('');
      setSearchedDriver(null);
      setSearchError(null);
      setShowCreateForm(false);
      setShowSuggestions(false);
    }
  }, [open]);

  const driverForm = useForm<InsertDriver>({
    resolver: zodResolver(insertDriverSchema),
    defaultValues: {
      name: '',
      phone: phoneNumber,
      licensePlate: '',
      vehicleMake: '',
      vehicleModel: '',
      vehicleYear: '',
      vehicleCapacity: '4',
      isActive: true,
    },
  });

  useEffect(() => {
    if (phoneNumber && showCreateForm) {
      driverForm.setValue('phone', phoneNumber);
    }
  }, [phoneNumber, showCreateForm, driverForm]);

  const handleSearchDriver = async () => {
    if (!phoneNumber.trim()) {
      setSearchError('Please enter a phone number');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchedDriver(null);

    try {
      const response = await apiRequest('GET', `/api/drivers/search?phone=${encodeURIComponent(phoneNumber)}`);
      const driver = await response.json();
      setSearchedDriver(driver);
      setShowCreateForm(false);
    } catch (error: any) {
      if (error.status === 404) {
        setShowCreateForm(true);
        setSearchError('Driver not found. Please enter driver details below to create and assign.');
      } else {
        setSearchError('Failed to search for driver. Please try again.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const assignExistingDriverMutation = useMutation({
    mutationFn: async (driverId: string) => {
      if (!booking) throw new Error('No booking selected');
      return await apiRequest('PUT', `/api/rental-bookings/${booking.id}/assign-driver`, { driverId });
    },
    onSuccess: () => {
      toast({ title: 'Driver assigned successfully!' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/rental-bookings'] });
      onSuccess();
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Failed to assign driver', variant: 'destructive' });
    },
  });

  const createAndAssignDriverMutation = useMutation({
    mutationFn: async (driverData: InsertDriver) => {
      if (!booking) throw new Error('No booking selected');
      return await apiRequest('POST', `/api/rental-bookings/${booking.id}/create-and-assign-driver`, driverData);
    },
    onSuccess: () => {
      toast({ title: 'Driver created and assigned successfully!' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/rental-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/drivers/active'] });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: any) => {
      const message = error.message || 'Failed to create and assign driver';
      toast({ title: message, variant: 'destructive' });
    },
  });

  const onSubmitCreateDriver = (data: InsertDriver) => {
    createAndAssignDriverMutation.mutate(data);
  };

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Assign Driver to Booking</DialogTitle>
          <DialogDescription>
            Booking Ref: <span className="font-semibold">{booking.referenceId}</span> - {booking.customerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          <div className="space-y-2">
            <label className="text-sm font-medium">Driver Phone Number</label>
            <Popover open={showSuggestions && driverSuggestions.length > 0 && phoneNumber.length >= 3 && !searchedDriver && !showCreateForm}>
              <PopoverTrigger asChild>
                <div className="relative">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      placeholder="Enter phone number (e.g., 01XXXXXXXXX)"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        setShowSuggestions(true);
                        setSearchError(null);
                        setSearchedDriver(null);
                        setShowCreateForm(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSearchDriver();
                        } else if (e.key === 'Escape') {
                          setShowSuggestions(false);
                        }
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      data-testid="input-driver-phone"
                    />
                    <Button
                      onClick={handleSearchDriver}
                      disabled={isSearching || !phoneNumber.trim()}
                      data-testid="button-search-driver"
                    >
                      {isSearching ? 'Searching...' : 'Search'}
                    </Button>
                  </div>
                </div>
              </PopoverTrigger>
              <PopoverContent 
                className="w-[var(--radix-popover-trigger-width)] p-0" 
                align="start"
                side="bottom"
                sideOffset={4}
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <div className="p-2 max-h-60 overflow-y-auto">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Suggestions:</p>
                  {driverSuggestions.map((driver) => (
                    <button
                      key={driver.id}
                      type="button"
                      onClick={() => {
                        setPhoneNumber(driver.phone);
                        setSearchedDriver(driver);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-3"
                      data-testid={`suggestion-${driver.phone}`}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{driver.name}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{driver.phone} • {driver.licensePlate}</p>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {driver.vehicleMake} {driver.vehicleModel}
                      </span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {searchError && (
              <p className="text-sm text-orange-600 dark:text-orange-400">{searchError}</p>
            )}
          </div>

          {searchedDriver && (
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardContent className="pt-4">
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-3">Driver Found!</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Name:</span>
                    <p className="font-medium">{searchedDriver.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                    <p className="font-medium">{searchedDriver.phone}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">License Plate:</span>
                    <p className="font-medium">{searchedDriver.licensePlate}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Vehicle:</span>
                    <p className="font-medium">{searchedDriver.vehicleMake} {searchedDriver.vehicleModel} ({searchedDriver.vehicleYear})</p>
                  </div>
                </div>
                <Button
                  className="w-full mt-4"
                  onClick={() => assignExistingDriverMutation.mutate(searchedDriver.id)}
                  disabled={assignExistingDriverMutation.isPending}
                  data-testid="button-assign-existing-driver"
                >
                  {assignExistingDriverMutation.isPending ? 'Assigning...' : 'Assign to Booking'}
                </Button>
              </CardContent>
            </Card>
          )}

          {showCreateForm && (
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">Create New Driver</h3>
                <Form {...driverForm}>
                  <form onSubmit={driverForm.handleSubmit(onSubmitCreateDriver)} className="space-y-4">
                    <FormField
                      control={driverForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Driver Name *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Full name" data-testid="input-driver-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={driverForm.control}
                      name="licensePlate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>License Plate *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., LA 22-1122" data-testid="input-license-plate" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={driverForm.control}
                        name="vehicleMake"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vehicle Make *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., Toyota" data-testid="input-vehicle-make" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={driverForm.control}
                        name="vehicleModel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vehicle Model *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., Hiace" data-testid="input-vehicle-model" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={driverForm.control}
                      name="vehicleYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle Year *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 2022" data-testid="input-vehicle-year" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={driverForm.control}
                      name="vehicleCapacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle Capacity *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-vehicle-capacity">
                                <SelectValue placeholder="Select capacity" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="4">4 seats</SelectItem>
                              <SelectItem value="6">6 seats</SelectItem>
                              <SelectItem value="7">7 seats</SelectItem>
                              <SelectItem value="10">10 seats</SelectItem>
                              <SelectItem value="15">15 seats</SelectItem>
                              <SelectItem value="20">20 seats</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={createAndAssignDriverMutation.isPending}
                      data-testid="button-create-and-assign-driver"
                    >
                      {createAndAssignDriverMutation.isPending ? 'Creating...' : 'Create Driver & Assign to Booking'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminRentalPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [assigningBooking, setAssigningBooking] = useState<RentalBooking | null>(null);
  const [viewingBooking, setViewingBooking] = useState<RentalBooking | null>(null);

  const { data: bookings = [], isLoading } = useQuery<RentalBooking[]>({
    queryKey: ["/api/admin/rental-bookings"],
    enabled: hasPermission('rentalBookings', 'view'),
  });

  const { data: activeDrivers = [] } = useQuery<Driver[]>({
    queryKey: ["/api/drivers/active"],
    enabled: hasPermission('driverAssignment'),
  });

  // Driver assignment is now handled in the dedicated Driver Assignment page
  const showDriverAssignment = false;

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

  const getAssignedDriver = (booking: RentalBooking) => {
    if (!booking.driverId) return null;
    return activeDrivers.find(d => d.id === booking.driverId);
  };

  const exportToCSV = () => {
    if (filteredBookings.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const headers = ["Reference ID", "Customer", "Email", "Phone", "Service Type", "Duration", "Pickup Date", "Driver", "Created At"];
    const csvContent = [
      headers.join(','),
      ...filteredBookings.map(b => {
        const driver = getAssignedDriver(b);
        return [
          b.referenceId || "",
          `"${b.customerName || ""}"`,
          b.email || "",
          b.phone || "",
          b.serviceType || "",
          b.duration || "",
          b.pickupDate || "",
          driver ? `"${driver.name}"` : "Unassigned",
          new Date(b.createdAt).toLocaleString()
        ].join(',');
      })
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
                    {showDriverAssignment && <TableHead>Driver</TableHead>}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => {
                    const assignedDriver = getAssignedDriver(booking);
                    return (
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
                        {showDriverAssignment && (
                          <TableCell>
                            {assignedDriver ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                  {assignedDriver.name}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs"
                                  onClick={() => setAssigningBooking(booking)}
                                  data-testid={`button-reassign-${booking.id}`}
                                >
                                  Reassign
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => setAssigningBooking(booking)}
                                data-testid={`button-assign-${booking.id}`}
                              >
                                <UserPlus className="h-3 w-3 mr-1" />
                                Assign Driver
                              </Button>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setViewingBooking(booking)}
                            data-testid={`button-view-${booking.id}`}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <DriverAssignmentDialog
        booking={assigningBooking}
        open={!!assigningBooking}
        onOpenChange={(open) => !open && setAssigningBooking(null)}
        onSuccess={() => setAssigningBooking(null)}
      />

      <Dialog open={!!viewingBooking} onOpenChange={(open) => !open && setViewingBooking(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              Reference: {viewingBooking?.referenceId}
            </DialogDescription>
          </DialogHeader>
          {viewingBooking && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Customer:</span>
                  <p className="font-medium">{viewingBooking.customerName}</p>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>
                  <p className="font-medium">{viewingBooking.email}</p>
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <p className="font-medium">{viewingBooking.phone}</p>
                </div>
                <div>
                  <span className="text-gray-500">Service Type:</span>
                  <p className="font-medium">{viewingBooking.serviceType}</p>
                </div>
                {viewingBooking.duration && (
                  <div>
                    <span className="text-gray-500">Duration:</span>
                    <p className="font-medium">{viewingBooking.duration}</p>
                  </div>
                )}
                {viewingBooking.pickupDate && (
                  <div>
                    <span className="text-gray-500">Pickup Date:</span>
                    <p className="font-medium">{viewingBooking.pickupDate}</p>
                  </div>
                )}
                {viewingBooking.fromLocation && (
                  <div className="col-span-2">
                    <span className="text-gray-500">From Location:</span>
                    <p className="font-medium">{viewingBooking.fromLocation}</p>
                  </div>
                )}
                {viewingBooking.toLocation && (
                  <div className="col-span-2">
                    <span className="text-gray-500">To Location:</span>
                    <p className="font-medium">{viewingBooking.toLocation}</p>
                  </div>
                )}
                {viewingBooking.vehicleType && (
                  <div>
                    <span className="text-gray-500">Vehicle Type:</span>
                    <p className="font-medium">{viewingBooking.vehicleType}</p>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Created:</span>
                  <p className="font-medium">{new Date(viewingBooking.createdAt).toLocaleString()}</p>
                </div>
                {showDriverAssignment && (
                  <div>
                    <span className="text-gray-500">Driver:</span>
                    <p className="font-medium">
                      {getAssignedDriver(viewingBooking)?.name || 'Unassigned'}
                    </p>
                  </div>
                )}
              </div>
              {showDriverAssignment && (
                <Button
                  className="w-full mt-4"
                  variant="outline"
                  onClick={() => {
                    setViewingBooking(null);
                    setAssigningBooking(viewingBooking);
                  }}
                  data-testid="button-assign-from-details"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {getAssignedDriver(viewingBooking) ? 'Reassign Driver' : 'Assign Driver'}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
