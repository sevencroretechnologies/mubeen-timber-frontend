import { useState, useEffect, useCallback } from 'react';
import { contractTypeService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Plus, Edit, Trash2, FileText, MoreHorizontal, Eye, Search } from 'lucide-react';

interface ContractType {
    id: number;
    title: string;
    description: string | null;
    default_duration_months: number;
    contracts_count?: number;
    created_at: string;
    updated_at: string;
}

export default function ContractTypes() {
    const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Pagination & Sorting State
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRows, setTotalRows] = useState(0);
    const [sortField, setSortField] = useState<string>('');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Dialog states
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<ContractType | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        default_duration_months: 12,
    });
    
    // Validation states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

        // Default Duration Months validation (nullable, integer, min 1 if provided)
        if (formData.default_duration_months !== undefined && formData.default_duration_months !== null) {
            const duration = Number(formData.default_duration_months);
            if (isNaN(duration) || !Number.isInteger(duration)) {
                errors.default_duration_months = 'Duration must be a whole number';
                isValid = false;
            } else if (duration < 1) {
                errors.default_duration_months = 'Duration must be at least 1 month';
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

    // ================= FETCH CONTRACT TYPES =================
    const fetchContractTypes = useCallback(
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

                const response = await contractTypeService.getAll(params);
                const { data, meta } = response.data;

                if (Array.isArray(data)) {
                    setContractTypes(data);
                    setTotalRows(meta?.total ?? 0);
                } else {
                    setContractTypes([]);
                    setTotalRows(0);
                }
            } catch (error) {
                console.error('Failed to fetch contract types:', error);
                showAlert('error', 'Error', getErrorMessage(error, 'Failed to fetch contract types'));
                setContractTypes([]);
                setTotalRows(0);
            } finally {
                setIsLoading(false);
            }
        },
        [perPage, searchQuery, sortField, sortDirection]
    );

    useEffect(() => {
        fetchContractTypes(page);
    }, [page, fetchContractTypes]);

    // ================= SEARCH =================
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchQuery(searchInput);
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

    // ================= SORTING =================
    const handleSort = (column: TableColumn<ContractType>, direction: 'asc' | 'desc') => {
        const columnId = String(column.id || '');
        if (columnId === 'title' || column.name === 'Title') {
            setSortField('title');
            setSortDirection(direction);
            setPage(1);
        }
    };

    // ================= CRUD OPERATIONS =================
    const handleAddClick = () => {
        setFormData({
            title: '',
            description: '',
            default_duration_months: 12,
        });
        setFieldErrors({});
        setIsAddOpen(true);
    };

    const handleViewClick = (type: ContractType) => {
        setSelectedType(type);
        setIsViewOpen(true);
    };

    const handleEditClick = (type: ContractType) => {
        setSelectedType(type);
        setFormData({
            title: type.title,
            description: type.description || '',
            default_duration_months: type.default_duration_months,
        });
        setFieldErrors({});
        setIsEditOpen(true);
    };

    const handleCreate = async () => {
        setIsSubmitting(true);
        setFieldErrors({});

        if (!validateForm()) {
            setIsSubmitting(false);
            // showAlert('error', 'Validation Error', 'Please check the form for errors.');
            return;
        }

        try {
            await contractTypeService.create(formData);
            showAlert('success', 'Success', 'Contract type created successfully', 2000);
            setIsAddOpen(false);
            setFieldErrors({});
            fetchContractTypes(page);
        } catch (error: any) {
            console.error('Failed to create contract type:', error);
            
            if (error.response?.data?.errors) {
                // Handle API validation errors
                const apiErrors: Record<string, string> = {};
                Object.keys(error.response.data.errors).forEach((key) => {
                    apiErrors[key] = error.response.data.errors[key][0];
                });
                setFieldErrors(apiErrors);
                showAlert('error', 'Validation Error', 'Please fix the errors highlighted below.');
            } else {
                showAlert('error', 'Error', getErrorMessage(error, 'Failed to create contract type'));
                setIsAddOpen(false);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async () => {
        if (!selectedType) return;
        
        setIsSubmitting(true);
        setFieldErrors({});

        if (!validateForm()) {
            setIsSubmitting(false);
            // showAlert('error', 'Validation Error', 'Please check the form for errors.');
            return;
        }

        try {
            await contractTypeService.update(selectedType.id, formData);
            showAlert('success', 'Success', 'Contract type updated successfully', 2000);
            setIsEditOpen(false);
            setFieldErrors({});
            fetchContractTypes(page);
        } catch (error: any) {
            console.error('Failed to update contract type:', error);
            
            if (error.response?.data?.errors) {
                // Handle API validation errors
                const apiErrors: Record<string, string> = {};
                Object.keys(error.response.data.errors).forEach((key) => {
                    apiErrors[key] = error.response.data.errors[key][0];
                });
                setFieldErrors(apiErrors);
                showAlert('error', 'Validation Error', 'Please fix the errors highlighted below.');
            } else {
                showAlert('error', 'Error', getErrorMessage(error, 'Failed to update contract type'));
                setIsEditOpen(false);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        const result = await showConfirmDialog(
            'Delete Contract Type',
            'Are you sure you want to delete this contract type?'
        );

        if (!result.isConfirmed) return;

        try {
            await contractTypeService.delete(id);
            showAlert('success', 'Deleted!', 'Contract type deleted successfully', 2000);
            fetchContractTypes(page);
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete contract type'));
        }
    };

    // ================= TABLE COLUMNS =================
    const columns: TableColumn<ContractType>[] = [
        {
            id: 'title',
            name: 'Title',
            selector: (row) => row.title,
            cell: (row) => <span className="font-medium">{row.title}</span>,
            sortable: true,
            // minWidth: '200px',
        },
        {
            name: 'Description',
            selector: (row) => row.description || '-',
            cell: (row) => (
                <span className="text-sm text-solarized-base01 line-clamp-2">
                    {row.description || '-'}
                </span>
            ),
            // minWidth: '300px',
        },
        {
            name: 'Duration (Months)',
            selector: (row) => row.default_duration_months,
            cell: (row) => <span>{row.default_duration_months}</span>,
            // width: '150px',
        },
        {
            name: 'Contracts',
            selector: (row) => row.contracts_count || 0,
            cell: (row) => <span>{row.contracts_count || 0}</span>,
            // width: '100px',
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
                        <DropdownMenuItem onClick={() => handleViewClick(row)}>
                            <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditClick(row)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => handleDelete(row.id)}
                            className="text-solarized-red"
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
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-solarized-base02">Contract Types</h1>
                    <p className="text-solarized-base01">
                        Manage different types of employment contracts
                    </p>
                </div>
                <Button className="bg-solarized-blue hover:bg-solarized-blue/90" onClick={handleAddClick}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Contract Type
                </Button>
            </div>

            {/* TABLE */}
            <Card className="border-0 shadow-md">
                <CardHeader>
                    <CardTitle>Contract Types List</CardTitle>
                    <form onSubmit={handleSearchSubmit} className="flex gap-4 mt-4">
                        <Input
                            placeholder="Search by title..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                        <Button type="submit" variant="outline">
                            <Search className="mr-2 h-4 w-4" /> Search
                        </Button>
                    </form>
                </CardHeader>
                <CardContent>
                    {!isLoading && contractTypes.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="mx-auto h-12 w-12 text-solarized-base01 mb-4" />
                            <h3 className="text-lg font-medium text-solarized-base02">No contract types found</h3>
                            <p className="text-solarized-base01 mt-1">Create your first contract type to get started.</p>
                            <Button
                                className="mt-4 bg-solarized-blue hover:bg-solarized-blue/90"
                                onClick={handleAddClick}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Contract Type
                            </Button>
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={contractTypes}
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
                            defaultSortFieldId="title"
                            defaultSortAsc={true}
                            highlightOnHover
                            responsive
                        />
                    )}
                </CardContent>
            </Card>

            {/* VIEW DIALOG */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Contract Type Details</DialogTitle>
                        <DialogDescription>View the details of this contract type</DialogDescription>
                    </DialogHeader>

                    {selectedType && (
                        <div className="space-y-4 py-4">
                            <div>
                                <Label className="text-solarized-base01">Title</Label>
                                <p className="font-medium text-lg">{selectedType.title}</p>
                            </div>

                            <div>
                                <Label className="text-solarized-base01">Description</Label>
                                <p className="text-sm">{selectedType.description || 'No description provided'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-solarized-base01">Default Duration</Label>
                                    <p className="font-medium">{selectedType.default_duration_months} months</p>
                                </div>
                                <div>
                                    <Label className="text-solarized-base01">Contracts Count</Label>
                                    <p className="font-medium">{selectedType.contracts_count || 0}</p>
                                </div>
                            </div>

                            {/* <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                <div>
                                    <Label className="text-xs text-solarized-base01">Created At</Label>
                                    <p className="text-sm">
                                        {new Date(selectedType.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-solarized-base01">Updated At</Label>
                                    <p className="text-sm">
                                        {new Date(selectedType.updated_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div> */}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                            Close
                        </Button>
                        {/* <Button
                            className="bg-solarized-blue hover:bg-solarized-blue/90"
                            onClick={() => {
                                if (selectedType) {
                                    handleEditClick(selectedType);
                                    setIsViewOpen(false);
                                }
                            }}
                        >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </Button> */}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ADD DIALOG */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Contract Type</DialogTitle>
                        <DialogDescription>Create a new contract type</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={(e) => {
                        e.preventDefault();
                        handleCreate();
                    }}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="addTitle" className={fieldErrors.title ? 'text-red-500' : ''}>
                                    Title *
                                </Label>
                                <Input
                                    id="addTitle"
                                    value={formData.title}
                                    onChange={(e) => {
                                        setFormData({ ...formData, title: e.target.value });
                                        clearFieldError('title');
                                    }}
                                    placeholder="e.g., Permanent, Fixed-Term"
                                    className={fieldErrors.title ? 'border-red-500' : ''}
                                />
                                {renderError('title')}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="addDescription">Description</Label>
                                <Textarea
                                    id="addDescription"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    placeholder="Enter description..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="addDuration" className={fieldErrors.default_duration_months ? 'text-red-500' : ''}>
                                    Default Duration (Months)
                                </Label>
                                <Input
                                    id="addDuration"
                                    type="number"
                                    value={formData.default_duration_months}
                                    onChange={(e) => {
                                        setFormData({ ...formData, default_duration_months: parseInt(e.target.value) || 1 });
                                        clearFieldError('default_duration_months');
                                    }}
                                    min={1}
                                    placeholder="e.g., 12"
                                    className={fieldErrors.default_duration_months ? 'border-red-500' : ''}
                                />
                                {renderError('default_duration_months')}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => {
                                    setIsAddOpen(false);
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
                                {isSubmitting ? 'Creating...' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* EDIT DIALOG */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Contract Type</DialogTitle>
                        <DialogDescription>Update the contract type details</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={(e) => {
                        e.preventDefault();
                        handleUpdate();
                    }}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="editTitle" className={fieldErrors.title ? 'text-red-500' : ''}>
                                    Title *
                                </Label>
                                <Input
                                    id="editTitle"
                                    value={formData.title}
                                    onChange={(e) => {
                                        setFormData({ ...formData, title: e.target.value });
                                        clearFieldError('title');
                                    }}
                                    className={fieldErrors.title ? 'border-red-500' : ''}
                                />
                                {renderError('title')}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="editDescription">Description</Label>
                                <Textarea
                                    id="editDescription"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="editDuration" className={fieldErrors.default_duration_months ? 'text-red-500' : ''}>
                                    Default Duration (Months)
                                </Label>
                                <Input
                                    id="editDuration"
                                    type="number"
                                    value={formData.default_duration_months}
                                    onChange={(e) => {
                                        setFormData({ ...formData, default_duration_months: parseInt(e.target.value) || 1 });
                                        clearFieldError('default_duration_months');
                                    }}
                                    min={1}
                                    className={fieldErrors.default_duration_months ? 'border-red-500' : ''}
                                />
                                {renderError('default_duration_months')}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => {
                                    setIsEditOpen(false);
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
                                {isSubmitting ? 'Updating...' : 'Update'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}