import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseOrderApi } from '../../services/inventoryApi';
import type { TimberPurchaseOrder, PurchaseOrderStatus } from '../../types/inventory';
import { PURCHASE_ORDER_STATUS } from '../../types/inventory';
import { showAlert, showConfirmDialog, getErrorMessage } from '@/lib/sweetalert';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Plus, Search, ShoppingCart, Eye, Send, Calendar, Building2, CreditCard, XCircle, FileText, MoreVertical } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Dynamic status configuration with fallback
const getStatusConfig = (status: string) => {
  const configs: Record<string, { label: string; color: string; classes: string }> = {
    [PURCHASE_ORDER_STATUS.DRAFT]: { label: 'Draft', color: 'bg-gray-100 text-gray-800', classes: 'bg-gray-100 text-gray-800' },
    [PURCHASE_ORDER_STATUS.ORDERED]: { label: 'Ordered', color: 'bg-blue-100 text-blue-800', classes: 'bg-blue-100 text-blue-800' },
    [PURCHASE_ORDER_STATUS.PARTIAL_RECEIVED]: { label: 'Partial Received', color: 'bg-yellow-100 text-yellow-800', classes: 'bg-yellow-100 text-yellow-800' },
    [PURCHASE_ORDER_STATUS.RECEIVED]: { label: 'Received', color: 'bg-green-100 text-green-800', classes: 'bg-green-100 text-green-800' },
    [PURCHASE_ORDER_STATUS.CANCELLED]: { label: 'Cancelled', color: 'bg-red-100 text-red-800', classes: 'bg-red-100 text-red-800' },
  };

  return configs[status] || {
    label: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    color: 'bg-slate-100 text-slate-600',
    classes: 'bg-slate-100 text-slate-600'
  };
};

// Action button types
type ActionType = 'view' | 'confirm' | 'cancel' | 'invoice';

interface ActionButton {
  type: ActionType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
  variant: 'primary' | 'secondary' | 'destructive' | 'invoice';
  priority: number;
}

// Get available actions based on status
const getAvailableActions = (status: PurchaseOrderStatus): ActionButton[] => {
  const baseActions: ActionButton[] = [
    {
      type: 'view',
      label: 'View',
      icon: Eye,
      tooltip: 'View order details',
      variant: 'secondary',
      priority: 1,
    },
  ];

  const statusActions: Record<PurchaseOrderStatus, ActionButton[]> = {
    [PURCHASE_ORDER_STATUS.DRAFT]: [
      {
        type: 'confirm',
        label: 'Confirm Order',
        icon: Send,
        tooltip: 'Confirm and send this order to supplier',
        variant: 'primary',
        priority: 2,
      },
      {
        type: 'cancel',
        label: 'Cancel',
        icon: XCircle,
        tooltip: 'Cancel this order',
        variant: 'destructive',
        priority: 3,
      },
    ],
    [PURCHASE_ORDER_STATUS.ORDERED]: [
      {
        type: 'cancel',
        label: 'Cancel',
        icon: XCircle,
        tooltip: 'Cancel this order',
        variant: 'destructive',
        priority: 2,
      },
      {
        type: 'invoice',
        label: 'Invoice',
        icon: FileText,
        tooltip: 'Download invoice',
        variant: 'invoice',
        priority: 3,
      },
    ],
    [PURCHASE_ORDER_STATUS.RECEIVED]: [
      {
        type: 'invoice',
        label: 'Invoice',
        icon: FileText,
        tooltip: 'Download invoice',
        variant: 'invoice',
        priority: 2,
      },
    ],
    [PURCHASE_ORDER_STATUS.CANCELLED]: [],
    [PURCHASE_ORDER_STATUS.PARTIAL_RECEIVED]: [
      {
        type: 'invoice',
        label: 'Invoice',
        icon: FileText,
        tooltip: 'Download invoice',
        variant: 'invoice',
        priority: 2,
      },
      {
        type: 'cancel',
        label: 'Cancel',
        icon: XCircle,
        tooltip: 'Cancel this order',
        variant: 'destructive',
        priority: 3,
      },
    ],
  };

  return [...baseActions, ...(statusActions[status] || [])].sort((a, b) => a.priority - b.priority);
};

