import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Filter, User, Clock, Trash2 } from 'lucide-react';
import { attendanceService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Skeleton } from '../../components/ui/skeleton';
import { Badge } from '../../components/ui/badge';

interface ShiftAssignment {
  id: number;
  shift_id: number;
  staff_member_id: number;
  effective_from: string;
  effective_to: string | null;
  shift: {
    id: number;
    name: string;
    start_time: string;
    end_time: string;
    color?: string;
  };
  staff_member: {
    id: number;
    full_name: string;
    staff_code?: string;
    department?: string;
  };
}

export function ShiftRoster() {
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [shifts, setShifts] = useState<Array<{id: number, name: string}>>([]);
  const [staffMembers, setStaffMembers] = useState<Array<{id: number, full_name: string}>>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    
    fetchShifts();
    fetchStaffMembers();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchRoster();
    }
  }, [selectedDate, selectedShift, selectedStaff]);

  const fetchRoster = async () => {
    if (!selectedDate) return;
    
    setIsLoading(true);
    try {
      const params: any = {
        date: selectedDate,
      };
      
      if (selectedShift !== 'all') {
        params.shift_id = selectedShift;
      }
      
      if (selectedStaff !== 'all') {
        params.staff_member_id = selectedStaff;
      }

      const response = await attendanceService.getShiftAssignments(params);
      setAssignments(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch roster:', error);
      showAlert('error', 'Error', 'Failed to fetch shift roster');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchShifts = async () => {
    try {
      const response = await attendanceService.getShifts();
      setShifts(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch shifts:', error);
    }
  };

  const fetchStaffMembers = async () => {
    try {
      const response = await attendanceService.getStaffMembersForDropdown();
      setStaffMembers(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch staff members:', error);
    }
  };

  const handleRemoveAssignment = async (assignmentId: number) => {
    const result = await showConfirmDialog(
      'Remove Assignment',
      'Are you sure you want to remove this shift assignment?'
    );

    if (!result.isConfirmed) return;

    try {
      await attendanceService.removeShiftAssignment(assignmentId);
      showAlert('success', 'Removed!', 'Shift assignment removed successfully');
      fetchRoster();
    } catch (error) {
      console.error('Failed to remove assignment:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to remove assignment'));
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '--:--';
    const [h, m] = time.split(':');
    const hour = Number(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusBadge = (assignment: ShiftAssignment) => {
    const today = new Date();
    const effectiveFrom = new Date(assignment.effective_from);
    const effectiveTo = assignment.effective_to ? new Date(assignment.effective_to) : null;

    if (today < effectiveFrom) {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Upcoming</Badge>;
    } else if (effectiveTo && today > effectiveTo) {
      return <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">Expired</Badge>;
    } else {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Shift Roster
          </CardTitle>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Filters */}
        {showFilters && (
          <div className="mb-6 p-4 border rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shift-filter">Shift</Label>
                <Select value={selectedShift} onValueChange={setSelectedShift}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Shifts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shifts</SelectItem>
                    {shifts.map((shift) => (
                      <SelectItem key={shift.id} value={shift.id.toString()}>
                        {shift.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff-filter">Staff Member</Label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    {staffMembers.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id.toString()}>
                        {staff.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedShift('all');
                  setSelectedStaff('all');
                  const today = new Date().toISOString().split('T')[0];
                  setSelectedDate(today);
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}

        {/* Roster Table */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-12">
            <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">No assignments found</p>
            <p className="text-muted-foreground">
              No shift assignments for {formatDate(selectedDate)}
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Timings</TableHead>
                  <TableHead>Effective Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {assignment.staff_member.full_name}
                        </span>
                        {assignment.staff_member.staff_code && (
                          <span className="text-sm text-muted-foreground">
                            Code: {assignment.staff_member.staff_code}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {assignment.shift.color && (
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: assignment.shift.color }}
                          />
                        )}
                        <span>{assignment.shift.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-3 w-3" />
                        {formatTime(assignment.shift.start_time)} - {formatTime(assignment.shift.end_time)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>From: {formatDate(assignment.effective_from)}</div>
                        {assignment.effective_to ? (
                          <div className="text-muted-foreground">
                            To: {formatDate(assignment.effective_to)}
                          </div>
                        ) : (
                          <div className="text-muted-foreground">Ongoing</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(assignment)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAssignment(assignment.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Summary Stats */}
        {assignments.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{assignments.length}</div>
                  <div className="text-sm text-muted-foreground">Total Assignments</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {new Set(assignments.map(a => a.staff_member_id)).size}
                  </div>
                  <div className="text-sm text-muted-foreground">Unique Staff</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {new Set(assignments.map(a => a.shift_id)).size}
                  </div>
                  <div className="text-sm text-muted-foreground">Unique Shifts</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}