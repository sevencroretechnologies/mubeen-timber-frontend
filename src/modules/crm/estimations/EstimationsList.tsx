import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { estimationsApi } from '@/services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '@/lib/sweetalert';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Plus, Search, FileSignature, Edit, Trash2 } from 'lucide-react';

export default function EstimationsList() {
    const navigate = useNavigate();
    const [estimations, setEstimations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');

    const fetchEstimations = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await estimationsApi.list();
            setEstimations(Array.isArray(data) ? data : data.data || []);
        } catch (error) {
            console.error('Failed to fetch estimations:', error);
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

    // Filter for basic client-side search if API doesn't support yet
    const filteredData = estimations.filter(est => 
        (est.customer?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (est.product?.name || '').toLowerCase().includes(search.toLowerCase())
    );

    const columns: TableColumn<any>[] = [
        { name: 'ID', selector: row => row.id, sortable: true, width: '70px' },
        { name: 'Customer', selector: row => row.customer?.name || 'Unknown', sortable: true },
        { name: 'Product', selector: row => row.product?.name || 'Unknown', sortable: true },
        { name: 'Type', selector: row => row.estimation_type || '-', width: '80px' },
        { name: 'Qty', selector: row => row.quantity || 0, sortable: true, width: '80px' },
        { name: 'CFT', selector: row => row.cft || '-', width: '90px' },
        { name: 'Cost/CFT', selector: row => `₹${row.cost_per_cft || 0}`, sortable: true },
        { name: 'Total Amount', selector: row => `₹${row.total_amount || 0}`, sortable: true, right: true },
        {
            name: 'Actions',
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/crm/estimations/${row.id}/edit`)} title="Edit">
                        <Edit className="h-4 w-4 text-solarized-blue" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)} title="Delete">
                        <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                </div>
            ),
            width: '120px',
            right: true,
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
            style: { fontSize: '14px', fontWeight: '600', color: '#374151', paddingLeft: '16px', paddingRight: '16px' },
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
                                placeholder="Search by customer or product..."
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
