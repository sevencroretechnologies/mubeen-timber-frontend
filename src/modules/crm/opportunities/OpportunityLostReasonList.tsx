import { useEffect, useState, useCallback } from "react";
import {
    crmOpportunityLostReasonService as lostReasonApi,
    crmOpportunityService as opportunityApi
} from "@/services/api";
import type { OpportunityLostReason, Opportunity } from "@/types";
import { Trash2, Edit2, Search, Eye, Ghost, TrendingDown } from "lucide-react";
import { showAlert, showConfirmDialog, getErrorMessage } from "@/lib/sweetalert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import DataTable, { TableColumn } from 'react-data-table-component';

// ── Helper functions for data extraction ──────────────────────────────────────
function extractList<T>(raw: unknown): T[] {
    if (Array.isArray(raw)) return raw as T[];
    if (raw && typeof raw === 'object') {
        const r = raw as Record<string, unknown>;
        if (Array.isArray(r.data)) return r.data as T[];
        const inner = r.data;
        if (inner && typeof inner === 'object') {
            const i = inner as Record<string, unknown>;
            if (Array.isArray(i.data)) return i.data as T[];
        }
    }
    return [];
}

function extractTotal(raw: unknown): number {
    if (raw && typeof raw === 'object') {
        const r = raw as Record<string, unknown>;
        const inner = r.data;
        if (inner && typeof inner === 'object') {
            const i = inner as Record<string, unknown>;
            if (typeof i.total === 'number') return i.total;
        }
        if (typeof r.total === 'number') return r.total;
    }
    return 0;
}

