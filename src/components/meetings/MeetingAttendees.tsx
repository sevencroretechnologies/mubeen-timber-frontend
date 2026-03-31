import { useState, useEffect, useCallback } from 'react';
import { meetingAttendeeService, meetingService, staffService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { useAuth } from '../../context/AuthContext';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
    Plus,
    Search,
    MoreHorizontal,
    Edit,
    Trash2,
    Users,
    UserCheck,
    Eye,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select';
import DataTable, { TableColumn } from 'react-data-table-component';

interface MeetingAttendee {
    id: number;
    meeting_id: number;
    staff_member_id: number;
    status: string;
    is_organizer: boolean;
    meeting?: {
        id: number;
        title: string;
        date: string;
    };
    staff_member?: {
        id: number;
        full_name: string;
    };
}

export default function MeetingAttendees() {
    const { hasPermission } = useAuth();
    const [attendees, setAttendees] = useState<MeetingAttendee[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRows, setTotalRows] = useState(0);

    // Modal State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAttendee, setEditingAttendee] = useState<MeetingAttendee | null>(null);
    const [meetings, setMeetings] = useState<{ id: number; title: string; date: string }[]>([]);
    const [employees, setEmployees] = useState<{ id: number; full_name: string }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // View Modal State
    const [viewingAttendee, setViewingAttendee] = useState<MeetingAttendee | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

    const [formData, setFormData] = useState({
        meeting_id: '',
        staff_member_id: '',
        status: 'invited',
        is_organizer: false,
    });

    // ================= VALIDATION =================
    const validateForm = () => {
        const errors: Record<string, string> = {};
        let isValid = true;

        // For create: meeting_id and staff_member_id are required
        if (!editingAttendee) {
            // Meeting ID validation
            if (!formData.meeting_id) {
                errors.meeting_id = 'Meeting is required';
                isValid = false;
            } else {
                const meetingExists = meetings.some(m => m.id.toString() === formData.meeting_id);
                if (!meetingExists) {
                    errors.meeting_id = 'Selected meeting does not exist';
                    isValid = false;
                }
            }

            // Staff Member ID validation
            if (!formData.staff_member_id) {
                errors.staff_member_id = 'Staff member is required';
                isValid = false;
            } else {
                const employeeExists = employees.some(emp => emp.id.toString() === formData.staff_member_id);
                if (!employeeExists) {
                    errors.staff_member_id = 'Selected staff member does not exist';
                    isValid = false;
                }
            }
        }

        // Status validation (nullable, must be in allowed values if provided)
        if (formData.status && !['invited', 'accepted', 'declined', 'attended'].includes(formData.status)) {
            errors.status = 'Status must be one of: invited, accepted, declined, attended';
            isValid = false;
        }

        // is_organizer validation (nullable, must be boolean)
        if (formData.is_organizer !== undefined && formData.is_organizer !== null) {
            if (typeof formData.is_organizer !== 'boolean') {
                errors.is_organizer = 'Organizer status must be true or false';
                isValid = false;
            }
        }

        setFieldErrors(errors);
        return isValid;
    };

    // Helper to render error messages
    const renderError = (field: string) => {
        return fieldErrors[field] ? (
            <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
        ) : null;
    };

    // Clear error for specific field when user starts typing
    const clearFieldError = (field: string) => {
        if (fieldErrors[field]) {
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const fetchMetadata = useCallback(async () => {
        try {
            const [meetingsRes, staffRes] = await Promise.all([
                meetingService.getAll({ per_page: 100 }),
                staffService.getAll({ per_page: 100 }),
            ]);
            if (meetingsRes.data.success) {
                setMeetings(meetingsRes.data.data.data || meetingsRes.data.data || []);
            }
            if (staffRes.data.success) {
                setEmployees(staffRes.data.data.data || staffRes.data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch metadata:', error);
        }
    }, []);

    const fetchAttendees = useCallback(async (currentPage: number = 1) => {
        setIsLoading(true);
        try {
            const response = await meetingAttendeeService.getAll({
                page: currentPage,
                per_page: perPage,
                search,
            });
            const resData = response.data.data;
            if (Array.isArray(resData)) {
                setAttendees(resData);
                setTotalRows(response.data.meta?.total || resData.length);
            } else {
                setAttendees(resData.data || []);
                setTotalRows(resData.total || 0);
            }
        } catch (error) {
            console.error('Failed to fetch attendees:', error);
            showAlert('error', 'Error', 'Failed to fetch meeting attendees');
        } finally {
            setIsLoading(false);
        }
    }, [perPage, search]);

    useEffect(() => {
        fetchAttendees(page);
    }, [page, fetchAttendees]);

    useEffect(() => {
        fetchMetadata();
    }, [fetchMetadata]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFieldErrors({});

        if (!validateForm()) {
            setIsSubmitting(false);
            // showAlert('error', 'Validation Error', 'Please check the form for errors.');
            return;
        }

        try {
            let payload;
            
            if (editingAttendee) {
                // For update: only status and is_organizer are allowed
                payload = {
                    status: formData.status,
                    is_organizer: formData.is_organizer,
                };
                await meetingAttendeeService.update(editingAttendee.id, payload);
                showAlert('success', 'Updated', 'Attendee record updated successfully');
            } else {
                // For create: include all fields
                payload = {
                    ...formData,
                    meeting_id: Number(formData.meeting_id),
                    staff_member_id: Number(formData.staff_member_id),
                };
                await meetingAttendeeService.create(payload);
                showAlert('success', 'Success', 'Meeting attendee added successfully');
            }

            setIsDialogOpen(false);
            resetForm();
            fetchAttendees(page);
        } catch (error: any) {
            console.error('Failed to save attendee:', error);
            
            if (error.response?.data?.errors) {
                // Handle API validation errors
                const apiErrors: Record<string, string> = {};
                Object.keys(error.response.data.errors).forEach((key) => {
                    apiErrors[key] = error.response.data.errors[key][0];
                });
                setFieldErrors(apiErrors);
                showAlert('error', 'Validation Error', 'Please fix the errors highlighted below.');
            } else {
                showAlert('error', 'Error', getErrorMessage(error, 'Failed to save attendee record'));
                setIsDialogOpen(false);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            meeting_id: '',
            staff_member_id: '',
            status: 'invited',
            is_organizer: false,
        });
        setEditingAttendee(null);
        setFieldErrors({});
    };

    const handleEdit = (attendee: MeetingAttendee) => {
        setEditingAttendee(attendee);
        setFormData({
            meeting_id: attendee.meeting_id.toString(),
            staff_member_id: attendee.staff_member_id.toString(),
            status: attendee.status,
            is_organizer: attendee.is_organizer,
        });
        setFieldErrors({});
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: number) => {
        const result = await showConfirmDialog(
            'Are you sure?',
            'You want to remove this attendee record?'
        );
        if (result.isConfirmed) {
            try {
                await meetingAttendeeService.delete(id);
                showAlert('success', 'Deleted', 'Attendee record removed successfully');
                fetchAttendees(page);
            } catch (error) {
                showAlert('error', 'Error', getErrorMessage(error, 'Failed to remove attendee'));
            }
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, string> = {
            accepted: 'bg-green-100 text-green-700 border-green-200',
            invited: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            declined: 'bg-red-100 text-red-700 border-red-200',
            attended: 'bg-blue-100 text-blue-700 border-blue-200',
        };
        return (
            <Badge variant="outline" className={`${variants[status] || 'bg-gray-100 text-gray-700'}`}>
                {status.toUpperCase()}
            </Badge>
        );
    };

    const columns: TableColumn<MeetingAttendee>[] = [
        {
            name: 'Attendee',
            selector: (row) => row.staff_member?.full_name || '',
            cell: (row) => (
                <div className="py-2">
                    <p className="font-medium">{row.staff_member?.full_name || 'N/A'}</p>
                    {row.is_organizer && (
                        <Badge variant="secondary" className="text-[10px] mt-1 uppercase bg-purple-100 text-purple-700 border-purple-200">
                            Organizer
                        </Badge>
                    )}
                </div>
            ),
            sortable: true,
        },
        {
            name: 'Meeting',
            selector: (row) => row.meeting?.title || '',
            cell: (row) => (
                <div className="py-2">
                    <p className="font-medium">{row.meeting?.title || 'N/A'}</p>
                </div>
            ),
            sortable: true,
        },
        {
            name: 'Status',
            cell: (row) => getStatusBadge(row.status),
            // width: '150px',
        },
        {
            name: 'Action',
            cell: (row) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                            setViewingAttendee(row);
                            setIsViewDialogOpen(true);
                        }}>
                            <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                        {hasPermission('edit_meetings') && (
                            <DropdownMenuItem onClick={() => handleEdit(row)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                        )}
                        {hasPermission('delete_meetings') && (
                            <DropdownMenuItem
                                onClick={() => handleDelete(row.id)}
                                className="text-red-600"
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
            width: '80px',
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-solarized-base02">Meeting Attendees</h1>
                    <p className="text-solarized-base01">Manage and track guest lists for meetings</p>
                </div>
                {hasPermission('create_meetings') && (
                    <Button
                        className="bg-solarized-blue hover:bg-solarized-blue/90"
                        onClick={() => {
                            resetForm();
                            setIsDialogOpen(true);
                        }}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Attendee
                    </Button>
                )}
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
                <Card className="border-0 shadow-sm bg-white">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <Users className="h-5 w-5 text-solarized-blue" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Invitations</p>
                                <p className="text-xl font-bold text-solarized-base02">{totalRows}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-white">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-green-50 rounded-lg">
                                <UserCheck className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Accepted</p>
                                <p className="text-xl font-bold text-solarized-base02">
                                    {attendees.filter(a => a.status === 'accepted').length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-white">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-red-50 rounded-lg">
                                <Trash2 className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Declined</p>
                                <p className="text-xl font-bold text-solarized-base02">
                                    {attendees.filter(a => a.status === 'declined').length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        {/* <CardTitle className="text-lg font-semibold">Attendee List</CardTitle> */}
                        <div className="flex items-center gap-4">
                            <Input
                                placeholder="Search attendees..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                // className="w-64"
                            />
                            <Button variant="outline" size="icon" className='w-40'>
                                <Search className="mr-2 h-4 w-4" /> Search
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={attendees}
                        progressPending={isLoading}
                        pagination
                        paginationServer
                        paginationTotalRows={totalRows}
                        paginationPerPage={perPage}
                        paginationDefaultPage={page}
                        onChangePage={(p) => setPage(p)}
                        onChangeRowsPerPage={(pp) => setPerPage(pp)}
                        highlightOnHover
                        responsive
                        noDataComponent={
                            <div className="p-8 text-center text-muted-foreground">
                                No attendee records found.
                            </div>
                        }
                    />
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingAttendee ? 'Edit Attendee' : 'Add Meeting Attendee'}</DialogTitle>
                        <DialogDescription>
                            {editingAttendee ? 'Update the RSVP and attendance status.' : 'Invite a staff member to a meeting.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            {/* Meeting ID Field (only for create) */}
                            {!editingAttendee && (
                                <div className="space-y-2">
                                    <Label htmlFor="meeting_id" className={fieldErrors.meeting_id ? 'text-red-500' : ''}>
                                        Meeting *
                                    </Label>
                                    <Select
                                        value={formData.meeting_id}
                                        onValueChange={(v) => {
                                            setFormData({ ...formData, meeting_id: v });
                                            clearFieldError('meeting_id');
                                        }}
                                    >
                                        <SelectTrigger className={fieldErrors.meeting_id ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Select objective meeting" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {meetings.map((m) => (
                                                <SelectItem key={m.id} value={m.id.toString()}>
                                                    {m.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {renderError('meeting_id')}
                                </div>
                            )}

                            {/* Staff Member ID Field (only for create) */}
                            {!editingAttendee && (
                                <div className="space-y-2">
                                    <Label htmlFor="staff_member_id" className={fieldErrors.staff_member_id ? 'text-red-500' : ''}>
                                        Employee *
                                    </Label>
                                    <Select
                                        value={formData.staff_member_id}
                                        onValueChange={(v) => {
                                            setFormData({ ...formData, staff_member_id: v });
                                            clearFieldError('staff_member_id');
                                        }}
                                    >
                                        <SelectTrigger className={fieldErrors.staff_member_id ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Select staff member" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {employees.map((e) => (
                                                <SelectItem key={e.id} value={e.id.toString()}>
                                                    {e.full_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {renderError('staff_member_id')}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                {/* Status Field (for both create and update) */}
                                <div className="space-y-2">
                                    <Label htmlFor="status" className={fieldErrors.status ? 'text-red-500' : ''}>
                                        Status
                                    </Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(v) => {
                                            setFormData({ ...formData, status: v });
                                            clearFieldError('status');
                                        }}
                                    >
                                        <SelectTrigger className={fieldErrors.status ? 'border-red-500' : ''}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="invited">Invited</SelectItem>
                                            <SelectItem value="accepted">Accepted</SelectItem>
                                            <SelectItem value="declined">Declined</SelectItem>
                                            <SelectItem value="attended">Attended</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {renderError('status')}
                                </div>
                                
                                {/* Organizer Checkbox (for both create and update) */}
                                <div className="flex items-center space-x-2 pt-8">
                                    <input
                                        type="checkbox"
                                        id="is_organizer"
                                        checked={formData.is_organizer}
                                        onChange={(e) => {
                                            setFormData({ ...formData, is_organizer: e.target.checked });
                                            clearFieldError('is_organizer');
                                        }}
                                        className={`h-4 w-4 rounded border-gray-300 text-solarized-blue focus:ring-solarized-blue ${
                                            fieldErrors.is_organizer ? 'border-red-500' : ''
                                        }`}
                                    />
                                    <Label htmlFor="is_organizer" className={fieldErrors.is_organizer ? 'text-red-500' : ''}>
                                        Organizer
                                    </Label>
                                </div>
                                {renderError('is_organizer')}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => {
                                    setIsDialogOpen(false);
                                    setFieldErrors({});
                                }}
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                className="bg-solarized-blue hover:bg-solarized-blue/90"
                                disabled={isSubmitting}
                            >
                                {isSubmitting 
                                    ? (editingAttendee ? 'Saving...' : 'Creating...') 
                                    : (editingAttendee ? 'Save Changes' : 'Invite Attendee')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Attendee Details</DialogTitle>
                        <DialogDescription>
                            Invitation and status details.
                        </DialogDescription>
                    </DialogHeader>
                    {viewingAttendee && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">Name</Label>
                                    <p className="font-medium text-lg">
                                        {viewingAttendee.staff_member?.full_name}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Status</Label>
                                    <div className="mt-1">{getStatusBadge(viewingAttendee.status)}</div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-muted-foreground">Meeting</Label>
                                <p className="font-medium">{viewingAttendee.meeting?.title || 'N/A'}</p>
                                <p className="text-sm text-solarized-base01">{viewingAttendee.meeting?.date}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">Role</Label>
                                    <p className="font-medium">
                                        {viewingAttendee.is_organizer ? 'Organizer' : 'Participant'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}