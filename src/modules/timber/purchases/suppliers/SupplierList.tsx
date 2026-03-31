import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supplierApi } from '../../services/inventoryApi';
import type { TimberSupplier } from '../../types/inventory';
import { showAlert, showConfirmDialog, getErrorMessage } from '@/lib/sweetalert';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Plus, Search, Truck, Eye, Edit, Trash2 } from 'lucide-react';

export default function SupplierList() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<TimberSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [selectedItem, setSelectedItem] = useState<TimberSupplier | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const fetchSuppliers = useCallback(async (currentPage: number = 1) => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page: currentPage, per_page: perPage };
      if (search) params.search = search;

      const response = await supplierApi.list(params) as Record<string, unknown>;
      const data = (response.data || response) as TimberSupplier[] | Record<string, unknown>;
      const pagination = response.pagination as Record<string, number> | undefined;
      const total = (response.total ?? pagination?.total_items ?? 0) as number;

      setSuppliers(Array.isArray(data) ? data : []);
      setTotalRows(total);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
      setSuppliers([]);
      setTotalRows(0);
    } finally {
      setIsLoading(false);
    }
  }, [perPage, search]);

  useEffect(() => {
    const timer = setTimeout(() => fetchSuppliers(page), 300);
    return () => clearTimeout(timer);
  }, [page, fetchSuppliers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSuppliers(1);
  };

  const handleView = (supplier: TimberSupplier) => {
    setSelectedItem(supplier);
    setIsViewOpen(true);
  };

  const handleDelete = async (id: number) => {
    const result = await showConfirmDialog('Delete Supplier', 'Are you sure you want to delete this supplier?');
    if (!result.isConfirmed) return;
    try {
      await supplierApi.delete(id);
      showAlert('success', 'Deleted!', 'Supplier deleted successfully', 2000);
      fetchSuppliers(page);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete supplier'));
    }
  };

  const columns: TableColumn<TimberSupplier>[] = [
    {
      name: '#',
      selector: (_row, index) => (page - 1) * perPage + (index !== undefined ? index + 1 : 0),
      width: '60px',
    },
    {
      name: 'Name',
      selector: (row) => row.name,
      sortable: true,
      minWidth: '200px',
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      name: 'Contact Person',
      selector: (row) => row.contact_person || '-',
      sortable: true,
    },
    {
      name: 'Phone',
      selector: (row) => row.phone || '-',
    },
    {
      name: 'City',
      selector: (row) => row.city || '-',
      sortable: true,
    },
    {
      name: 'GST Number',
      selector: (row) => row.gst_number || '-',
    },
    {
      name: 'Status',
      cell: (row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
      width: '100px',
    },
    {
      name: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleView(row)} title="View"><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(`/purchases/suppliers/${row.id}/edit`)} title="Edit"><Edit className="h-4 w-4 text-blue-600" /></Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)} title="Delete"><Trash2 className="h-4 w-4 text-red-600" /></Button>
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
          <h1 className="text-2xl font-bold text-solarized-base02">Suppliers</h1>
          <p className="text-muted-foreground">Manage timber suppliers and vendors</p>
        </div>
        <Button onClick={() => navigate('/purchases/suppliers/create')} className="bg-solarized-blue hover:bg-solarized-blue/90">
          <Plus className="mr-2 h-4 w-4" /> New Supplier
        </Button>
      </div>

      <Card>
        <CardHeader>
          <form onSubmit={handleSearchSubmit} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Button type="submit" variant="outline">Search</Button>
          </form>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={suppliers}
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
                <Truck className="mx-auto h-12 w-12 mb-4 opacity-20" />
                <p>No suppliers found</p>
              </div>
            }
          />
        </CardContent>
      </Card>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-solarized-blue" />
              Supplier Details
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs text-muted-foreground uppercase">Name</Label><p className="text-base font-semibold">{selectedItem.name}</p></div>
                <div><Label className="text-xs text-muted-foreground uppercase">Contact Person</Label><p className="text-sm">{selectedItem.contact_person || '-'}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs text-muted-foreground uppercase">Email</Label><p className="text-sm">{selectedItem.email || '-'}</p></div>
                <div><Label className="text-xs text-muted-foreground uppercase">Phone</Label><p className="text-sm">{selectedItem.phone || '-'}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs text-muted-foreground uppercase">City</Label><p className="text-sm">{selectedItem.city || '-'}</p></div>
                <div><Label className="text-xs text-muted-foreground uppercase">State</Label><p className="text-sm">{selectedItem.state || '-'}</p></div>
              </div>
              <div><Label className="text-xs text-muted-foreground uppercase">Address</Label><p className="text-sm">{selectedItem.address || '-'}</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs text-muted-foreground uppercase">GST Number</Label><p className="text-sm">{selectedItem.gst_number || '-'}</p></div>
                <div><Label className="text-xs text-muted-foreground uppercase">PAN Number</Label><p className="text-sm">{selectedItem.pan_number || '-'}</p></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="text-xs text-muted-foreground uppercase">Bank</Label><p className="text-sm">{selectedItem.bank_name || '-'}</p></div>
                <div><Label className="text-xs text-muted-foreground uppercase">Account #</Label><p className="text-sm">{selectedItem.bank_account_number || '-'}</p></div>
                <div><Label className="text-xs text-muted-foreground uppercase">IFSC</Label><p className="text-sm">{selectedItem.bank_ifsc_code || '-'}</p></div>
              </div>
              {selectedItem.payment_terms && (
                <div><Label className="text-xs text-muted-foreground uppercase">Payment Terms</Label><p className="text-sm">{selectedItem.payment_terms}</p></div>
              )}
              {selectedItem.notes && (
                <div><Label className="text-xs text-muted-foreground uppercase">Notes</Label><p className="text-sm">{selectedItem.notes}</p></div>
              )}
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
