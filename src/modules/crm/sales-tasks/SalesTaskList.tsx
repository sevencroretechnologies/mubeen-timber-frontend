import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { salesTaskApi } from '@/services/api';
import { SalesTask } from '@/types';
import { showAlert, showConfirmDialog, getErrorMessage } from '@/lib/sweetalert';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Plus, Search, Eye, Edit, Trash2, LayoutGrid, MoreHorizontal } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SalesTaskModal from '@/modules/crm/sales-tasks/SalesTaskModal';

const TASK_SOURCE_OPTIONS = [
    { id: 1, name: "Lead" },
    { id: 2, name: "Prospect" },
    { id: 3, name: "Opportunity" },
];

const getBadgeColor = (sourceName: string) => {
    switch (sourceName?.toLowerCase()) {
        case "lead":
            return "bg-blue-100 text-blue-800";
        case "prospect":
            return "bg-yellow-100 text-yellow-800";
        case "opportunity":
            return "bg-green-100 text-green-800";
        default:
            return "bg-gray-100 text-gray-800";
    }
};

const getSourceEntityInfo = (task: SalesTask) => {
    if (task.source_detail) {
        if (task.task_source_id === 3) {
            // Opportunity
            return task.source_detail.party_name || task.source_detail.naming_series || `Opp #${task.source_id}`;
        } else if (task.task_source_id === 1) {
            // Lead
            return `${task.source_detail.first_name || ''} ${task.source_detail.last_name || ''}`.trim() || task.source_detail.company_name || `Lead #${task.source_id}`;
        } else if (task.task_source_id === 2) {
            // Prospect
            return task.source_detail.company_name || task.source_detail.name || `Prospect #${task.source_id}`;
        }

        // Fallback for any other source types
        return task.source_detail.name ||
            task.source_detail.naming_series ||
            task.source_detail.company_name ||
            task.source_detail.party_name ||
            (task.source_detail.first_name ? `${task.source_detail.first_name} ${task.source_detail.last_name || ''}`.trim() : null) ||
            `#${task.source_detail.id}`;
    }
    return "-";
};

