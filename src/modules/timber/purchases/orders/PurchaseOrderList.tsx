import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseOrderApi } from '../../services/inventoryApi';
import type { TimberPurchaseOrder, PurchaseOrderStatus } from '../../types/inventory';
import { showAlert, showConfirmDialog, getErrorMessage } from '@/lib/sweetalert';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Plus, Search, ShoppingCart, Eye, Edit, Trash2, Send, PackageCheck, Calendar, Building2, CreditCard } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const statusConfig: Record<PurchaseOrderStatus, { label: string; color: string; classes: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800', classes: 'bg-gray-100 text-gray-800' },
  ordered: { label: 'Ordered', color: 'bg-blue-100 text-blue-800', classes: 'bg-blue-100 text-blue-800' },
  partial: { label: 'Partial', color: 'bg-yellow-100 text-yellow-800', classes: 'bg-yellow-100 text-yellow-800' },
  received: { label: 'Received', color: 'bg-green-100 text-green-800', classes: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', classes: 'bg-red-100 text-red-800' },
};

function PurchaseOrderSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="rounded-xl shadow-sm border-none bg-white p-4">
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="flex justify-between items-end mt-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-28" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

interface PurchaseOrderCardProps {
  order: TimberPurchaseOrder;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onSend: (id: number) => void;
  onReceive: (id: number) => void;
  getStatusBadge: (status: PurchaseOrderStatus) => React.ReactNode;
}

function PurchaseOrderCard({ order, onView, onEdit, onDelete, onSend, onReceive, getStatusBadge }: PurchaseOrderCardProps) {
  return (
    <Card className="rounded-xl shadow-sm border border-slate-100 bg-white p-4 transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-3">
        <div className="space-y-1">
          <h3 className="font-bold text-slate-900 text-lg uppercase tracking-tight">{order.po_code}</h3>
          <div className="flex items-center gap-1.5 text-slate-500 text-sm">
            <Building2 className="h-3.5 w-3.5" />
            <span className="truncate max-w-[180px]">{order.supplier?.name || 'Unknown Supplier'}</span>
          </div>
        </div>
        {getStatusBadge(order.status)}
      </div>

      <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-50">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order Date</span>
          <div className="flex items-center gap-1.5 text-slate-600 text-xs font-medium">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            {order.order_date ? new Date(order.order_date).toLocaleDateString('en-IN') : '-'}
          </div>
        </div>
        <div className="space-y-1 text-right">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Amount</span>
          <div className="flex items-center justify-end gap-1 text-indigo-600 font-bold text-sm">
            <CreditCard className="h-3.5 w-3.5" />
            ₹{Number(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
          <span className="text-[10px] font-black uppercase text-slate-300">W/H:</span>
          <span className="font-medium text-slate-600">{order.warehouse?.name || '-'}</span>
        </div>
        
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-lg hover:bg-slate-50 border-slate-200" onClick={() => onView(order.id)}>
            <Eye className="h-4 w-4 text-slate-600" />
          </Button>
          
          {order.status === 'draft' && (
            <>
              <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-lg border-blue-100 hover:bg-blue-50" onClick={() => onEdit(order.id)}>
                <Edit className="h-4 w-4 text-blue-600" />
              </Button>
              <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-lg border-green-100 hover:bg-green-50" onClick={() => onSend(order.id)}>
                <Send className="h-4 w-4 text-green-600" />
              </Button>
              <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-lg border-red-100 hover:bg-red-50" onClick={() => onDelete(order.id)}>
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </>
          )}

          {(order.status === 'ordered' || order.status === 'partial') && (
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-lg border-green-100 hover:bg-green-50" onClick={() => onReceive(order.id)}>
              <PackageCheck className="h-4 w-4 text-green-600" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function PurchaseOrderList() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<TimberPurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchOrders = useCallback(async (currentPage: number = 1) => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page: currentPage, per_page: perPage };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const response = await purchaseOrderApi.list(params) as Record<string, unknown>;
      const data = (response.data || response) as TimberPurchaseOrder[] | Record<string, unknown>;
      const pagination = response.pagination as Record<string, number> | undefined;
      const total = (response.total ?? pagination?.total_items ?? 0) as number;

      setOrders(Array.isArray(data) ? data : []);
      setTotalRows(total);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setOrders([]);
      setTotalRows(0);
    } finally {
      setIsLoading(false);
    }
  }, [perPage, search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => fetchOrders(page), 300);
    return () => clearTimeout(timer);
  }, [page, fetchOrders]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders(1);
  };

  const handleSend = async (id: number) => {
    const result = await showConfirmDialog('Send Order', 'Mark this purchase order as sent/ordered?');
    if (!result.isConfirmed) return;
    try {
      await purchaseOrderApi.send(id);
      showAlert('success', 'Sent', 'Purchase order marked as ordered', 2000);
      fetchOrders(page);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to send order'));
    }
  };

  const handleDelete = async (id: number) => {
    const result = await showConfirmDialog('Delete Order', 'Are you sure you want to delete this purchase order?');
    if (!result.isConfirmed) return;
    try {
      await purchaseOrderApi.delete(id);
      showAlert('success', 'Deleted', 'Purchase order deleted successfully', 2000);
      fetchOrders(page);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete order'));
    }
  };

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    const config = statusConfig[status];
    if (!config) return <span className="text-xs">{status}</span>;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>{config.label}</span>;
  };

  const columns: TableColumn<TimberPurchaseOrder>[] = [
    {
      name: '#',
      selector: (_row, index) => (page - 1) * perPage + (index !== undefined ? index + 1 : 0),
      width: '60px',
    },
    {
      name: 'PO Number',
      selector: (row) => row.po_code,
      sortable: true,
      minWidth: '140px',
      cell: (row) => <span className="font-medium text-solarized-blue">{row.po_code}</span>,
    },
    {
      name: 'Supplier',
      selector: (row) => row.supplier?.name || '-',
      sortable: true,
      minWidth: '160px',
    },
    {
      name: 'Status',
      cell: (row) => getStatusBadge(row.status),
      width: '110px',
    },
    {
      name: 'Order Date',
      selector: (row) => row.order_date || '-',
      cell: (row) => row.order_date ? new Date(row.order_date).toLocaleDateString('en-IN') : '-',
      width: '110px',
    },
    {
      name: 'Total Amount',
      selector: (row) => row.total_amount,
      sortable: true,
      right: true,
      cell: (row) => <span className="font-semibold">{`₹${Number(row.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}</span>,
      minWidth: '130px',
    },
    {
      name: 'Warehouse',
      selector: (row) => row.warehouse?.name || '-',
    },
    {
      name: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/purchases/orders/${row.id}`)} title="View">
            <Eye className="h-4 w-4" />
          </Button>
          {row.status === 'draft' && (
            <>
              <Button variant="ghost" size="icon" onClick={() => navigate(`/purchases/orders/${row.id}/edit`)} title="Edit">
                <Edit className="h-4 w-4 text-blue-600" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleSend(row.id)} title="Send">
                <Send className="h-4 w-4 text-green-600" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)} title="Delete">
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </>
          )}
          {(row.status === 'ordered' || row.status === 'partial') && (
            <Button variant="ghost" size="icon" onClick={() => navigate(`/purchases/orders/${row.id}/receive`)} title="Receive Goods">
              <PackageCheck className="h-4 w-4 text-green-600" />
            </Button>
          )}
        </div>
      ),
      minWidth: '160px',
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
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Purchase Orders</h1>
          <p className="text-sm text-slate-500">Manage purchase orders for timber procurement</p>
        </div>
        <Button onClick={() => navigate('/purchases/orders/create')} className="bg-solarized-blue hover:bg-solarized-blue/90 w-full sm:w-auto shadow-sm shadow-solarized-blue/20">
          <Plus className="mr-2 h-4 w-4" /> New Purchase Order
        </Button>
      </div>

      <Card>
        <CardHeader>
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by PO number or supplier..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="pl-10 h-11 sm:h-auto" 
              />
            </div>
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="flex-1 sm:flex-none border rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="ordered">Ordered</option>
                <option value="partial">Partial</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <Button type="submit" variant="outline" className="flex-1 sm:flex-none">Search</Button>
            </div>
          </form>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <DataTable
              columns={columns}
              data={orders}
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
                  <ShoppingCart className="mx-auto h-12 w-12 mb-4 opacity-20" />
                  <p>No purchase orders found</p>
                </div>
              }
            />
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden p-4 space-y-4">
            {isLoading ? (
              <PurchaseOrderSkeleton />
            ) : orders.length > 0 ? (
              <>
                {orders.map((order) => (
                  <PurchaseOrderCard
                    key={order.id}
                    order={order}
                    onView={(id) => navigate(`/purchases/orders/${id}`)}
                    onEdit={(id) => navigate(`/purchases/orders/${id}/edit`)}
                    onDelete={handleDelete}
                    onSend={handleSend}
                    onReceive={(id) => navigate(`/purchases/orders/${id}/receive`)}
                    getStatusBadge={getStatusBadge}
                  />
                ))}
                
                {/* Mobile Pagination (Simple) */}
                {totalRows > perPage && (
                  <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-xs font-medium text-slate-500">
                      Page {page} of {Math.ceil(totalRows / perPage)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= Math.ceil(totalRows / perPage)}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <ShoppingCart className="mx-auto h-12 w-12 mb-4 opacity-20" />
                <p className="text-sm font-medium">No purchase orders found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
