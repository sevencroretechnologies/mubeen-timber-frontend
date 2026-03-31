import { useState, useEffect } from 'react';
import { attendanceService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent } from '../../components/ui/card';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { Skeleton } from '../../components/ui/skeleton';
import { Plus, Edit, Trash2, Clock, MoreHorizontal, Eye, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { AssignShiftDialog } from '../../pages/attendance/AssisgnShiftDialog';
import { ShiftRoster } from './ShiftRoster';

interface Shift {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  break_duration_minutes: number;
  assignments_count?: number;
}

export default function Shifts() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [viewingShift, setViewingShift] = useState<Shift | null>(null);
  const [activeTab, setActiveTab] = useState('shifts');

  const [formData, setFormData] = useState({
    name: '',
    start_time: '',
    end_time: '',
    break_duration_minutes: '60',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activeTab === 'shifts') {
      fetchShifts();
    }
  }, [activeTab]);

  const fetchShifts = async () => {
    setIsLoading(true);
    try {
      const response = await attendanceService.getShifts();
      setShifts(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch shifts:', error);
      showAlert('error', 'Error', 'Failed to fetch shifts');
    } finally {
      setIsLoading(false);
    }
  };

  // Form Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Shift name is required';
      isValid = false;
    } else if (formData.name.length > 255) {
      errors.name = 'Shift name must be less than 255 characters';
      isValid = false;
    }

    // Start time validation
    if (!formData.start_time) {
      errors.start_time = 'Start time is required';
      isValid = false;
    } else if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(formData.start_time)) {
      errors.start_time = 'Invalid start time format (HH:MM)';
      isValid = false;
    }

    // End time validation
    if (!formData.end_time) {
      errors.end_time = 'End time is required';
      isValid = false;
    } else if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(formData.end_time)) {
      errors.end_time = 'Invalid end time format (HH:MM)';
      isValid = false;
    }

    // With this night-shift aware validation:
    if (formData.start_time && formData.end_time) {
      const start = new Date(`2000-01-01T${formData.start_time}`);
      const end = new Date(`2000-01-01T${formData.end_time}`);

      if (end <= start) {
        // If end time is earlier than or equal to start time, it means the shift crosses midnight
        // We implicitly allow this as a night shift.
        // Ensure the duration makes sense, but we won't strictly block it here.
      }
    }

    // Break duration validation
    const breakMinutes = parseInt(formData.break_duration_minutes);
    if (isNaN(breakMinutes)) {
      errors.break_duration_minutes = 'Break duration must be a number';
      isValid = false;
    } else if (breakMinutes < 0) {
      errors.break_duration_minutes = 'Break duration cannot be negative';
      isValid = false;
    } else if (breakMinutes > 1440) {
      errors.break_duration_minutes = 'Break duration cannot exceed 24 hours (1440 minutes)';
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const renderError = (field: string) => {
    return fieldErrors[field] ? (
      <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
    ) : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setIsSubmitting(true);

    // Frontend validation
    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    const payload = {
      name: formData.name,
      start_time: formData.start_time,
      end_time: formData.end_time,
      break_duration_minutes: Number(formData.break_duration_minutes),
    };

    try {
      if (editingShift) {
        await attendanceService.updateShift(editingShift.id, payload);
      } else {
        await attendanceService.createShift(payload);
      }

      showAlert(
        'success',
        'Success!',
        editingShift ? 'Shift updated successfully' : 'Shift created successfully',
        2000
      );
      setIsDialogOpen(false);
      setEditingShift(null);
      resetForm();
      fetchShifts();
    } catch (error: any) {
      console.error('Failed to save shift:', error);

      // Handle backend validation errors (status 422)
      if (error.response?.status === 422 && error.response?.data?.errors) {
        const apiErrors: Record<string, string> = {};
        Object.keys(error.response.data.errors).forEach((key) => {
          apiErrors[key] = error.response.data.errors[key][0];
        });
        setFieldErrors(apiErrors);
        showAlert('error', 'Validation Error', 'Please fix the errors highlighted below.');
      } else {
        showAlert('error', 'Error', getErrorMessage(error, 'Failed to save shift'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    setFormData({
      name: shift.name,
      start_time: shift.start_time.slice(0, 5),
      end_time: shift.end_time.slice(0, 5),
      break_duration_minutes: shift.break_duration_minutes.toString(),
    });
    setFieldErrors({});
    setIsDialogOpen(true);
  };

  const handleView = (shift: Shift) => {
    setViewingShift(shift);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    const result = await showConfirmDialog(
      'Are you sure?',
      'You want to delete this shift?'
    );

    if (!result.isConfirmed) return;

    try {
      await attendanceService.deleteShift(id);
      showAlert('success', 'Deleted!', 'Shift deleted successfully', 2000);
      fetchShifts();
    } catch (error: unknown) {
      console.error('Failed to delete shift:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete shift'));
    }
  };

  const handleAssignClick = (shift: Shift) => {
    setSelectedShift(shift);
    setIsAssignDialogOpen(true);
  };

  const handleAssignSuccess = () => {
    fetchShifts(); // Refresh the shift list to update assignment counts
  };

  const resetForm = () => {
    setFormData({
      name: '',
      start_time: '',
      end_time: '',
      break_duration_minutes: '60',
    });
    setFieldErrors({});
    setEditingShift(null);
  };

  const parseTime = (time24: string) => {
    if (!time24) return { h: '', m: '', ampm: 'AM' };
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours, 10);
    if (isNaN(h)) return { h: '', m: '', ampm: 'AM' };
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return { h: h.toString(), m: minutes || '', ampm };
  };

  const toTime24 = (h: string, m: string, ampm: string) => {
    if (!h) h = '12';
    if (!m) m = '00';
    let hour = parseInt(h, 10);
    if (isNaN(hour)) hour = 12;
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return `${hour.toString().padStart(2, '0')}:${m.padStart(2, '0')}`;
  };

  const handleTimeChange = (field: 'start_time' | 'end_time', part: 'h' | 'm' | 'ampm', value: string) => {
    const current = parseTime(formData[field]);
    const updated = { ...current, [part]: value };
    const time24 = toTime24(updated.h, updated.m, updated.ampm);

    setFormData((prev) => ({ ...prev, [field]: time24 }));
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const formatTime = (time: string) => {
    if (!time) return '--:--';
    const [h, m] = time.split(':');
    const hour = Number(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Shift Management</h1>
          <p className="text-muted-foreground">Manage work shifts and assignments</p>
        </div>
      </div>

      {/* TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="shifts" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Shifts
          </TabsTrigger>
          <TabsTrigger value="roster" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Roster
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shifts" className="space-y-4">
          {/* Add Shift Button */}
          <div className="flex justify-end">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-solarized-blue hover:bg-solarized-blue/90"
                  onClick={resetForm}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Shift
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingShift ? 'Edit Shift' : 'Add Shift'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingShift
                      ? 'Update shift details'
                      : 'Create a new shift'}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    {/* Shift Name */}
                    <div>
                      <Label htmlFor="name" className={fieldErrors.name ? 'text-red-500' : ''}>
                        Shift Name *
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                        }}
                        placeholder="e.g., Morning Shift"
                        className={fieldErrors.name ? 'border-red-500' : ''}
                        maxLength={255}
                      />
                      {renderError('name')}
                    </div>

                    {/* Start and End Times */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="start_time" className={fieldErrors.start_time ? 'text-red-500' : ''}>
                          Start Time *
                        </Label>
                        <div className="flex gap-2">
                          <Select
                            value={parseTime(formData.start_time).h || undefined}
                            onValueChange={(val) => handleTimeChange('start_time', 'h', val)}
                          >
                            <SelectTrigger className={`w-[70px] ${fieldErrors.start_time ? 'border-red-500' : ''}`}>
                              <SelectValue placeholder="HH" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                                <SelectItem key={h} value={h.toString()}>
                                  {h.toString().padStart(2, '0')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={parseTime(formData.start_time).m || undefined}
                            onValueChange={(val) => handleTimeChange('start_time', 'm', val)}
                          >
                            <SelectTrigger className={`w-[70px] ${fieldErrors.start_time ? 'border-red-500' : ''}`}>
                              <SelectValue placeholder="MM" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map((m) => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={parseTime(formData.start_time).ampm || 'AM'}
                            onValueChange={(val) => handleTimeChange('start_time', 'ampm', val)}
                          >
                            <SelectTrigger className={`w-[80px] ${fieldErrors.start_time ? 'border-red-500' : ''}`}>
                              <SelectValue placeholder="AM/PM" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AM">AM</SelectItem>
                              <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {renderError('start_time')}
                      </div>

                      <div>
                        <Label htmlFor="end_time" className={fieldErrors.end_time ? 'text-red-500' : ''}>
                          End Time *
                        </Label>
                        <div className="flex gap-2">
                          <Select
                            value={parseTime(formData.end_time).h || undefined}
                            onValueChange={(val) => handleTimeChange('end_time', 'h', val)}
                          >
                            <SelectTrigger className={`w-[70px] ${fieldErrors.end_time ? 'border-red-500' : ''}`}>
                              <SelectValue placeholder="HH" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                                <SelectItem key={h} value={h.toString()}>
                                  {h.toString().padStart(2, '0')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={parseTime(formData.end_time).m || undefined}
                            onValueChange={(val) => handleTimeChange('end_time', 'm', val)}
                          >
                            <SelectTrigger className={`w-[70px] ${fieldErrors.end_time ? 'border-red-500' : ''}`}>
                              <SelectValue placeholder="MM" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map((m) => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={parseTime(formData.end_time).ampm || 'AM'}
                            onValueChange={(val) => handleTimeChange('end_time', 'ampm', val)}
                          >
                            <SelectTrigger className={`w-[80px] ${fieldErrors.end_time ? 'border-red-500' : ''}`}>
                              <SelectValue placeholder="AM/PM" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AM">AM</SelectItem>
                              <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {renderError('end_time')}
                      </div>
                    </div>

                    {/* Break Duration */}
                    <div>
                      <Label htmlFor="break_duration_minutes" className={fieldErrors.break_duration_minutes ? 'text-red-500' : ''}>
                        Break Duration (minutes)
                      </Label>
                      <Input
                        id="break_duration_minutes"
                        type="number"
                        min="0"
                        max="1440"
                        value={formData.break_duration_minutes}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            break_duration_minutes: e.target.value,
                          });
                          if (fieldErrors.break_duration_minutes) setFieldErrors(prev => ({ ...prev, break_duration_minutes: '' }));
                        }}
                        className={fieldErrors.break_duration_minutes ? 'border-red-500' : ''}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Enter 0 for no break
                      </div>
                      {renderError('break_duration_minutes')}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-solarized-blue hover:bg-solarized-blue/90"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Saving...' : (editingShift ? 'Update' : 'Create')}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Shifts Table */}
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : shifts.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                  <p>No shifts found</p>
                  <Button
                    className="mt-4 bg-solarized-blue hover:bg-solarized-blue/90"
                    onClick={() => {
                      resetForm();
                      setIsDialogOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Shift
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                        <TableHead>Break</TableHead>
                        <TableHead>Assignments</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {shifts.map((shift) => (
                        <TableRow key={shift.id}>
                          <TableCell className="font-medium">{shift.name}</TableCell>
                          <TableCell>{formatTime(shift.start_time)}</TableCell>
                          <TableCell>{formatTime(shift.end_time)}</TableCell>
                          <TableCell>
                            {shift.break_duration_minutes} mins
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {shift.assignments_count || 0}
                            </span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleView(shift)}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleAssignClick(shift)}
                                >
                                  <Users className="mr-2 h-4 w-4" />
                                  Assign to Staff
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleEdit(shift)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(shift.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roster">
          <ShiftRoster />
        </TabsContent>
      </Tabs>

      {/* Assign Shift Dialog */}
      {selectedShift && (
        <AssignShiftDialog
          shift={selectedShift}
          open={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
          onSuccess={handleAssignSuccess}
        />
      )}

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shift Details</DialogTitle>
            <DialogDescription>View shift information</DialogDescription>
          </DialogHeader>
          {viewingShift && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Shift Name</Label>
                <p className="font-medium">{viewingShift.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Start Time</Label>
                  <p className="font-medium">{formatTime(viewingShift.start_time)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">End Time</Label>
                  <p className="font-medium">{formatTime(viewingShift.end_time)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Break Duration</Label>
                <p className="font-medium">{viewingShift.break_duration_minutes} minutes</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Assignments</Label>
                <p className="font-medium">{viewingShift.assignments_count || 0} staff members</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}