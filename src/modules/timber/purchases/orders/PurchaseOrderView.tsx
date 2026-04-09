import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { purchaseOrderApi } from '../../services/inventoryApi';
import type { TimberPurchaseOrder, PurchaseOrderStatus } from '../../types/inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { showAlert, showConfirmDialog, getErrorMessage } from '@/lib/sweetalert';
import { ArrowLeft, Send, PackageCheck, Edit, ChevronLeft, Calendar, Building2, Package, Clock, CreditCard, Truck, LayoutGrid, IndianRupee } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const statusConfig: Record<PurchaseOrderStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  ordered: { label: 'Ordered', color: 'bg-blue-100 text-blue-800' },
  partial: { label: 'Partial', color: 'bg-yellow-100 text-yellow-800' },
  received: { label: 'Received', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
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

  const statusBadge = statusConfig[order.status];

  return (
    <div className="max-w-6xl mx-auto -mx-4 -mt-6 sm:mx-0 sm:mt-0 pb-12">
      {/* Sticky Top Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 py-3 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9 bg-slate-50 text-slate-500 hover:text-indigo-600" onClick={() => navigate('/purchases/orders')}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight leading-none mb-1">
                PO Details
              </h1>
              <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">
                {order.po_code}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {order.status === 'draft' && (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => navigate(`/purchases/orders/${order.id}/edit`)}
                  className="rounded-xl border-slate-200 font-bold gap-2 text-xs md:text-sm h-9 md:h-10 px-3 md:px-4"
                  aria-label="Edit Purchase Order"
                >
                  <Edit className="h-4 w-4" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSend} 
                  className="bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold gap-2 text-xs md:text-sm h-9 md:h-10 px-3 md:px-4"
                >
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Send Order</span>
                </Button>
              </>
            )}
            {(order.status === 'ordered' || order.status === 'partial') && (
              <Button 
                size="sm" 
                onClick={() => navigate(`/purchases/orders/${order.id}/receive`)} 
                className="bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold gap-2 text-xs md:text-sm h-9 md:h-10 px-3 md:px-4 shadow-lg shadow-indigo-100"
              >
                <PackageCheck className="h-4 w-4" />
                <span>Receive Goods</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Main Info Blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-2xl border-none shadow-sm md:shadow-md md:border md:border-slate-100 bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-50 py-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-indigo-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-800 uppercase tracking-wide">Supplier & Order Info</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier Name</Label>
                    <p className="text-sm font-bold text-slate-800">{order.supplier?.name || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Warehouse</Label>
                    <p className="text-sm font-bold text-slate-800">{order.warehouse?.name || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Status</Label>
                    <div className="pt-1">
                      <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider", statusBadge?.color)}>
                        {statusBadge?.label}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Date</Label>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                      <Calendar className="h-3.5 w-3.5 text-slate-300" />
                      {order.order_date ? new Date(order.order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </div>
                  </div>
                  {/* <div className="space-y-1">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expected Delivery</Label>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                      <Truck className="h-3.5 w-3.5 text-slate-300" />
                      {order.expected_date ? new Date(order.expected_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </div>
                  </div> */}
                  {order.received_date && (
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Final Receipt</Label>
                      <div className="flex items-center gap-2 text-sm font-bold text-emerald-600">
                        <PackageCheck className="h-3.5 w-3.5 text-emerald-300" />
                        {new Date(order.received_date).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                  )}
                  {order.notes && (
                    <div className="col-span-2 pt-2">
                       <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes / Instructions</Label>
                       <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm italic text-slate-600">
                         "{order.notes}"
                       </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-2xl border-none shadow-sm md:shadow-md md:border md:border-slate-100 bg-white overflow-hidden">
               <CardHeader className="py-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-indigo-200" />
                    <CardTitle className="text-base font-bold text-black uppercase tracking-wide">Financial Summary</CardTitle>
                  </div>
               </CardHeader>
               <CardContent className="pt-6 space-y-4">
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-400 font-bold uppercase tracking-tighter text-[10px]">Subtotal (Pre-tax)</span>
                   <span className="font-bold text-slate-700">₹{Number(order.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                 </div>
                 {/* <div className="flex justify-between items-center text-sm text-emerald-600">
                   <span className="font-bold uppercase tracking-tighter text-[10px]">Tax Amount</span>
                   <span className="font-bold">+₹{Number(order.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                 </div> */}
                 {/* <div className="flex justify-between items-center text-sm text-red-500">
                   <span className="font-bold uppercase tracking-tighter text-[10px]">Discount</span>
                   <span className="font-bold">-₹{Number(order.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                 </div> */}
                 <Separator className="bg-slate-100" />
                 <div className="pt-2">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Total Payable Amount</p>
                   <div className="bg-indigo-50 rounded-2xl p-4 text-center">
                     <span className="font-black tabular-nums">
                       ₹{Number(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                     </span>
                   </div>
                 </div>
               </CardContent>
            </Card>
          </div>
        </div>

        {/* Items Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <LayoutGrid className="h-4 w-4 text-slate-400" />
            <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">Ordered Items List</h2>
          </div>

          {order.items && order.items.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-100 shadow-sm bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className="text-[10px] font-black uppercase text-slate-400 tracking-widest p-4 text-left">#</th>
                      <th className="text-[10px] font-black uppercase text-slate-400 tracking-widest p-4 text-left">Wood Type</th>
                      <th className="text-[10px] font-black uppercase text-slate-400 tracking-widest p-4 text-right">Qty (Requested)</th>
                      <th className="text-[10px] font-black uppercase text-slate-400 tracking-widest p-4 text-right">Received</th>
                      <th className="text-[10px] font-black uppercase text-slate-400 tracking-widest p-4 text-right">Rate</th>
                      <th className="text-[10px] font-black uppercase text-slate-400 tracking-widest p-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {order.items.map((item, index) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-slate-400 font-bold">{index + 1}</td>
                        <td className="p-4">
                          <p className="font-bold text-slate-800">{item.wood_type?.name || '-'}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{item.wood_type?.unit || ''}</p>
                        </td>
                        <td className="p-4 text-right font-bold text-slate-700">{Number(item.quantity).toFixed(2)}</td>
                        <td className="p-4 text-right">
                          <span className={cn("font-bold", Number(item.received_quantity) > 0 ? "text-emerald-600" : "text-slate-300")}>
                            {Number(item.received_quantity).toFixed(2)}
                          </span>
                        </td>
                        <td className="p-4 text-right font-medium text-slate-500">₹{Number(item.unit_price).toFixed(2)}</td>
                        <td className="p-4 text-right font-black text-indigo-600">₹{Number(item.total_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {order.items.map((item, index) => (
                  <POViewItemCard key={item.id} index={index} item={item} />
                ))}
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
