import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { purchaseOrderApi } from '../../services/inventoryApi';
import type { TimberPurchaseOrder } from '../../types/inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { showAlert, getErrorMessage } from '@/lib/sweetalert';
import { ArrowLeft, PackageCheck } from 'lucide-react';

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
          item_id: item.id,
          quantity: Number(item.received_quantity),
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/purchases/orders/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">Receive Goods</h1>
          <p className="text-muted-foreground">PO: {order.po_code} - {order.supplier?.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Items to Receive</CardTitle></CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Wood Type</th>
                    <th className="text-right p-3">Ordered</th>
                    <th className="text-right p-3">Already Received</th>
                    <th className="text-right p-3">Remaining</th>
                    <th className="text-right p-3 w-40">Receiving Now</th>
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
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label>Receiving Notes</Label>
              <Textarea placeholder="Notes about the received goods..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(`/purchases/orders/${id}`)}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="bg-solarized-blue hover:bg-solarized-blue/90">
            <PackageCheck className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Processing...' : 'Confirm Receipt'}
          </Button>
        </div>
      </form>
    </div>
  );
}
