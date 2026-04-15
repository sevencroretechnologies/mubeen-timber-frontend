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
                <CardContent className="p-0 sm:p-6">
                    {/* Mobile Card View (< sm) */}
                    <div className="sm:hidden space-y-4 p-4">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-xl">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-solarized-blue border-t-transparent mb-4" />
                                <p className="text-sm text-muted-foreground">Loading sales tasks...</p>
                            </div>
                        ) : filteredTasks.length === 0 ? (
                            <div className="text-center py-20 bg-gray-50/50 rounded-lg border border-dashed">
                                <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground mb-3 opacity-20" />
                                <p className="text-muted-foreground font-medium">No sales tasks found.</p>
                                <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or search.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {filteredTasks.map((task) => (
                                    <div key={task.id} className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1 flex-1 min-w-0 mr-2">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getBadgeColor(task.task_source?.name || '')}`}>
                                                        {task.task_source?.name || '—'}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                                                        {task.task_type?.name || '—'}
                                                    </span>
                                                </div>
                                                <h3 className="font-bold text-base text-solarized-blue truncate tracking-tight">
                                                    {getSourceEntityInfo(task)}
                                                </h3>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4 text-gray-400" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    {/* <DropdownMenuItem onClick={() => openViewModal(task.id)} className="h-10">
                                                        <Eye className="mr-2 h-4 w-4 text-gray-500" />
                                                        <span>View Details</span>
                                                    </DropdownMenuItem> */}
                                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); openEditModal(task.id); }} className="h-10 cursor-pointer">
                                                        <Edit className="mr-2 h-4 w-4 text-blue-600" />
                                                        <span>Edit</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleDelete(task.id); }} className="h-10 text-red-600 focus:text-red-600 cursor-pointer">
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        <span>Delete</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm border-t pt-3">
                                            <div>
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-0.5">Status</p>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                    task.details?.[0]?.status === 'Closed' ? 'bg-green-100 text-green-700' :
                                                    task.details?.[0]?.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-orange-100 text-orange-700'
                                                }`}>
                                                    {task.details?.[0]?.status || '—'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-0.5">Assigned To</p>
                                                <span className="text-gray-700 font-semibold truncate block">{task.assigned_user?.name || '—'}</span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-0.5">Date</p>
                                                <span className="text-gray-700 font-medium">{task.details?.[0]?.date || '—'}</span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-0.5">Time</p>
                                                <span className="text-gray-700 font-medium">{task.details?.[0]?.time || '—'}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-3 border-t">
                                            <Button
                                                variant="outline"
                                                className="flex-1 h-10 text-xs font-bold uppercase tracking-wider text-solarized-blue border-solarized-blue/20 hover:bg-solarized-blue/5"
                                                onClick={() => openViewModal(task.id)}
                                            >
                                                View Details
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Desktop DataTable (sm+) */}
                    <div className="hidden sm:block">
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
                    </div>
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