export default function SalesTaskList() {
    const [salesTasks, setSalesTasks] = useState<SalesTask[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [sourceFilter, setSourceFilter] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(15);
    const [totalRows, setTotalRows] = useState(0);

    const [showModal, setShowModal] = useState(false);
    const [modalTaskId, setModalTaskId] = useState<number | undefined>(undefined);
    const [modalReadOnly, setModalReadOnly] = useState(false);

    const fetchSalesTasks = useCallback(async (currentPage: number = 1) => {
        setIsLoading(true);
        try {
            const params: Record<string, any> = { page: currentPage, per_page: perPage };
            if (sourceFilter) params.task_source_id = sourceFilter;

            const res = await salesTaskApi.list(params);
            // Depending on whether it's WrappedPaginatedResponse or PaginatedResponse
            const data = (res as any).data || res;
            const pagination = (res as any).pagination || res;

            setSalesTasks(Array.isArray(data) ? data : data.data || []);
            setTotalRows(pagination?.total_items || pagination?.total || 0);
        } catch (error) {
            console.error('Failed to fetch sales tasks:', error);
            setSalesTasks([]);
            setTotalRows(0);
        } finally {
            setIsLoading(false);
        }
    }, [perPage, sourceFilter]);

    useEffect(() => {
        fetchSalesTasks(page);
    }, [page, fetchSalesTasks]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchSalesTasks(1);
    };

    const handlePageChange = (newPage: number) => setPage(newPage);
    const handlePerRowsChange = (newPerPage: number) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    const openAddModal = () => {
        setModalTaskId(undefined);
        setModalReadOnly(false);
        setShowModal(true);
    };

    const openEditModal = (id: number) => {
        setModalTaskId(id);
        setModalReadOnly(false);
        setShowModal(true);
    };

    const openViewModal = (id: number) => {
        setModalTaskId(id);
        setModalReadOnly(true);
        setShowModal(true);
    };

    const handleModalSave = () => {
        setShowModal(false);
        fetchSalesTasks(page);
    };

    const handleDelete = async (id: number) => {
        const result = await showConfirmDialog('Delete Sales Task', 'Are you sure you want to delete this sales task?');
        if (!result.isConfirmed) return;
        try {
            await salesTaskApi.delete(id);
            showAlert('success', 'Deleted!', 'Sales task deleted successfully', 2000);
            fetchSalesTasks(page);
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete sales task'));
        }
    };

    const columns: TableColumn<SalesTask>[] = [
        {
            name: 'Source',
            cell: (row) => (
                <span className={`px-2 py-1 rounded text-xs font-medium ${getBadgeColor(row.task_source?.name || "")}`}>
                    {row.task_source?.name || "-"}
                </span>
            ),
            sortable: true,
            width: '120px',
        },
        {
            name: 'Entity',
            selector: (row) => getSourceEntityInfo(row),
            sortable: true,
        },
        {
            name: 'Type',
            selector: (row) => row.task_type?.name || "-",
            sortable: true,
        },
        {
            name: 'Assigned To',
            selector: (row) => row.assigned_user?.name || "-",
            sortable: true,
        },
        {
            name: 'Date',
            selector: (row) => row.details?.[0]?.date || "-",
            sortable: true,
            width: '120px',
        },
        {
            name: 'Time',
            selector: (row) => row.details?.[0]?.time || "-",
            width: '100px',
        },
        {
            name: 'Status',
            cell: (row) => (
                <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${row.details?.[0]?.status === 'Closed' ? 'bg-green-100 text-green-700' :
                    row.details?.[0]?.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                    }`}>
                    {row.details?.[0]?.status || "-"}
                </span>
            ),
            width: '120px',
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
                        <DropdownMenuItem onClick={() => openViewModal(row.id)}>
                            <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                        {/* <DropdownMenuItem onClick={() => navigate(`/crm/sales-tasks/${row.id}`)}>
                            <LayoutGrid className="mr-2 h-4 w-4 text-purple-600" /> View Progress
                        </DropdownMenuItem> */}
                        <DropdownMenuItem onClick={() => openEditModal(row.id)}>
                            <Edit className="mr-2 h-4 w-4 text-blue-600" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(row.id)} className="text-red-600 focus:text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
            width: '80px',
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

    // Simple client-side search for the current page
    const filteredTasks = search
        ? salesTasks.filter((task) => {
            const searchLower = search.toLowerCase();
            const sourceName = task.task_source?.name?.toLowerCase() || "";
            const typeName = task.task_type?.name?.toLowerCase() || "";
            const userName = task.assigned_user?.name?.toLowerCase() || "";
            const sourceEntity = getSourceEntityInfo(task).toLowerCase();
            return (
                sourceName.includes(searchLower) ||
                typeName.includes(searchLower) ||
                userName.includes(searchLower) ||
                sourceEntity.includes(searchLower)
            );
        })
        : salesTasks;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Sales Tasks</h1>
                    <p className="text-muted-foreground text-sm flex items-center gap-2">
                        <Link to="/crm" className="hover:underline">CRM</Link> / Sales Tasks
                    </p>
                </div>
                <Button onClick={openAddModal} className="bg-solarized-blue hover:bg-solarized-blue/90">
                    <Plus className="mr-2 h-4 w-4" /> Add Sales Task
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3 text-right">
                    <form onSubmit={handleSearchSubmit} className="flex gap-4">
                        <div className="relative flex-1 max-w-sm ml-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search tasks..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <select
                            className="bg-background border rounded-md px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                            value={sourceFilter}
                            onChange={(e) => {
                                setSourceFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All Sources</option>
                            {TASK_SOURCE_OPTIONS.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <Button type="submit" variant="secondary">Search</Button>
                    </form>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={filteredTasks}
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
                                <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                <p>No sales tasks found</p>
                            </div>
                        }
                    />
                </CardContent>
            </Card>

            <SalesTaskModal
                show={showModal}
                onHide={() => setShowModal(false)}
                onSave={handleModalSave}
                taskId={modalTaskId}
                readOnly={modalReadOnly}
            />
        </div>
    );
}