export default function OpportunityLostReasonList() {
    const [reasons, setReasons] = useState<OpportunityLostReason[]>([]);
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRows, setTotalRows] = useState(0);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [currentReason, setCurrentReason] = useState<Partial<OpportunityLostReason> | null>(null);
    const [selectedReason, setSelectedReason] = useState<OpportunityLostReason | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchReasons = useCallback(async (currentPage: number = 1) => {
        setLoading(true);
        try {
            const params: Record<string, unknown> = {
                page: currentPage,
                per_page: perPage,
                search
            };
            const response = await lostReasonApi.getAll(params);
            setReasons(extractList<OpportunityLostReason>(response.data));
            setTotalRows(extractTotal(response.data));
        } catch (error) {
            console.error("Failed to fetch lost reasons:", error);
            setReasons([]);
        } finally {
            setLoading(false);
        }
    }, [search, perPage]);

    const fetchOpportunities = useCallback(async () => {
        try {
            const response = await opportunityApi.getAll({ per_page: 1000 });
            setOpportunities(extractList<Opportunity>(response.data));
        } catch (error) {
            console.error("Failed to fetch opportunities:", error);
        }
    }, []);

    useEffect(() => {
        fetchReasons(page);
        fetchOpportunities();
    }, [page, fetchReasons, fetchOpportunities]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchReasons(1);
    };

    /* const handleAddClick = () => {
        setCurrentReason({ opportunity_id: undefined, opportunity_lost_reasons: "" });
        setIsModalOpen(true);
    }; */

    const handleEditClick = (reason: OpportunityLostReason) => {
        setCurrentReason(reason);
        setIsModalOpen(true);
    };

    const handleViewClick = (reason: OpportunityLostReason) => {
        setSelectedReason(reason);
        setIsViewOpen(true);
    };

    const handleDelete = async (id: number) => {
        const result = await showConfirmDialog("Delete Lost Reason?", "Are you sure you want to delete this lost reason? This action cannot be undone.");
        if (result.isConfirmed) {
            try {
                await lostReasonApi.delete(id);
                showAlert("success", "Deleted!", "Lost reason has been deleted.");
                fetchReasons(page);
            } catch (error) {
                showAlert("error", "Error", getErrorMessage(error, "Failed to delete lost reason."));
            }
        }
    };

    const handleModalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentReason?.opportunity_id || !currentReason?.opportunity_lost_reasons) {
            showAlert("error", "Validation Error", "Please fill in all required fields.");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                opportunity_id: currentReason.opportunity_id,
                opportunity_lost_reasons: currentReason.opportunity_lost_reasons,
            };

            if (currentReason.id) {
                await lostReasonApi.update(currentReason.id, payload);
                showAlert("success", "Updated!", "Lost reason has been updated.");
            } else {
                await lostReasonApi.create(payload as any);
                showAlert("success", "Added!", "Lost reason has been added.");
            }
            setIsModalOpen(false);
            fetchReasons(page);
        } catch (error) {
            showAlert("error", "Error", getErrorMessage(error, "Failed to save lost reason."));
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns: TableColumn<OpportunityLostReason>[] = [
        {
            name: "Opportunity",
            cell: (row) => (
                <div className="flex flex-col py-2">
                    <span className="font-medium text-solarized-blue">
                        {row.opportunity?.party_name || `Opp #${row.opportunity_id}`}
                    </span>
                    <span className="text-xs text-muted-foreground">{row.opportunity?.naming_series || '-'}</span>
                </div>
            ),
            sortable: true,
            minWidth: "200px",
        },
        {
            name: "Lost Reason",
            selector: (row) => row.opportunity_lost_reasons,
            sortable: true,
            wrap: true,
            minWidth: "250px",
        },
        {
            name: "Actions",
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleViewClick(row)} title="View">
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(row)} title="Edit">
                        <Edit2 className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)} title="Delete">
                        <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                </div>
            ),
            width: "140px",
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
            style: {
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                paddingLeft: '16px',
                paddingRight: '16px',
            },
        },
        rows: {
            style: {
                minHeight: '64px',
            },
        },
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Opportunity Lost Reasons</h1>
                    <p className="text-muted-foreground">Manage and analyze why opportunities were lost</p>
                </div>
                {/* <Button onClick={handleAddClick} className="bg-solarized-blue hover:bg-solarized-blue/90 font-medium">
                    <Plus className="mr-2 h-4 w-4" /> Add Lost Reason
                </Button> */}
            </div>

            <Card className="shadow-sm">
                <CardHeader className="pb-3 text-2xl font-bold">
                    <form onSubmit={handleSearchSubmit} className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search reasons..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-10"
                            />
                        </div>
                        <Button type="submit" variant="outline" className="h-10">
                            Search
                        </Button>
                    </form>
                </CardHeader>
                <CardContent>
                    {!loading && reasons.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50/50 rounded-lg border border-dashed">
                            <Ghost className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">No lost reasons found</h3>
                            <p className="text-muted-foreground max-w-xs mx-auto mt-1">
                                Try adjusting your search or add a new reason to get started.
                            </p>
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={reasons}
                            progressPending={loading}
                            pagination
                            paginationServer
                            paginationTotalRows={totalRows}
                            paginationPerPage={perPage}
                            paginationDefaultPage={page}
                            onChangePage={(p) => setPage(p)}
                            onChangeRowsPerPage={(pp) => {
                                setPerPage(pp);
                                setPage(1);
                            }}
                            customStyles={customStyles}
                            highlightOnHover
                            responsive
                        />
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{currentReason?.id ? "Edit Lost Reason" : "Add Lost Reason"}</DialogTitle>
                        <DialogDescription>
                            Select an opportunity and provide the reason why it was lost.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleModalSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="opportunity" className="text-sm font-semibold">
                                Opportunity <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={currentReason?.opportunity_id?.toString() || ""}
                                onValueChange={(v) => setCurrentReason(p => ({ ...p, opportunity_id: Number(v) }))}
                            >
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Select Opportunity" />
                                </SelectTrigger>
                                <SelectContent>
                                    {opportunities.map((o) => (
                                        <SelectItem key={o.id} value={o.id.toString()}>
                                            {o.party_name || o.naming_series || `Opp #${o.id}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reason" className="text-sm font-semibold">
                                Reason <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="reason"
                                value={currentReason?.opportunity_lost_reasons || ""}
                                onChange={(e) => setCurrentReason(p => ({ ...p, opportunity_lost_reasons: e.target.value }))}
                                placeholder="e.g. Price too high"
                                className="h-10"
                                required
                            />
                        </div>
                        <DialogFooter className="pt-4 gap-2 sm:gap-0">
                            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-solarized-blue hover:bg-solarized-blue/90"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Saving..." : "Save Reason"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <TrendingDown className="h-5 w-5 text-solarized-blue" />
                            Reason Details
                        </DialogTitle>
                        <DialogDescription>
                            Full details of why this opportunity was lost.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedReason && (
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Opportunity</Label>
                                    <p className="text-base font-semibold text-solarized-blue">
                                        {selectedReason.opportunity?.party_name || `Opp #${selectedReason.opportunity_id}`}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Series</Label>
                                    <p className="text-sm font-medium">{selectedReason.opportunity?.naming_series || '—'}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Lost Reason</Label>
                                <div className="p-4 bg-slate-50 rounded-lg border">
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedReason.opportunity_lost_reasons}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
