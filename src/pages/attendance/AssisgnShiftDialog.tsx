import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { UserPlus } from 'lucide-react';
import { attendanceService } from '../../services/api';
import { showAlert, getErrorMessage } from '../../lib/sweetalert';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';

interface AssignShiftDialogProps {
  shift: {
    id: number;
    name: string;
    start_time: string;
    end_time: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface StaffMember {
  id: number;
  full_name: string;
  staff_code?: string;
  department?: string;
}

export function AssignShiftDialog({
  shift,
  open,
  onOpenChange,
  onSuccess,
}: AssignShiftDialogProps) {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<number | number[]>([]);
  const [effectiveFrom, setEffectiveFrom] = useState<string>('');
  const [effectiveTo, setEffectiveTo] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMultiple, setIsMultiple] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (open) {
      fetchStaffMembers();
      // Set default date to today
      const today = new Date().toISOString().split('T')[0];
      setEffectiveFrom(today);
    }
  }, [open]);

  const fetchStaffMembers = async () => {
    try {
      const response = await attendanceService.getStaffMembersForDropdown();
      setStaffMembers(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch staff members:', error);
      showAlert('error', 'Error', 'Failed to fetch staff members');
    }
  };

  const handleAssign = async () => {
    if (!selectedStaff || (Array.isArray(selectedStaff) && selectedStaff.length === 0)) {
      showAlert('warning', 'Validation Error', 'Please select at least one staff member');
      return;
    }

    if (!effectiveFrom) {
      showAlert('warning', 'Validation Error', 'Effective From date is required');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        staff_member_id: selectedStaff,
        effective_from: effectiveFrom,
        effective_to: effectiveTo || undefined,
      };

      await attendanceService.assignShift(shift.id, payload);
      
      showAlert(
        'success',
        'Success!',
        `Shift assigned successfully to ${Array.isArray(selectedStaff) ? selectedStaff.length : 1} staff member(s)`
      );
      
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setSelectedStaff([]);
      setEffectiveFrom('');
      setEffectiveTo('');
      setIsMultiple(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to assign shift:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to assign shift'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStaffSelect = (staffId: string) => {
    const id = parseInt(staffId);
    if (isMultiple) {
      const current = Array.isArray(selectedStaff) ? selectedStaff : [];
      if (current.includes(id)) {
        setSelectedStaff(current.filter(sid => sid !== id));
      } else {
        setSelectedStaff([...current, id]);
      }
    } else {
      setSelectedStaff(id);
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

  const filteredStaffMembers = staffMembers.filter(member =>
    member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.staff_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Assign Shift: {shift.name}
          </DialogTitle>
          <DialogDescription>
            {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Multiple Assignment Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Assign to multiple staff</Label>
              <p className="text-sm text-muted-foreground">
                Enable to assign this shift to multiple staff members at once
              </p>
            </div>
            <Switch
              checked={isMultiple}
              onCheckedChange={setIsMultiple}
            />
          </div>

          {/* Staff Selection */}
          <div className="space-y-2">
            <Label htmlFor="staff">
              {isMultiple ? 'Select Staff Members' : 'Select Staff Member'}
            </Label>
            
            {/* Search Input */}
            {/* <Input
              placeholder="Search by name, code, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-2"
            /> */}

            {/* Selected Staff Display (for multiple) */}
            {isMultiple && Array.isArray(selectedStaff) && selectedStaff.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedStaff.map(id => {
                  const member = staffMembers.find(m => m.id === id);
                  return member ? (
                    <Badge key={id} variant="secondary" className="px-3 py-1">
                      {member.full_name}
                      <button
                        type="button"
                        onClick={() => handleStaffSelect(id.toString())}
                        className="ml-2 text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>
            )}

            {/* Staff Dropdown */}
            <Select
              onValueChange={handleStaffSelect}
              value={isMultiple ? undefined : selectedStaff.toString()}
            >
              <SelectTrigger>
                <SelectValue 
                  placeholder={
                    isMultiple 
                      ? "Click to select staff members" 
                      : "Select a staff member"
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {filteredStaffMembers.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No staff members found
                  </div>
                ) : (
                  filteredStaffMembers.map((member) => (
                    <SelectItem 
                      key={member.id} 
                      value={member.id.toString()}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{member.full_name}</span>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          {/* {member.staff_code && (
                            <span>Code: {member.staff_code}</span>
                          )}
                          {member.department && (
                            <span>Dept: {member.department}</span>
                          )} */}
                        </div>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {/* Selection Summary */}
            {isMultiple && (
              <p className="text-sm text-muted-foreground">
                {Array.isArray(selectedStaff) 
                  ? `${selectedStaff.length} staff member(s) selected`
                  : 'No staff members selected'}
              </p>
            )}
          </div>

          {/* Effective Dates - Using simple date inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Effective From *</Label>
              <Input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Effective To (Optional)</Label>
              <Input
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
                min={effectiveFrom}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for permanent assignment
              </p>
            </div>
          </div>

          {/* Shift Preview */}
          <div className="rounded-lg border p-4 space-y-2">
            <h4 className="font-semibold">Shift Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Shift:</span>
                <p className="font-medium">{shift.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Timings:</span>
                <p className="font-medium">
                  {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={isLoading || (!selectedStaff || (Array.isArray(selectedStaff) && selectedStaff.length === 0))}
            className="bg-solarized-blue hover:bg-solarized-blue/90"
          >
            {isLoading ? 'Assigning...' : 'Assign Shift'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}