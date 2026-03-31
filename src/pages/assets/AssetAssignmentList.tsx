import { useState, useEffect, useCallback } from 'react';
import { assetService, staffService } from '../../services/api';
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
    Search,
    ClipboardList,
} from 'lucide-react';
import { showAlert, getErrorMessage } from '../../lib/sweetalert';
import DataTable, { TableColumn } from 'react-data-table-component';

interface Asset {
    id: number;
    name: string;
    asset_code: string;
    status: string;
    assigned_to?: number;
    assigned_employee?: {
        id: number;
        full_name: string;
    };
    assigned_date?: string;
}

interface Staff {
    id: number;
    full_name: string;
    email: string;
}

export default function AssetAssignmentList() {
    const [assignments, setAssignments] = useState<Asset[]>([]);
    const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
    const [formData, setFormData] = useState({
        asset_id: '',
        staff_member_id: '',
        notes: '',
    });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch assignments with pagination
    const fetchAssignments = useCallback(
        async (currentPage: number = 1) => {
            setIsLoading(true);
            try {
                const params: {
                    status?: string;
                    page?: number;
                    per_page?: number;
                    search?: string;
                    order_by?: string;
                    order?: string;
                } = {
                    status: 'assigned',
                    page: currentPage,
                    per_page: perPage,
                };

                if (searchQuery) {
                    params.search = searchQuery;
                }

                if (sortField) {
                    params.order_by = sortField;
                    params.order = sortDirection;
                }

                const response = await assetService.getAll(params);
                const payload = response.data.data;

                if (payload && typeof payload === 'object' && !Array.isArray(payload) && Array.isArray(payload.data)) {
                    // Paginated response
                    setAssignments(payload.data);
                    setTotalRows(payload.total ?? 0);
                } else if (Array.isArray(payload)) {
                    // Non-paginated response
                    setAssignments(payload);
                    setTotalRows(payload.length);
                } else {
                    setAssignments([]);
                    setTotalRows(0);
                }
            } catch (error) {
                console.error('Failed to fetch assignments:', error);
                const msg = getErrorMessage(error, 'Failed to fetch assignments');
                showAlert('error', 'Error', msg);
                setAssignments([]);
                setTotalRows(0);
            } finally {
                setIsLoading(false);
            }
        },
        [perPage, searchQuery, sortField, sortDirection]
    );

    useEffect(() => {
        fetchAssignments(page);
    }, [page, fetchAssignments]);

    // Fetch available assets and staff when dialog opens
    useEffect(() => {
        if (isDialogOpen) {
            fetchAvailableAssets();
            fetchStaff();
            setFieldErrors({}); // Clear errors when dialog opens
        }
    }, [isDialogOpen]);

    const fetchAvailableAssets = async () => {
        try {
            const response = await assetService.getAll({ status: 'available', paginate: 'false' });
            const data = response.data.data || response.data;
            setAvailableAssets(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch available assets:', error);
            const msg = getErrorMessage(error, 'Failed to fetch available assets');
            showAlert('error', 'Error', msg);
        }
    };

    const fetchStaff = async () => {
        try {
            const response = await staffService.getAll({ per_page: 100 });
            const payload = response.data.data;
            if (payload && Array.isArray(payload.data)) {
                setStaffList(payload.data);
            } else if (Array.isArray(payload)) {
                setStaffList(payload);
            }
        } catch (error) {
            console.error('Failed to fetch staff:', error);
        }
    };

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

    // Sorting Handler
    const handleSort = (column: TableColumn<Asset>, direction: 'asc' | 'desc') => {
        const columnId = String(column.id || '');

        const fieldMap: Record<string, string> = {
            'name': 'name',
            'asset_code': 'asset_code',
            'assigned_date': 'assigned_date',
        };

        const fieldName = fieldMap[columnId];

        if (fieldName) {
            setSortField(fieldName);
            setSortDirection(direction);
            setPage(1);
        }
    };

    const resetForm = () => {
        setFormData({
            asset_id: '',
            staff_member_id: '',
            notes: '',
        });
        setFieldErrors({});
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};
        let isValid = true;

        if (!formData.asset_id) {
            errors.asset_id = 'Please select an asset';
            isValid = false;
        }

        if (!formData.staff_member_id) {
            errors.staff_member_id = 'Please select a staff member';
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

        setIsSubmitting(true);
        try {
            await assetService.assignAsset(Number(formData.asset_id), {
                staff_member_id: Number(formData.staff_member_id),
                notes: formData.notes
            });

            showAlert('success', 'Success', 'Asset assigned successfully', 2000);

            setIsDialogOpen(false);
            resetForm();
            fetchAssignments(page);
        } catch (error) {
            console.error('Failed to assign asset:', error);
            const msg = getErrorMessage(error, 'Failed to assign asset');
            showAlert('error', 'Error', msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderError = (field: string) => {
        return fieldErrors[field] ? (
            <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
        ) : null;
    };

    // Table Columns
    const columns: TableColumn<Asset>[] = [
        {
            id: 'name',
            name: 'Asset',
            selector: (row) => row.name,
            cell: (row) => (
                <div>
                    <p className="font-medium text-solarized-base02">{row.name}</p>
                    <p className="text-xs text-solarized-base01 font-mono">{row.asset_code}</p>
                </div>
            ),
            sortable: true,
            minWidth: '180px',
        },
        {
            name: 'Assigned Staff',
            selector: (row) => row.assigned_employee?.full_name || 'Unknown',
            cell: (row) => (
                <span>{row.assigned_employee?.full_name || 'Unknown'}</span>
            ),
        },
        {
            id: 'assigned_date',
            name: 'Assigned Date',
            selector: (row) => row.assigned_date || '',
            cell: (row) => (
                <span>
                    {row.assigned_date
                        ? new Date(row.assigned_date).toLocaleDateString()
                        : '-'
                    }
                </span>
            ),
            sortable: true,
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
                    <h1 className="text-2xl font-bold text-solarized-base02">Asset Assignments</h1>
                    <p className="text-solarized-base01">Manage asset allocation to staff</p>
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
                            New Assignment
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Assign Asset</DialogTitle>
                            <DialogDescription>
                                Select an available asset and assign it to a staff member.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit}>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="asset" className={fieldErrors.asset_id ? 'text-red-500' : ''}>
                                        Asset *
                                    </Label>
                                    <Select
                                        value={formData.asset_id}
                                        onValueChange={(value) => {
                                            setFormData({ ...formData, asset_id: value });
                                            if (fieldErrors.asset_id) setFieldErrors(prev => ({ ...prev, asset_id: '' }));
                                        }}
                                    >
                                        <SelectTrigger className={fieldErrors.asset_id ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Select asset" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableAssets.length === 0 ? (
                                                <SelectItem value="none" disabled>No available assets</SelectItem>
                                            ) : (
                                                availableAssets.map((asset) => (
                                                    <SelectItem key={asset.id} value={String(asset.id)}>
                                                        {asset.name} ({asset.asset_code})
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {renderError('asset_id')}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="staff" className={fieldErrors.staff_member_id ? 'text-red-500' : ''}>
                                        Staff Member *
                                    </Label>
                                    <Select
                                        value={formData.staff_member_id}
                                        onValueChange={(value) => {
                                            setFormData({ ...formData, staff_member_id: value });
                                            if (fieldErrors.staff_member_id) setFieldErrors(prev => ({ ...prev, staff_member_id: '' }));
                                        }}
                                    >
                                        <SelectTrigger className={fieldErrors.staff_member_id ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Select staff member" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {staffList.map((staff) => (
                                                <SelectItem key={staff.id} value={String(staff.id)}>
                                                    {staff.full_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {renderError('staff_member_id')}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="notes">Notes</Label>
                                    <Textarea
                                        id="notes"
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder="Additional comments..."
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90" disabled={isSubmitting}>
                                    {isSubmitting ? 'Assigning...' : 'Assign'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-0 shadow-md">
                <CardHeader>
                    <CardTitle>Asset Assignments List</CardTitle>
                    <form onSubmit={handleSearchSubmit} className="flex gap-4 mt-4">
                        <Input
                            placeholder="Search by asset name or code..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                        <Button type="submit" variant="outline">
                            <Search className="mr-2 h-4 w-4" /> Search
                        </Button>
                    </form>
                </CardHeader>
                <CardContent>
                    {!isLoading && assignments.length === 0 && !searchQuery ? (
                        <div className="text-center py-12">
                            <ClipboardList className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-solarized-base02">No active assignments</h3>
                            <p className="text-solarized-base01 mt-1">Assignments will appear here once assets are assigned to staff.</p>
                            <Button
                                className="mt-4 bg-solarized-blue hover:bg-solarized-blue/90"
                                onClick={() => {
                                    resetForm();
                                    setIsDialogOpen(true);
                                }}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                New Assignment
                            </Button>
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={assignments}
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