// Button style variants
const getButtonStyles = (variant: ActionButton['variant']) => {
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600 shadow-sm shadow-emerald-200',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200',
    destructive: 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200 hover:border-red-300',
    invoice: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 hover:border-blue-300',
  };
  return variants[variant];
};

// Get primary action (if any) and remaining actions
const getActionGroups = (status: PurchaseOrderStatus) => {
  const actions = getAvailableActions(status);
  const primaryAction = actions.find(a => a.variant === 'primary');
  const remainingActions = actions.filter(a => a.variant !== 'primary');
  return { primaryAction, remainingActions };
};

// Action Menu Component
interface ActionMenuProps {
  actions: ActionButton[];
  onAction: (action: ActionButton, id: number) => void;
  id: number;
}

function ActionMenu({ actions, onAction, id }: ActionMenuProps) {
  if (actions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 gap-1.5 rounded-md border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600 font-medium whitespace-nowrap"
        >
          <span className="text-xs">Actions</span>
          <MoreVertical className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 min-w-[180px] rounded-lg border-slate-200">
        {actions.map((action) => {
          const Icon = action.icon;
          const variantClass = {
            primary: 'text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50',
            secondary: 'text-slate-700 focus:text-slate-900 focus:bg-slate-50',
            destructive: 'text-red-600 focus:text-red-700 focus:bg-red-50',
            invoice: 'text-blue-600 focus:text-blue-700 focus:bg-blue-50',
          }[action.variant];

          return (
            <DropdownMenuItem
              key={action.type}
              onClick={() => onAction(action, id)}
              className={`gap-2.5 cursor-pointer py-2 px-3 rounded-md ${variantClass}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">{action.label}</span>
                <span className="text-[10px] text-slate-400 font-normal">{action.tooltip}</span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
  onCancel: (id: number) => void;
  onDownloadInvoice: (id: number, code: string) => void;
  getStatusBadge: (status: PurchaseOrderStatus) => React.ReactNode;
  isMobile?: boolean;
}

function PurchaseOrderCard({ order, onView, onEdit, onDelete, onSend, onReceive, onCancel, onDownloadInvoice, getStatusBadge, isMobile = false }: PurchaseOrderCardProps) {
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

      <div className="mt-4 pt-3 border-t border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="text-[10px] font-black uppercase text-slate-300">W/H:</span>
            <span className="font-bold text-slate-600 text-xs truncate max-w-[150px] sm:max-w-none">{order.warehouse?.name || '-'}</span>
          </div>
          
          <div className="sm:hidden">
            <ActionMenu
              actions={getActionGroups(order.status).remainingActions}
              onAction={(action) => {
                switch (action.type) {
                  case 'view': onView(order.id); break;
                  case 'cancel': onCancel(order.id); break;
                  case 'invoice': onDownloadInvoice(order.id, order.po_code); break;
                }
              }}
              id={order.id}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:w-auto">
          {getActionGroups(order.status).primaryAction && (
            <Button
              size="sm"
              className="sm:h-9 px-5 gap-2 rounded-xl sm:rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-bold sm:font-semibold shadow-md shadow-emerald-100 sm:shadow-emerald-200 whitespace-nowrap"
              onClick={() => onSend(order.id)}
            >
              <Send className="h-4 w-4" />
              Confirm Order
            </Button>
          )}
          
          <div className="hidden sm:block">
            <ActionMenu
              actions={getActionGroups(order.status).remainingActions}
              onAction={(action) => {
                switch (action.type) {
                  case 'view': onView(order.id); break;
                  case 'cancel': onCancel(order.id); break;
                  case 'invoice': onDownloadInvoice(order.id, order.po_code); break;
                }
              }}
              id={order.id}
            />
          </div>
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

  const handleSend = async (id: number) => {
    const result = await showConfirmDialog('Send Order', 'Mark this purchase order as ordered?');
    if (!result.isConfirmed) return;
    try {
      await purchaseOrderApi.send(id);
      showAlert('success', 'Sent', 'Purchase order marked as ordered', 2000);
      fetchOrders(page);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to send order'));
    }
  };

  const handleCancel = async (id: number) => {
    const result = await showConfirmDialog('Cancel Order', 'Are you sure you want to cancel this purchase order? This will cancel the order.');
    if (!result.isConfirmed) return;
    try {
      await purchaseOrderApi.cancel(id);
      showAlert('success', 'Cancelled', 'Purchase order cancelled successfully', 2000);
      fetchOrders(page);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to cancel order'));
    }
  };

  const handleDownloadInvoice = async (id: number, code: string) => {
    try {
      const response = await purchaseOrderApi.generateInvoice(id);
      const url = window.URL.createObjectURL(new Blob([response.data || response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${code}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to download invoice'));
    }
  };

  const getStatusBadge = (status: string) => {
    const config = getStatusConfig(status);
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
      width: '140px',
      cell: (row) => <span className="font-medium text-solarized-blue">{row.po_code}</span>,
    },
    {
      name: 'Supplier',
      selector: (row) => row.supplier?.name || '-',
      sortable: true,
      width: '180px',
    },
    {
      name: 'Status',
      cell: (row) => getStatusBadge(row.status),
      width: '120px',
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
      width: '140px',
    },
    {
      name: 'Warehouse',
      selector: (row) => row.warehouse?.name || '-',
      width: '150px',
    },
    {
      name: 'Confirm',
      cell: (row) => {
        const { primaryAction } = getActionGroups(row.status);
        if (!primaryAction) return null;

        return (
          <div className="flex items-center justify-center px-2">
            <Button
              size="sm"
              className="h-8 px-3 gap-1.5 rounded-md  text-white font-semibold text-xs whitespace-nowrap"
              onClick={() => handleSend(row.id)}
            >
              <Send className="h-3 w-3" />
              <span>Confirm</span>
            </Button>
          </div>
        );
      },
      width: '110px',
      center: true,
    },
    {
      name: 'Actions',
      cell: (row) => {
        const { remainingActions } = getActionGroups(row.status);

        const handleAction = (action: ActionButton) => {
          switch (action.type) {
            case 'view':
              navigate(`/purchases/orders/${row.id}`);
              break;
            case 'confirm':
              handleSend(row.id);
              break;
            case 'cancel':
              handleCancel(row.id);
              break;
            case 'invoice':
              handleDownloadInvoice(row.id, row.po_code);
              break;
          }
        };

        return (
          <div className="flex items-center justify-center px-2">
            <ActionMenu
              actions={remainingActions}
              onAction={handleAction}
              id={row.id}
            />
          </div>
        );
      },
      width: '120px',
      center: true,
    },
  ];

  const customStyles = {
    headRow: {
      style: { backgroundColor: '#f9fafb', borderBottomWidth: '1px', borderBottomColor: '#e5e7eb', borderBottomStyle: 'solid' as const, minHeight: '56px' },
    },
    headCells: {
      style: { fontSize: '13px', fontWeight: '600', color: '#374151', paddingLeft: '12px', paddingRight: '12px', '&:last-child': { paddingRight: '12px' } },
    },
    cells: {
      style: { paddingLeft: '12px', paddingRight: '12px', '&:last-child': { paddingRight: '12px' } },
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
                <option value={PURCHASE_ORDER_STATUS.DRAFT}>Draft</option>
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
                    onCancel={handleCancel}
                    onDownloadInvoice={handleDownloadInvoice}
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
