import { useState, useEffect, useCallback } from 'react';
import { trainingService, staffService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { StatusBadge } from '../../components/ui/status-badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../../components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select';
import {
    Plus,
    Calendar,
    Clock,
    MapPin,
    User,
    Search,
    MoreHorizontal,
    Eye,
    Edit,
    Trash2,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { useAuth } from '../../context/AuthContext';
import DataTable, { TableColumn } from 'react-data-table-component';

interface Program {
    id: number;
    title: string;
}

interface Staff {
    id: number;
    first_name: string;
    last_name: string;
}

interface Session {
    id: number;
    training_program_id: number;
    session_name: string;
    date: string;
    time: string | null;
    location: string | null;
    trainer_id: number | null;
    max_participants: number;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    participants_count?: number;
    program?: Program;
    trainer?: Staff;
}

export default function Sessions() {
    const { hasPermission } = useAuth();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [staffMembers, setStaffMembers] = useState<Staff[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRows, setTotalRows] = useState(0);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [editingSession, setEditingSession] = useState<Session | null>(null);
    const [viewingSession, setViewingSession] = useState<Session | null>(null);
    const [formData, setFormData] = useState({
        training_program_id: '',
        session_name: '',
        date: '',
        time: '',
        location: '',
        trainer_id: '',
        max_participants: '20',
        status: 'scheduled',
    });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canManage = hasPermission('manage_staff_training');

    // ================= VALIDATION =================
    const validateForm = (isEditMode: boolean = false) => {
        const errors: Record<string, string> = {};
        let isValid = true;

        // Training program ID validation (required, must exist)
        if (!formData.training_program_id) {
            errors.training_program_id = 'Training program is required';
            isValid = false;
        } else {
            const programExists = programs.some(prog => prog.id.toString() === formData.training_program_id);
            if (!programExists) {
                errors.training_program_id = 'Selected training program does not exist';
                isValid = false;
            }
        }

        // Session name validation (required, max 255 chars)
        if (!formData.session_name.trim()) {
            errors.session_name = 'Session name is required';
            isValid = false;
        } else if (formData.session_name.length > 255) {
            errors.session_name = 'Session name must be less than 255 characters';
            isValid = false;
        }

        // Date validation (required, must be valid date)
        if (!formData.date) {
            errors.date = 'Date is required';
            isValid = false;
        } else {
            const date = new Date(formData.date);
            if (isNaN(date.getTime())) {
                errors.date = 'Invalid date';
                isValid = false;
            }
        }

        // Time validation (nullable, must be in HH:MM format if provided)
        if (formData.time && formData.time.trim() !== '') {
            // Check if time is in HH:MM format (24-hour)
            const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(formData.time)) {
                errors.time = 'Time must be in 24-hour format (HH:MM)';
                isValid = false;
            }
        }

        // Location validation (nullable, max 255 chars if provided)
        if (formData.location && formData.location.length > 255) {
            errors.location = 'Location must be less than 255 characters';
            isValid = false;
        }

        // Trainer ID validation (nullable, must exist if provided)
        if (formData.trainer_id && formData.trainer_id.trim() !== '') {
            const trainerExists = staffMembers.some(staff => staff.id.toString() === formData.trainer_id);
            if (!trainerExists) {
                errors.trainer_id = 'Selected trainer does not exist';
                isValid = false;
            }
        }

        // Max participants validation (nullable, integer, min: 1 if provided)
        if (formData.max_participants && formData.max_participants.trim() !== '') {
            const maxParticipants = Number(formData.max_participants);
            if (isNaN(maxParticipants) || !Number.isInteger(maxParticipants)) {
                errors.max_participants = 'Max participants must be an integer';
                isValid = false;
            } else if (maxParticipants < 1) {
                errors.max_participants = 'Max participants must be at least 1';
                isValid = false;
            }
        }

        // Status validation (for edit mode only, must be in allowed values)
        if (isEditMode) {
            if (formData.status && !['scheduled', 'in_progress', 'completed', 'cancelled'].includes(formData.status)) {
                errors.status = "Status must be 'scheduled', 'in_progress', 'completed', or 'cancelled'";
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
        setFieldErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
        });
    };

    // Helper function to format date for input
    const formatDateForInput = (dateString: string): string => {
        if (!dateString) return '';

        try {
            // If it's already in YYYY-MM-DD format
            if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return dateString;
            }

            // If it's in ISO format (2026-01-24T00:00:00.000000Z)
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        } catch (error) {
            console.error('Error formatting date:', error);
        }

        return '';
    };

    // Helper function to format time for input
    const formatTimeForInput = (timeString: string | null): string => {
        if (!timeString) return '';

        try {
            // If it's already in HH:MM format
            if (timeString.match(/^\d{2}:\d{2}$/)) {
                return timeString;
            }

            // If it's in HH:MM:SS format
            if (timeString.match(/^\d{2}:\d{2}:\d{2}$/)) {
                return timeString.substring(0, 5); // Take only HH:MM
            }

            // Try parsing as a Date object
            const [hours, minutes] = timeString.split(':');
            if (hours && minutes) {
                return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
            }
        } catch (error) {
            console.error('Error formatting time:', error);
        }

        return '';
    };

    const fetchSessions = useCallback(
        async (currentPage: number = 1) => {
            setIsLoading(true);
            try {
                const params: Record<string, unknown> = {
                    page: currentPage,
                    per_page: perPage,
                    search,
                };

                const response = await trainingService.getSessions(params);
                const payload = response.data.data;

                if (Array.isArray(payload)) {
                    setSessions(payload);
                    setTotalRows(response.data.meta?.total ?? payload.length);
                } else if (payload && Array.isArray(payload.data)) {
                    setSessions(payload.data);
                    setTotalRows(payload.total);
                } else {
                    setSessions([]);
                    setTotalRows(0);
                }
            } catch (error) {
                console.error('Failed to fetch sessions:', error);
                // showAlert('error', 'Error', 'Failed to fetch training sessions');
                setSessions([]);
                setTotalRows(0);
            } finally {
                setIsLoading(false);
            }
        },
        [perPage, search]
    );

    const fetchPrograms = async () => {
        try {
            const response = await trainingService.getPrograms({ paginate: 'false' } as any);
            const data = response.data.data || response.data;
            setPrograms(Array.isArray(data) ? data : (data.data || []));
        } catch (error) {
            console.error('Failed to fetch programs:', error);
        }
    };

    const fetchStaff = async () => {
        try {
            const response = await staffService.getAll({ paginate: 'false' } as any);
            const data = response.data.data || response.data;
            setStaffMembers(Array.isArray(data) ? data : (data.data || []));
        } catch (error) {
            console.error('Failed to fetch staff members:', error);
        }
    };

    useEffect(() => {
        fetchSessions(page);
    }, [page, fetchSessions]);

    useEffect(() => {
        fetchPrograms();
        fetchStaff();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFieldErrors({});

        // Validate form before submission
        if (!validateForm(!!editingSession)) {
            setIsSubmitting(false);
            // showAlert('error', 'Validation Error', 'Please check the form for errors.');
            return;
        }

        try {
            const payload: any = {
                training_program_id: Number(formData.training_program_id),
                session_name: formData.session_name,
                date: formData.date,
                max_participants: Number(formData.max_participants),
            };

            // Add optional fields only if they have values
            if (formData.time && formData.time.trim() !== '') {
                payload.time = formData.time;
            }
            if (formData.location && formData.location.trim() !== '') {
                payload.location = formData.location;
            }
            if (formData.trainer_id && formData.trainer_id.trim() !== '') {
                payload.trainer_id = Number(formData.trainer_id);
            }

            // Add status only for edit mode
            if (editingSession) {
                payload.status = formData.status;
            }

            if (editingSession) {
                await trainingService.updateSession(editingSession.id, payload);
                showAlert('success', 'Success', 'Session updated successfully', 2000);
            } else {
                await trainingService.createSession(payload);
                showAlert('success', 'Success', 'Session created successfully', 2000);
            }

            setIsDialogOpen(false);
            setEditingSession(null);
            resetForm();
            fetchSessions(page);
        } catch (error: any) {
            console.error('Failed to save session:', error);

            if (error.response?.data?.errors) {
                // Handle API validation errors
                const apiErrors: Record<string, string> = {};
                Object.keys(error.response.data.errors).forEach((key) => {
                    apiErrors[key] = error.response.data.errors[key][0];
                });
                setFieldErrors(apiErrors);
                showAlert('error', 'Validation Error', 'Please fix the errors highlighted below.');
            } else {
                const errorMessage = getErrorMessage(error, 'Failed to save session');
                showAlert('error', 'Error', errorMessage);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (session: Session) => {
        setEditingSession(session);
        setFormData({
            training_program_id: String(session.training_program_id),
            session_name: session.session_name,
            date: formatDateForInput(session.date), // Use the helper function
            time: formatTimeForInput(session.time), // Use the helper function
            location: session.location || '',
            trainer_id: session.trainer_id ? String(session.trainer_id) : '',
            max_participants: String(session.max_participants),
            status: session.status,
        });
        setFieldErrors({});
        setIsDialogOpen(true);
    };

    const handleView = (session: Session) => {
        setViewingSession(session);
        setIsViewDialogOpen(true);
    };

    const handleDelete = async (id: number) => {
        const result = await showConfirmDialog('Delete Session', 'Are you sure you want to delete this session?');
        if (!result.isConfirmed) return;
        try {
            await trainingService.deleteSession(id);
            fetchSessions(page);
            showAlert('success', 'Deleted!', 'Session deleted successfully', 2000);
        } catch (error) {
            console.error('Failed to delete session:', error);
            const errorMessage = getErrorMessage(error, 'Failed to delete session');
            showAlert('error', 'Error', errorMessage);
        }
    };

    const resetForm = () => {
        setFormData({
            training_program_id: '',
            session_name: '',
            date: '',
            time: '',
            location: '',
            trainer_id: '',
            max_participants: '20',
            status: 'scheduled',
        });
        setFieldErrors({});
    };



    // Format date for display in table
    const formatDisplayDate = (dateString: string): string => {
        if (!dateString) return '';

        try {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }
        } catch (error) {
            console.error('Error formatting display date:', error);
        }

        return dateString;
    };

    // ================= SEARCH =================
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
    };

    // ================= PAGINATION =================
    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handlePerRowsChange = (newPerPage: number) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    // ================= TABLE COLUMNS =================
    const columns: TableColumn<Session>[] = [
        {
            name: 'Session Name',
            selector: (row) => row.session_name,
            cell: (row) => (
                <div className="py-2">
                    <p className="font-medium">{row.session_name}</p>
                </div>
            ),
            sortable: true,
        },
        {
            name: 'Training Program',
            selector: (row) => row.program?.title || '',
            cell: (row) => (
                <span className="text-sm">
                    {row.program?.title || '-'}
                </span>
            ),
            sortable: true,
            width: '200px',
        },
        {
            name: 'Date',
            selector: (row) => row.date,
            cell: (row) => (
                <div className="text-sm">
                    <p className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {formatDisplayDate(row.date)}
                    </p>
                </div>
            ),
            width: '150px',
        },
        {
            name: 'Time',
            selector: (row) => row.time || '',
            cell: (row) => (
                <div className="text-sm">
                    {row.time && (
                        <p className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" /> {formatTimeForInput(row.time)}
                        </p>
                    )}
                </div>
            ),
            width: '150px',
        },
        {
            name: 'Location',
            selector: (row) => row.location || '',
            cell: (row) => (
                <p className="truncate text-sm">
                    {row.location || '-'}
                </p>
            ),
            width: '150px',
        },
        {
            name: 'Max Participants',
            selector: (row) => row.max_participants || '',
            cell: (row) => (
                <p className="text-sm">
                    {row.max_participants ? `${row.max_participants}` : 'TBD'}
                </p>
            ),
            width: '150px',
        },
        {
            name: 'Status',
            cell: (row) => (
                <StatusBadge status={row.status} />
            ),
            width: '120px',
        },
        {
            name: 'Actions',
            cell: (row) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(row)}>
                            <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                        {canManage && (
                            <>
                                <DropdownMenuItem onClick={() => handleEdit(row)}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleDelete(row.id)}
                                    className="text-red-600"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
            ignoreRowClick: true,
            width: '80px',
        },
    ];

    const customStyles = {
        headRow: {
            style: {
                backgroundColor: '#f9fafb',
                borderBottomWidth: '1px',
                borderBottomColor: '#e5e7eb',
                borderBottomStyle: 'solid' as const,
                minHeight: '56px',
            },
        },
        headCells: {
            style: {
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                paddingLeft: '16px',
                paddingRight: '16px',
            },
        },
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-solarized-base02">Training Sessions</h1>
                    <p className="text-solarized-base01">Manage specific training events and trainer assignments</p>
                </div>
                {canManage && (
                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) {
                            setEditingSession(null);
                            resetForm();
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button
                                className="bg-solarized-blue hover:bg-solarized-blue/90"
                                onClick={() => { setEditingSession(null); resetForm(); }}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Session
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>{editingSession ? 'Edit Session' : 'Add Session'}</DialogTitle>
                                <DialogDescription>
                                    {editingSession ? 'Update training session details.' : 'Schedule a new training session.'}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit}>
                                <div className="grid gap-4 py-4 max-h-[500px] overflow-y-auto">
                                    <div className="space-y-2">
                                        <Label htmlFor="training_program_id" className={fieldErrors.training_program_id ? 'text-red-500' : ''}>
                                            Training Program *
                                        </Label>
                                        <Select
                                            value={formData.training_program_id}
                                            onValueChange={(value) => {
                                                setFormData({ ...formData, training_program_id: value });
                                                clearFieldError('training_program_id');
                                            }}
                                            disabled={!!editingSession}
                                        >
                                            <SelectTrigger className={fieldErrors.training_program_id ? 'border-red-500' : ''}>
                                                <SelectValue placeholder="Select training program" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {programs.map((program) => (
                                                    <SelectItem key={program.id} value={String(program.id)}>
                                                        {program.title}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {renderError('training_program_id')}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="session_name" className={fieldErrors.session_name ? 'text-red-500' : ''}>
                                            Session Name *
                                        </Label>
                                        <Input
                                            id="session_name"
                                            value={formData.session_name}
                                            onChange={(e) => {
                                                setFormData({ ...formData, session_name: e.target.value });
                                                clearFieldError('session_name');
                                            }}
                                            placeholder="e.g., Q1 Ethics Seminar"
                                            className={fieldErrors.session_name ? 'border-red-500' : ''}
                                        />
                                        {renderError('session_name')}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="date" className={fieldErrors.date ? 'text-red-500' : ''}>
                                                Date *
                                            </Label>
                                            <Input
                                                id="date"
                                                type="date"
                                                value={formData.date}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, date: e.target.value });
                                                    clearFieldError('date');
                                                }}
                                                className={fieldErrors.date ? 'border-red-500' : ''}
                                            />
                                            {renderError('date')}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="time" className={fieldErrors.time ? 'text-red-500' : ''}>
                                                Time
                                            </Label>
                                            <Input
                                                id="time"
                                                type="time"
                                                value={formData.time}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, time: e.target.value });
                                                    clearFieldError('time');
                                                }}
                                                className={fieldErrors.time ? 'border-red-500' : ''}
                                            />
                                            {renderError('time')}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="location" className={fieldErrors.location ? 'text-red-500' : ''}>
                                            Location
                                        </Label>
                                        <Input
                                            id="location"
                                            value={formData.location}
                                            onChange={(e) => {
                                                setFormData({ ...formData, location: e.target.value });
                                                clearFieldError('location');
                                            }}
                                            placeholder="e.g., Conference Room B or Zoom Link"
                                            className={fieldErrors.location ? 'border-red-500' : ''}
                                        />
                                        {renderError('location')}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="trainer_id" className={fieldErrors.trainer_id ? 'text-red-500' : ''}>
                                                Trainer
                                            </Label>
                                            <Select
                                                value={formData.trainer_id}
                                                onValueChange={(value) => {
                                                    setFormData({ ...formData, trainer_id: value });
                                                    clearFieldError('trainer_id');
                                                }}
                                            >
                                                <SelectTrigger className={fieldErrors.trainer_id ? 'border-red-500' : ''}>
                                                    <SelectValue placeholder="Select trainer" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {staffMembers.map((staff) => (
                                                        <SelectItem key={staff.id} value={String(staff.id)}>
                                                            {staff.first_name} {staff.last_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {renderError('trainer_id')}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="max_participants" className={fieldErrors.max_participants ? 'text-red-500' : ''}>
                                                Max Participants
                                            </Label>
                                            <Input
                                                id="max_participants"
                                                type="number"
                                                min="1"
                                                value={formData.max_participants}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, max_participants: e.target.value });
                                                    clearFieldError('max_participants');
                                                }}
                                                className={fieldErrors.max_participants ? 'border-red-500' : ''}
                                            />
                                            {renderError('max_participants')}
                                        </div>
                                    </div>
                                    {editingSession && (
                                        <div className="space-y-2">
                                            <Label htmlFor="status" className={fieldErrors.status ? 'text-red-500' : ''}>
                                                Status
                                            </Label>
                                            <Select
                                                value={formData.status}
                                                onValueChange={(value) => {
                                                    setFormData({ ...formData, status: value as any });
                                                    clearFieldError('status');
                                                }}
                                            >
                                                <SelectTrigger className={fieldErrors.status ? 'border-red-500' : ''}>
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                                    <SelectItem value="completed">Completed</SelectItem>
                                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {renderError('status')}
                                        </div>
                                    )}
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
                                        {isSubmitting ? 'Saving...' : (editingSession ? 'Update' : 'Create')}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* View Details Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Session Details</DialogTitle>
                    </DialogHeader>
                    {viewingSession && (
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-solarized-base01">Session Name</p>
                                <p className="font-medium text-lg">{viewingSession.session_name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-solarized-base01">Program</p>
                                <p>{viewingSession.program?.title || 'Unknown Program'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-solarized-base01">Date & Time</p>
                                    <p className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4 text-solarized-blue" />
                                        {formatDisplayDate(viewingSession.date)}
                                    </p>
                                    <p className="flex items-center gap-1 mt-1">
                                        <Clock className="h-4 w-4 text-solarized-blue" />
                                        {viewingSession.time ? formatTimeForInput(viewingSession.time) : 'TBD'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-solarized-base01">Trainer</p>
                                    <p className="flex items-center gap-1">
                                        <User className="h-4 w-4 text-solarized-green" />
                                        {viewingSession.trainer ? `${viewingSession.trainer.first_name} ${viewingSession.trainer.last_name}` : 'No trainer assigned'}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-solarized-base01">Location</p>
                                <p className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4 text-solarized-red" />
                                    {viewingSession.location || 'No location set'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-solarized-base01">Status</p>
                                <StatusBadge status={viewingSession.status} />
                            </div>
                            <div>
                                <p className="text-sm text-solarized-base01">Participants</p>
                                <p>{viewingSession.participants_count || 0} / {viewingSession.max_participants} enrolled</p>
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

            <Card className="border-0 shadow-md">
                <CardHeader>
                    <form onSubmit={handleSearchSubmit} className="flex gap-4">
                        <Input
                            placeholder="Search sessions..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <Button type="submit" variant="outline">
                            <Search className="mr-2 h-4 w-4" /> Search
                        </Button>
                    </form>
                </CardHeader>

                <CardContent>
                    {!isLoading && sessions.length === 0 ? (
                        <div className="text-center py-12">
                            <Calendar className="mx-auto h-12 w-12 text-solarized-base01 mb-4" />
                            <h3 className="text-lg font-medium text-solarized-base02">No training sessions found</h3>
                            <p className="text-solarized-base01 mt-1">Create your first session to get started.</p>
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={sessions}
                            progressPending={isLoading}
                            pagination
                            paginationServer
                            paginationTotalRows={totalRows}
                            paginationPerPage={perPage}
                            paginationDefaultPage={page}
                            onChangePage={handlePageChange}
                            onChangeRowsPerPage={handlePerRowsChange}
                            customStyles={customStyles}
                            highlightOnHover
                            responsive
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}