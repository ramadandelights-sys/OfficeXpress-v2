import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CalendarOff, Plus, Trash2, Download } from "lucide-react";
import { format } from "date-fns";

interface BlackoutDate {
  id: string;
  date: string;
  reason: string;
  createdAt: string;
}

export default function AdminBlackoutPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [showCreator, setShowCreator] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState("");

  const { data: blackoutDates = [], isLoading } = useQuery<BlackoutDate[]>({
    queryKey: ["/api/admin/blackout-dates"],
    enabled: hasPermission('carpoolBlackoutDates', 'view'),
  });

  const createMutation = useMutation({
    mutationFn: async (data: { date: string; reason: string }) => {
      return await apiRequest("POST", "/api/admin/blackout-dates", data);
    },
    onSuccess: () => {
      toast({ title: "Blackout date added successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blackout-dates"] });
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
      return await apiRequest("DELETE", `/api/admin/blackout-dates/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Blackout date removed successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blackout-dates"] });
    },
    onError: () => {
      toast({ title: "Failed to remove blackout date", variant: "destructive" });
    },
  });

  const importHolidaysMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/blackout-dates/import-holidays");
    },
    onSuccess: () => {
      toast({ title: "Bangladesh holidays imported successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blackout-dates"] });
    },
    onError: () => {
      toast({ title: "Failed to import holidays", variant: "destructive" });
    },
  });

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
                    onClick={() => importHolidaysMutation.mutate()}
                    variant="outline"
                    className="flex items-center gap-2"
                    disabled={importHolidaysMutation.isPending}
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
                    <TableHead>Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blackoutDates.map((bd) => (
                    <TableRow key={bd.id}>
                      <TableCell className="font-medium" data-testid={`text-blackout-date-${bd.id}`}>
                        {new Date(bd.date).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell>{bd.reason}</TableCell>
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
    </div>
  );
}
