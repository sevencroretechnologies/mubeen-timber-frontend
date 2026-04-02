import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { estimationsApi } from '@/services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '@/lib/sweetalert';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Plus, Search, FileSignature, Edit, Trash2, Eye } from 'lucide-react';

export default function EstimationsList() {
    const navigate = useNavigate();
    const [estimations, setEstimations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [perPage, setPerPage] = useState(25);

    const fetchEstimations = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await estimationsApi.list();
            // Handle different response structures
            const data = response?.data?.data || response?.data || response;
            setEstimations(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch estimations:', error);
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to load estimations'));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEstimations();
    }, [fetchEstimations]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Simple client-side search or reload if needed.
    };

    const handleDelete = async (id: number) => {
        const result = await showConfirmDialog('Delete Estimation', 'Are you sure?');
        if (!result.isConfirmed) return;
        try {
            await estimationsApi.delete(id);
            showAlert('success', 'Deleted!', 'Estimation deleted successfully', 2000);
            fetchEstimations();
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete estimation'));
        }
    };

    // Helper to get estimation type label
    const getEstimationTypeLabel = (type: number) => {
        const types = { 1: 'Inches', 2: 'Feet', 3: 'Thk (In)', 4: 'Thk (Ft)' };
        return types[type as keyof typeof types] || 'Unknown';
    };

    // Helper to get dimensions display
    const getDimensionsDisplay = (est: any) => {
        const l = est.length || 0;
        const b = est.breadth || 0;
        const type = est.estimation_type;

        if (type === 1 || type === 2) {
            const h = est.height || 0;
            return (l || b || h) ? `${l}×${b}×${h}` : '-';
        } else {
            const t = est.thickness || 0;
            return (l || b || t) ? `${l}×${b}×${t}` : '-';
        }
    };

    // Filter for basic client-side search
    const filteredData = estimations.filter((est: any) =>
        (est.customer?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (est.product?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (est.project?.name || '').toLowerCase().includes(search.toLowerCase())
    );

    const columns: TableColumn<any>[] = [
        { name: 'ID', selector: row => row.id, sortable: true, width: '60px' },
        {
            name: 'Customer',
            selector: row => row.customer?.name || 'Unknown',
            sortable: true,
            minWidth: '150px',
        },
        {
            name: 'Project',
            selector: row => row.project?.name || '-',
            sortable: true,
            minWidth: '120px',
        },
        {
            name: 'Product',
            selector: row => row.product?.name || 'Unknown',
            sortable: true,
            minWidth: '120px',
        },
        {
            name: 'Type',
            selector: row => getEstimationTypeLabel(row.estimation_type),
            sortable: true,
            width: '80px',
            center: true,
        },
        {
            name: 'Dimensions',
            selector: row => getDimensionsDisplay(row),
            width: '120px',
            center: true,
        },
        {
            name: 'Qty',
            selector: row => row.quantity || 1,
            sortable: true,
            width: '60px',
            right: true,
        },
        {
            name: 'CFT',
            selector: row => Number(row.cft || 0).toFixed(2),
            sortable: true,
            width: '80px',
            right: true,
        },
        {
            name: 'Cost/CFT',
            cell: row => row.cost_per_cft ? `₹${Number(row.cost_per_cft).toFixed(2)}` : '-',
            sortable: true,
            width: '90px',
            right: true,
        },
        {
            name: 'Labor',
            cell: row => row.labor_charges ? `₹${Number(row.labor_charges).toFixed(2)}` : '-',
            sortable: true,
            width: '90px',
            right: true,
        },
        {
            name: 'Total',
            selector: row => `₹${Number(row.total_amount || 0).toFixed(2)}`,
            sortable: true,
            width: '100px',
            right: true,
            cell: row => (
                <span className="font-semibold text-green-600">
                    ₹{Number(row.total_amount || 0).toFixed(2)}
                </span>
            ),
        },
        {
            name: 'Actions',
            cell: (row) => (
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/crm/customers/${row.customer_id}/projects`)} title="View Customer Projects">
                        <Eye className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/crm/estimations/${row.id}/edit`)} title="Edit">
                        <Edit className="h-4 w-4 text-solarized-blue" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)} title="Delete">
                        <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                </div>
            ),
            width: '140px',
            center: true,
        },
    ];

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
                fontSize: '13px',
                fontWeight: '600',
                color: '#374151',
                paddingLeft: '12px',
                paddingRight: '12px',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.05em' as const,
            },
        },
        cells: {
            style: {
                paddingLeft: '12px',
                paddingRight: '12px',
                fontSize: '14px',
            },
        },
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-solarized-base02">Estimations</h1>
                    <p className="text-muted-foreground">Manage order and project estimations here</p>
                </div>
                <Button onClick={() => navigate('/crm/estimations/create')} className="bg-solarized-blue hover:bg-solarized-blue/90">
                    <Plus className="mr-2 h-4 w-4" /> New Estimation
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <form onSubmit={handleSearchSubmit} className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by customer, project, or product..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </form>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={filteredData}
                        progressPending={isLoading}
                        pagination
                        paginationPerPage={perPage}
                        paginationRowsPerPageOptions={[10, 25, 50, 100]}
                        onChangeRowsPerPage={(newPerPage) => setPerPage(newPerPage)}
                        customStyles={customStyles}
                        highlightOnHover
                        responsive
                        noDataComponent={
                            <div className="text-center py-12 text-muted-foreground">
                                <FileSignature className="mx-auto h-12 w-12 mb-4 opacity-20" />
                                <p>No estimations found</p>
                            </div>
                        }
                    />
                </CardContent>
            </Card>
        </div>
    );
}
