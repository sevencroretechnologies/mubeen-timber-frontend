import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  crmOpportunityService,
  crmStatusService,
  crmOpportunityLostReasonService
} from '../../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../../lib/sweetalert';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '../../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Plus, Search, MoreHorizontal, Eye, Edit, Trash2, Target, XCircle } from 'lucide-react';
// import { Customer } from '@/types';

// ── Types ──────────────────────────────────────────────────────────────────────
interface OppStatus { id: number; status_name: string; }
interface OppStage { id: number; name: string; }
interface Opportunity {
  id: number;
  naming_series?: string;
  party_name: string | null;
  opportunity_from: string | null;
  amount: number | null;
  expected_closing: string | null;
  probability: number | null;
  currency: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_mobile: string | null;
  company_name: string | null;
  to_discuss: string | null;
  status_id: number | null;
  status_name?: string;
  status: OppStatus | null;
  opportunity_stage_id: number | null;
  stage_name?: string;
  opportunity_stage: OppStage | null;
  created_at: string;
  items?: { amount: string | number }[];
  lead?: Lead | null;
  customer?: Customer | null;
}

interface Lead {
  first_name: string | null;
  last_name: string | null;
}

interface Customer {
  name: string | null;
}

// ── Helper functions for data extraction ──────────────────────────────────────
function extractList<T>(raw: any): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];

  // Axios response wrapper check
  const body = raw.data || raw;
  if (Array.isArray(body)) return body as T[];

  // Laravel Paginated structure
  if (body && typeof body === 'object') {
    if (Array.isArray(body.data)) return body.data as T[];
    // Deep Laravel pagination: { message: "...", data: { data: [...] } }
    if (body.data && typeof body.data === 'object' && Array.isArray(body.data.data)) {
      return body.data.data as T[];
    }
  }
  return [];
}

function extractTotal(raw: any): number {
  if (!raw) return 0;
  
  // Directly check the raw response first for pagination
  if (raw.pagination && typeof raw.pagination.total_items === 'number') {
    return raw.pagination.total_items;
  }
  if (typeof raw.total === 'number') return raw.total;

  const body = raw.data || raw;

  if (body && typeof body === 'object') {
    if (typeof body.total === 'number') return body.total;
    if (body.data && typeof body.data === 'object' && typeof body.data.total === 'number') {
      return body.data.total;
    }
    if (body.pagination && typeof body.pagination.total_items === 'number') {
      return body.pagination.total_items;
    }
  }
  return 0;
}

// ── Status badge — same colour logic as crm-frontend statusVariant ─────────────
const statusBadge = (name = '') => {
  const n = name.toLowerCase();
  let cls = 'bg-blue-100 text-blue-800';
  if (n === 'converted') cls = 'bg-green-100 text-green-800';
  else if (n === 'lost') cls = 'bg-red-100 text-red-800';
  else if (n === 'open') cls = 'bg-yellow-100 text-yellow-800';
  else if (n === 'closed') cls = 'bg-gray-100 text-gray-700';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{name}</span>;
};

