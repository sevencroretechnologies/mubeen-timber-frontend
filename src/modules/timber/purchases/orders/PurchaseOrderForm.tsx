import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { purchaseOrderApi, supplierApi, warehouseApi } from '../../services/inventoryApi';
import type { TimberSupplier, TimberWarehouse, TimberWoodType, TimberPurchaseOrder } from '../../types/inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { showAlert, getErrorMessage } from '@/lib/sweetalert';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import api from '@/services/api';

interface POItemRow {
  wood_type_id: string;
  quantity: string;
  unit: string;
  unit_price: string;
  notes: string;
}

export default function PurchaseOrderForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<TimberSupplier[]>([]);
  const [warehouses, setWarehouses] = useState<TimberWarehouse[]>([]);
  const [woodTypes, setWoodTypes] = useState<TimberWoodType[]>([]);

  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<POItemRow[]>([
    { wood_type_id: '', quantity: '', unit: '', unit_price: '', notes: '' },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [supRes, whRes, wtRes] = await Promise.all([
          supplierApi.list({ per_page: 100 }),
          warehouseApi.list({ per_page: 100 }),
          api.get('/timber/wood-types', { params: { per_page: 100 } }),
        ]);
        const supData = (supRes as Record<string, unknown>).data;
        setSuppliers(Array.isArray(supData) ? supData as TimberSupplier[] : []);
        const whData = (whRes as Record<string, unknown>).data;
        setWarehouses(Array.isArray(whData) ? whData as TimberWarehouse[] : []);
        const wtData = wtRes.data?.data || wtRes.data;
        setWoodTypes(Array.isArray(wtData) ? wtData : []);
      } catch (error) {
        console.error('Failed to fetch form data:', error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (isEdit && id) {
      purchaseOrderApi.get(Number(id))
        .then((data) => {
          const po = data as TimberPurchaseOrder;
          setSupplierId(String(po.supplier_id));
          setWarehouseId(String(po.warehouse_id));
          setOrderDate(po.order_date || '');
          setExpectedDate(po.expected_date || '');
          setNotes(po.notes || '');
          if (po.items && po.items.length > 0) {
            setItems(po.items.map((item) => ({
              wood_type_id: String(item.wood_type_id),
              quantity: String(item.quantity),
              unit: item.wood_type?.unit || '',
              unit_price: String(item.unit_price),
              notes: item.notes || '',
            })));
          }
        })
        .catch((error) => {
          console.error('Failed to fetch PO:', error);
          showAlert('error', 'Error', 'Failed to load purchase order');
        });
    }
  }, [id, isEdit]);

  const addItem = () => {
    setItems([...items, { wood_type_id: '', quantity: '', unit: '', unit_price: '', notes: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof POItemRow, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
      return sum + qty * price;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !warehouseId) {
      showAlert('error', 'Validation', 'Please select supplier and warehouse');
      return;
    }
    const validItems = items.filter((item) => item.wood_type_id && item.quantity && item.unit_price);
    if (validItems.length === 0) {
      showAlert('error', 'Validation', 'Please add at least one item');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        supplier_id: Number(supplierId),
        warehouse_id: Number(warehouseId),
        order_date: orderDate || undefined,
        expected_date: expectedDate || undefined,
        notes: notes || undefined,
        items: validItems.map((item) => ({
          wood_type_id: Number(item.wood_type_id),
          quantity: Number(item.quantity),
          unit: item.unit,
          unit_price: Number(item.unit_price),
          notes: item.notes || undefined,
        })),
      };

      if (isEdit && id) {
        await purchaseOrderApi.update(Number(id), payload);
        showAlert('success', 'Updated', 'Purchase order updated successfully', 2000);
      } else {
        await purchaseOrderApi.create(payload);
        showAlert('success', 'Created', 'Purchase order created successfully', 2000);
      }
      navigate('/purchases/orders');
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, `Failed to ${isEdit ? 'update' : 'create'} purchase order`));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/purchases/orders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">{isEdit ? 'Edit' : 'New'} Purchase Order</h1>
          <p className="text-muted-foreground">{isEdit ? 'Update purchase order details' : 'Create a new purchase order'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Order Details</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Supplier <span className="text-red-500">*</span></Label>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" required>
                  <option value="">Select supplier</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Warehouse <span className="text-red-500">*</span></Label>
                <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" required>
                  <option value="">Select warehouse</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Order Date</Label>
                <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Expected Delivery Date</Label>
                <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Notes</Label>
                <Textarea placeholder="Additional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="mr-1 h-4 w-4" /> Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-end p-3 border rounded-md bg-gray-50">
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Wood Type <span className="text-red-500">*</span></Label>
                    <select value={item.wood_type_id} onChange={(e) => updateItem(index, 'wood_type_id', e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm">
                      <option value="">Select wood type</option>
                      {woodTypes.map((wt) => <option key={wt.id} value={wt.id}>{wt.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Quantity <span className="text-red-500">*</span></Label>
                    <Input type="number" step="0.01" min="0.01" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Unit <span className="text-red-500">*</span></Label>
                    <select value={item.unit} onChange={(e) => updateItem(index, 'unit', e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm">
                      <option value="CFT">CFT</option>
                      <option value="SqFt">SqFt</option>
                      <option value="Running/Ft">Running/Ft</option>
                      <option value="Piece">Piece</option>
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Unit Price <span className="text-red-500">*</span></Label>
                    <Input type="number" step="0.01" min="0" placeholder="₹" value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', e.target.value)} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Total</Label>
                    <p className="text-sm font-semibold py-2">₹{((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={items.length <= 1}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="flex justify-end pt-4 border-t">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Estimated Total</p>
                  <p className="text-xl font-bold">₹{calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/purchases/orders')}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="bg-solarized-blue hover:bg-solarized-blue/90">
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Order' : 'Create Order'}
          </Button>
        </div>
      </form>
    </div>
  );
}
