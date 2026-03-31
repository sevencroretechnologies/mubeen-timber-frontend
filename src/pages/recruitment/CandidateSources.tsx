import { useState, useEffect, useCallback } from 'react';
import { candidateSourceService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { StatusBadge } from '../../components/ui/status-badge';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Plus, MoreVertical, Edit, Trash2, Search, FileText, MoreHorizontal } from 'lucide-react';

// ==================== LOCAL TYPE DEFINITIONS ====================
interface CandidateSource {
    id: number;
    title: string;
    description?: string;
    status: 'active' | 'inactive';
    created_at: string;
}

export default function CandidateSources() {
    const [sources, setSources] = useState<CandidateSource[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRows, setTotalRows] = useState(0);

    // Dialog states
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSource, setEditingSource] = useState<CandidateSource | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'active',
    });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // View Dialog State
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [viewingSource, setViewingSource] = useState<CandidateSource | null>(null);

    // ================= FETCH SOURCES =================
    const fetchSources = useCallback(
        async (currentPage: number = 1) => {
            setIsLoading(true);
            try {
                const params = {
                    page: currentPage,
                    per_page: perPage,
                    search: searchQuery,
                };
                const response = await candidateSourceService.getAll(params);
                const { data, meta } = response.data;

                if (Array.isArray(data)) {
                    setSources(data);
                    setTotalRows(meta?.total ?? 0);
                } else {
                    setSources([]);
                    setTotalRows(0);
                }
            } catch (error) {
                console.error('Failed to fetch candidate sources:', error);
                setSources([]);
                setTotalRows(0);
            } finally {
                setIsLoading(false);
            }
        },
        [perPage, searchQuery]
    );

    useEffect(() => {
        fetchSources(page);
    }, [page, fetchSources]);

    // ================= HANDLERS =================
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchSources(1);
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handlePerRowsChange = (newPerPage: number) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    const resetForm = () => {
        setFormData({ title: '', description: '', status: 'active' });
        setFieldErrors({});
        setEditingSource(null);
    };

    const handleAddClick = () => {
        resetForm();
        setIsDialogOpen(true);
    };

    const handleEditClick = (source: CandidateSource) => {
        setEditingSource(source);
        setFormData({
            title: source.title,
            description: source.description || '',
            status: source.status,
        });
        setFieldErrors({});
        setIsDialogOpen(true);
    };

    const handleViewClick = (source: CandidateSource) => {
        setViewingSource(source);
        setIsViewDialogOpen(true);
    };

    const handleDeleteClick = async (id: number) => {
        const result = await showConfirmDialog(
            'Delete Source',
            'Are you sure you want to delete this candidate source?'
        );

        if (!result.isConfirmed) return;

        try {
            await candidateSourceService.delete(id);
            showAlert('success', 'Deleted', 'Candidate source deleted successfully', 2000);
            fetchSources(page);
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete candidate source'));
        }
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!formData.title.trim()) errors.title = 'Title is required';
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            if (editingSource) {
                await candidateSourceService.update(editingSource.id, formData);
                showAlert('success', 'Success', 'Candidate source updated successfully', 2000);
            } else {
                await candidateSourceService.create(formData);
                showAlert('success', 'Success', 'Candidate source created successfully', 2000);
            }
            setIsDialogOpen(false);
            fetchSources(page);
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to save candidate source'));
        }
    };

    // ================= COLUMNS =================
    const columns: TableColumn<CandidateSource>[] = [
        {
            name: 'Title',
            selector: (row) => row.title,
            sortable: true,
            cell: (row) => <span className="font-medium text-solarized-base02">{row.title}</span>
        },
        {
            name: 'Description',
            selector: (row) => row.description || '-',
            sortable: true,
            wrap: true,
        },
        {
            name: 'Status',
            cell: (row) => (
                <StatusBadge status={row.status} />
            ),
            width: '100px',
        },
        {
            name: 'Actions',
            cell: (row) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewClick(row)}>
                            <FileText className="mr-2 h-4 w-4" />
                            View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditClick(row)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => handleDeleteClick(row.id)}
                            className="text-red-600"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
            width: '100px',
            right: true,
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-solarized-base02">Candidate Sources</h1>
                    <p className="text-solarized-base01">Manage sources where candidates come from</p>
                </div>
                <Button className="bg-solarized-blue hover:bg-solarized-blue/90" onClick={handleAddClick}>
                    <Plus className="mr-2 h-4 w-4" /> New Source
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Sources List</CardTitle>
                    <div className="flex mt-4">
                        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full max-w-sm">
                            <Input
                                placeholder="Search sources..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <Button type="submit" variant="outline">
                                <Search className="mr-2 h-4 w-4" /> Search
                            </Button>
                        </form>
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={sources}
                        progressPending={isLoading}
                        pagination
                        paginationServer
                        paginationTotalRows={totalRows}
                        paginationPerPage={perPage}
                        paginationDefaultPage={page}
                        onChangePage={handlePageChange}
                        onChangeRowsPerPage={handlePerRowsChange}
                        highlightOnHover
                    />
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingSource ? 'Edit Source' : 'New Candidate Source'}</DialogTitle>
                        <DialogDescription>Add or update a candidate source.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className={fieldErrors.title ? 'border-red-500' : ''}
                                />
                                {fieldErrors.title && <p className="text-xs text-red-500">{fieldErrors.title}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(val: any) => setFormData({ ...formData, status: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" className='bg-solarized-blue hover:bg-solarized-blue/90'>{editingSource ? 'Update' : 'Create'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Candidate Source Details</DialogTitle>
                        <DialogDescription>View details of this candidate source.</DialogDescription>
                    </DialogHeader>
                    {viewingSource && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-1">
                                <Label className="text-solarized-base01">Title</Label>
                                <p className="font-medium text-solarized-base02">{viewingSource.title}</p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-solarized-base01">Description</Label>
                                <p className="text-sm text-solarized-base02 whitespace-pre-wrap">
                                    {viewingSource.description || 'No description provided.'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-solarized-base01">Status</Label>
                                <div>
                                    <StatusBadge status={viewingSource.status} />
                                </div>
                            </div>
                            {/* <div className="space-y-1">
                                <Label className="text-solarized-base01">Created At</Label>
                                <p className="text-sm text-solarized-base02">
                                    {new Date(viewingSource.created_at).toLocaleDateString()}
                                </p>
                            </div> */}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
