import { useState, useEffect, useCallback } from 'react';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
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
    DialogTrigger,
} from '../../components/ui/dialog';
import { StatusBadge } from '../../components/ui/status-badge';
import { Textarea } from '../../components/ui/textarea';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Plus, Briefcase, Building, Edit, Trash2, FileText, Search, MoreHorizontal } from 'lucide-react';
import { recruitmentService } from '@/services/api';

interface JobCategory {
    id: number;
    title: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    jobs_count?: number;
    jobs?: {
        id: number;
        title: string;
        description: string;
        created_at: string;
    }[];
}

export default function JobCategories() {
    const [jobCategories, setJobCategories] = useState<JobCategory[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRows, setTotalRows] = useState(0);
    const [searchInput, setSearchInput] = useState(''); // What user types
    const [search, setSearch] = useState(''); // What's sent to API

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [viewingCategory, setViewingCategory] = useState<JobCategory | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
    });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // ================= FETCH JOB CATEGORIES =================
    const fetchJobCategories = useCallback(
        async (currentPage: number = 1) => {
            setIsLoading(true);
            try {
                const response = await recruitmentService.getJobCategories({
                    page: currentPage,
                    per_page: perPage,
                    ...(search && { search })
                });

                const { data, meta } = response.data;

                if (Array.isArray(data)) {
                    setJobCategories(data);
                    setTotalRows(meta?.total ?? 0);
                } else {
                    setJobCategories([]);
                    setTotalRows(0);
                }
            } catch (error) {
                console.error('Failed to fetch job categories:', error);
                showAlert('error', 'Error', 'Failed to fetch job categories');
                setJobCategories([]);
                setTotalRows(0);
            } finally {
                setIsLoading(false);
            }
        },
        [perPage, search]
    );

    useEffect(() => {
        fetchJobCategories(page);
    }, [page, fetchJobCategories]);

    // ================= SEARCH =================
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSearch(searchInput); // Update search state with current input
        setPage(1);
    };

    // ================= PAGINATION =================
    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handlePerRowsChange = (newPerPage: number) => {
        setPerPage(newPerPage);
        setPage(1); // Reset to first page when changing rows per page
    };

    // ================= FORM HANDLERS =================
    const validateForm = () => {
        const errors: Record<string, string> = {};
        let isValid = true;

        if (!formData.title.trim()) {
            errors.title = 'Title is required';
            isValid = false;
        } else if (formData.title.length > 255) {
            errors.title = 'Title must be less than 255 characters';
            isValid = false;
        }

        setFieldErrors(errors);
        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFieldErrors({});

        if (!validateForm()) return;

        try {
            if (isEditMode && editingId) {
                // Update existing job category
                await recruitmentService.updateJobCategory(editingId, formData);
            } else {
                // Create new job category
                await recruitmentService.createJobCategory(formData);
            }

            showAlert(
                'success',
                'Success!',
                isEditMode ? 'Job category updated successfully' : 'Job category created successfully',
                2000
            );
            setIsDialogOpen(false);
            resetForm();
            fetchJobCategories(page);
        } catch (err: any) {
            console.error('Failed to save job category:', err);

            const message = getErrorMessage(err, 'Failed to save job category');

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

    const handleEdit = (category: JobCategory) => {
        setIsEditMode(true);
        setEditingId(category.id);
        setFieldErrors({});
        setFormData({
            title: category.title,
            description: category.description || '',
        });
        setIsDialogOpen(true);
    };

    const handleView = async (category: JobCategory) => {
        setIsViewDialogOpen(true);
        // Set initial data from row
        setViewingCategory(category);

        try {
            const response = await recruitmentService.getJobCategory(category.id);
            if (response.data.success) {
                // Update with full data (including jobs)
                setViewingCategory(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch category details:', error);
        }
    };

    const handleDelete = async (row: JobCategory) => {
        if ((row.jobs_count ?? 0) > 0) {
            showAlert('warning', 'Cannot Delete', 'This category has jobs assigned. Please delete or reassign the jobs first.');
            return;
        }

        const result = await showConfirmDialog(
            'Are you sure?',
            'You want to delete this job category? This action cannot be undone.'
        );

        if (!result.isConfirmed) return;

        try {
            await recruitmentService.deleteJobCategory(row.id);
            showAlert('success', 'Deleted!', 'Job category deleted successfully', 2000);
            fetchJobCategories(page);
        } catch (error: unknown) {
            console.error('Failed to delete job category:', error);
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete job category'));
        }
    };

    const resetForm = () => {
        setIsEditMode(false);
        setEditingId(null);
        setFieldErrors({});
        setFormData({
            title: '',
            description: '',
        });
    };

    const renderError = (field: string) => {
        return fieldErrors[field] ? (
            <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
        ) : null;
    };

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch (error) {
            return 'Invalid Date';
        }
    };

    const totalJobsCount = jobCategories.reduce((sum, category) => sum + (category.jobs_count || 0), 0);

    // ================= TABLE COLUMNS =================
    const columns: TableColumn<JobCategory>[] = [
        {
            name: 'Title',
            selector: (row) => row.title,
            sortable: true,
        },
        {
            name: 'Description',
            selector: (row) => row.description || 'No description',
            sortable: true,
            grow: 2,
        },
        {
            name: 'Jobs Count',
            cell: (row) => (
                <StatusBadge
                    status={row.jobs_count && row.jobs_count > 0 ? 'active' : 'default'}
                >
                    {row.jobs_count || 0} jobs
                </StatusBadge>
            ),
        },
        // {
        //     name: 'Created',
        //     selector: (row) => formatDate(row.created_at),
        //     sortable: true,
        // },
        // {
        //     name: 'Updated',
        //     selector: (row) => formatDate(row.updated_at),
        //     sortable: true,
        // },
        {
            name: 'Actions',
            cell: (row) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(row)}>
                            <Briefcase className="mr-2 h-4 w-4" />
                            View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(row)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => handleDelete(row)}
                            className={`text-red-600 ${(row.jobs_count ?? 0) > 0 ? 'opacity-50' : ''}`}
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-solarized-base02">Job Categories</h1>
                    <p className="text-solarized-base01">Manage job categories for recruitment</p>
                </div>
                <div className="flex items-center gap-4">
                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        if (!open) {
                            resetForm();
                        }
                        setIsDialogOpen(open);
                    }}>
                        <DialogTrigger asChild>
                            <Button
                                className="bg-solarized-blue hover:bg-solarized-blue/90"
                                onClick={() => {
                                    resetForm();
                                    setIsDialogOpen(true);
                                }}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Category
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>
                                    {isEditMode ? 'Edit Job Category' : 'Add Job Category'}
                                </DialogTitle>
                                <DialogDescription>
                                    {isEditMode
                                        ? 'Update the details of this job category'
                                        : 'Add a new job category to the system'}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit}>
                                <div className="grid gap-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="title" className={fieldErrors.title ? 'text-red-500' : ''}>Title *</Label>
                                        <Input
                                            id="title"
                                            value={formData.title}
                                            onChange={(e) => {
                                                setFormData({ ...formData, title: e.target.value });
                                                if (fieldErrors.title) setFieldErrors(prev => ({ ...prev, title: '' }));
                                            }}
                                            placeholder="e.g., Information Technology"
                                            className={fieldErrors.title ? 'border-red-500' : ''}
                                        />
                                        {renderError('title')}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description" className={fieldErrors.description ? 'text-red-500' : ''}>Description</Label>
                                        <Textarea
                                            id="description"
                                            value={formData.description}
                                            onChange={(e) => {
                                                setFormData({ ...formData, description: e.target.value });
                                                if (fieldErrors.description) setFieldErrors(prev => ({ ...prev, description: '' }));
                                            }}
                                            placeholder="Optional description of this job category..."
                                            rows={4}
                                            className={fieldErrors.description ? 'border-red-500' : ''}
                                        />
                                        {renderError('description')}
                                    </div>
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
                                    <Button
                                        type="submit"
                                        className="bg-solarized-blue hover:bg-solarized-blue/90"
                                    >
                                        {isEditMode ? 'Update' : 'Create'} Category
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* VIEW DIALOG */}
                    <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Category Details</DialogTitle>
                                <DialogDescription>View the details of this job category</DialogDescription>
                            </DialogHeader>
                            {viewingCategory && (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <Label className="text-solarized-base01">Title</Label>
                                        <p className="font-medium text-solarized-base02">{viewingCategory.title}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-solarized-base01">Description</Label>
                                        <p className="text-sm text-solarized-base02 whitespace-pre-wrap">
                                            {viewingCategory.description || 'No description provided'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-solarized-base01">Jobs Count</Label>
                                        <p className="font-medium text-solarized-base02">{viewingCategory.jobs_count || 0} jobs</p>
                                    </div>
                                    {/* <div className="space-y-1">
                                        <Label className="text-solarized-base01">Created At</Label>
                                        <p className="text-sm text-solarized-base02">{formatDate(viewingCategory.created_at)}</p>
                                    </div> */}

                                    {viewingCategory.jobs && viewingCategory.jobs.length > 0 && (
                                        <div className="space-y-2 pt-2 border-t">
                                            <Label className="text-solarized-base01">Assigned Jobs</Label>
                                            <div className="max-h-40 overflow-y-auto space-y-2">
                                                {viewingCategory.jobs.map((job) => (
                                                    <div key={job.id} className="p-2 bg-gray-50 rounded text-sm flex justify-between items-center">
                                                        <p className="font-medium text-solarized-base02">{job.title}</p>
                                                        <span className="text-xs text-solarized-base01">
                                                            {new Date(job.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
                <Card className="border-0 shadow-md">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-solarized-green/10 flex items-center justify-center">
                                <Building className="h-6 w-6 text-solarized-green" />
                            </div>
                            <div>
                                <p className="text-sm text-solarized-base01">Total Categories</p>
                                <p className="text-2xl font-bold text-solarized-base02">
                                    {jobCategories.length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-md">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-solarized-blue/10 flex items-center justify-center">
                                <Briefcase className="h-6 w-6 text-solarized-blue" />
                            </div>
                            <div>
                                <p className="text-sm text-solarized-base01">Total Jobs</p>
                                <p className="text-2xl font-bold text-solarized-base02">{totalJobsCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-md">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-solarized-yellow/10 flex items-center justify-center">
                                <FileText className="h-6 w-6 text-solarized-yellow" />
                            </div>
                            <div>
                                <p className="text-sm text-solarized-base01">Active Categories</p>
                                <p className="text-2xl font-bold text-solarized-base02">
                                    {jobCategories.filter(cat => cat.jobs_count && cat.jobs_count > 0).length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Job Categories List</CardTitle>
                    <form onSubmit={handleSearchSubmit} className="flex gap-4 mt-4">
                        <Input
                            placeholder="Search categories..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                        <Button type="submit" variant="outline">
                            <Search className="mr-2 h-4 w-4" /> Search
                        </Button>
                    </form>
                </CardHeader>
                <CardContent>
                    {!isLoading && jobCategories.length === 0 ? (
                        <div className="text-center py-12">
                            <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium">
                                {search ? 'No matching categories found' : 'No job categories found'}
                            </h3>
                            <p className="text-muted-foreground mt-1">
                                {search
                                    ? 'Try a different search term'
                                    : 'Create your first job category to get started.'}
                            </p>
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={jobCategories}
                            progressPending={isLoading}
                            pagination
                            paginationServer
                            paginationTotalRows={totalRows}
                            paginationPerPage={perPage}
                            paginationRowsPerPageOptions={[5, 10, 15, 20]}
                            paginationDefaultPage={page}
                            onChangePage={handlePageChange}
                            onChangeRowsPerPage={handlePerRowsChange}
                            highlightOnHover
                            responsive
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
