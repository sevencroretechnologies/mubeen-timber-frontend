import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { materialRequisitionApi } from '../services/inventoryApi';
import type { TimberMaterialRequisition, RequisitionStatus } from '../types/inventory';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Search, Plus, ClipboardList, Eye, CheckCircle, XCircle } from 'lucide-react';
import { showAlert, showConfirmDialog, getErrorMessage } from '@/lib/sweetalert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const statusConfig: Record<RequisitionStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  issued: { label: 'Issued', color: 'bg-blue-100 text-blue-800' },
  partial_return: { label: 'Partial Return', color: 'bg-orange-100 text-orange-800' },
  returned: { label: 'Returned', color: 'bg-gray-100 text-gray-800' },
};

export default function MaterialRequisitionList() {
  const navigate = useNavigate();
  const [requisitions, setRequisitions] = useState<TimberMaterialRequisition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [selectedItem, setSelectedItem] = useState<TimberMaterialRequisition | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const fetchRequisitions = useCallback(async (currentPage: number = 1) => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page: currentPage, per_page: perPage };
      if (search) params.search = search;

      const response = await materialRequisitionApi.list(params) as Record<string, unknown>;
      const data = (response.data || response) as TimberMaterialRequisition[] | Record<string, unknown>;
      const pagination = response.pagination as Record<string, number> | undefined;
      const total = (response.total ?? pagination?.total_items ?? 0) as number;

      setRequisitions(Array.isArray(data) ? data : []);
      setTotalRows(total);
    } catch (error) {
      console.error('Failed to fetch requisitions:', error);
      setRequisitions([]);
      setTotalRows(0);
    } finally {
      setIsLoading(false);
    }
  }, [perPage, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRequisitions(page);
    }, 300);
    return () => clearTimeout(timer);
  }, [page, fetchRequisitions]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRequisitions(1);
  };

  const handleView = async (item: TimberMaterialRequisition) => {
    try {
      const detail = await materialRequisitionApi.get(item.id);
      setSelectedItem((detail as any).data || detail);
      setIsViewOpen(true);
    } catch {
      setSelectedItem(item);
      setIsViewOpen(true);
    }
  };

  const handleApprove = async (id: number) => {
    const result = await showConfirmDialog('Approve Requisition', 'Approve and issue materials for this requisition?');
    if (!result.isConfirmed) return;
    try {
      await materialRequisitionApi.approve(id);
      showAlert('success', 'Approved', 'Requisition approved and materials issued', 2000);
      fetchRequisitions(page);
      setIsViewOpen(false);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to approve requisition'));
    }
  };

  const handleReject = async (id: number) => {
    const result = await showConfirmDialog('Reject Requisition', 'Are you sure you want to reject this requisition?');
    if (!result.isConfirmed) return;
    try {
      await materialRequisitionApi.reject(id, { rejection_reason: 'Rejected by approver' });
      showAlert('success', 'Rejected', 'Requisition has been rejected', 2000);
      fetchRequisitions(page);
      setIsViewOpen(false);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to reject requisition'));
    }
  };

  const getStatusBadge = (status: RequisitionStatus) => {
    const config = statusConfig[status];
    if (!config) return <span className="text-xs">{status}</span>;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>{config.label}</span>;
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[priority] || 'bg-gray-100 text-gray-800'}`}>{priority}</span>;
  };

  const columns: TableColumn<TimberMaterialRequisition>[] = [
    {
      name: '#',
      selector: (_row, index) => (page - 1) * perPage + (index !== undefined ? index + 1 : 0),
      width: '60px',
    },
    {
      name: 'Requisition',
      selector: (row) => row.requisition_code,
      sortable: true,
      minWidth: '150px',
      cell: (row) => <span className="font-medium text-solarized-blue">{row.requisition_code}</span>,
    },
    {
      name: 'Status',
      cell: (row) => getStatusBadge(row.status),
      width: '130px',
    },
    {
      name: 'Priority',
      cell: (row) => getPriorityBadge(row.priority),
      width: '100px',
    },
    {
      name: 'Required Date',
      selector: (row) => row.required_date || '-',
      cell: (row) => row.required_date ? new Date(row.required_date).toLocaleDateString('en-IN') : '-',
      width: '120px',
    },
    {
      name: 'Requested By',
      selector: (row) => row.requester?.name || '-',
    },
    {
      name: 'Date',
      selector: (row) => row.created_at,
      cell: (row) => new Date(row.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      width: '120px',
    },
    {
      name: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleView(row)} title="View">
            <Eye className="h-4 w-4" />
          </Button>
          {row.status === 'pending' && (
            <>
              <Button variant="ghost" size="icon" onClick={() => handleApprove(row.id)} title="Approve">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleReject(row.id)} title="Reject">
                <XCircle className="h-4 w-4 text-red-600" />
              </Button>
            </>
          )}
        </div>
      ),
      width: '140px',
    },
  ];

  const customStyles = {
    headRow: {
      style: { backgroundColor: '#f9fafb', borderBottomWidth: '1px', borderBottomColor: '#e5e7eb', borderBottomStyle: 'solid' as const, minHeight: '56px' },
    },
    headCells: {
      style: { fontSize: '14px', fontWeight: '600', color: '#374151', paddingLeft: '16px', paddingRight: '16px' },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">Material Requisitions</h1>
          <p className="text-muted-foreground">Manage material requests for job cards and projects</p>
        </div>
        <Button onClick={() => navigate('/inventory/requisitions/create')} className="bg-solarized-blue hover:bg-solarized-blue/90">
          <Plus className="mr-2 h-4 w-4" /> New Requisition
        </Button>
      </div>

      <Card>
        <CardHeader>
          <form onSubmit={handleSearchSubmit} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search requisitions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Button type="submit" variant="outline">Search</Button>
          </form>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={requisitions}
            progressPending={isLoading}
            pagination
            paginationServer
            paginationTotalRows={totalRows}
            paginationPerPage={perPage}
            paginationDefaultPage={page}
            onChangePage={(newPage) => setPage(newPage)}
            onChangeRowsPerPage={(newPerPage) => { setPerPage(newPerPage); setPage(1); }}
            customStyles={customStyles}
            highlightOnHover
            responsive
            noDataComponent={
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="mx-auto h-12 w-12 mb-4 opacity-20" />
                <p>No material requisitions found</p>
              </div>
            }
          />
        </CardContent>
      </Card>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-solarized-blue" />
              Requisition: {selectedItem?.requisition_code}
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="text-xs text-muted-foreground uppercase">Status</Label><div className="mt-1">{getStatusBadge(selectedItem.status)}</div></div>
                <div><Label className="text-xs text-muted-foreground uppercase">Priority</Label><div className="mt-1">{getPriorityBadge(selectedItem.priority)}</div></div>
                <div><Label className="text-xs text-muted-foreground uppercase">Required Date</Label><p className="text-sm">{selectedItem.required_date ? new Date(selectedItem.required_date).toLocaleDateString('en-IN') : '-'}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs text-muted-foreground uppercase">Requested By</Label><p className="text-sm">{selectedItem.requester?.name || '-'}</p></div>
                <div><Label className="text-xs text-muted-foreground uppercase">Approved By</Label><p className="text-sm">{selectedItem.approver?.name || '-'}</p></div>
              </div>
              {selectedItem.notes && (
                <div><Label className="text-xs text-muted-foreground uppercase">Notes</Label><p className="text-sm">{selectedItem.notes}</p></div>
              )}
              {selectedItem.rejection_reason && (
                <div><Label className="text-xs text-muted-foreground uppercase">Rejection Reason</Label><p className="text-sm text-red-600">{selectedItem.rejection_reason}</p></div>
              )}
              {selectedItem.items && selectedItem.items.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">Items</Label>
                  <div className="mt-2 border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-2">Wood Type</th>
                          <th className="text-right p-2">Requested</th>
                          <th className="text-right p-2">Approved</th>
                          <th className="text-right p-2">Issued</th>
                          <th className="text-right p-2">Returned</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedItem.items.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="p-2">{item.wood_type?.name || '-'}</td>
                            <td className="text-right p-2">{Number(item.quantity_requested).toFixed(2)}</td>
                            <td className="text-right p-2">{Number(item.quantity_approved).toFixed(2)}</td>
                            <td className="text-right p-2">{Number(item.quantity_issued).toFixed(2)}</td>
                            <td className="text-right p-2">{Number(item.quantity_returned).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedItem?.status === 'pending' && (
              <div className="flex gap-2 mr-auto">
                <Button variant="default" onClick={() => handleApprove(selectedItem.id)} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="mr-1 h-4 w-4" /> Approve
                </Button>
                <Button variant="destructive" onClick={() => handleReject(selectedItem.id)}>
                  <XCircle className="mr-1 h-4 w-4" /> Reject
                </Button>
              </div>
            )}
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
