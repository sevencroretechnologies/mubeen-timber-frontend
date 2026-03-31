import { useState, useEffect, useCallback } from 'react';
import { meetingTypeService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import {
    Card,
    CardContent,
    CardHeader,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ui/status-badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
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
import DataTable, { TableColumn } from 'react-data-table-component';
import {
    Plus,
    Search,
    MoreHorizontal,
    Edit,
    Trash2,
    Settings,
    Clock,
    Palette,
    Eye,
    Calendar,
} from 'lucide-react';

interface MeetingType {
    id: number;
    title: string;
    description: string;
    default_duration: number;
    color: string;
    status: 'active' | 'inactive';
    meetings_count?: number;
}

export default function MeetingTypes() {
    const [types, setTypes] = useState<MeetingType[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRows, setTotalRows] = useState(0);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingType, setEditingType] = useState<MeetingType | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        default_duration: 60,
        color: '#6366f1',
        status: 'active' as 'active' | 'inactive',
    });
    const [viewingType, setViewingType] = useState<MeetingType | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

    // ================= FETCH TYPES =================
    const fetchTypes = useCallback(
        async (currentPage: number = 1) => {
            setIsLoading(true);
            try {
                const params: Record<string, unknown> = {
                    page: currentPage,
                    per_page: perPage,
                    search,
                };

                const response = await meetingTypeService.getAll(params);

                if (response.data.success) {
                    const data = response.data.data;
                    const meta = response.data.meta;

                    if (Array.isArray(data)) {
                        setTypes(data);
                        setTotalRows(meta?.total ?? data.length);
                    } else {
                        setTypes([]);
                        setTotalRows(0);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch meeting types:', error);
                // showAlert('error', 'Error', getErrorMessage(error, 'Failed to fetch meeting types'));
                setTypes([]);
                setTotalRows(0);
            } finally {
                setIsLoading(false);
            }
        },
        [perPage, search]
    );

    useEffect(() => {
        fetchTypes(page);
    }, [page, fetchTypes]);

    // ================= VALIDATION =================
    const validateForm = () => {
        const errors: Record<string, string> = {};
        let isValid = true;

        // Title validation (required, max 255 chars)
        if (!formData.title.trim()) {
            errors.title = 'Title is required';
            isValid = false;
        } else if (formData.title.length > 255) {
            errors.title = 'Title cannot exceed 255 characters';
            isValid = false;
        }

        // Default duration validation (nullable, integer, min 15 if provided)
        if (formData.default_duration !== undefined && formData.default_duration !== null) {
            const duration = Number(formData.default_duration);
            if (isNaN(duration) || !Number.isInteger(duration)) {
                errors.default_duration = 'Duration must be a whole number';
                isValid = false;
            } else if (duration < 15) {
                errors.default_duration = 'Duration must be at least 15 minutes';
                isValid = false;
            }
        }

        // Color validation (nullable, max 20 chars if provided)
        if (formData.color && formData.color.length > 20) {
            errors.color = 'Color value cannot exceed 20 characters';
            isValid = false;
        } else if (formData.color && !isValidColor(formData.color)) {
            errors.color = 'Please enter a valid color value (e.g., #6366f1 or blue)';
            isValid = false;
        }

        // Status validation (must be 'active' or 'inactive')
        if (formData.status && !['active', 'inactive'].includes(formData.status)) {
            errors.status = 'Status must be either active or inactive';
            isValid = false;
        }

        setFieldErrors(errors);
        return isValid;
    };

    const isValidColor = (color: string) => {
        // Check if it's a valid hex color (e.g., #fff, #ffffff)
        if (color.startsWith('#')) {
            return /^#([A-Fa-f0-9]{3}){1,2}$/.test(color);
        }
        // Check if it's a valid color name or rgb/rgba/hsl/hsla
        // For simplicity, we'll accept any string up to 20 chars for named colors
        return color.length <= 20;
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

    // ================= DELETE =================
    const handleDelete = async (id: number) => {
        const result = await showConfirmDialog(
            'Are you sure?',
            'You want to delete this meeting type?'
        );

        if (!result.isConfirmed) return;

        try {
            await meetingTypeService.delete(id);
            showAlert('success', 'Deleted!', 'Meeting type deleted successfully', 2000);
            fetchTypes(page);
        } catch (error) {
            console.error('Failed to delete meeting type:', error);
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete meeting type'));
        }
    };

    // ================= FORM HANDLERS =================
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
            if (editingType) {
                await meetingTypeService.update(editingType.id, formData);
                showAlert('success', 'Updated', 'Meeting type updated successfully');
            } else {
                await meetingTypeService.create(formData);
                showAlert('success', 'Created', 'Meeting type created successfully');
            }
            setIsDialogOpen(false);
            resetForm();
            fetchTypes(page);
        } catch (error: any) {
            console.error('Failed to save meeting type:', error);

            if (error.response?.data?.errors) {
                // Handle API validation errors
                const apiErrors: Record<string, string> = {};
                Object.keys(error.response.data.errors).forEach((key) => {
                    apiErrors[key] = error.response.data.errors[key][0];
                });
                setFieldErrors(apiErrors);
                showAlert('error', 'Validation Error', 'Please fix the errors highlighted below.');
            } else {
                showAlert('error', 'Error', getErrorMessage(error, 'Failed to save meeting type'));
                setIsDialogOpen(false);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            default_duration: 60,
            color: '#6366f1',
            status: 'active',
        });
        setEditingType(null);
        setFieldErrors({});
    };

    // ================= HELPERS =================


    // ================= TABLE COLUMNS =================
    const columns: TableColumn<MeetingType>[] = [
        {
            name: 'Title',
            selector: (row) => row.title,
            cell: (row) => (
                <div className="py-2">
                    <p className="font-medium">{row.title}</p>
                </div>
            ),
            sortable: true,
        },
        {
            name: 'Description',
            selector: (row) => row.description || '',
            cell: (row) => (
                <p className="text-sm text-muted-foreground line-clamp-2 py-2">
                    {row.description || '-'}
                </p>
            ),
            sortable: true,
        },
        {
            name: 'Duration',
            selector: (row) => row.default_duration,
            cell: (row) => (
                <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span>{row.default_duration} mins</span>
                </div>
            ),
            width: '120px',
        },
        {
            name: 'Color',
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: row.color }}
                    />
                    <span className="text-xs font-mono">{row.color}</span>
                </div>
            ),
            width: '140px',
        },
        {
            name: 'Status',
            cell: (row) => <StatusBadge status={row.status} />,
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
                        <DropdownMenuItem
                            onClick={() => {
                                setViewingType(row);
                                setIsViewDialogOpen(true);
                            }}
                        >
                            <Eye className="mr-2 h-4 w-4" />  View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => {
                                setEditingType(row);
                                setFormData({
                                    title: row.title,
                                    description: row.description || '',
                                    default_duration: row.default_duration,
                                    color: row.color,
                                    status: row.status || 'active',
                                });
                                setFieldErrors({});
                                setIsDialogOpen(true);
                            }}
                        >
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
            ignoreRowClick: true,
            width: '80px',
        },
    ];

    // ================= CUSTOM STYLES =================
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

    // ================= UI =================
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Meeting Types</h1>
                    <p className="text-muted-foreground">Manage categories and defaults for your meetings</p>
                </div>
                <Button
                    className="bg-solarized-blue hover:bg-solarized-blue/90"
                    onClick={() => {
                        resetForm();
                        setIsDialogOpen(true);
                    }}
                >
                    <Plus className="mr-2 h-4 w-4" /> Add Meeting Type
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <form onSubmit={handleSearchSubmit} className="flex gap-4">
                        <Input
                            placeholder="Search meeting types..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <Button type="submit" variant="outline">
                            <Search className="mr-2 h-4 w-4" /> Search
                        </Button>
                    </form>
                </CardHeader>

                <CardContent>
                    {!isLoading && types.length === 0 ? (
                        <div className="text-center py-12">
                            <Settings className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <p>No meeting types found</p>
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={types}
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

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingType ? 'Edit Meeting Type' : 'Add Meeting Type'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            {/* Title Field */}
                            <div className="space-y-2">
                                <Label htmlFor="title" className={fieldErrors.title ? 'text-red-500' : ''}>
                                    Title *
                                </Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => {
                                        setFormData({ ...formData, title: e.target.value });
                                        clearFieldError('title');
                                    }}
                                    placeholder="e.g., Client Sync"
                                    className={fieldErrors.title ? 'border-red-500' : ''}
                                />
                                {renderError('title')}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Duration Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="duration" className={fieldErrors.default_duration ? 'text-red-500' : ''}>
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            Duration (mins)
                                        </div>
                                    </Label>
                                    <Input
                                        id="duration"
                                        type="number"
                                        min={15}
                                        step={15}
                                        value={formData.default_duration}
                                        onChange={(e) => {
                                            setFormData({ ...formData, default_duration: parseInt(e.target.value) || 0 });
                                            clearFieldError('default_duration');
                                        }}
                                        className={fieldErrors.default_duration ? 'border-red-500' : ''}
                                    />
                                    {renderError('default_duration')}
                                </div>

                                {/* Color Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="color" className={fieldErrors.color ? 'text-red-500' : ''}>
                                        <div className="flex items-center gap-1">
                                            <Palette className="h-3 w-3" />
                                            Display Color
                                        </div>
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="color"
                                            type="color"
                                            className={`w-12 p-1 h-9 cursor-pointer ${fieldErrors.color ? 'border-red-500' : ''}`}
                                            value={formData.color}
                                            onChange={(e) => {
                                                setFormData({ ...formData, color: e.target.value });
                                                clearFieldError('color');
                                            }}
                                        />
                                        <Input
                                            value={formData.color}
                                            onChange={(e) => {
                                                setFormData({ ...formData, color: e.target.value });
                                                clearFieldError('color');
                                            }}
                                            className={`flex-1 font-mono uppercase ${fieldErrors.color ? 'border-red-500' : ''}`}
                                            maxLength={20}
                                        />
                                    </div>
                                    {renderError('color')}
                                </div>
                            </div>

                            {/* Description Field */}
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe the purpose of this meeting type..."
                                    rows={3}
                                />
                            </div>

                            {/* Status Field */}
                            <div className="space-y-2">
                                <Label htmlFor="status" className={fieldErrors.status ? 'text-red-500' : ''}>
                                    Status
                                </Label>
                                <select
                                    id="status"
                                    value={formData.status}
                                    onChange={(e) => {
                                        setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' });
                                        clearFieldError('status');
                                    }}
                                    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${fieldErrors.status ? 'border-red-500' : ''
                                        }`}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                                {renderError('status')}
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
                                    ? (editingType ? 'Saving...' : 'Creating...')
                                    : (editingType ? 'Save Changes' : 'Create Type')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* VIEW MEETING TYPE DIALOG */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Meeting Type Details</DialogTitle>
                        <DialogDescription>
                            Configuration and characteristic details for this meeting category.
                        </DialogDescription>
                    </DialogHeader>
                    {viewingType && (
                        <div className="grid gap-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">Title</Label>
                                    <p className="font-medium text-lg">{viewingType.title}</p>
                                </div>
                                <div className="text-right">
                                    <Label className="text-muted-foreground">Status</Label>
                                    <div className="mt-1"><StatusBadge status={viewingType.status} /></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> Duration
                                    </Label>
                                    <p>{viewingType.default_duration} minutes</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-3 w-3" /> Usage
                                    </Label>
                                    <p>{viewingType.meetings_count || 0} meetings</p>
                                </div>
                            </div>

                            <div>
                                <Label className="text-muted-foreground flex items-center gap-1">
                                    <Palette className="h-3 w-3" /> Display Color
                                </Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <div
                                        className="w-8 h-8 rounded-md border shadow-sm"
                                        style={{ backgroundColor: viewingType.color }}
                                    />
                                    <span className="font-mono text-sm uppercase">{viewingType.color}</span>
                                </div>
                            </div>

                            {viewingType.description && (
                                <div>
                                    <Label className="text-muted-foreground">Description</Label>
                                    <p className="text-sm mt-1 whitespace-pre-wrap text-solarized-base01">
                                        {viewingType.description}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="submit" variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}