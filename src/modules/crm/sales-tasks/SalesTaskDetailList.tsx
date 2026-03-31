import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { salesTaskDetailApi } from '@/services/api';
import { SalesTaskDetail } from '@/types';
import { showAlert, showConfirmDialog, getErrorMessage } from '@/lib/sweetalert';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Plus, Search, Eye, Edit, Trash2, ListChecks } from 'lucide-react';
import SalesTaskDetailModal from '@/modules/crm/sales-tasks/SalesTaskDetailModal';

const STATUS_OPTIONS = ["Open", "In Progress", "Closed"];

const getStatusBadgeColor = (status: string) => {
    switch (status) {
        case "Open":
            return "bg-blue-100 text-blue-800";
        case "In Progress":
            return "bg-yellow-100 text-yellow-800";
        case "Closed":
            return "bg-green-100 text-green-800";
        default:
            return "bg-gray-100 text-gray-800";
    }
};

const getTaskName = (task: any) => {
    if (!task) return "Unknown Task";

    let detailName = "";
    if (task.source_detail) {
        if (task.task_source_id === 3) {
            detailName = task.source_detail.party_name || task.source_detail.naming_series || `Opp #${task.source_id}`;
        } else if (task.task_source_id === 1) {
            detailName = `${task.source_detail.first_name || ''} ${task.source_detail.last_name || ''}`.trim() || task.source_detail.company_name || `Lead #${task.source_id}`;
        } else if (task.task_source_id === 2) {
            detailName = task.source_detail.company_name || `Prospect #${task.source_id}`;
        }
    }

    if (detailName) {
        return detailName;
    }

    return `#${task.id}`;
};

export default function SalesTaskDetailList() {
    const [details, setDetails] = useState<SalesTaskDetail[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(15);
    const [totalRows, setTotalRows] = useState(0);

    const [showModal, setShowModal] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState<SalesTaskDetail | null>(null);
    const [modalReadOnly, setModalReadOnly] = useState(false);

    const fetchDetails = useCallback(async (currentPage: number = 1) => {
        setIsLoading(true);
        try {
            const params: Record<string, any> = { page: currentPage, per_page: perPage };
            if (search) params.search = search;
            if (statusFilter) params.status = statusFilter;

            const res = await salesTaskDetailApi.list(params);
            const data = (res as any).data || res;
            const pagination = (res as any).pagination || res;

            setDetails(Array.isArray(data) ? data : data.data || []);
            setTotalRows(pagination?.total_items || pagination?.total || 0);
        } catch (error) {
            console.error("Failed to fetch task details:", error);
            setDetails([]);
            setTotalRows(0);
        } finally {
            setIsLoading(false);
        }
    }, [search, statusFilter, perPage]);

    useEffect(() => {
        fetchDetails(page);
    }, [page, fetchDetails]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchDetails(1);
    };

    const handlePageChange = (newPage: number) => setPage(newPage);
    const handlePerRowsChange = (newPerPage: number) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    const openAddModal = () => {
        setSelectedDetail(null);
        setModalReadOnly(false);
        setShowModal(true);
    };

    const openEditModal = (detail: SalesTaskDetail) => {
        setSelectedDetail(detail);
        setModalReadOnly(false);
        setShowModal(true);
    };

    const openViewModal = (detail: SalesTaskDetail) => {
        setSelectedDetail(detail);
        setModalReadOnly(true);
        setShowModal(true);
    };

    const handleModalSave = () => {
        setShowModal(false);
        fetchDetails(page);
    };

    const handleDelete = async (id: number) => {
        const result = await showConfirmDialog('Delete Task Detail', 'Are you sure you want to delete this task detail?');
        if (!result.isConfirmed) return;
        try {
            await salesTaskDetailApi.delete(id);
            showAlert('success', 'Deleted!', 'Task detail deleted successfully', 2000);
            fetchDetails(page);
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete task detail'));
        }
    };

    const columns: TableColumn<SalesTaskDetail>[] = [
        {
            name: 'Sales Task',
            cell: (row) => (
                <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-48" title={getTaskName(row.sales_task)}>
                        {row.sales_task?.task_source?.name || "Task"} - {getTaskName(row.sales_task)}
                    </span>
                    <span className="font-medium whitespace-nowrap">
                        {row.sales_task?.task_type?.name || "Unknown Type"}
                    </span>
                </div>
            ),
            sortable: true,
        },
        {
            name: 'Date / Time',
            cell: (row) => (
                <div className="flex flex-col">
                    <span>{new Date(row.date).toLocaleDateString()}</span>
                    <span className="text-xs text-muted-foreground">{row.time}</span>
                </div>
            ),
            sortable: true,
        },
        {
            name: 'Description',
            selector: (row) => row.description,
            sortable: true,
            wrap: true,
            minWidth: '200px',
        },
        {
            name: 'Status',
            cell: (row) => (
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(row.status)}`}>
                    {row.status}
                </span>
            ),
            sortable: true,
            width: '120px',
        },
        {
            name: 'Actions',
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openViewModal(row)} title="View">
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(row)} title="Edit">
                        <Edit className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)} title="Delete">
                        <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                </div>
            ),
            width: '120px',
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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">All Sales Task Details</h1>
                    <p className="text-muted-foreground text-sm flex items-center gap-2">
                        <Link to="/crm" className="hover:underline">CRM</Link> /
                        <Link to="/crm/sales-tasks" className="hover:underline">Sales Tasks</Link> / Details
                    </p>
                </div>
                <Button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" /> Add Task Detail
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3 text-right">
                    <form onSubmit={handleSearchSubmit} className="flex gap-4">
                        <div className="relative flex-1 max-w-sm ml-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by description..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <select
                            className="bg-background border rounded-md px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All Statuses</option>
                            {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                        <Button type="submit" variant="secondary">Search</Button>
                    </form>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={details}
                        progressPending={isLoading}
                        pagination
                        paginationServer
                        paginationTotalRows={totalRows}
                        paginationPerPage={perPage}
                        paginationDefaultPage={page}
                        onChangePage={handlePageChange}
                        onChangeRowsPerPage={handlePerRowsChange}
                        customStyles={customStyles}
                        highlightOnHover
                        responsive
                        noDataComponent={
                            <div className="text-center py-12">
                                <ListChecks className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                <p>No task details found</p>
                            </div>
                        }
                    />
                </CardContent>
            </Card>

            <SalesTaskDetailModal
                show={showModal}
                onHide={() => setShowModal(false)}
                onSave={handleModalSave}
                detail={selectedDetail}
                readOnly={modalReadOnly}
            />
        </div>
    );
}
