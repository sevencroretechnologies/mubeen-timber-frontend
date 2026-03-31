import { useState, useEffect, useCallback } from 'react';
import { recruitmentService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
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
import { StatusBadge } from '../../components/ui/status-badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Plus, Edit, Trash2, Check, MoreHorizontal, Search, Eye } from 'lucide-react';

interface JobStage {
    id: number;
    title: string;
    description: string;
    status: 'active' | 'inactive';
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export default function JobStages() {
    const [stages, setStages] = useState<JobStage[]>([]);
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
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedStage, setSelectedStage] = useState<JobStage | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'active',
        is_default: false,
    });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // ================= FETCH STAGES =================
    const fetchStages = useCallback(
        async (currentPage: number = 1) => {
            setIsLoading(true);
            try {
                const params: Record<string, unknown> = {
                    page: currentPage,
                    per_page: perPage,
                    search: searchQuery,
                    paginate: true,
                };

                if (sortField) {
                    params.order_by = sortField;
                    params.order = sortDirection;
                }

                const response = await recruitmentService.getJobStages(params);
                const { data, meta } = response.data;

                if (Array.isArray(data)) {
                    setStages(data);
                    setTotalRows(meta?.total ?? 0);
                } else {
                    setStages([]);
                    setTotalRows(0);
                }
            } catch (error) {
                console.error('Failed to fetch interview type:', error);
                showAlert('error', 'Error', getErrorMessage(error, 'Failed to fetch interview type'));
                setStages([]);
                setTotalRows(0);
            } finally {
                setIsLoading(false);
            }
        },
        [perPage, searchQuery, sortField, sortDirection]
    );

    useEffect(() => {
        fetchStages(page);
    }, [page, fetchStages]);

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
    const handleSort = (column: TableColumn<JobStage>, direction: 'asc' | 'desc') => {
        const columnId = String(column.id || '');
        if (columnId === 'title' || column.name === 'Stage Title') {
            setSortField('title');
            setSortDirection(direction);
            setPage(1);
        }
    };

    // ================= CRUD OPERATIONS =================
    const resetForm = () => {
        setIsEditMode(false);
        setSelectedStage(null);
        setFieldErrors({});
        setFormData({
            title: '',
            description: '',
            status: 'active',
            is_default: false,
        });
    };

    const handleAddClick = () => {
        resetForm();
        setIsDialogOpen(true);
    };

    const handleViewClick = (stage: JobStage) => {
        setSelectedStage(stage);
        setIsViewOpen(true);
    };

    const handleEditClick = (stage: JobStage) => {
        setIsEditMode(true);
        setSelectedStage(stage);
        setFieldErrors({});
        setFormData({
            title: stage.title,
            description: stage.description,
            status: stage.status,
            is_default: stage.is_default,
        });
        setIsDialogOpen(true);
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};
        let isValid = true;

        if (!formData.title.trim()) {
            errors.title = 'Interview type is required';
            isValid = false;
        } else if (formData.title.length > 255) {
            errors.title = 'Stage Title must be less than 255 characters';
            isValid = false;
        }



        setFieldErrors(errors);
        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFieldErrors({});

        if (!validateForm()) {
            return;
        }

        try {
            if (isEditMode && selectedStage) {
                await recruitmentService.updateJobStage(selectedStage.id, formData);
                showAlert('success', 'Success', 'Interview type updated successfully', 2000);
            } else {
                await recruitmentService.createJobStage(formData);
                showAlert('success', 'Success', 'Interview type created successfully', 2000);
            }

            setIsDialogOpen(false);
            resetForm();
            fetchStages(page);
        } catch (err: any) {
            console.error('Failed to save interview type:', err);
            const message = getErrorMessage(err, 'Failed to save jinterivew type');

            // Handle backend validation errors
            if (err.response?.data?.errors) {
                const apiErrors: Record<string, string> = {};
                Object.keys(err.response.data.errors).forEach((key) => {
                    apiErrors[key] = err.response.data.errors[key][0];
                });
                setFieldErrors(apiErrors);
            } else {
                showAlert('error', 'Error', message);
            }
        }
    };

    const renderError = (field: string) => {
        return fieldErrors[field] ? (
            <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
        ) : null;
    };

    const handleDelete = async (id: number) => {
        const result = await showConfirmDialog(
            'Delete Job Stage',
            'Are you sure you want to delete this stage?'
        );

        if (!result.isConfirmed) return;

        try {
            await recruitmentService.deleteJobStage(id);
            showAlert('success', 'Deleted!', 'Job stage deleted successfully', 2000);
            fetchStages(page);
        } catch (error) {
            console.error('Failed to delete job stage:', error);
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete job stage'));
        }
    };

    // ================= HELPERS =================
    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return 'Invalid Date';
        }
    };



    const defaultStageCount = stages.filter((stage) => stage.is_default).length;

    // ================= TABLE COLUMNS =================
    const columns: TableColumn<JobStage>[] = [
        {
            id: 'title',
            name: 'Interview type',
            selector: (row) => row.title,
            cell: (row) => <span className="font-medium">{row.title}</span>,
            sortable: true,
        },

        {
            id: 'Description',
            name: 'Description',
            selector: (row) => row.description,
            cell: (row) => <span className="font-medium">{row.description}</span>,
            sortable: true,
        },

        {
            name: 'Status',
            cell: (row) => (
                <StatusBadge status={row.status} />
            ),
            width: '100px',
        },
        // {
        //     name: 'Default',
        //     cell: (row) =>
        //         row.is_default ? (
        //             <Badge className="bg-solarized-green/10 text-solarized-green">
        //                 <Check className="h-3 w-3 mr-1" />
        //                 Default
        //             </Badge>
        //         ) : (
        //             <Badge variant="outline">No</Badge>
        //         ),
        //     width: '110px',
        // },
        // {
        //     name: 'Created',
        //     selector: (row) => row.created_at,
        //     cell: (row) => <span className="text-sm">{formatDate(row.created_at)}</span>,
        //     width: '120px',
        // },
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
                    <h1 className="text-2xl font-bold text-solarized-base02">Interview Types</h1>
                    {/* <p className="text-solarized-base01">Manage recruitment pipeline stages</p> */}
                </div>
                <Button className="bg-solarized-blue hover:bg-solarized-blue/90" onClick={handleAddClick}>
                    <Plus className="mr-2 h-4 w-4" />
                    Interview Types
                </Button>
            </div>

            {/* TABLE */}
            <Card className="border-0 shadow-md">
                <CardHeader>
                    {/* <CardTitle>Recruitment Pipeline Stages</CardTitle> */}
                    {/* <CardDescription>
                        Manage the stages that applications go through in your recruitment process
                    </CardDescription> */}
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
                    {!isLoading && stages.length === 0 ? (
                        <div className="text-center py-12">
                            <Plus className="mx-auto h-12 w-12 text-solarized-base01 mb-4" />
                            <h3 className="text-lg font-medium text-solarized-base02">No stages created</h3>
                            <p className="text-solarized-base01 mt-1">
                                Create your first stage to start building your recruitment pipeline.
                            </p>
                            <Button
                                className="mt-4 bg-solarized-blue hover:bg-solarized-blue/90"
                                onClick={handleAddClick}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Stage
                            </Button>
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={stages}
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
                        <DialogTitle>Interview type Details</DialogTitle>
                        <DialogDescription>View the details of this job stage</DialogDescription>
                    </DialogHeader>

                    {selectedStage && (
                        <div className="space-y-4 py-4">
                            <div>
                                <Label className="text-solarized-base01">Title</Label>
                                <p className="font-medium text-lg">{selectedStage.title}</p>
                            </div>

                            <div>
                                <Label className="text-solarized-base01">Description</Label>
                                <p className="text-sm text-solarized-base02 whitespace-pre-wrap">
                                    {selectedStage.description || 'No description provided.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-solarized-base01">Status</Label>
                                    <div className="mt-1">
                                        <StatusBadge status={selectedStage.status} />
                                    </div>
                                </div>
                                {/* <div>
                                    <Label className="text-solarized-base01">Default</Label>
                                    <div className="mt-1">
                                        {selectedStage.is_default ? (
                                            <Badge className="bg-solarized-green/10 text-solarized-green">
                                                <Check className="h-3 w-3 mr-1" />
                                                Default
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline">No</Badge>
                                        )}
                                    </div>
                                </div> */}
                            </div>

                            {/* <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                <div>
                                    <Label className="text-xs text-solarized-base01">Created At</Label>
                                    <p className="text-sm">{formatDate(selectedStage.created_at)}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-solarized-base01">Updated At</Label>
                                    <p className="text-sm">{formatDate(selectedStage.updated_at)}</p>
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
                                if (selectedStage) {
                                    handleEditClick(selectedStage);
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

            {/* ADD/EDIT DIALOG */}
            <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    if (!open) resetForm();
                    setIsDialogOpen(open);
                }}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? 'Edit Interview Type' : 'Add Interview Types'}</DialogTitle>
                        <DialogDescription>
                            {isEditMode
                                ? 'Update stage details'
                                : 'Create a new stage for your recruitment pipeline'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="title" className={fieldErrors.title ? 'text-red-500' : ''}>Interview Type *</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => {
                                        setFormData({ ...formData, title: e.target.value });
                                        if (fieldErrors.title) setFieldErrors(prev => ({ ...prev, title: '' }));
                                    }}
                                    placeholder="e.g., Phone Screen, Technical Interview"
                                    className={fieldErrors.title ? 'border-red-500' : ''}
                                />
                                {renderError('title')}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description (Optional)</Label>
                                <textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Enter description..."
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Status</Label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="status"
                                            value="active"
                                            checked={formData.status === 'active'}
                                            onChange={() => setFormData({ ...formData, status: 'active' })}
                                            className="w-4 h-4 text-solarized-blue border-gray-300 focus:ring-solarized-blue"
                                        />
                                        <span className="text-sm font-medium text-gray-900">Active</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="status"
                                            value="inactive"
                                            checked={formData.status === 'inactive'}
                                            onChange={() => setFormData({ ...formData, status: 'inactive' })}
                                            className="w-4 h-4 text-solarized-blue border-gray-300 focus:ring-solarized-blue"
                                        />
                                        <span className="text-sm font-medium text-gray-900">Inactive</span>
                                    </label>
                                </div>
                            </div>

                            {/* <div className="space-y-2">
                                <Label htmlFor="is_default" className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="is_default"
                                        checked={formData.is_default}
                                        onChange={(e) =>
                                            setFormData({ ...formData, is_default: e.target.checked })
                                        }
                                        className="rounded border-solarized-base01"
                                    />
                                    Set as default stage for new applications
                                </Label>
                                <p className="text-sm text-solarized-base01">
                                    {defaultStageCount > 0 && !formData.is_default ? (
                                        <span className="text-solarized-yellow">
                                            Note: There's already a default stage.
                                        </span>
                                    ) : (
                                        'New applications will start in this stage'
                                    )}
                                </p>
                            </div> */}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    resetForm();
                                    setIsDialogOpen(false);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90">
                                {isEditMode ? 'Update' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}