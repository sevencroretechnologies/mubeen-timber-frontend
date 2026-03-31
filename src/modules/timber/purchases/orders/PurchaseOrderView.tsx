import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { purchaseOrderApi } from '../../services/inventoryApi';
import type { TimberPurchaseOrder, PurchaseOrderStatus } from '../../types/inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { showAlert, showConfirmDialog, getErrorMessage } from '@/lib/sweetalert';
import { ArrowLeft, Send, PackageCheck, Edit } from 'lucide-react';

const statusConfig: Record<PurchaseOrderStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  ordered: { label: 'Ordered', color: 'bg-blue-100 text-blue-800' },
  partial: { label: 'Partial', color: 'bg-yellow-100 text-yellow-800' },
  received: { label: 'Received', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
};

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
          setOrder((data as Record<string, unknown>).data as TimberPurchaseOrder || data as TimberPurchaseOrder);
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
      setOrder((data as Record<string, unknown>).data as TimberPurchaseOrder || data as TimberPurchaseOrder);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to send order'));
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><p>Loading purchase order...</p></div>;
  }

  if (!order) {
    return <div className="flex justify-center py-12"><p>Purchase order not found</p></div>;
  }

  const statusBadge = statusConfig[order.status];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/purchases/orders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-solarized-base02">PO: {order.po_number}</h1>
            <p className="text-muted-foreground">Purchase order details</p>
          </div>
        </div>
        <div className="flex gap-2">
          {order.status === 'draft' && (
            <>
              <Button variant="outline" onClick={() => navigate(`/purchases/orders/${order.id}/edit`)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
              <Button onClick={handleSend} className="bg-green-600 hover:bg-green-700">
                <Send className="mr-2 h-4 w-4" /> Send Order
              </Button>
            </>
          )}
          {(order.status === 'ordered' || order.status === 'partial') && (
            <Button onClick={() => navigate(`/purchases/orders/${order.id}/receive`)} className="bg-solarized-blue hover:bg-solarized-blue/90">
              <PackageCheck className="mr-2 h-4 w-4" /> Receive Goods
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Order Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs text-muted-foreground uppercase">PO Number</Label><p className="text-base font-semibold">{order.po_number}</p></div>
              <div><Label className="text-xs text-muted-foreground uppercase">Status</Label><div className="mt-1"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge?.color}`}>{statusBadge?.label}</span></div></div>
              <div><Label className="text-xs text-muted-foreground uppercase">Supplier</Label><p className="text-sm font-medium">{order.supplier?.name || '-'}</p></div>
              <div><Label className="text-xs text-muted-foreground uppercase">Warehouse</Label><p className="text-sm">{order.warehouse?.name || '-'}</p></div>
              <div><Label className="text-xs text-muted-foreground uppercase">Order Date</Label><p className="text-sm">{order.order_date ? new Date(order.order_date).toLocaleDateString('en-IN') : '-'}</p></div>
              <div><Label className="text-xs text-muted-foreground uppercase">Expected Date</Label><p className="text-sm">{order.expected_date ? new Date(order.expected_date).toLocaleDateString('en-IN') : '-'}</p></div>
              {order.received_date && (
                <div><Label className="text-xs text-muted-foreground uppercase">Received Date</Label><p className="text-sm">{new Date(order.received_date).toLocaleDateString('en-IN')}</p></div>
              )}
              {order.notes && (
                <div className="col-span-2"><Label className="text-xs text-muted-foreground uppercase">Notes</Label><p className="text-sm">{order.notes}</p></div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Totals</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{Number(order.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>₹{Number(order.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-₹{Number(order.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
            <div className="border-t pt-3 flex justify-between font-bold text-lg"><span>Total</span><span>₹{Number(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
          </CardContent>
        </Card>
      </div>

      {order.items && order.items.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Items</CardTitle></CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">#</th>
                    <th className="text-left p-3">Wood Type</th>
                    <th className="text-right p-3">Quantity</th>
                    <th className="text-right p-3">Received</th>
                    <th className="text-right p-3">Unit Price</th>
                    <th className="text-right p-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-3">{index + 1}</td>
                      <td className="p-3 font-medium">{item.wood_type?.name || '-'}</td>
                      <td className="text-right p-3">{Number(item.quantity).toFixed(2)}</td>
                      <td className="text-right p-3">{Number(item.received_quantity).toFixed(2)}</td>
                      <td className="text-right p-3">₹{Number(item.unit_price).toFixed(2)}</td>
                      <td className="text-right p-3 font-semibold">₹{Number(item.total_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
