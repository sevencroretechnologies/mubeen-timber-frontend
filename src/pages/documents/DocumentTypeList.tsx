import { useState, useEffect, useCallback } from 'react';
import { documentTypeService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Badge } from '../../components/ui/badge';
import { StatusBadge } from '../../components/ui/status-badge';
import {
    Plus,
    Search,
    MoreHorizontal,
    Edit,
    Trash2,
    FileText,
    Eye,
} from 'lucide-react';
import DataTable, { TableColumn } from 'react-data-table-component';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select';

interface DocumentType {
    id: number;
    title: string;
    notes: string | null;
    owner_type_id: number | null;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

// Define owner types based on your PHP enum
const ownerTypeOptions = [
    { id: 1, value: 'employee', label: 'Employee' },
    { id: 2, value: 'company', label: 'Company' },
    { id: 3, value: 'accountant', label: 'Accountant' },
];

// Helper function to get owner type by ID
const getOwnerTypeById = (id: number | null) => {
    if (!id) return null;
    return ownerTypeOptions.find(option => option.id === id) || null;
};



export default function DocumentTypeList() {
    const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Pagination & Sorting State
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRows, setTotalRows] = useState(0);
    const [sortField, setSortField] = useState<string>('');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Dialog state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingDocumentType, setEditingDocumentType] = useState<DocumentType | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        notes: '',
        owner_type: '', // Use string value, not ID
        is_active: true,
    });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // View dialog state
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [viewingDocumentType, setViewingDocumentType] = useState<DocumentType | null>(null);

    // Fetch document types with pagination
    const fetchDocumentTypes = useCallback(
        async (currentPage: number = 1) => {
            setIsLoading(true);
            try {
                const params: Record<string, unknown> = {
                    page: currentPage,
                    per_page: perPage,
                    search: searchQuery,
                };

                if (sortField) {
                    params.order_by = sortField;
                    params.order = sortDirection;
                }

                const response = await documentTypeService.getAll(params);
                const { data, meta } = response.data;

                if (Array.isArray(data)) {
                    setDocumentTypes(data);
                    setTotalRows(meta?.total ?? 0);
                } else {
                    setDocumentTypes([]);
                    setTotalRows(0);
                }
            } catch (error) {
                console.error('Failed to fetch document types:', error);
                setDocumentTypes([]);
                setTotalRows(0);
            } finally {
                setIsLoading(false);
            }
        },
        [perPage, searchQuery, sortField, sortDirection]
    );

    useEffect(() => {
        fetchDocumentTypes(page);
    }, [page, fetchDocumentTypes]);

    // Search Handler
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchQuery(searchInput);
        setPage(1);
    };

    // Pagination Handlers
    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handlePerRowsChange = (newPerPage: number) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    // Sorting Handler - Only Title column is sortable
    const handleSort = (column: TableColumn<DocumentType>, sortDirection: 'asc' | 'desc') => {
        if (column.name === 'Title') {
            setSortField('title');
            setSortDirection(sortDirection);
            setPage(1);
        }
    };

    // Form Validation
    const validateForm = () => {
        const errors: Record<string, string> = {};
        let isValid = true;

        // Title validation
        if (!formData.title.trim()) {
            errors.title = 'Title is required';
            isValid = false;
        } else if (formData.title.length > 255) {
            errors.title = 'Title must be less than 255 characters';
            isValid = false;
        }

        // Owner type validation
        if (!formData.owner_type) {
            errors.owner_type = 'Owner type is required';
            isValid = false;
        } else if (!ownerTypeOptions.some(option => option.value === formData.owner_type)) {
            errors.owner_type = 'Invalid owner type selected';
            isValid = false;
        }

        // Notes validation (optional but with length check)
        if (formData.notes && formData.notes.length > 1000) {
            errors.notes = 'Notes must be less than 1000 characters';
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

    const handleView = (documentType: DocumentType) => {
        setViewingDocumentType(documentType);
        setIsViewDialogOpen(true);
    };

    const handleEdit = (documentType: DocumentType) => {
        setEditingDocumentType(documentType);
        // Convert owner_type_id to owner_type string value
        const ownerType = getOwnerTypeById(documentType.owner_type_id);
        setFormData({
            title: documentType.title,
            notes: documentType.notes || '',
            owner_type: ownerType ? ownerType.value : '',
            is_active: documentType.is_active,
        });
        setFieldErrors({});
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: number) => {
        const result = await showConfirmDialog('Delete Document Type', 'Are you sure you want to delete this document type?');
        if (!result.isConfirmed) return;
        try {
            await documentTypeService.delete(id);
            showAlert('success', 'Deleted!', 'Document type deleted successfully', 2000);
            fetchDocumentTypes(page);
        } catch (error) {
            console.error('Failed to delete document type:', error);
            const errorMessage = getErrorMessage(error, 'Failed to delete document type');
            showAlert('error', 'Error', errorMessage);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            notes: '',
            owner_type: '',
            is_active: true,
        });
        setFieldErrors({});
        setEditingDocumentType(null);
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

        try {
            const payload = {
                title: formData.title,
                notes: formData.notes || null,
                owner_type: formData.owner_type, // Send string value
                is_active: formData.is_active,
            };

            if (editingDocumentType) {
                await documentTypeService.update(editingDocumentType.id, payload);
                showAlert('success', 'Success', 'Document type updated successfully', 2000);
            } else {
                await documentTypeService.create(payload);
                showAlert('success', 'Success', 'Document type created successfully', 2000);
            }
            setIsDialogOpen(false);
            resetForm();
            fetchDocumentTypes(page);
        } catch (error: any) {
            console.error('Failed to save document type:', error);

            // Handle backend validation errors (status 422)
            if (error.response?.status === 422 && error.response?.data?.errors) {
                const apiErrors: Record<string, string> = {};
                Object.keys(error.response.data.errors).forEach((key) => {
                    apiErrors[key] = error.response.data.errors[key][0];
                });
                setFieldErrors(apiErrors);
                showAlert('error', 'Validation Error', 'Please fix the errors highlighted below.');
            } else {
                const errorMessage = getErrorMessage(error, 'Failed to save document type');
                showAlert('error', 'Error', errorMessage);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Update columns to include owner_type
    const columns: TableColumn<DocumentType>[] = [
        {
            name: 'Title',
            selector: (row) => row.title,
            cell: (row) => <span className="font-medium text-solarized-base02">{row.title}</span>,
            sortable: true,
        },
        {
            name: 'Owner Type',
            selector: (row) => {
                const ownerType = getOwnerTypeById(row.owner_type_id);
                return ownerType ? ownerType.label : 'Not Set';
            },
            cell: (row) => {
                const ownerType = getOwnerTypeById(row.owner_type_id);
                return <StatusBadge status={ownerType ? ownerType.value : 'unknown'} />;
            },
        },
        {
            name: 'Notes',
            selector: (row) => row.notes || '-',
            cell: (row) => (
                <span className="max-w-[250px] truncate">{row.notes || '-'}</span>
            ),
        },
        {
            name: 'Status',
            cell: (row) => (
                <StatusBadge status={row.is_active ? 'active' : 'inactive'} />
            ),
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
                            <Eye className="mr-2 h-4 w-4" />
                            View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(row)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => handleDelete(row.id)}
                            className="text-solarized-red"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
            ignoreRowClick: true,
            width: '80px',
        },
    ];

    // Custom Styles for DataTable
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
                    <h1 className="text-2xl font-bold text-solarized-base02">Document Types</h1>
                    <p className="text-solarized-base01">Manage document type categories</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            className="bg-solarized-blue hover:bg-solarized-blue/90"
                            onClick={() => {
                                resetForm();
                            }}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Document Type
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingDocumentType ? 'Edit Document Type' : 'Add New Document Type'}</DialogTitle>
                            <DialogDescription>
                                {editingDocumentType ? 'Update the document type details.' : 'Add a new document type.'}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit}>
                            <div className="grid gap-4 py-4">
                                {/* Title */}
                                <div className="space-y-2">
                                    <Label htmlFor="title" className={fieldErrors.title ? 'text-red-500' : ''}>
                                        Title *
                                    </Label>
                                    <Input
                                        id="title"
                                        value={formData.title}
                                        onChange={(e) => {
                                            setFormData({ ...formData, title: e.target.value });
                                            if (fieldErrors.title) setFieldErrors(prev => ({ ...prev, title: '' }));
                                        }}
                                        placeholder="e.g., Employment Contract"
                                        className={fieldErrors.title ? 'border-red-500' : ''}
                                        maxLength={255}
                                    />
                                    {renderError('title')}
                                </div>

                                {/* Owner Type - Using string enum values */}
                                <div className="space-y-2">
                                    <Label htmlFor="owner_type" className={fieldErrors.owner_type ? 'text-red-500' : ''}>
                                        Owner Type *
                                    </Label>
                                    <Select
                                        value={formData.owner_type}
                                        onValueChange={(value) => {
                                            setFormData({ ...formData, owner_type: value });
                                            if (fieldErrors.owner_type) setFieldErrors(prev => ({ ...prev, owner_type: '' }));
                                        }}
                                    >
                                        <SelectTrigger className={fieldErrors.owner_type ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Select owner type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ownerTypeOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {renderError('owner_type')}
                                </div>

                                {/* Notes */}
                                <div className="space-y-2">
                                    <Label htmlFor="notes" className={fieldErrors.notes ? 'text-red-500' : ''}>
                                        Notes
                                    </Label>
                                    <Textarea
                                        id="notes"
                                        value={formData.notes}
                                        onChange={(e) => {
                                            setFormData({ ...formData, notes: e.target.value });
                                            if (fieldErrors.notes) setFieldErrors(prev => ({ ...prev, notes: '' }));
                                        }}
                                        placeholder="Additional notes..."
                                        rows={3}
                                        className={fieldErrors.notes ? 'border-red-500' : ''}
                                        maxLength={1000}
                                    />
                                    <div className="text-xs text-gray-500">
                                        {formData.notes.length}/1000 characters
                                    </div>
                                    {renderError('notes')}
                                </div>

                                {/* Active Switch */}
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="is_active"
                                        checked={formData.is_active}
                                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                    />
                                    <Label htmlFor="is_active">Active</Label>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-solarized-blue hover:bg-solarized-blue/90"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Saving...' : (editingDocumentType ? 'Update' : 'Create')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* View Document Type Dialog */}
                <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-solarized-blue" />
                                Document Type Details
                            </DialogTitle>
                            <DialogDescription>
                                View document type information
                            </DialogDescription>
                        </DialogHeader>
                        {viewingDocumentType && (
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label className="text-sm text-muted-foreground">Title</Label>
                                    <p className="text-lg font-semibold">{viewingDocumentType.title}</p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm text-muted-foreground">Owner Type</Label>
                                    <StatusBadge status={(() => {
                                        const ownerType = getOwnerTypeById(viewingDocumentType.owner_type_id);
                                        return ownerType ? ownerType.value : 'unknown';
                                    })()} />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm text-muted-foreground">Notes</Label>
                                    <p className="text-base whitespace-pre-wrap">
                                        {viewingDocumentType.notes || 'No notes provided'}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm text-muted-foreground">Status</Label>
                                    <StatusBadge status={viewingDocumentType.is_active ? 'active' : 'inactive'} />
                                </div>

                                {/* {viewingDocumentType.created_at && (
                                    <div className="space-y-2 pt-4 border-t">
                                        <Label className="text-sm text-muted-foreground">Created At</Label>
                                        <p className="text-sm">
                                            {new Date(viewingDocumentType.created_at).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </p>
                                    </div>
                                )} */}
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

            <Card className="border-0 shadow-md">
                <CardHeader>
                    <form onSubmit={handleSearchSubmit} className="flex gap-4">
                        <Input
                            placeholder="Search document types..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                        <Button type="submit" variant="outline">
                            <Search className="mr-2 h-4 w-4" /> Search
                        </Button>
                    </form>
                </CardHeader>
                <CardContent>
                    {!isLoading && documentTypes.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-solarized-base02">No document types found</h3>
                            <p className="text-solarized-base01 mt-1">Get started by adding your first document type.</p>
                            <Button
                                className="mt-4 bg-solarized-blue hover:bg-solarized-blue/90"
                                onClick={() => {
                                    resetForm();
                                    setIsDialogOpen(true);
                                }}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Document Type
                            </Button>
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={documentTypes}
                            progressPending={isLoading}
                            pagination
                            paginationServer
                            paginationTotalRows={totalRows}
                            paginationPerPage={perPage}
                            paginationDefaultPage={page}
                            onChangePage={handlePageChange}
                            onChangeRowsPerPage={handlePerRowsChange}
                            onSort={handleSort}
                            customStyles={customStyles}
                            sortServer
                            highlightOnHover
                            responsive
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}