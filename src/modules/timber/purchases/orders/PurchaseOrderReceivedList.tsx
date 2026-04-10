import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseOrderApi } from '../../services/inventoryApi';
import type { TimberPurchaseOrder } from '../../types/inventory';
import { PURCHASE_ORDER_STATUS } from '../../types/inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Search, Eye, Calendar, Building2, CreditCard, ShoppingCart, CheckCircle2, ArrowLeft, PackageCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function ReceivedOrderSkeleton() {
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
          </div>
        </Card>
      ))}
    </div>
  );
}

function ReceivedOrderCard({ order, onView, onReceive }: { order: TimberPurchaseOrder; onView: (id: number) => void; onReceive: (id: number) => void }) {
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
        <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 tracking-wider">
          Received
        </span>
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
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paid Amount</span>
          <div className="flex items-center justify-end gap-1 text-emerald-600 font-bold text-sm">
            <CreditCard className="h-3.5 w-3.5" />
            ₹{Number(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-4">
         <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase italic">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            Received Date: {new Date(order.updated_at).toLocaleDateString('en-IN')}
         </div>
        
        <div className="flex gap-2">
          {(order.status === PURCHASE_ORDER_STATUS.ORDERED || order.status === PURCHASE_ORDER_STATUS.PARTIAL_RECEIVED) && (
            <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl hover:bg-green-50 border-green-100 text-green-600 font-bold gap-2" onClick={() => onReceive(order.id)}>
              <PackageCheck className="h-4 w-4" /> Receive Goods
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl hover:bg-emerald-50 border-emerald-100 text-emerald-600 font-bold gap-2" onClick={() => onView(order.id)}>
            <Eye className="h-4 w-4" /> View
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function PurchaseOrderReceivedList() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<TimberPurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);

  const fetchOrders = useCallback(async (currentPage: number = 1) => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { 
        page: currentPage, 
        per_page: perPage,
        status: statusFilter || [PURCHASE_ORDER_STATUS.ORDERED, PURCHASE_ORDER_STATUS.PARTIAL_RECEIVED, PURCHASE_ORDER_STATUS.RECEIVED]
      };
      if (search) params.search = search;

      const response = await purchaseOrderApi.list(params) as Record<string, unknown>;
      const rawData = (response.data || response) as TimberPurchaseOrder[] | Record<string, unknown>;
      const data = Array.isArray(rawData) ? rawData : [];
      
      // Filter to only show relevant history (exclude draft)
      const filteredData = data.filter(order => order.status !== PURCHASE_ORDER_STATUS.DRAFT);

      const total = (response.total ?? 0) as number;

      setOrders(filteredData);
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
  }, [page, fetchOrders, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders(1);
  };

  const columns: TableColumn<TimberPurchaseOrder>[] = [
    { name: '#', selector: (_row, index) => (page - 1) * perPage + (index !== undefined ? index + 1 : 0), width: '60px' },
    { name: 'PO Number', selector: (row) => row.po_code, sortable: true, cell: (row) => <span className="font-bold text-slate-700">{row.po_code}</span> },
    { name: 'Supplier', selector: (row) => row.supplier?.name || '-', sortable: true },
    { name: 'Order Date', cell: (row) => row.order_date ? new Date(row.order_date).toLocaleDateString('en-IN') : '-', width: '120px' },
    { name: 'Received Date', cell: (row) => new Date(row.updated_at).toLocaleDateString('en-IN'), width: '120px' },
    { name: 'Total Amount', right: true, cell: (row) => <span className="font-black text-black">₹{Number(row.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> },
    { name: 'Warehouse', selector: (row) => row.warehouse?.name || '-' },
    {
      name: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/purchases/orders/${row.id}/received`)} className="text-slate-700 font-bold hover:bg-slate-50">
            <Eye className="h-4 w-4 mr-1.5" /> View
          </Button>
          {(row.status === PURCHASE_ORDER_STATUS.ORDERED || row.status === PURCHASE_ORDER_STATUS.PARTIAL_RECEIVED) && (
            <Button variant="ghost" size="sm" onClick={() => navigate(`/purchases/orders/${row.id}/receive`)} className="text-green-600 font-bold hover:bg-green-50">
              <PackageCheck className="h-4 w-4 mr-1.5" /> Receive
            </Button>
          )}
        </div>
      ),
      minWidth: '220px',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Received Orders</h1>
          <p className="text-sm text-slate-500">History of completed procurement & verified inventory</p>
        </div>
        <Button onClick={() => navigate('/purchases/orders')} variant="outline" className="rounded-xl font-bold border-slate-200">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Main List
        </Button>
      </div>

      <Card>
        <CardHeader>
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search history by PO number or supplier..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="pl-10 h-11 rounded-xl border-slate-200" 
              />
            </div>
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="flex-1 sm:flex-none border rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="">All Relevant</option>
                <option value={PURCHASE_ORDER_STATUS.ORDERED}>Ordered</option>
                <option value={PURCHASE_ORDER_STATUS.PARTIAL_RECEIVED}>Partial Received</option>
                <option value={PURCHASE_ORDER_STATUS.RECEIVED}>Received</option>
                <option value={PURCHASE_ORDER_STATUS.CANCELLED}>Cancelled</option>
              </select>
              <Button type="submit" variant="outline" className="flex-1 sm:flex-none">Search</Button>
            </div>
          </form>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
          <div className="hidden md:block">
            <DataTable
              columns={columns}
              data={orders}
              progressPending={isLoading}
              pagination
              paginationServer
              paginationTotalRows={totalRows}
              paginationPerPage={perPage}
              onChangePage={(newPage) => setPage(newPage)}
              highlightOnHover
              responsive
              noDataComponent={
                <div className="text-center py-12 text-slate-400">
                  <ShoppingCart className="mx-auto h-12 w-12 mb-4 opacity-10" />
                  <p className="font-bold uppercase tracking-widest text-xs">No received orders recorded</p>
                </div>
              }
            />
          </div>

          <div className="md:hidden p-4 space-y-4">
            {isLoading ? (
              <ReceivedOrderSkeleton />
            ) : orders.length > 0 ? (
              <>
                {orders.map((order) => (
                  <ReceivedOrderCard
                    key={order.id}
                    order={order}
                    onView={(id) => navigate(`/purchases/orders/${id}/received`)}
                    onReceive={(id) => navigate(`/purchases/orders/${id}/receive`)}
                  />
                ))}
              </>
            ) : (
              <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <ShoppingCart className="mx-auto h-12 w-12 mb-4 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">No received orders found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
