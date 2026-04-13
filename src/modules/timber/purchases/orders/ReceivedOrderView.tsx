import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { purchaseOrderApi } from '../../services/inventoryApi';
import type { TimberPurchaseOrder } from '../../types/inventory';
import { PURCHASE_ORDER_STATUS } from '../../types/inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { showAlert } from '@/lib/sweetalert';
import { ArrowLeft, Package, Calendar, Building2, CreditCard, LayoutGrid, CheckCircle2, Warehouse } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

function ReceivedItemCard({ item, index }: { item: any; index: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Item #{index + 1}</span>
        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{item.wood_type?.name || '-'}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-0.5">
          <p className="text-[10px] uppercase font-bold text-slate-400">Ordered Qty</p>
          <p className="text-sm font-semibold text-slate-500">{Number(item.quantity).toFixed(2)} {item.wood_type?.unit || ''}</p>
        </div>
        <div className="space-y-0.5 text-right">
          <p className="text-[10px] uppercase font-bold text-slate-400">Received Qty</p>
          <p className="text-sm font-bold text-emerald-600">{Number(item.received_quantity).toFixed(2)}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] uppercase font-bold text-slate-400">Balance</p>
          <p className="text-sm font-bold text-slate-400">0.00</p>
        </div>
        <div className="space-y-0.5 text-right">
          <p className="text-[10px] uppercase font-bold text-slate-400">Final Subtotal</p>
          <p className="text-sm font-bold text-indigo-700">₹{Number(item.total_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>
    </div>
  );
}

export default function ReceivedOrderView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<TimberPurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      purchaseOrderApi.get(Number(id))
        .then((data) => {
          const po = (data as any).data as TimberPurchaseOrder || data as TimberPurchaseOrder;
          if (po.status !== PURCHASE_ORDER_STATUS.RECEIVED) {
             // If someone navigates here for a non-received order, we could redirect or just show the page
             // per user request this view is specialized for 'received'
          }
          setOrder(po);
        })
        .catch((error) => {
          console.error('Failed to fetch order:', error);
          showAlert('error', 'Error', 'Failed to load purchase order');
        })
        .finally(() => setIsLoading(false));
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 border-4 border-black-100 rounded-full animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Loading received order summary...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
        <Package className="h-16 w-16 text-slate-200 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Order Not Found</h2>
        <Button onClick={() => navigate('/purchases/orders')} className="mt-6 bg-indigo-600 font-bold px-8 rounded-xl">
          Back to Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate('/purchases/orders')} 
            className="h-9 w-9 text-slate-500 rounded-xl border-slate-200 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
               <div className="bg-emerald-100 p-1.5 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
               </div>
               <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Received Order</h1>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">Summary: {order.po_code}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <span className="flex-1 sm:flex-none text-center px-4 py-2 rounded-xl text-[10px] font-black text-black uppercase tracking-widest border border-black">
             Verified & Received
           </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none bg-white shadow-sm overflow-hidden">
            <CardHeader className="bg-emerald-50/30 border-b border-emerald-100">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                 <Building2 className="h-5 w-5" />
                 Fulfillment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 lg:grid-cols-2 gap-y-6 gap-x-4">
                 <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Supplier</Label>
                    <p className="text-sm font-bold text-slate-900 truncate">{order.supplier?.name || '-'}</p>
                 </div>
                 <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Location</Label>
                    <div className="flex items-center gap-1.5">
                       <Warehouse className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                       <p className="text-sm font-bold text-slate-900 truncate">{order.warehouse?.name || '-'}</p>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Order Date</Label>
                    <div className="flex items-center gap-1.5">
                       <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                       <p className="text-sm font-bold text-slate-900">
                         {order.order_date ? new Date(order.order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                       </p>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Received</Label>
                    <div className="flex items-center gap-1.5">
                       <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                       <p className="text-sm font-bold text-emerald-700">
                         {new Date(order.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                       </p>
                    </div>
                 </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Section */}
          <div className="space-y-4">
             <div className="flex items-center justify-between px-2">
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                   <LayoutGrid className="h-5 w-5" />
                   Fully Received Items
                </h2>
                <span className="text-xs font-bold text-slate-400 italic">Balance cleared (0)</span>
             </div>

             {/* Desktop Table */}
             <div className="hidden md:block rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                   <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                         <th className="p-4 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Wood Type</th>
                         <th className="p-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">Ordered</th>
                         <th className="p-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">Received</th>
                         <th className="p-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">Balance</th>
                         <th className="p-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">Line Total</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {order.items?.map((item) => (
                         <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4">
                               <p className="font-bold text-slate-800">{item.wood_type?.name || '-'}</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase">{item.wood_type?.unit || ''}</p>
                            </td>
                            <td className="p-4 text-right font-bold text-slate-400">{Number(item.quantity).toFixed(2)}</td>
                            <td className="p-4 text-right font-black">{Number(item.received_quantity).toFixed(2)}</td>
                            <td className="p-4 text-right font-bold text-slate-300">0.00</td>
                            <td className="p-4 text-right font-black text-indigo-700">₹{Number(item.total_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>

             {/* Mobile Cards */}
             <div className="md:hidden space-y-4">
                {order.items?.map((item, index) => (
                   <ReceivedItemCard key={item.id} index={index} item={item} />
                ))}
             </div>
          </div>
        </div>

        <div className="space-y-6">
           <Card className="border-none bg-white shadow-sm">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                 <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-indigo-500" />
                    Final Costing
                 </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ordered Subtotal</span>
                    <span className="font-bold text-slate-600">₹{Number(order.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                 </div>
                 {Number(order.discount_amount) > 0 && (
                    <div className="flex justify-between items-center text-sm">
                       <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Discount</span>
                       <span className="font-bold text-red-600">- ₹{Number(order.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                 )}
                 {Number(order.tax_amount) > 0 && (
                    <div className="flex justify-between items-center text-sm">
                       <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">GST ({order.tax_percentage}%)</span>
                       <span className="font-bold text-slate-600">+ ₹{Number(order.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                 )}
                 <Separator className="bg-slate-100" />
                  <div className="pt-2">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Grand Total Paid</p>
                     <div className="relative overflow-hidden rounded-2xl p-6 flex justify-between items-center group">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-2 rounded-full blur-2xl transition-all" />
                        <div className="relative z-10 flex flex-col">
                           <span className="text-[10px] font-black uppercase text-black">Settled Amount</span>
                           <span className="text-2xl sm:text-3xl font-black text-black">
                              ₹{Number(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                           </span>
                        </div>
                        <div className="p-3 rounded-xl border border-emerald-500/30">
                           <CreditCard className="h-6 w-6 text-emerald-400" />
                        </div>
                     </div>
                  </div>
              </CardContent>
           </Card>

           {order.notes && (
             <Card className="border-none bg-indigo-50/30 shadow-none">
                <CardContent className="pt-6">
                   <Label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Notes & Observations</Label>
                   <p className="mt-2 text-sm text-slate-600 leading-relaxed italic">{order.notes}</p>
                </CardContent>
             </Card>
           )}
        </div>
      </div>
    </div>
  );
}