// ══════════════════════════════════════════════════════════════════════════════
export default function OpportunitiesList() {
  const navigate = useNavigate();

  const [items, setItems] = useState<Opportunity[]>([]);
  const [statuses, setStatuses] = useState<OppStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // status_id
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<Opportunity | null>(null);

  // Lost Dialog states
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [isSubmittingLost, setIsSubmittingLost] = useState(false);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load status dropdown once
  useEffect(() => {
    crmStatusService.getAll({ per_page: 100 })
      .then((r) => setStatuses(extractList<OppStatus>(r.data)))
      .catch(() => setStatuses([]));
  }, []);

  // Main data fetch – mirrors crm-frontend fetchData()
  const fetchData = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page: pg, per_page: perPage };
      if (search) params.search = search;
      if (statusFilter) params.status_id = statusFilter;
      const r = await crmOpportunityService.getAll(params);

      const extractedList = extractList<Opportunity>(r.data);
      const extractedTotal = extractTotal(r.data);

      setItems(extractedList);
      setTotal(extractedTotal);
    } catch (err) {
      console.error("fetchData error:", err);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [perPage, search, statusFilter]);

  // Debounce search + filter (400 ms) — same as crm-frontend useCallback / useEffect
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => { setPage(1); fetchData(1); }, 400);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [search, statusFilter, fetchData]);

  useEffect(() => { fetchData(page); }, [page, fetchData]);

  const handleDelete = async (id: number) => {
    const res = await showConfirmDialog('Delete Opportunity', 'Delete this opportunity?');
    if (!res.isConfirmed) return;
    try {
      await crmOpportunityService.delete(id);
      showAlert('success', 'Deleted!', 'Opportunity deleted.', 2000);
      fetchData(page);
    } catch (e) {
      showAlert('error', 'Error', getErrorMessage(e, 'Failed to delete.'));
    }
  };

  const handleMarkAsLostClick = (opp: Opportunity) => {
    setSelected(opp);
    setLostReason('');
    setLostDialogOpen(true);
  };

  const handleLostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (!lostReason.trim()) {
      showAlert('error', 'Validation Error', 'Please enter a reason.');
      return;
    }

    setIsSubmittingLost(true);
    try {
      // 1. Find the 'Lost' status ID
      const lostStatus = statuses.find(s => s.status_name.toLowerCase() === 'lost');
      if (!lostStatus) {
        throw new Error("Could not find 'Lost' status in the system.");
      }

      // 2. Update the opportunity status to 'Lost'
      await crmOpportunityService.setMultipleStatus({
        ids: [selected.id],
        status_id: lostStatus.id
      });

      // 3. Create the lost reason record
      await crmOpportunityLostReasonService.create({
        opportunity_id: selected.id,
        opportunity_lost_reasons: lostReason,
      });

      showAlert('success', 'Success', 'Opportunity marked as lost.');
      setLostDialogOpen(false);
      fetchData(page);
    } catch (e) {
      showAlert('error', 'Error', getErrorMessage(e, 'Failed to mark as lost.'));
    } finally {
      setIsSubmittingLost(false);
    }
  };

  // ── DataTable columns — mirrors crm-frontend Table columns ────────────────────
  const columns: TableColumn<Opportunity>[] = [
    {
      name: 'Opportunity Code',
      cell: (row) => (
        <span className="font-medium text-solarized-blue">
          {row.naming_series || `#${row.id}`}
        </span>
      ),
      width: '180px',
    },
    {
      name: 'Party Name',
      cell: (row) => {
        let party = '-';

        if (row.opportunity_from === 'lead' && row.lead) {
          party = [row.lead.first_name, row.lead.last_name]
            .filter(Boolean)
            .join(' ') || '-';
        }
        else if (row.opportunity_from === 'customer' && row.customer) {
          party = row.customer.name || '-';
        }
        else if (row.party_name) {
          party = row.party_name;
        }

        return <span className="font-medium">{party}</span>;
      },
      minWidth: '200px',
    },
    {
      name: 'From',
      cell: (row) => <span className="capitalize">{row.opportunity_from || '-'}</span>,
      width: '110px',
    },
    {
      name: 'Status',
      cell: (row) => row.status_name ? statusBadge(row.status_name) : <span className="text-muted-foreground">—</span>,
      width: '130px',
    },
    {
      name: 'Stage',
      selector: (row) => row.stage_name || '-',
    },
    {
      name: 'Amount',
      cell: (row) => {
        const amt = row.amount ?? (row.items?.reduce((sum, item) => sum + Number(item.amount || 0), 0) || 0);
        return amt > 0
          ? `${row.currency ?? '₹'} ${Number(amt).toLocaleString()}`
          : '-';
      },
      width: '120px',
    },
    {
      name: 'Expected Close',
      selector: (row) => row.expected_closing
        ? String(row.expected_closing).split('T')[0]
        : '-',
      width: '140px',
    },
    {
      name: 'Actions',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setSelected(row); setViewOpen(true); }}>
              <Eye className="mr-2 h-4 w-4" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/crm/opportunities/${row.id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            {row.status?.status_name?.toLowerCase() !== 'lost' && (
              <DropdownMenuItem onClick={() => handleMarkAsLostClick(row)}>
                <XCircle className="mr-2 h-4 w-4 text-orange-600" /> Mark as Lost
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(row.id)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      width: '80px',
    },
  ];

  const tableStyles = {
    headRow: { style: { backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', minHeight: '52px' } },
    headCells: { style: { fontSize: '13px', fontWeight: '600', color: '#374151', padding: '0 16px' } },
  };

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Opportunities</h2>
          <p className="text-muted-foreground">Manage and track your sales opportunities</p>
        </div>
        <Button onClick={() => navigate('/crm/opportunities/create')} className="bg-solarized-blue hover:bg-solarized-blue/90 font-medium">
          <Plus className="h-4 w-4 mr-1" /> New Opportunity
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search opportunities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <div className="w-44">
          <Select
            value={statusFilter || 'all'}
            onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="h-10"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.status_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="pt-4">
          {!loading && items.length === 0 ? (
            <div className="text-center py-20 bg-gray-50/50 rounded-lg border border-dashed">
              <Target className="mx-auto h-12 w-12 text-muted-foreground mb-3 opacity-20" />
              <p className="text-muted-foreground font-medium">No opportunities found.</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or search.</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={items}
              progressPending={loading}
              pagination
              paginationServer
              paginationTotalRows={total}
              paginationPerPage={perPage}
              paginationDefaultPage={page}
              onChangePage={(p) => setPage(p)}
              onChangeRowsPerPage={(pp) => { setPerPage(pp); setPage(1); }}
              customStyles={tableStyles}
              highlightOnHover
              responsive
            />
          )}
        </CardContent>
      </Card>

      {/* View dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-solarized-blue" />
              Opportunity Details
            </DialogTitle>
            <DialogDescription>
              {selected?.naming_series || `ID #${selected?.id}`}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-6 py-4">
              <div className="space-y-1 block mb-4">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Opportunity Code</Label>
                <p className="text-xl font-bold text-solarized-blue">{selected.naming_series || `#${selected.id}`}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Customer / Party Name</Label>
                  <p className="text-base font-semibold text-solarized-blue">
                    {(() => {
                      if (selected.opportunity_from === 'lead' && selected.lead) {
                        return [selected.lead.first_name, selected.lead.last_name].filter(Boolean).join(' ') || '—';
                      } else if (selected.opportunity_from === 'customer' && selected.customer) {
                        return selected.customer.name || '—';
                      }
                      return selected.party_name || '—';
                    })()}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Company</Label>
                  <p className="text-base font-medium">{selected.company_name || '—'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Opportunity From</Label>
                  <p className="text-sm font-medium capitalize">{selected.opportunity_from || '—'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Status</Label>
                  <div>
                    {selected?.status_name ? statusBadge(selected.status_name) : '—'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Stage</Label>
                  <p className="text-sm font-medium">{selected?.stage_name || '—'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Amount</Label>
                  <p className="text-lg font-bold text-solarized-blue">
                    {(() => {
                      const amt = selected.amount ?? (selected.items?.reduce((sum, item) => sum + Number(item.amount || 0), 0) || 0);
                      return amt > 0 ? `${selected.currency ?? '₹'} ${Number(amt).toLocaleString()}` : '—';
                    })()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Expected Close</Label>
                  <p className="text-sm font-medium">{selected.expected_closing ? String(selected.expected_closing).split('T')[0] : '—'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Probability</Label>
                  <p className="text-sm font-medium">{selected.probability != null ? `${selected.probability}%` : '—'}</p>
                </div>
              </div>

              {selected.to_discuss && (
                <div className="space-y-1 p-3 bg-slate-50 rounded-lg border">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">To Discuss</Label>
                  <p className="text-sm leading-relaxed italic">{selected.to_discuss}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-3 block">Primary Contact</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">Person</Label>
                    <p className="text-sm font-medium truncate">{selected.contact_person || '—'}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">Email</Label>
                    <p className="text-xs font-medium truncate">{selected.contact_email || '—'}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">Mobile</Label>
                    <p className="text-sm font-medium truncate">{selected.contact_mobile || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Lost Dialog */}
      <Dialog open={lostDialogOpen} onOpenChange={setLostDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Mark as Lost</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this opportunity as lost? This will record the reason in the CRM.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLostSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Opportunity</Label>
              <div className="p-3 bg-muted/50 rounded-md text-sm border font-medium text-solarized-blue">
                {selected?.party_name || selected?.naming_series || `Opp #${selected?.id}`}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lost-reason" className="text-sm font-semibold">
                Lost Reason <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lost-reason"
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="e.g. Price too high, Competitor won"
                className="h-10 border-solarized-blue/20"
                required
              />
            </div>
            <DialogFooter className="pt-4 gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setLostDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-solarized-blue hover:bg-solarized-blue/90"
                disabled={isSubmittingLost}
              >
                {isSubmittingLost ? "Processing..." : "Confirm Lost"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
