import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { estimationsApi } from '@/services/api';
import api from '@/services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '@/lib/sweetalert';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DataTable, { TableColumn } from 'react-data-table-component';
import {
    Plus, Search, FileSignature, Eye, Check, X,
    Package, ArrowRightCircle, Edit3, Ban
} from 'lucide-react';
import CollectMaterialModal from './CollectMaterialModal';

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
        draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
        approved: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Approved' },
        partially_collected: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Partial' },
        collected: { bg: 'bg-green-100', text: 'text-green-700', label: 'Collected' },
        cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
    };

    const style = styles[status] || styles.draft;

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
            {style.label}
        </span>
    );
};

// Collection progress component
const CollectionProgress = ({ collected, total }: { collected: number | string; total: number | string }) => {
    const collectedNum = parseFloat(String(collected || 0));
    const totalNum = parseFloat(String(total || 0));

    if (!totalNum || totalNum === 0) return <span className="text-gray-400">-</span>;

    const percentage = Math.min(100, (collectedNum / totalNum) * 100);
    const remaining = Math.max(0, totalNum - collectedNum);

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-600">{collectedNum.toFixed(2)} / {totalNum.toFixed(2)} CFT</span>
                {remaining > 0 && <span className="text-orange-600">({remaining.toFixed(2)} left)</span>}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                        width: `${percentage}%`,
                        backgroundColor: percentage >= 100 ? '#22c55e' : percentage >= 50 ? '#eab308' : '#3b82f6'
                    }}
                />
            </div>
        </div>
    );
};

export default function EstimationsList() {
    const navigate = useNavigate();
    const [estimations, setEstimations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [perPage, setPerPage] = useState(25);
    const [collectModal, setCollectModal] = useState<{ open: boolean; estimation: any }>({
        open: false,
        estimation: null
    });

    const fetchEstimations = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await estimationsApi.list();
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

    const handleApprove = async (id: number) => {
        const result = await showConfirmDialog('Approve Estimation', 'Approve this estimation to enable material collection?');
        if (!result.isConfirmed) return;

        try {
            await api.post(`/estimations/${id}/approve`);
            showAlert('success', 'Approved!', 'Estimation approved successfully', 2000);
            fetchEstimations();
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to approve estimation'));
        }
    };

    const handleCancel = async (id: number) => {
        const result = await showConfirmDialog('Cancel Estimation', 'Are you sure you want to cancel this estimation?');
        if (!result.isConfirmed) return;

        try {
            await api.post(`/estimations/${id}/cancel`);
            showAlert('success', 'Cancelled!', 'Estimation cancelled successfully', 2000);
            fetchEstimations();
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to cancel estimation'));
        }
    };

    const handleMarkComplete = async (id: number) => {
        const result = await showConfirmDialog('Mark Complete', 'Mark this estimation as fully collected?');
        if (!result.isConfirmed) return;

        try {
            await api.post(`/estimations/${id}/mark-complete`);
            showAlert('success', 'Completed!', 'Estimation marked as collected', 2000);
            fetchEstimations();
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to mark as complete'));
        }
    };

    const openCollectModal = (estimation: any) => {
        setCollectModal({ open: true, estimation });
    };

    const closeCollectModal = () => {
        setCollectModal({ open: false, estimation: null });
    };

    const handleCollected = () => {
        closeCollectModal();
        fetchEstimations();
    };

    const getEstimationTypeLabel = (type: number) => {
        const types = { 1: 'Inches', 2: 'Feet', 3: 'Thk (In)', 4: 'Thk (Ft)' };
        return types[type as keyof typeof types] || 'Unknown';
    };

    const getActionsForStatus = (row: any) => {
        const status = row.status;

        if (status === 'draft') {
            return (
                <>
                    <Button variant="ghost" size="icon" onClick={() => handleApprove(row.id)} title="Approve">
                        <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/crm/estimations/${row.id}/edit`)} title="Edit">
                        <Edit3 className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)} title="Delete">
                        <X className="h-4 w-4 text-red-600" />
                    </Button>
                </>
            );
        }

        if (status === 'approved' || status === 'partially_collected') {
            return (
                <>
                    <Button variant="ghost" size="icon" onClick={() => openCollectModal(row)} title="Collect Material">
                        <Package className="h-4 w-4 text-orange-600" />
                    </Button>
                    {status === 'partially_collected' && (
                        <Button variant="ghost" size="icon" onClick={() => handleMarkComplete(row.id)} title="Mark Complete">
                            <ArrowRightCircle className="h-4 w-4 text-green-600" />
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleCancel(row.id)} title="Cancel">
                        <Ban className="h-4 w-4 text-red-600" />
                    </Button>
                </>
            );
        }

        // For collected or cancelled - only view
        return (
            <Button variant="ghost" size="icon" onClick={() => navigate(`/crm/estimations/${row.id}`)} title="View Details">
                <Eye className="h-4 w-4 text-blue-600" />
            </Button>
        );
    };

    const filteredData = estimations.filter((est: any) =>
        (est.customer?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (est.product?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (est.project?.name || '').toLowerCase().includes(search.toLowerCase())
    );

    const columns: TableColumn<any>[] = [
        {
            name: 'Customer',
            selector: row => row.customer?.name || 'Unknown',
            sortable: true,
            minWidth: '140px',
        },
        {
            name: 'Project',
            selector: row => row.project?.name || '-',
            sortable: true,
            minWidth: '100px',
        },
        {
            name: 'Product',
            selector: row => row.product?.name || 'Unknown',
            sortable: true,
            minWidth: '100px',
        },
        {
            name: 'CFT',
            selector: row => `${Number(row.cft || 0).toFixed(2)} CFT`,
            sortable: true,
            width: '80px',
            right: true,
        },
        {
            name: 'Status',
            cell: row => <StatusBadge status={row.status} />,
            sortable: true,
            width: '110px',
            center: true,
        },
        {
            name: 'Collection Progress',
            cell: row => (
                <CollectionProgress
                    collected={row.total_collected_cft || 0}
                    total={row.cft || 0}
                />
            ),
            width: '180px',
        },
        {
            name: 'Actions',
            cell: row => <div className="flex items-center gap-1">{getActionsForStatus(row)}</div>,
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
                {/* <Button onClick={() => navigate('/crm/estimations/create')} className="bg-solarized-blue hover:bg-solarized-blue/90">
                    <Plus className="mr-2 h-4 w-4" /> New Estimation
                </Button> */}
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

            {collectModal.open && collectModal.estimation && (
                <CollectMaterialModal
                    estimation={collectModal.estimation}
                    onClose={closeCollectModal}
                    onCollected={handleCollected}
                />
            )}
        </div>
    );
}
