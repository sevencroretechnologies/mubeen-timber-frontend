import { useState, useEffect, useCallback } from 'react';
import { meetingMinuteService, meetingService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
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
    FileText,
    Clock,
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
import { Textarea } from '../../components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select';
import DataTable, { TableColumn } from 'react-data-table-component';

interface MeetingMinute {
    id: number;
    meeting_id: number;
    content: string;
    creator?: {
        id: number;
        name: string;
    };
    created_at: string;
    meeting?: {
        id: number;
        title: string;
        date: string;
    };
}

export default function MeetingMinutes() {
    const [minutes, setMinutes] = useState<MeetingMinute[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRows, setTotalRows] = useState(0);

    // Modal State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingMinute, setEditingMinute] = useState<MeetingMinute | null>(null);
    const [meetings, setMeetings] = useState<{ id: number; title: string; date: string }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // View Modal State
    const [viewingMinute, setViewingMinute] = useState<MeetingMinute | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

    const [formData, setFormData] = useState({
        meeting_id: '',
        content: '',
    });

    // ================= VALIDATION =================
    const validateForm = () => {
        const errors: Record<string, string> = {};
        let isValid = true;

        // For create: meeting_id is required
        if (!editingMinute && !formData.meeting_id) {
            errors.meeting_id = 'Meeting is required';
            isValid = false;
        }

        // For create: meeting must exist in meetings list
        if (!editingMinute && formData.meeting_id) {
            const meetingExists = meetings.some(m => m.id.toString() === formData.meeting_id);
            if (!meetingExists) {
                errors.meeting_id = 'Selected meeting does not exist';
                isValid = false;
            }
        }

        // Content is always required (for both create and update)
        if (!formData.content.trim()) {
            errors.content = 'Content is required';
            isValid = false;
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
            const [meetingsRes] = await Promise.all([
                meetingService.getAll({ per_page: 100 }),
            ]);
            if (meetingsRes.data.success) {
                setMeetings(meetingsRes.data.data.data || meetingsRes.data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch metadata:', error);
        }
    }, []);

    const fetchMinutes = useCallback(async (currentPage: number = 1) => {
        setIsLoading(true);
        try {
            const response = await meetingMinuteService.getAll({
                page: currentPage,
                per_page: perPage,
                search,
            });
            const resData = response.data.data;
            if (Array.isArray(resData)) {
                setMinutes(resData);
                setTotalRows(response.data.meta?.total || resData.length);
            } else {
                setMinutes(resData.data || []);
                setTotalRows(resData.total || 0);
            }
        } catch (error) {
            console.error('Failed to fetch minutes:', error);
            showAlert('error', 'Error', 'Failed to fetch meeting minutes');
        } finally {
            setIsLoading(false);
        }
    }, [perPage, search]);

    useEffect(() => {
        fetchMinutes(page);
    }, [page, fetchMinutes]);

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
                meeting_id: editingMinute ? editingMinute.meeting_id : Number(formData.meeting_id),
                content: formData.content,
            };

            if (editingMinute) {
                await meetingMinuteService.update(editingMinute.id, payload);
                showAlert('success', 'Updated', 'Meeting minute updated successfully');
            } else {
                await meetingMinuteService.create(payload);
                showAlert('success', 'Success', 'Meeting minute recorded successfully');
            }

            setIsDialogOpen(false);
            resetForm();
            fetchMinutes(page);
        } catch (error: any) {
            console.error('Failed to save minute:', error);
            
            if (error.response?.data?.errors) {
                // Handle API validation errors
                const apiErrors: Record<string, string> = {};
                Object.keys(error.response.data.errors).forEach((key) => {
                    apiErrors[key] = error.response.data.errors[key][0];
                });
                setFieldErrors(apiErrors);
                showAlert('error', 'Validation Error', 'Please fix the errors highlighted below.');
            } else {
                showAlert('error', 'Error', getErrorMessage(error, 'Failed to save meeting minute'));
                setIsDialogOpen(false);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            meeting_id: '',
            content: '',
        });
        setEditingMinute(null);
        setFieldErrors({});
    };

    const handleEdit = (minute: MeetingMinute) => {
        setEditingMinute(minute);
        setFormData({
            meeting_id: minute.meeting_id.toString(),
            content: minute.content,
        });
        setFieldErrors({});
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: number) => {
        const result = await showConfirmDialog(
            'Are you sure?',
            'You want to delete this meeting minute?'
        );
        if (result.isConfirmed) {
            try {
                await meetingMinuteService.delete(id);
                showAlert('success', 'Deleted', 'Meeting minute deleted successfully');
                fetchMinutes(page);
            } catch (error) {
                showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete minute'));
            }
        }
    };

    const columns: TableColumn<MeetingMinute>[] = [
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
            name: 'Content',
            selector: (row) => row.content,
            cell: (row) => (
                <p className="max-w-[400px] text-sm text-muted-foreground py-2 leading-relaxed">
                    {row.content}
                </p>
            ),
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
                            setViewingMinute(row);
                            setIsViewDialogOpen(true);
                        }}>
                            <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(row)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => handleDelete(row.id)}
                            className="text-red-600"
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
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
                    <h1 className="text-2xl font-bold text-solarized-base02">Meeting Minutes</h1>
                    <p className="text-solarized-base01">Track discussions and decisions from meetings</p>
                </div>
                <Button
                    className="bg-solarized-blue hover:bg-solarized-blue/90"
                    onClick={() => {
                        resetForm();
                        setIsDialogOpen(true);
                    }}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Minute
                </Button>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
                <Card className="border-0 shadow-sm bg-white">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <FileText className="h-5 w-5 text-solarized-blue" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Minutes</p>
                                <p className="text-xl font-bold text-solarized-base02">{totalRows}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-white">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-green-50 rounded-lg">
                                <Badge variant="outline" className="h-5 w-5 p-0 flex items-center justify-center border-green-600 text-green-600">D</Badge>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Latest Entry</p>
                                <p className="text-xl font-bold text-solarized-base02">
                                    {minutes[0]?.created_at ? new Date(minutes[0].created_at).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-white">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-orange-50 rounded-lg">
                                <Clock className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Meetings Covered</p>
                                <p className="text-xl font-bold text-solarized-base02">
                                    {new Set(minutes.map(m => m.meeting_id)).size}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        {/* <CardTitle className="text-lg font-semibold">Discussion Log</CardTitle> */}
                        <div className="flex items-center gap-4">
                            <Input
                                placeholder="Search topics..."
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
                        data={minutes}
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
                                No meeting minutes recorded yet.
                            </div>
                        }
                    />
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingMinute ? 'Edit Minute' : 'Add Meeting Minute'}</DialogTitle>
                        <DialogDescription>
                            Record a significant point from the meeting.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            {/* Meeting ID Field (only for create) */}
                            {!editingMinute && (
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
                            )}

                            {/* Content Field */}
                            <div className="space-y-2">
                                <Label htmlFor="content" className={fieldErrors.content ? 'text-red-500' : ''}>
                                    Minute Content *
                                </Label>
                                <Textarea
                                    id="content"
                                    placeholder="Enter meeting notes, decisions, or discussion points..."
                                    value={formData.content}
                                    onChange={(e) => {
                                        setFormData({ ...formData, content: e.target.value });
                                        clearFieldError('content');
                                    }}
                                    rows={8}
                                    className={fieldErrors.content ? 'border-red-500' : ''}
                                />
                                {renderError('content')}
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
                                    ? (editingMinute ? 'Saving...' : 'Creating...') 
                                    : (editingMinute ? 'Save Changes' : 'Record Minute')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Meeting Minute Details</DialogTitle>
                        <DialogDescription>
                            Full details of the recorded minute.
                        </DialogDescription>
                    </DialogHeader>
                    {viewingMinute && (
                        <div className="grid gap-4 py-4">
                            <div className="space-y-1">
                                <Label className="text-muted-foreground">Meeting</Label>
                                <p className="font-medium text-lg">{viewingMinute.meeting?.title || 'N/A'}</p>
                                <p className="text-sm text-solarized-base01">{viewingMinute.meeting?.date}</p>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-muted-foreground">Content</Label>
                                <div className="p-4 bg-muted/50 rounded-lg text-sm leading-relaxed whitespace-pre-wrap">
                                    {viewingMinute.content}
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