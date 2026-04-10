import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Lead } from "../../../types";
import { leadApi } from "../../../services/api";
import {
    showAlert,
    showConfirmDialog,
    getErrorMessage,
} from "../../../lib/sweetalert";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { StatusBadge } from "../../../components/ui/status-badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import DataTable, { TableColumn } from "react-data-table-component";
import {
    Plus,
    Search,
    Users,
    Eye,
    Edit,
    Trash2,
    Mail,
    Phone,
    Building2,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

export default function LeadsList() {
    const navigate = useNavigate();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRows, setTotalRows] = useState(0);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

    const fetchLeads = useCallback(
        async (currentPage: number = 1) => {
            setIsLoading(true);
            try {
                const params: Record<string, unknown> = {
                    page: currentPage,
                    per_page: perPage,
                    search,
                };
                const response = await leadApi.list(params);
                const data = response.data || response;
                const pagination = response.pagination;
                const total = response.total ?? pagination?.total_items ?? 0;
                setLeads(Array.isArray(data) ? data : []);
                setTotalRows(total);
            } catch (error) {
                console.error("Failed to fetch leads:", error);
                setLeads([]);
                setTotalRows(0);
            } finally {
                setIsLoading(false);
            }
        },
        [perPage, search],
    );

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLeads(page);
        }, 300);
        return () => clearTimeout(timer);
    }, [page, fetchLeads]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchLeads(1);
    };
    const handlePageChange = (newPage: number) => setPage(newPage);
    const handlePerRowsChange = (newPerPage: number) => {
        setPerPage(newPerPage);
        setPage(1);
    };
    const handleView = (lead: Lead) => {
        setSelectedLead(lead);
        setIsViewOpen(true);
    };
    const handleEdit = (lead: Lead) => {
        navigate(`/crm/leads/${lead.id}/edit`);
    };
    const handleDelete = async (id: number) => {
        const result = await showConfirmDialog(
            "Delete Lead",
            "Are you sure you want to delete this lead?",
        );
        if (!result.isConfirmed) return;
        try {
            await leadApi.delete(id);
            showAlert("success", "Deleted!", "Lead deleted successfully", 2000);
            fetchLeads(page);
        } catch (error) {
            showAlert(
                "error",
                "Error",
                getErrorMessage(error, "Failed to delete lead"),
            );
        }
    };

    /* ── Desktop Table Columns ── */
    const columns: TableColumn<Lead>[] = [
        {
            name: "Name",
            selector: (row) =>
                [row.first_name, row.last_name].filter(Boolean).join(" ") ||
                "-",
            sortable: true,
            minWidth: "160px",
            cell: (row) => (
                <span className='font-semibold text-gray-900'>
                    {[row.first_name, row.last_name]
                        .filter(Boolean)
                        .join(" ") || "-"}
                </span>
            ),
        },
        {
            name: "Email",
            selector: (row) => row.email || "-",
            minWidth: "160px",
        },
        {
            name: "Company",
            selector: (row) => row.company_name || "-",
            minWidth: "140px",
        },
        {
            name: "Status",
            cell: (row) =>
                row.status_name ? (
                    <StatusBadge status={row.status_name} />
                ) : (
                    <span className='text-muted-foreground'>—</span>
                ),
            width: "130px",
        },
        { name: "Source", selector: (row) => row.source_name || "-" },
        {
            name: "Actions",
            cell: (row) => (
                <div className='flex items-center gap-1 pl-1'>
                    <Button
                        variant='ghost'
                        size='icon'
                        className='h-7 w-7'
                        onClick={() => handleView(row)}
                        title='View'
                    >
                        <Eye className='h-4 w-4' />
                    </Button>
                    <Button
                        variant='ghost'
                        size='icon'
                        className='h-7 w-7'
                        onClick={() => handleEdit(row)}
                        title='Edit'
                    >
                        <Edit className='h-4 w-4 text-blue-600' />
                    </Button>
                    <Button
                        variant='ghost'
                        size='icon'
                        className='h-7 w-7'
                        onClick={() => handleDelete(row.id)}
                        title='Delete'
                    >
                        <Trash2 className='h-4 w-4 text-red-600' />
                    </Button>
                </div>
            ),
            width: "130px",
        },
    ];

    const customStyles = {
        headRow: {
            style: {
                backgroundColor: "#f9fafb",
                borderBottomWidth: "1px",
                borderBottomColor: "#e5e7eb",
                borderBottomStyle: "solid" as const,
                minHeight: "56px",
            },
        },
        headCells: {
            style: {
                fontSize: "14px",
                fontWeight: "600",
                color: "#374151",
                paddingLeft: "16px",
                paddingRight: "16px",
            },
        },
    };

    return (
        <div className='space-y-6'>
            {/* ── Page Header ── */}
            <div className='flex justify-between items-center gap-4 mb-4'>
                <div>
                    <h1 className='text-2xl font-bold text-solarized-base02 tracking-tight'>
                        Leads
                    </h1>
                    <p className='text-sm text-muted-foreground'>
                        Manage your CRM leads
                    </p>
                </div>
                <Button
                    onClick={() => navigate("/crm/leads/create")}
                    size='sm'
                    className='bg-solarized-blue hover:bg-solarized-blue/90 shadow-sm transition-all active:scale-95 h-9 shrink-0 px-3'
                >
                    <Plus className='mr-1 h-3.5 w-3.5' /> New Lead
                </Button>
            </div>

            {/* ── Search + Table/Cards ── */}
            <Card>
                <CardHeader>
                    <form
                        onSubmit={handleSearchSubmit}
                        className='flex flex-col sm:flex-row gap-3'
                    >
                        <div className='relative flex-1'>
                            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                            <Input
                                placeholder='Search leads...'
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className='pl-10 h-10 border-gray-200 focus:ring-solarized-blue/20'
                            />
                        </div>
                        <Button
                            type='submit'
                            variant='secondary'
                            className='w-full sm:w-auto h-10 px-6 font-semibold'
                        >
                            Search
                        </Button>
                    </form>
                </CardHeader>

                <CardContent className='p-0 sm:p-6'>
                    {/* ── Desktop DataTable (hidden on mobile) ── */}
                    <div className='hidden md:block'>
                        <DataTable
                            columns={columns}
                            data={leads}
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
                                <div className='text-center py-12 text-muted-foreground'>
                                    <Users className='mx-auto h-12 w-12 mb-4 opacity-20' />
                                    <p>No leads found</p>
                                </div>
                            }
                        />
                    </div>

                    {/* ── Mobile Card View (hidden on md+) ── */}
                    <div className='md:hidden space-y-4 p-4'>
                        {isLoading ? (
                            <div className='flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-gray-200'>
                                <Plus className='h-8 w-8 animate-spin text-solarized-blue/20 mb-2' />
                                <p className='text-sm text-muted-foreground animate-pulse'>
                                    Loading leads...
                                </p>
                            </div>
                        ) : leads.length === 0 ? (
                            <div className='text-center py-20 rounded-xl border border-dashed border-gray-200'>
                                <Users className='mx-auto h-12 w-12 mb-4 opacity-10' />
                                <p className='text-muted-foreground'>
                                    No leads found
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className='grid grid-cols-1 gap-4'>
                                    {leads.map((lead) => {
                                        const fullName =
                                            [lead.first_name, lead.last_name]
                                                .filter(Boolean)
                                                .join(" ") || "Unnamed Lead";
                                        return (
                                            <div
                                                key={lead.id}
                                                className='responsive-card p-4'
                                            >
                                                {/* Top Row: Name + Eye/Edit icons */}
                                                <div className='flex justify-between items-start mb-3'>
                                                    <div className='flex-1 min-w-0'>
                                                        <h3 className='font-bold text-gray-900 leading-tight mb-1'>
                                                            {fullName}
                                                        </h3>
                                                    </div>
                                                    <div className='flex gap-1 shrink-0'>
                                                        <Button
                                                            variant='ghost'
                                                            size='icon'
                                                            className='h-8 w-8 text-gray-400 hover:text-solarized-blue'
                                                            onClick={() =>
                                                                handleView(lead)
                                                            }
                                                        >
                                                            <Eye className='h-4 w-4' />
                                                        </Button>
                                                        <Button
                                                            variant='ghost'
                                                            size='icon'
                                                            className='h-8 w-8 text-gray-400 hover:text-blue-600'
                                                            onClick={() =>
                                                                handleEdit(lead)
                                                            }
                                                        >
                                                            <Edit className='h-4 w-4' />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Email row */}
                                                <div className='text-sm text-gray-500 mb-3'>
                                                    {lead.email && (
                                                        <div className='flex items-center gap-2'>
                                                            <Mail className='h-3.5 w-3.5 opacity-60 shrink-0' />
                                                            <span className='truncate'>
                                                                {lead.email}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 2 columns, 2 rows grid for key info */}
                                                <div className='grid grid-cols-2 gap-x-4 gap-y-3 mb-4'>
                                                    <div className='flex flex-col gap-1'>
                                                        <span className='text-[10px] font-bold text-gray-400 uppercase tracking-widest'>
                                                            Source
                                                        </span>
                                                        <span className='text-xs text-gray-600 truncate font-medium'>
                                                            {lead.source_name ||
                                                                "—"}
                                                        </span>
                                                    </div>
                                                    <div className='flex flex-col gap-1 ms-3'>
                                                        <span className='text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-5'>
                                                            Status
                                                        </span>
                                                        <div>
                                                            <StatusBadge
                                                                status={
                                                                    lead.status_name
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className='flex flex-col gap-1'>
                                                        <span className='text-[10px] font-bold text-gray-400 uppercase tracking-widest'>
                                                            Company
                                                        </span>
                                                        <span className='text-xs text-gray-600 truncate font-medium'>
                                                            {lead.company_name ||
                                                                "—"}
                                                        </span>
                                                    </div>
                                                    <div className='flex flex-col gap-1'>
                                                        <span className='text-[10px] font-bold text-gray-400 uppercase tracking-widest'>
                                                            Phone
                                                        </span>
                                                        <span className='text-xs text-gray-600 font-medium'>
                                                            {lead.mobile_no ||
                                                                "—"}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Footer: VIEW DETAILS + delete */}
                                                <div className='flex gap-2 pt-3 border-t border-gray-100 items-center'>
                                                    <Button
                                                        className='flex-1 h-10 text-[11px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-100'
                                                        variant='outline'
                                                        onClick={() =>
                                                            handleView(lead)
                                                        }
                                                    >
                                                        VIEW DETAILS
                                                    </Button>
                                                    <Button
                                                        variant='ghost'
                                                        size='icon'
                                                        className='h-10 w-10 text-red-400 hover:text-red-600 hover:bg-gray-50 rounded-lg shrink-0'
                                                        onClick={() =>
                                                            handleDelete(
                                                                lead.id,
                                                            )
                                                        }
                                                    >
                                                        <Trash2 className='h-4 w-4' />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Mobile Pagination */}
                                {totalRows > perPage && (
                                    <div className='flex justify-between items-center py-4 px-2 border-t border-gray-100 mt-4'>
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            disabled={page === 1}
                                            onClick={() => setPage(page - 1)}
                                            className='h-9 px-3 text-gray-600'
                                        >
                                            <ChevronLeft className='h-4 w-4 mr-1' />{" "}
                                            Prev
                                        </Button>
                                        <div className='text-[11px] font-bold text-gray-500 uppercase tracking-widest'>
                                            Page {page} /{" "}
                                            {Math.ceil(totalRows / perPage)}
                                        </div>
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            disabled={
                                                page >=
                                                Math.ceil(totalRows / perPage)
                                            }
                                            onClick={() => setPage(page + 1)}
                                            className='h-9 px-3 text-gray-600'
                                        >
                                            Next{" "}
                                            <ChevronRight className='h-4 w-4 ml-1' />
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ── View Lead Modal ── */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className='sm:max-w-[600px]'>
                    <DialogHeader>
                        <DialogTitle className='flex items-center gap-2'>
                            <Users className='h-5 w-5 text-solarized-blue' />
                            Lead Details
                        </DialogTitle>
                        <DialogDescription>
                            Full information for{" "}
                            {selectedLead
                                ? [
                                      selectedLead.first_name,
                                      selectedLead.last_name,
                                  ]
                                      .filter(Boolean)
                                      .join(" ")
                                : ""}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedLead && (
                        <div className='space-y-6 py-4'>
                            <div className='grid grid-cols-2 gap-4'>
                                <div className='space-y-1'>
                                    <Label className='text-xs text-muted-foreground uppercase tracking-wider font-semibold'>
                                        Lead Name
                                    </Label>
                                    <p className='text-base font-semibold text-solarized-blue'>
                                        {[
                                            selectedLead.first_name,
                                            selectedLead.last_name,
                                        ]
                                            .filter(Boolean)
                                            .join(" ") || "—"}
                                    </p>
                                </div>
                                <div className='space-y-1'>
                                    <Label className='text-xs text-muted-foreground uppercase tracking-wider font-semibold'>
                                        Series
                                    </Label>
                                    <p className='text-sm font-medium'>
                                        {selectedLead.series || "—"}
                                    </p>
                                </div>
                            </div>
                            <div className='grid grid-cols-2 gap-4'>
                                <div className='space-y-1'>
                                    <Label className='text-xs text-muted-foreground uppercase tracking-wider font-semibold'>
                                        Email
                                    </Label>
                                    <p className='text-sm font-medium break-all'>
                                        {selectedLead.email || "—"}
                                    </p>
                                </div>
                                <div className='space-y-1'>
                                    <Label className='text-xs text-muted-foreground uppercase tracking-wider font-semibold'>
                                        Phone
                                    </Label>
                                    <p className='text-sm font-medium'>
                                        {selectedLead.mobile_no || "—"}
                                    </p>
                                </div>
                            </div>
                            <div className='grid grid-cols-2 gap-4'>
                                <div className='space-y-1'>
                                    <Label className='text-xs text-muted-foreground uppercase tracking-wider font-semibold'>
                                        Company
                                    </Label>
                                    <p className='text-sm font-medium'>
                                        {selectedLead.company_name || "—"}
                                    </p>
                                </div>
                                <div className='space-y-1'>
                                    <Label className='text-xs text-muted-foreground uppercase tracking-wider font-semibold'>
                                        Status
                                    </Label>
                                    <div className='pt-0.5'>
                                        <StatusBadge
                                            status={selectedLead.status_name}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className='grid grid-cols-2 gap-4'>
                                <div className='space-y-1'>
                                    <Label className='text-xs text-muted-foreground uppercase tracking-wider font-semibold'>
                                        Source
                                    </Label>
                                    <p className='text-sm font-medium'>
                                        {selectedLead.source_name || "—"}
                                    </p>
                                </div>
                                <div className='space-y-1'>
                                    <Label className='text-xs text-muted-foreground uppercase tracking-wider font-semibold'>
                                        Industry
                                    </Label>
                                    <p className='text-sm font-medium'>
                                        {selectedLead.industry?.name || "—"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant='outline'
                            onClick={() => setIsViewOpen(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
