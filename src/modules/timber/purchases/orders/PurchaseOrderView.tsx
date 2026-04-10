import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { purchaseOrderApi } from '../../services/inventoryApi';
import type { TimberPurchaseOrder, PurchaseOrderStatus } from '../../types/inventory';
import { PURCHASE_ORDER_STATUS } from '../../types/inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { showAlert, showConfirmDialog, getErrorMessage } from '@/lib/sweetalert';
import { ArrowLeft, Send, PackageCheck, Edit, ChevronLeft, Calendar, Building2, Package, Clock, CreditCard, Truck, LayoutGrid, IndianRupee, XCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

// Dynamic status configuration with fallback
const getStatusConfig = (status: string) => {
  const configs: Record<string, { label: string; color: string }> = {
    [PURCHASE_ORDER_STATUS.DRAFT]: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
    [PURCHASE_ORDER_STATUS.ORDERED]: { label: 'Ordered', color: 'bg-blue-100 text-blue-800' },
    [PURCHASE_ORDER_STATUS.PARTIAL_RECEIVED]: { label: 'Partial Received', color: 'bg-yellow-100 text-yellow-800' },
    [PURCHASE_ORDER_STATUS.RECEIVED]: { label: 'Received', color: 'bg-green-100 text-green-800' },
    [PURCHASE_ORDER_STATUS.CANCELLED]: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  };
  
  return configs[status] || { 
    label: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
    color: 'bg-slate-100 text-slate-600' 
  };
};

function POViewItemCard({ item, index }: { item: any; index: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Item #{index + 1}</span>
        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{item.wood_type?.name || '-'}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-0.5">
          <p className="text-[10px] uppercase font-bold text-slate-400">Quantity</p>
          <p className="text-sm font-semibold text-slate-700">{Number(item.quantity).toFixed(2)} {item.wood_type?.unit || ''}</p>
        </div>
        <div className="space-y-0.5 text-right">
          <p className="text-[10px] uppercase font-bold text-slate-400">Unit Price</p>
          <p className="text-sm font-semibold text-slate-700">₹{Number(item.unit_price).toFixed(2)}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] uppercase font-bold text-slate-400">Received</p>
          <p className="text-sm font-semibold text-emerald-600">{Number(item.received_quantity).toFixed(2)}</p>
        </div>
        <div className="space-y-0.5 text-right">
          <p className="text-[10px] uppercase font-bold text-slate-400">Subtotal</p>
          <p className="text-sm font-bold text-indigo-700">₹{Number(item.total_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>
    </div>
  );
}

export default function PurchaseOrderView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<TimberPurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      purchaseOrderApi.get(Number(id))
        .then((data) => {
          setOrder((data as any).data as TimberPurchaseOrder || data as TimberPurchaseOrder);
        })
        .catch((error) => {
          console.error('Failed to fetch order:', error);
          showAlert('error', 'Error', 'Failed to load purchase order');
        })
        .finally(() => setIsLoading(false));
    }
  }, [id]);

  const handleSend = async () => {
    if (!order) return;
    const result = await showConfirmDialog('Send Order', 'Mark this purchase order as sent?');
    if (!result.isConfirmed) return;
    try {
      await purchaseOrderApi.send(order.id);
      showAlert('success', 'Sent', 'Purchase order marked as ordered', 2000);
      const data = await purchaseOrderApi.get(order.id);
      setOrder((data as any).data as TimberPurchaseOrder || data as TimberPurchaseOrder);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to send order'));
    }
  };

  const handleConfirmReceived = async () => {
    if (!order) return;
    const result = await showConfirmDialog('Confirm Completion', 'Mark this order as fully received? Use only after all physical goods are verified.');
    if (!result.isConfirmed) return;
    try {
      await purchaseOrderApi.confirmReceived(order.id);
      showAlert('success', 'Confirmed', 'Order marked as fully received', 2000);
      const data = await purchaseOrderApi.get(order.id);
      setOrder((data as any).data as TimberPurchaseOrder || data as TimberPurchaseOrder);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to confirm completion'));
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    const result = await showConfirmDialog('Cancel Order', 'Are you sure you want to cancel this purchase order? This will soft delete the record.');
    if (!result.isConfirmed) return;
    try {
      await purchaseOrderApi.cancel(order.id);
      showAlert('success', 'Cancelled', 'Purchase order cancelled successfully', 2000);
      navigate('/purchases/orders');
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to cancel order'));
    }
  };

  const handleDownloadInvoice = async () => {
    if (!order) return;
    try {
      const response = await purchaseOrderApi.generateInvoice(order.id);
      const url = window.URL.createObjectURL(new Blob([response.data || response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${order.po_code}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to download invoice'));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Loading purchase order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
        <Package className="h-16 w-16 text-slate-200 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Order Not Found</h2>
        <p className="text-slate-500 mb-6 max-w-xs">The purchase order you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate('/purchases/orders')} className="bg-indigo-600 font-bold px-8 rounded-xl">
          Back to Orders
        </Button>
      </div>
    );
  }

  const statusInfo = getStatusConfig(order.status);

  return (
    <div className="w-full space-y-6">
      {/* Desktop Header - Previous Style */}
      <div className="hidden md:flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/purchases/orders')} className="h-10 w-10 text-slate-500">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-solarized-base02">Purchase Order Details</h1>
            <p className="text-muted-foreground">{order.po_code}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {order.status === PURCHASE_ORDER_STATUS.DRAFT && (
            <>
              <Button variant="outline" onClick={() => navigate(`/purchases/orders/${order.id}/edit`)} className="font-bold border-slate-200">
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
              <Button onClick={handleSend} className="bg-solarized-blue hover:bg-solarized-blue/90 font-bold">
                <Send className="mr-2 h-4 w-4" /> Send Order
              </Button>
            </>
          )}
          {(order.status === PURCHASE_ORDER_STATUS.ORDERED || order.status === PURCHASE_ORDER_STATUS.PARTIAL_RECEIVED) && (
            <Button onClick={() => navigate(`/purchases/orders/${id}/receive`)} className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto">
              <PackageCheck className="mr-2 h-4 w-4" /> Receive Goods
            </Button>
          )}

          {order.status === PURCHASE_ORDER_STATUS.PARTIAL_RECEIVED && (
            <Button onClick={handleConfirmReceived} className="bg-indigo-600 hover:bg-indigo-700 font-bold">
              <PackageCheck className="mr-2 h-4 w-4" /> Confirm Completed
            </Button>
          )}

          {order.status !== PURCHASE_ORDER_STATUS.RECEIVED && order.status !== PURCHASE_ORDER_STATUS.CANCELLED && (
            <Button variant="outline" onClick={handleCancel} className="text-red-600 border-red-100 hover:bg-red-50 font-bold">
              <XCircle className="mr-2 h-4 w-4" /> Cancel Order
            </Button>
          )}

          {order.status !== PURCHASE_ORDER_STATUS.DRAFT && order.status !== PURCHASE_ORDER_STATUS.CANCELLED && (
            <Button variant="outline" onClick={handleDownloadInvoice} className="text-indigo-600 border-indigo-100 hover:bg-indigo-50 font-bold">
              <FileText className="mr-2 h-4 w-4" /> Generate Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Sticky Header - Modern Style */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-3 md:hidden -mx-4 -mt-6 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9 bg-slate-50 text-slate-500 hover:text-indigo-600" onClick={() => navigate('/purchases/orders')}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1">PO Details</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{order.po_code}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {order.status === PURCHASE_ORDER_STATUS.DRAFT && (
              <Button size="sm" variant="outline" onClick={() => navigate(`/purchases/orders/${order.id}/edit`)} className="rounded-xl border-slate-200 font-bold h-9">
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {(order.status === PURCHASE_ORDER_STATUS.ORDERED || order.status === PURCHASE_ORDER_STATUS.PARTIAL_RECEIVED) && (
              <Button size="sm" onClick={() => navigate(`/purchases/orders/${order.id}/receive`)} className="bg-emerald-600 rounded-xl font-bold h-9 shadow-lg shadow-emerald-100">
                <PackageCheck className="h-4 w-4" />
              </Button>
            )}

            {order.status === PURCHASE_ORDER_STATUS.PARTIAL_RECEIVED && (
              <Button size="sm" onClick={handleConfirmReceived} className="bg-indigo-600 rounded-xl font-bold h-9 shadow-lg shadow-indigo-100">
                <PackageCheck className="h-4 w-4" />
              </Button>
            )}

            {order.status !== PURCHASE_ORDER_STATUS.RECEIVED && order.status !== PURCHASE_ORDER_STATUS.CANCELLED && (
              <Button size="sm" variant="outline" onClick={handleCancel} className="rounded-xl border-red-100 text-red-600 font-bold h-9">
                <XCircle className="h-4 w-4" />
              </Button>
            )}

            {order.status !== PURCHASE_ORDER_STATUS.DRAFT && order.status !== PURCHASE_ORDER_STATUS.CANCELLED && (
              <Button size="sm" variant="outline" onClick={handleDownloadInvoice} className="rounded-xl border-indigo-100 text-indigo-600 font-bold h-9" title="Generate Invoice">
                <FileText className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Main Info Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card className="border-none md:border md:border-slate-200 shadow-none md:shadow-sm">
              <CardHeader className="hidden md:block">
                <CardTitle className="text-xl font-bold text-solarized-base02">Supplier & Order Info</CardTitle>
              </CardHeader>
              <CardHeader className="bg-slate-50/50 border-b border-slate-50 py-4 md:hidden">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-widest">Supplier & Order Info</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground md:text-slate-500 font-medium">Supplier Name</Label>
                    <p className="text-sm font-bold text-slate-800">{order.supplier?.name || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground md:text-slate-500 font-medium">Target Warehouse</Label>
                    <p className="text-sm font-bold text-slate-800">{order.warehouse?.name || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground md:text-slate-500 font-medium">Status</Label>
                    <div className="pt-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusInfo.color} border border-black/5 shadow-sm uppercase tracking-wider whitespace-nowrap`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground md:text-slate-500 font-medium">Order Date</Label>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                      <Calendar className="h-3.5 w-3.5 text-slate-300 md:hidden" />
                      {order.order_date ? new Date(order.order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground md:text-slate-500 font-medium">Expected Delivery</Label>
                    <div className="flex items-center gap-2 text-sm font-bold text-indigo-600">
                      <Truck className="h-3.5 w-3.5 text-indigo-300 md:hidden" />
                      {order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 
                       order.expected_date ? new Date(order.expected_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </div>
                  </div>
                  {order.notes && (
                    <div className="col-span-2 pt-2">
                       <Label className="text-muted-foreground md:text-slate-500 font-medium">Notes</Label>
                       <div className="mt-2 text-sm text-slate-600">
                         {order.notes}
                       </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-none md:border md:border-slate-200 shadow-none md:shadow-sm">
               <CardHeader className="hidden md:block">
                  <CardTitle className="text-xl font-bold text-solarized-base02">Financial Summary</CardTitle>
               </CardHeader>
               <CardContent className="pt-6 space-y-4">
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-muted-foreground font-bold uppercase text-[10px]">Subtotal</span>
                   <span className="font-bold text-slate-700">₹{Number(order.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                 </div>

                 {Number(order.discount_amount) > 0 && (
                   <div className="flex justify-between items-center text-sm">
                     <span className="text-muted-foreground font-bold uppercase text-[10px]">Discount</span>
                     <span className="font-bold text-red-600">- ₹{Number(order.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                   </div>
                 )}

                 {Number(order.tax_amount) > 0 && (
                   <>
                     <div className="flex justify-between items-center text-sm">
                       <span className="text-muted-foreground font-bold uppercase text-[10px]">Tax ({order.tax_percentage}%)</span>
                       <span className="font-bold text-slate-700">+ ₹{Number(order.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                     </div>
                   </>
                 )}

                 <Separator className="bg-slate-100" />
                 <div className="pt-2">
                   <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Total Amount</p>
                   <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center border">
                     <span className="text-xl md:text-2xl font-black tabular-nums text-solarized-base02">
                       ₹{Number(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                     </span>
                     <IndianRupee className="h-5 w-5 text-gray-400" />
                   </div>
                 </div>
               </CardContent>
            </Card>
          </div>
        </div>

        {/* Items Section */}
        <div className="space-y-4 pb-24 md:pb-8">
          <div className="hidden md:flex items-center gap-2 mb-2">
            <h2 className="text-xl font-bold text-solarized-base02">Ordered Items</h2>
          </div>

          {order.items && order.items.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b text-solarized-base02">
                      <th className="font-bold p-4 text-left">#</th>
                      <th className="font-bold p-4 text-left">Wood Type</th>
                      <th className="font-bold p-4 text-right">Quantity</th>
                      <th className="font-bold p-4 text-right">Received</th>
                      <th className="font-bold p-4 text-right">Unit Price</th>
                      <th className="font-bold p-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {order.items.map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="p-4 text-muted-foreground">{index + 1}</td>
                        <td className="p-4">
                          <p className="font-bold text-slate-800">{item.wood_type?.name || '-'}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{item.wood_type?.unit || ''}</p>
                        </td>
                        <td className="p-4 text-right font-semibold text-slate-700">{Number(item.quantity).toFixed(2)}</td>
                        <td className="p-4 text-right font-semibold text-emerald-600">{Number(item.received_quantity).toFixed(2)}</td>
                        <td className="p-4 text-right text-muted-foreground">₹{Number(item.unit_price).toFixed(2)}</td>
                        <td className="p-4 text-right font-bold text-solarized-blue">₹{Number(item.total_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td colSpan={5} className="p-4 text-right font-bold text-solarized-base02 uppercase text-xs tracking-widest">
                        Items Subtotal
                      </td>
                      <td className="p-4 text-right font-black text-solarized-blue text-base">
                        ₹{Number(order.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4 px-4">
                <div className="flex items-center gap-2 mb-2">
                  <LayoutGrid className="h-4 w-4 text-slate-400" />
                  <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest leading-none">Ordered Items</h2>
                </div>
                {order.items.map((item, index) => (
                  <POViewItemCard key={item.id} index={index} item={item} />
                ))}
                
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mt-2 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Items Subtotal</span>
                  <span className="text-lg font-bold text-indigo-700">₹{Number(order.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-50 rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
               <Package className="h-10 w-10 text-slate-200 mx-auto mb-3" />
               <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No items found in this order</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
