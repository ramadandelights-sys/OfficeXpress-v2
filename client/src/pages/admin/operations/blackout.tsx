import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CalendarOff, Plus, Trash2, Download, Calendar } from "lucide-react";
import { format } from "date-fns";

interface BlackoutDate {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

interface Holiday {
  name: string;
  nameBn: string;
  date: string;
  type: 'national' | 'religious' | 'cultural';
  durationDays: number;
  isVariable: boolean;
}

interface HolidaySuggestion {
  holiday: Holiday;
  expandedDates: string[];
  overlappingBlackouts: string[];
  fullyAdded: boolean;
  partiallyAdded: boolean;
}

export default function AdminBlackoutPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [showCreator, setShowCreator] = useState(false);
  const [showHolidayImport, setShowHolidayImport] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState("");
  const [selectedHolidays, setSelectedHolidays] = useState<Holiday[]>([]);

  const { data: blackoutDates = [], isLoading } = useQuery<BlackoutDate[]>({
    queryKey: ["/api/admin/carpool/blackout-dates"],
    enabled: hasPermission('carpoolBlackoutDates', 'view'),
  });

  const createMutation = useMutation({
    mutationFn: async (data: { date: string; reason: string }) => {
      // Convert to the format expected by the API (name, startDate, endDate, isActive)
      const startDate = new Date(data.date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(data.date);
      endDate.setHours(23, 59, 59, 999);
      return await apiRequest("POST", "/api/admin/carpool/blackout-dates", {
        name: data.reason || "Service unavailable",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        isActive: true,
      });
    },
    onSuccess: () => {
      toast({ title: "Blackout date added successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/carpool/blackout-dates"] });
      setShowCreator(false);
      setSelectedDate(undefined);
      setReason("");
    },
    onError: () => {
      toast({ title: "Failed to add blackout date", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/carpool/blackout-dates/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Blackout date removed successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/carpool/blackout-dates"] });
    },
    onError: () => {
      toast({ title: "Failed to remove blackout date", variant: "destructive" });
    },
  });

  // Holiday suggestions query
  const { data: holidaySuggestions = [], isLoading: loadingHolidays } = useQuery<HolidaySuggestion[]>({
    queryKey: ['/api/admin/holidays/suggestions'],
    enabled: showHolidayImport,
  });

  // Reset selected holidays when dialog opens
  useEffect(() => {
    if (showHolidayImport) {
      setSelectedHolidays([]);
    }
  }, [showHolidayImport]);

  const importHolidaysMutation = useMutation({
    mutationFn: async (holidays: Holiday[]) => {
      return await apiRequest("POST", "/api/admin/holidays/sync", { holidays });
    },
    onSuccess: () => {
      toast({ title: "Bangladesh holidays imported successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/carpool/blackout-dates"] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/holidays/suggestions'] });
      setShowHolidayImport(false);
    },
    onError: () => {
      toast({ title: "Failed to import holidays", variant: "destructive" });
    },
  });

  const handleToggleHoliday = (holiday: Holiday, fullyAdded: boolean) => {
    if (fullyAdded) return;
    setSelectedHolidays(prev => {
      const isSelected = prev.some(h => h.date === holiday.date && h.name === holiday.name);
      if (isSelected) {
        return prev.filter(h => !(h.date === holiday.date && h.name === holiday.name));
      } else {
        return [...prev, holiday];
      }
    });
  };

  const handleSelectAllHolidays = () => {
    const availableHolidays = holidaySuggestions
      .filter(s => !s.fullyAdded)
      .map(s => s.holiday);
    setSelectedHolidays(availableHolidays);
  };

  const handleDeselectAllHolidays = () => {
    setSelectedHolidays([]);
  };

  const getTypeColor = (type: 'national' | 'religious' | 'cultural') => {
    switch (type) {
      case 'national':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'religious':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cultural':
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const availableHolidayCount = holidaySuggestions.filter(s => !s.fullyAdded).length;

  const handleCreate = () => {
    if (!selectedDate) {
      toast({ title: "Please select a date", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      date: format(selectedDate, "yyyy-MM-dd"),
      reason: reason || "Service unavailable",
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">Loading blackout dates...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2" data-testid="heading-blackout">
              <CalendarOff className="h-5 w-5" />
              Service Blackout Dates
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {hasPermission('carpoolBlackoutDates', 'edit') && (
                <>
                  <Button 
                    onClick={() => setShowHolidayImport(true)}
                    variant="outline"
                    className="flex items-center gap-2"
                    data-testid="button-import-holidays"
                  >
                    <Download className="h-4 w-4" />
                    Import Holidays
                  </Button>
                  <Button 
                    onClick={() => setShowCreator(true)}
                    className="flex items-center gap-2 bg-[#4c9096] hover:bg-[#4c9096]/90 text-white"
                    data-testid="button-add-blackout"
                  >
                    <Plus className="h-4 w-4" />
                    Add Blackout Date
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {blackoutDates.length === 0 ? (
            <div className="text-center py-8">
              <CalendarOff className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Blackout Dates Configured
              </h3>
              <p className="text-gray-500">
                Add blackout dates to block service during holidays or maintenance periods.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Start Date & Time</TableHead>
                    <TableHead>End Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blackoutDates.map((bd) => (
                    <TableRow key={bd.id}>
                      <TableCell className="font-medium" data-testid={`text-blackout-name-${bd.id}`}>
                        {bd.name}
                      </TableCell>
                      <TableCell data-testid={`text-blackout-start-${bd.id}`}>
                        {new Date(bd.startDate).toLocaleString()}
                      </TableCell>
                      <TableCell data-testid={`text-blackout-end-${bd.id}`}>
                        {new Date(bd.endDate).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${bd.isActive ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                          {bd.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {hasPermission('carpoolBlackoutDates', 'edit') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteMutation.mutate(bd.id)}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`button-delete-blackout-${bd.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
            <DialogTitle>Add Blackout Date</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Date</label>
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border mt-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Reason</label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., National Holiday, Maintenance"
                className="mt-2"
                data-testid="input-blackout-reason"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleCreate} 
                disabled={createMutation.isPending}
                className="flex-1"
                data-testid="button-save-blackout"
              >
                {createMutation.isPending ? "Adding..." : "Add Blackout Date"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCreator(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Holiday Import Dialog */}
      <Dialog open={showHolidayImport} onOpenChange={setShowHolidayImport}>
        <DialogContent className="w-[95vw] sm:w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="dialog-title-import-holidays">
              <Calendar className="h-5 w-5" />
              Import Bangladesh Holidays
            </DialogTitle>
            <DialogDescription>
              Select holidays to add as blackout dates. Multi-day holidays (like Eid) will block all days automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAllHolidays}
              disabled={availableHolidayCount === 0}
              data-testid="button-select-all-holidays"
            >
              Select All ({availableHolidayCount})
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDeselectAllHolidays}
              disabled={selectedHolidays.length === 0}
              data-testid="button-deselect-all-holidays"
            >
              Deselect All
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2" data-testid="holiday-list-container">
            {loadingHolidays ? (
              <div className="text-center py-8">Loading holidays...</div>
            ) : holidaySuggestions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No upcoming holidays found.
              </div>
            ) : (
              holidaySuggestions.map((suggestion, index) => {
                const { holiday, fullyAdded, partiallyAdded } = suggestion;
                const isSelected = selectedHolidays.some(
                  h => h.date === holiday.date && h.name === holiday.name
                );

                return (
                  <div
                    key={`${holiday.date}-${holiday.name}-${index}`}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      fullyAdded
                        ? 'bg-gray-50 border-gray-200 opacity-60'
                        : isSelected
                        ? 'bg-primary/5 border-primary'
                        : 'hover:bg-gray-50 border-gray-200'
                    }`}
                    data-testid={`holiday-item-${holiday.date}`}
                  >
                    <Checkbox
                      checked={isSelected || fullyAdded}
                      disabled={fullyAdded}
                      onCheckedChange={() => handleToggleHoliday(holiday, fullyAdded)}
                      data-testid={`checkbox-holiday-${holiday.date}`}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{holiday.name}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${getTypeColor(holiday.type)}`}>
                          {holiday.type}
                        </span>
                        {holiday.durationDays > 1 && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                            {holiday.durationDays} days
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {holiday.nameBn}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(holiday.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                        {holiday.durationDays > 1 && (
                          <span>
                            {' - '}
                            {new Date(new Date(holiday.date).setDate(
                              new Date(holiday.date).getDate() + holiday.durationDays - 1
                            )).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    {fullyAdded && (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                        Already Added
                      </span>
                    )}
                    {partiallyAdded && !fullyAdded && (
                      <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                        Partial
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-500">
              {selectedHolidays.length} holiday(s) selected
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowHolidayImport(false)}
                data-testid="button-cancel-import-holidays"
              >
                Cancel
              </Button>
              <Button
                onClick={() => importHolidaysMutation.mutate(selectedHolidays)}
                disabled={importHolidaysMutation.isPending || selectedHolidays.length === 0}
                data-testid="button-submit-import-holidays"
              >
                {importHolidaysMutation.isPending ? 'Importing...' : `Import ${selectedHolidays.length} Holiday(s)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
