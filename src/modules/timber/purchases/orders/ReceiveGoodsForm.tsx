import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { purchaseOrderApi } from '../../services/inventoryApi';
import type { TimberPurchaseOrder } from '../../types/inventory';
import { PURCHASE_ORDER_STATUS } from '../../types/inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { showAlert, getErrorMessage } from '@/lib/sweetalert';
import { ArrowLeft, PackageCheck, ChevronLeft, Package, Clock, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReceiveItemRow {
  id: number;
  wood_type_name: string;
  ordered_quantity: number;
  already_received: number;
  remaining: number;
  received_quantity: string;
}

export default function ReceiveGoodsForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [order, setOrder] = useState<TimberPurchaseOrder | null>(null);
  const [items, setItems] = useState<ReceiveItemRow[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      purchaseOrderApi.get(Number(id))
        .then((data) => {
          const po = (data as unknown as Record<string, unknown>).data as TimberPurchaseOrder || data as TimberPurchaseOrder;
          setOrder(po);
          if (po.items) {
            setItems(po.items.map((item) => ({
              id: item.id,
              wood_type_name: item.wood_type?.name || '-',
              ordered_quantity: Number(item.quantity),
              already_received: Number(item.received_quantity),
              remaining: Number(item.quantity) - Number(item.received_quantity),
              received_quantity: '',
            })));
          }
        })
        .catch((error) => {
          console.error('Failed to fetch order:', error);
          showAlert('error', 'Error', 'Failed to load purchase order');
        })
        .finally(() => setIsLoading(false));
    }
  }, [id]);

  const updateReceivedQty = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], received_quantity: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const receivingItems = items.filter((item) => Number(item.received_quantity) > 0);
    if (receivingItems.length === 0) {
      showAlert('error', 'Validation', 'Please enter received quantities for at least one item');
      return;
    }

    // Validate no item exceeds remaining quantity
    for (const item of receivingItems) {
      const received = Number(item.received_quantity);
      if (received > item.remaining) {
        showAlert('error', 'Validation', `Received quantity for ${item.wood_type_name} exceeds remaining quantity (${item.remaining})`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await purchaseOrderApi.receive(Number(id), {
        items: receivingItems.map((item) => ({
          id: item.id,
          received_quantity: Number(item.received_quantity),
        })),
        notes: notes || undefined,
      });
      showAlert('success', 'Success', 'Goods received and stock updated', 2000);
      navigate(`/purchases/orders/${id}`);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to receive goods'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><p>Loading purchase order...</p></div>;
  }

  if (!order) {
    return <div className="flex justify-center py-12"><p>Purchase order not found</p></div>;
  }

  return (
    <div className="w-full space-y-6 pb-24 md:pb-8">
      {/* Desktop Header - Previous Style */}
      <div className="hidden md:flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/purchases/orders/${id}`)} className="h-10 w-10 text-slate-500">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">Receive Goods</h1>
          <p className="text-muted-foreground font-medium">PO: {order.po_code} — {order.supplier?.name}</p>
        </div>
      </div>

      {/* Mobile Sticky Header - Modern Style */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 md:hidden -mx-4 -mt-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 bg-slate-50" onClick={() => navigate(`/purchases/orders/${id}`)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-slate-800 tracking-tight">Receive Goods</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-3">
          <Card className="border-none md:border md:border-slate-200 shadow-none md:shadow-sm">
            <CardHeader className="hidden md:block">
              <CardTitle className="text-xl font-bold text-solarized-base02">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 md:pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <Label className="text-muted-foreground md:text-slate-500 font-medium">Supplier</Label>
                  <p className="text-sm font-bold text-slate-800">{order.supplier?.name || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground md:text-slate-500 font-medium">Warehouse</Label>
                  <p className="text-sm font-bold text-slate-800">{order.warehouse?.name || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground md:text-slate-500 font-medium">PO Code</Label>
                  <p className="text-sm font-bold text-slate-800">{order.po_code}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground md:text-slate-500 font-medium">Expected Date</Label>
                  <p className="text-sm font-bold text-indigo-600">{order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString('en-IN') : order.expected_date ? new Date(order.expected_date).toLocaleDateString('en-IN') : '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-none md:border md:border-slate-200 shadow-none md:shadow-sm">
          <CardHeader className="hidden md:block">
            <CardTitle className="text-xl font-bold text-solarized-base02">Items to Receive</CardTitle>
          </CardHeader>
          <CardHeader className="bg-slate-50/50 border-b border-slate-50 py-4 md:hidden">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-slate-400 ml-2" />
              <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-widest">Items to Receive</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-0 md:px-6">
            {/* Desktop Table - Unchanged structure, just hidden on mobile */}
            <div className="hidden md:block border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-solarized-base02">
                    <th className="text-left p-3 font-bold">Wood Type</th>
                    <th className="text-right p-3 font-bold">Ordered</th>
                    <th className="text-right p-3 font-bold">Already Received</th>
                    <th className="text-right p-3 font-bold">Remaining</th>
                    <th className="text-right p-3 w-40 font-bold">Receiving Now</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-3 font-medium">{item.wood_type_name}</td>
                      <td className="text-right p-3">{item.ordered_quantity.toFixed(2)}</td>
                      <td className="text-right p-3">{item.already_received.toFixed(2)}</td>
                      <td className="text-right p-3 font-semibold">{item.remaining.toFixed(2)}</td>
                      <td className="p-3">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={item.remaining}
                          placeholder="0.00"
                          value={item.received_quantity}
                          onChange={(e) => updateReceivedQty(index, e.target.value)}
                          className="text-right"
                          disabled={item.remaining <= 0}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards - New for mobile, hidden on desktop */}
            <div className="block md:hidden space-y-4">
              {items.map((item, index) => (
                <Card key={item.id} className="rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center font-bold text-[10px] text-slate-400 uppercase tracking-widest">
                    <span>Item #{index + 1}</span>
                    {item.remaining <= 0 && <span className="text-emerald-500">Fully Received</span>}
                  </div>
                  <div className="p-4 space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm">{item.wood_type_name}</h3>
                    <div className="grid grid-cols-3 gap-2 text-center border-b border-slate-50 pb-3">
                      <div className="space-y-0.5">
                        <p className="text-[9px] uppercase font-bold text-slate-400">Ordered</p>
                        <p className="text-xs font-semibold text-slate-600">{item.ordered_quantity.toFixed(2)}</p>
                      </div>
                      <div className="space-y-0.5 border-x border-slate-50">
                        <p className="text-[9px] uppercase font-bold text-slate-400">Received</p>
                        <p className="text-xs font-semibold text-slate-600">{item.already_received.toFixed(2)}</p>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <p className="text-[9px] uppercase font-bold text-slate-400">Remaining</p>
                        <p className="text-xs font-bold text-indigo-600">{item.remaining.toFixed(2)}</p>
                      </div>
                    </div>
                    {item.remaining > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Receiving Now</Label>
                        <div className="relative">
                          <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max={item.remaining}
                            placeholder="0.00"
                            value={item.received_quantity}
                            onChange={(e) => updateReceivedQty(index, e.target.value)}
                            className="pl-9 h-11 bg-slate-50 border-slate-200 rounded-lg font-bold text-slate-900"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none md:border md:border-slate-200 shadow-none md:shadow-sm mt-4">
          <CardContent className="pt-6 px-4 md:px-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-bold text-solarized-base02">Receiving Notes</Label>
              </div>
              <Textarea 
                placeholder="Notes about the received goods..." 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                rows={3} 
                className="w-full text-sm h-11 md:h-24 bg-slate-50 md:bg-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Sticky Mobile actions and Static Desktop actions */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-50 md:static md:p-0 md:border-none flex flex-col md:flex-row justify-end gap-3 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] md:shadow-none">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate(`/purchases/orders/${id}`)}
            className="w-full md:w-auto h-11 md:h-10 order-2 md:order-1 font-bold md:font-normal text-slate-500"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting} 
            className="bg-solarized-blue hover:bg-solarized-blue/90 w-full md:w-auto h-11 md:h-10 order-1 md:order-2 font-black md:font-normal"
          >
            <PackageCheck className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Processing...' : 'Confirm Receipt'}
          </Button>
        </div>
      </form>
    </div>
  );
}
