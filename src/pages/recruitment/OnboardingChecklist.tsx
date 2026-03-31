import { useState, useEffect, useCallback } from "react";
import DataTable, { TableColumn } from 'react-data-table-component';
import { Plus, Search, Edit, Trash2, MoreHorizontal, Eye, Briefcase } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { StatusBadge } from "../../components/ui/status-badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog";
import { showAlert, showConfirmDialog, getErrorMessage } from "../../lib/sweetalert";
import { onboardingTemplateService } from "../../services/api";

// Interface for Checklist Data
interface Checklist {
    id: number;
    title: string;
    description: string;
    status: 'active' | 'inactive';
    created_at?: string;
    updated_at?: string;
}

interface FormData {
    title: string;
    description: string;
    status: string;
}

export default function OnboardingChecklist() {
    const [checklists, setChecklists] = useState<Checklist[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalRows, setTotalRows] = useState(0);

    // Pagination & Search & Filter State
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortField, setSortField] = useState<string>("created_at");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

    // Modal States
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [editingChecklist, setEditingChecklist] = useState<Checklist | null>(null);
    const [viewingChecklist, setViewingChecklist] = useState<Checklist | null>(null);

    const [formData, setFormData] = useState<FormData>({
        title: "",
        description: "",
        status: "active",
    });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Fetch Data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {
                page: page,
                per_page: perPage,
                search: searchQuery,
                order_by: sortField,
                order: sortDirection
            };

            if (statusFilter !== "all") {
                params.status = statusFilter;
            }

            const response = await onboardingTemplateService.getAll(params);

            // API Response: { success: true, data: [...], meta: { ... } }
            const { data, meta } = response.data;

            setChecklists(data || []);
            setTotalRows(meta?.total || data?.length || 0);

        } catch (error) {
            console.error("Error fetching checklists:", error);
        } finally {
            setLoading(false);
        }
    }, [page, perPage, searchQuery, statusFilter, sortField, sortDirection]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handlers
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchQuery(searchInput);
        setPage(1);
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handlePerRowsChange = (newPerPage: number) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    const handleSort = (column: TableColumn<Checklist>, sortDirection: "asc" | "desc") => {
        const field = column.id || "created_at";
        setSortField(String(field));
        setSortDirection(sortDirection);
    };

    const resetForm = () => {
        setFormData({
            title: "",
            description: "",
            status: "active",
        });
        setFieldErrors({});
    };

    const handleCreateClick = () => {
        setEditingChecklist(null);
        resetForm();
        setIsDialogOpen(true);
    };

    const handleEditClick = (checklist: Checklist) => {
        setEditingChecklist(checklist);
        setFormData({
            title: checklist.title,
            description: checklist.description || "",
            status: checklist.status,
        });
        setFieldErrors({});
        setIsDialogOpen(true);
    };

    const handleViewClick = (checklist: Checklist) => {
        setViewingChecklist(checklist);
        setIsViewOpen(true);
    };

    const handleDelete = async (id: number) => {
        const result = await showConfirmDialog(
            "Delete Checklist",
            "Are you sure you want to delete this checklist? This action cannot be undone."
        );

        if (result.isConfirmed) {
            try {
                await onboardingTemplateService.delete(id);
                showAlert("success", "Deleted", "Checklist deleted successfully.");
                fetchData();
            } catch (error) {
                console.error("Error deleting:", error);
                showAlert("error", "Error", getErrorMessage(error, "Failed to delete checklist."));
            }
        }
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!formData.title.trim()) errors.title = "Title is required";

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            const apiData = { ...formData };

            if (editingChecklist) {
                await onboardingTemplateService.update(editingChecklist.id, apiData);
                showAlert("success", "Success", "Checklist updated successfully.");
            } else {
                await onboardingTemplateService.create(apiData);
                showAlert("success", "Success", "Checklist created successfully.");
            }

            setIsDialogOpen(false);
            fetchData();
        } catch (error: any) {
            console.error("Error saving checklist:", error);
            if (error.response?.data?.errors) {
                const apiErrors: Record<string, string> = {};
                Object.keys(error.response.data.errors).forEach((key) => {
                    apiErrors[key] = error.response.data.errors[key][0];
                });
                setFieldErrors(apiErrors);
            } else {
                showAlert("error", "Error", getErrorMessage(error, "Failed to save checklist."));
            }
        }
    };

    const renderError = (field: string) => {
        return fieldErrors[field] ? (
            <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
        ) : null;
    };

    // Formatter Helpers
    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    }

    // Columns
    const columns: TableColumn<Checklist>[] = [
        {
            name: 'Title',
            id: 'title', // for sorting
            selector: row => row.title,
            sortable: true,
            cell: row => (
                <div>
                    <div className="font-semibold text-solarized-base02">{row.title}</div>
                    {/* {row.description && <div className="text-xs text-solarized-base01 truncate max-w-[300px]">{row.description}</div>} */}
                </div>
            ),
            grow: 2
        },

        {
            name: 'Description',
            id: 'description', // for sorting
            selector: row => row.description,
            sortable: true,
            cell: row => (
                <div>
                    {/* <div className="font-semibold text-solarized-base02">{row.title}</div> */}
                    {row.description && <div className="text-xs text-solarized-base01 truncate max-w-[300px]">{row.description}</div>}
                </div>
            ),
            grow: 2
        },
        {
            name: 'Status',
            id: 'status',
            selector: row => row.status,
            sortable: true,
            cell: row => (
                <StatusBadge status={row.status} />
            ),
            width: '100px'
        },
        {
            name: 'Actions',
            cell: (row) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
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
                        <DropdownMenuItem onClick={() => handleDelete(row.id)} className="text-red-600 focus:text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
            width: '80px',
            ignoreRowClick: true,
            button: true,
        }
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-solarized-base02">Onboarding Checklists</h1>
                    <p className="text-solarized-base01">Manage onboarding templates and task lists.</p>
                </div>
                <Button onClick={handleCreateClick} className="bg-solarized-blue hover:bg-solarized-blue/90 text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Checklist
                </Button>
            </div>

            {/* Content */}
            <Card className="border-0 shadow-md">
                <CardHeader className="pb-4">
                    <CardTitle>Checklists</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-4 mt-4">
                        {/* Search */}
                        <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    placeholder="Search checklists..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <Button type="submit" variant="outline">
                                Search
                            </Button>
                        </form>

                        {/* Filter */}
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Data Table */}
                    <DataTable
                        columns={columns}
                        data={checklists}
                        progressPending={loading}
                        pagination
                        paginationServer
                        paginationTotalRows={totalRows}
                        paginationPerPage={perPage}
                        paginationDefaultPage={page}
                        onChangePage={handlePageChange}
                        onChangeRowsPerPage={handlePerRowsChange}
                        onSort={handleSort}
                        sortServer
                        defaultSortFieldId="created_at"
                        defaultSortAsc={false}
                        highlightOnHover
                        customStyles={customStyles}
                        noDataComponent={
                            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                                <Briefcase className="h-12 w-12 text-gray-300 mb-4" />
                                <p className="text-lg font-medium">No checklists found</p>
                                <p className="text-sm">Try adjusting your search or filters</p>
                            </div>
                        }
                    />
                </CardContent>
            </Card>

            {/* CREATE/EDIT DIALOG */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle>{editingChecklist ? "Edit Checklist" : "Create Checklist"}</DialogTitle>
                        <DialogDescription>
                            {editingChecklist ? "Update the checklist details below." : "Fill in the details to create a new onboarding checklist."}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Checklist Title *</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g. Standard Developer Onboarding"
                                className={fieldErrors.title ? "border-red-500" : ""}
                            />
                            {renderError('title')}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe the purpose of this checklist..."
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter className="mt-4">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90">
                                {editingChecklist ? "Update Checklist" : "Create Checklist"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* VIEW DIALOG */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Checklist Details</DialogTitle>
                        <DialogDescription>
                            View full details of the checklist.
                        </DialogDescription>
                    </DialogHeader>
                    {viewingChecklist && (
                        <div className="space-y-6 py-4">
                            <div>
                                <h3 className="text-xl font-bold text-solarized-base02">{viewingChecklist.title}</h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <StatusBadge status={viewingChecklist.status} />
                                    <span className="text-sm text-gray-500">
                                        Created: {formatDate(viewingChecklist.created_at)}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <Label className="text-gray-500 text-xs uppercase tracking-wide">Description</Label>
                                <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm text-gray-700 whitespace-pre-wrap">
                                    {viewingChecklist.description || "No description provided."}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
                        {viewingChecklist && (
                            <Button onClick={() => {
                                setIsViewOpen(false);
                                handleEditClick(viewingChecklist);
                            }}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
