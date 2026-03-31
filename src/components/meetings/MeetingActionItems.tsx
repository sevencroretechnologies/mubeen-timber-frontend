import { useState, useEffect, useCallback } from 'react';
import { meetingActionItemService, meetingService, staffService } from '../../services/api';
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
    CheckSquare,
    AlertCircle,
    TrendingUp,
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

interface MeetingActionItem {
    id: number;
    meeting_id: number;
    title: string;
    assigned_to: number | null;
    due_date: string;
    meeting?: {
        id: number;
        title: string;
    };
    assigned_employee?: {
        id: number;
        full_name: string;
        last_name: string;
    };
}

export default function MeetingActionItems() {
    const { hasPermission } = useAuth();
    const [actionItems, setActionItems] = useState<MeetingActionItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRows, setTotalRows] = useState(0);

    // Modal State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MeetingActionItem | null>(null);
    const [meetings, setMeetings] = useState<{ id: number; title: string }[]>([]);
    const [employees, setEmployees] = useState<{ id: number; full_name: string; last_name: string }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // View Modal State
    const [viewingItem, setViewingItem] = useState<MeetingActionItem>();
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

    const [formData, setFormData] = useState({
        meeting_id: '',
        title: '',
        assigned_to: '',
        due_date: '',
    });

    // ================= VALIDATION =================
    const validateForm = () => {
        const errors: Record<string, string> = {};
        let isValid = true;

        // Meeting ID validation (required)
        if (!formData.meeting_id) {
            errors.meeting_id = 'Meeting is required';
            isValid = false;
        }

        // Title validation (required, max 255 chars)
        if (!formData.title.trim()) {
            errors.title = 'Title is required';
            isValid = false;
        } else if (formData.title.length > 255) {
            errors.title = 'Title cannot exceed 255 characters';
            isValid = false;
        }

        // Assigned To validation (nullable, but must exist if provided)
        if (formData.assigned_to) {
            // Check if the selected assigned_to exists in employees list
            const employeeExists = employees.some(emp => emp.id.toString() === formData.assigned_to);
            if (!employeeExists) {
                errors.assigned_to = 'Selected employee does not exist';
                isValid = false;
            }
        }

        // Due Date validation (nullable, must be valid date if provided)
        if (formData.due_date) {
            const dueDate = new Date(formData.due_date);
            if (isNaN(dueDate.getTime())) {
                errors.due_date = 'Invalid date format';
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
            debugger;
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

    const fetchActionItems = useCallback(async (currentPage: number = 1) => {
        setIsLoading(true);
        try {
            const response = await meetingActionItemService.getAll({
                page: currentPage,
                per_page: perPage,
                search,
            });
            const resData = response.data.data;
            if (Array.isArray(resData)) {
                setActionItems(resData);
                setTotalRows(response.data.meta?.total || resData.length);
            } else {
                setActionItems(resData.data || []);
                setTotalRows(resData.total || 0);
            }
        } catch (error) {
            console.error('Failed to fetch action items:', error);
            showAlert('error', 'Error', 'Failed to fetch meeting action items');
        } finally {
            setIsLoading(false);
        }
    }, [perPage, search]);

    useEffect(() => {
        fetchActionItems(page);
    }, [page, fetchActionItems]);

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
            const payload = {
                ...formData,
                meeting_id: Number(formData.meeting_id),
                assigned_to: formData.assigned_to ? Number(formData.assigned_to) : null,
            };

            if (editingItem) {
                await meetingActionItemService.update(editingItem.id, payload);
                showAlert('success', 'Updated', 'Action item updated successfully');
            } else {
                await meetingActionItemService.create(payload);
                showAlert('success', 'Success', 'Action item created successfully');
            }

            setIsDialogOpen(false);
            resetForm();
            fetchActionItems(page);
        } catch (error: any) {
            console.error('Failed to save action item:', error);

            if (error.response?.data?.errors) {
                // Handle API validation errors
                const apiErrors: Record<string, string> = {};
                Object.keys(error.response.data.errors).forEach((key) => {
                    apiErrors[key] = error.response.data.errors[key][0];
                });
                setFieldErrors(apiErrors);
                showAlert('error', 'Validation Error', 'Please fix the errors highlighted below.');
            } else {
                showAlert('error', 'Error', getErrorMessage(error, 'Failed to save action item'));
                setIsDialogOpen(false);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            meeting_id: '',
            title: '',
            assigned_to: '',
            due_date: '',
        });
        setEditingItem(null);
        setFieldErrors({});
    };

    const handleEdit = (item: MeetingActionItem) => {
        setEditingItem(item);
        setFormData({
            meeting_id: item.meeting_id.toString(),
            title: item.title,
            assigned_to: item.assigned_to?.toString() || '',
            due_date: item.due_date || '',
        });
        setFieldErrors({});
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: number) => {
        const result = await showConfirmDialog(
            'Are you sure?',
            'You want to delete this action item?'
        );
        if (result.isConfirmed) {
            try {
                await meetingActionItemService.delete(id);
                showAlert('success', 'Deleted', 'Action item deleted successfully');
                fetchActionItems(page);
            } catch (error) {
                showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete action item'));
            }
        }
    };

    const isOverdue = (dueDate: string) => {
        if (!dueDate) return false;
        return new Date(dueDate) < new Date();
    };

    const columns: TableColumn<MeetingActionItem>[] = [
        {
            name: 'Meeting',
            selector: (row) => row.meeting?.title || '',
            cell: (row) => (
                <div className="py-2">
                    {/* <p className="font-medium">{row.title}</p> */}
                    <p className="text-xs text-muted-foreground">{row.meeting?.title || 'N/A'}</p>
                </div>
            ),
            sortable: true,
        },

        {
            name: 'Action Item',
            selector: (row) => row.title,
            cell: (row) => (
                <div className="py-2">
                    <p className="font-medium">{row.title}</p>
                    {/* <p className="text-xs text-muted-foreground">{row.meeting?.title || 'N/A'}</p> */}
                </div>
            ),
            sortable: true,
        },
        {
            name: 'Assigned To',
            selector: (row) => `${row.assigned_employee?.full_name} `,
            cell: (row) => (
                <span>
                    {row.assigned_employee ? `${row.assigned_employee.full_name}` : 'Unassigned'}
                </span>
            ),
            sortable: true,
        },
        {
            name: 'Due Date',
            selector: (row) => row.due_date || '-',
            cell: (row) => (
                <div>
                    <p className={isOverdue(row.due_date) ? 'text-red-600 font-medium' : 'font-medium'}>
                        {row.due_date ? new Date(row.due_date).toLocaleDateString() : '-'}
                    </p>
                    {isOverdue(row.due_date) && (
                        <span className="text-[10px] text-red-500 uppercase font-bold">Overdue</span>
                    )}
                </div>
            ),
            sortable: true,
            width: '130px',
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
                            setViewingItem(row);
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
                    <h1 className="text-2xl font-bold text-solarized-base02">Action Items</h1>
                    <p className="text-solarized-base01">Track and manage tasks assigned during meetings</p>
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
                        Add Action Item
                    </Button>
                )}
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
                <Card className="border-0 shadow-sm bg-white">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <CheckSquare className="h-5 w-5 text-solarized-blue" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Tasks</p>
                                <p className="text-xl font-bold text-solarized-base02">{totalRows}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-white">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-red-50 rounded-lg">
                                <AlertCircle className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Overdue</p>
                                <p className="text-xl font-bold text-solarized-base02">
                                    {actionItems.filter(i => isOverdue(i.due_date)).length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-white">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-green-50 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Completion Rate</p>
                                <p className="text-xl font-bold text-solarized-base02">
                                    {totalRows > 0 ? '100%' : '0%'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        {/* <CardTitle className="text-lg font-semibold">Task Tracking</CardTitle> */}
                        <div className="flex gap-4">
                            <Input
                                placeholder="Search action items..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            // className="w-64"
                            />
                            <Button variant="outline" size="icon" className='w-40'>
                                <Search className="h-4 w-4" /> Search
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={actionItems}
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
                                No action items found.
                            </div>
                        }
                    />
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit Action Item' : 'New Action Item'}</DialogTitle>
                        <DialogDescription>
                            Assign a new task related to the selected meeting.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            {/* Meeting ID Field */}
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
                                        <SelectValue placeholder="Select meeting" />
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

                            {/* Title Field */}
                            <div className="space-y-2">
                                <Label htmlFor="title" className={fieldErrors.title ? 'text-red-500' : ''}>
                                    Action Item Title *
                                </Label>
                                <Input
                                    id="title"
                                    placeholder="e.g., Finalize Q3 Roadmap"
                                    value={formData.title}
                                    onChange={(e) => {
                                        setFormData({ ...formData, title: e.target.value });
                                        clearFieldError('title');
                                    }}
                                    className={fieldErrors.title ? 'border-red-500' : ''}
                                />
                                {renderError('title')}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Assigned To Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="assigned_to" className={fieldErrors.assigned_to ? 'text-red-500' : ''}>
                                        Assign To
                                    </Label>
                                    <Select
                                        value={formData.assigned_to}
                                        onValueChange={(v) => {
                                            setFormData({ ...formData, assigned_to: v });
                                            clearFieldError('assigned_to');
                                        }}
                                    >
                                        <SelectTrigger className={fieldErrors.assigned_to ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Select employee" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {employees.map((e) => (
                                                <SelectItem key={e.id} value={e.id.toString()}>
                                                    {e.full_name} {e.last_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {renderError('assigned_to')}
                                </div>

                                {/* Due Date Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="due_date" className={fieldErrors.due_date ? 'text-red-500' : ''}>
                                        Due Date
                                    </Label>
                                    <Input
                                        type="date"
                                        value={formData.due_date}
                                        onChange={(e) => {
                                            setFormData({ ...formData, due_date: e.target.value });
                                            clearFieldError('due_date');
                                        }}
                                        className={fieldErrors.due_date ? 'border-red-500' : ''}
                                    />
                                    {renderError('due_date')}
                                </div>
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
                                    ? (editingItem ? 'Saving...' : 'Creating...')
                                    : (editingItem ? 'Save Changes' : 'Create Action Item')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Action Item Details</DialogTitle>
                        <DialogDescription>
                            Full details of the assigned task.
                        </DialogDescription>
                    </DialogHeader>
                    {viewingItem && (
                        <div className="grid gap-4 py-4">
                            <div className="space-y-1">
                                <Label className="text-muted-foreground">Action Item</Label>
                                <p className="font-medium text-lg">{viewingItem.title}</p>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-muted-foreground">Meeting</Label>
                                <p className="font-medium">{viewingItem.meeting?.title || 'N/A'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">Assigned To</Label>
                                    <p className="font-medium">
                                        {viewingItem.assigned_employee
                                            ? `${viewingItem.assigned_employee.full_name} ${viewingItem.assigned_employee.last_name}`
                                            : 'Unassigned'}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Due Date</Label>
                                    <p className={isOverdue(viewingItem.due_date) ? 'font-medium text-red-600' : 'font-medium'}>
                                        {viewingItem.due_date ? new Date(viewingItem.due_date).toLocaleDateString() : '-'}
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