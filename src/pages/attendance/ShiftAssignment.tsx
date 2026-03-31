// pages/attendance/ShiftAssignments.tsx
import { useState } from 'react';
import { AssignShiftDialog } from '../../pages/attendance/AssisgnShiftDialog';
import { ShiftRoster } from '../../pages/attendance/ShiftRoster';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Users, Calendar } from 'lucide-react';
import { useShifts } from '../../hooks/useShifts';

export default function ShiftAssignments() {
  const [selectedShift, setSelectedShift] = useState(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const { shifts, isLoading } = useShifts();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Shift Assignments</h1>
          <p className="text-muted-foreground">Assign and manage staff shifts</p>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Generate Roster
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Available Shifts Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Available Shifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-8">
                  <p>Loading shifts...</p>
                </div>
              ) : shifts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No shifts available</p>
                </div>
              ) : (
                shifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedShift(shift);
                      setIsAssignDialogOpen(true);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{shift.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {shift.start_time} - {shift.end_time}
                        </p>
                      </div>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {shift.assignments_count || 0} assigned
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Roster Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Current Roster
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ShiftRoster />
          </CardContent>
        </Card>
      </div>

      {/* Assign Shift Dialog */}
      {selectedShift && (
        <AssignShiftDialog
          shift={selectedShift}
          open={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
        />
      )}
    </div>
  );
}