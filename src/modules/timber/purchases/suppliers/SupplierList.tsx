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
import { Plus, Search, Truck, Eye, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

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
          <Button variant="ghost" size="icon" onClick={() => handleView(row)} title="View">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(`/purchases/suppliers/${row.id}/edit`)} title="Edit">
            <Edit className="h-4 w-4 text-blue-600" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)} title="Delete">
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ),
      width: '140px',
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
      {/* Page Header */}
      <div className="flex justify-between items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02 tracking-tight">Suppliers</h1>
          <p className="text-sm text-muted-foreground">Manage timber suppliers and vendors</p>
        </div>
        <Button
          onClick={() => navigate('/purchases/suppliers/create')}
          size="sm"
          className="bg-solarized-blue hover:bg-solarized-blue/90 shadow-sm transition-all active:scale-95 h-9 shrink-0 px-3"
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> New Supplier
        </Button>
      </div>

      <Card>
        <CardHeader>
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 border-gray-200 focus:ring-solarized-blue/20"
              />
            </div>
            <Button type="submit" variant="secondary" className="w-full sm:w-auto h-10 px-6 font-semibold">
              Search
            </Button>
          </form>
        </CardHeader>

        <CardContent className="p-0 sm:p-6">

          {/* Desktop View */}
          <div className="hidden md:block">
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
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 p-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-gray-200">
                <Plus className="h-8 w-8 animate-spin text-solarized-blue/20 mb-2" />
                <p className="text-sm text-muted-foreground animate-pulse">Loading suppliers...</p>
              </div>
            ) : suppliers.length === 0 ? (
              <div className="text-center py-20 rounded-xl border border-dashed border-gray-200">
                <Truck className="mx-auto h-12 w-12 mb-4 opacity-10" />
                <p className="text-muted-foreground">No suppliers found</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4">
                  {suppliers.map((supplier) => (
                    <div key={supplier.id} className="responsive-card p-4">

                      {/* Name (left) + Status (right) */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <h3 className="font-bold text-gray-900 leading-tight truncate">{supplier.name}</h3>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${supplier.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {supplier.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {/* Info Grid: Phone, City */}
                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-gray-600 mb-3">
                        {supplier.phone && (
                          <div>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Phone</span>
                            <span>{supplier.phone}</span>
                          </div>
                        )}
                        {supplier.city && (
                          <div>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">City</span>
                            <span>{supplier.city}</span>
                          </div>
                        )}
                      </div>

                      {/* Footer: View + Edit + Delete */}
                      <div className="flex items-center justify-end gap-1 pt-3 border-t border-gray-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-solarized-blue"
                          onClick={() => handleView(supplier)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-blue-600"
                          onClick={() => navigate(`/purchases/suppliers/${supplier.id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          onClick={() => handleDelete(supplier.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                    </div>

                  ))}
                </div>

                {/* Mobile Pagination */}
                {totalRows > perPage && (
                  <div className="flex justify-between items-center py-4 px-2 border-t border-gray-100 mt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                      className="h-9 px-3 text-gray-600"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                    </Button>
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                      Page {page} / {Math.ceil(totalRows / perPage)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={page >= Math.ceil(totalRows / perPage)}
                      onClick={() => setPage(page + 1)}
                      className="h-9 px-3 text-gray-600"
                    >
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[600px] max-sm:mx-[5px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-solarized-blue" />
              Supplier Details
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">Name</Label>
                  <p className="text-base font-semibold">{selectedItem.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">Contact Person</Label>
                  <p className="text-sm">{selectedItem.contact_person || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">Email</Label>
                  <p className="text-sm">{selectedItem.email || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">Phone</Label>
                  <p className="text-sm">{selectedItem.phone || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">City</Label>
                  <p className="text-sm">{selectedItem.city || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">State</Label>
                  <p className="text-sm">{selectedItem.state || '-'}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase">Address</Label>
                <p className="text-sm">{selectedItem.address || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">GST Number</Label>
                  <p className="text-sm">{selectedItem.gst_number || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">PAN Number</Label>
                  <p className="text-sm">{selectedItem.pan_number || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">Bank</Label>
                  <p className="text-sm">{selectedItem.bank_name || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">Account #</Label>
                  <p className="text-sm">{selectedItem.bank_account_number || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">IFSC</Label>
                  <p className="text-sm">{selectedItem.bank_ifsc_code || '-'}</p>
                </div>
              </div>
              {selectedItem.payment_terms && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">Payment Terms</Label>
                  <p className="text-sm">{selectedItem.payment_terms}</p>
                </div>
              )}
              {selectedItem.notes && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase">Notes</Label>
                  <p className="text-sm">{selectedItem.notes}</p>
                </div>
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
