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
import { ArrowLeft, Save, Plus, Trash2, Calendar, Building2, Package, ChevronLeft, LayoutGrid, Clock, IndianRupee } from 'lucide-react';
import api from '@/services/api';

interface POItemRow {
  wood_type_id: string;
  quantity: string;
  unit: string;
  unit_price: string;
  notes: string;
}

interface MobileItemCardProps {
  item: POItemRow;
  index: number;
  woodTypes: TimberWoodType[];
  onUpdate: (index: number, field: keyof POItemRow, value: string) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

function MobileItemCard({ item, index, woodTypes, onUpdate, onRemove, canRemove }: MobileItemCardProps) {
  return (
    <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden bg-white">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Item #{index + 1}</span>
        {canRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)} className="h-8 w-8 p-0 text-red-500 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="p-4 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">Wood Type <span className="text-red-500">*</span></Label>
          <select 
            value={item.wood_type_id} 
            onChange={(e) => onUpdate(index, 'wood_type_id', e.target.value)} 
            className="w-full bg-slate-50 border-slate-200 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all h-11"
          >
            <option value="">Select wood type</option>
            {woodTypes.map((wt) => <option key={wt.id} value={wt.id}>{wt.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Quantity <span className="text-red-500">*</span></Label>
            <Input 
              type="number" 
              step="0.01" 
              placeholder="0.00" 
              value={item.quantity} 
              onChange={(e) => onUpdate(index, 'quantity', e.target.value)}
              className="bg-slate-50 border-slate-200 rounded-lg py-2.5 h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Unit <span className="text-red-500">*</span></Label>
            <select 
              value={item.unit} 
              onChange={(e) => onUpdate(index, 'unit', e.target.value)} 
              className="w-full bg-slate-50 border-slate-200 rounded-lg py-2.5 px-3 text-sm h-11 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="CFT">CFT</option>
              <option value="SqFt">SqFt</option>
              <option value="Piece">Piece</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">Unit Price <span className="text-red-500">*</span></Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
            <Input 
              type="number" 
              step="0.01" 
              placeholder="0.00" 
              value={item.unit_price} 
              onChange={(e) => onUpdate(index, 'unit_price', e.target.value)}
              className="bg-slate-50 border-slate-200 rounded-lg pl-8 py-2.5 h-11 mt-0"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-between items-center border-t border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subtotal</span>
          <span className="text-base font-bold text-indigo-600">₹{((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </Card>
  );
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
    { wood_type_id: '', quantity: '', unit: 'CFT', unit_price: '', notes: '' },
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
          setExpectedDate(po.expected_delivery_date || '');
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
    setItems([...items, { wood_type_id: '', quantity: '', unit: 'CFT', unit_price: '', notes: '' }]);
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
    const validItems = items.filter((item) => item.wood_type_id && item.quantity && item.unit && item.unit_price);
    if (validItems.length === 0) {
      showAlert('error', 'Validation', 'Please add at least one item with all fields filled');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        supplier_id: Number(supplierId),
        warehouse_id: Number(warehouseId),
        order_date: orderDate || undefined,
        expected_delivery_date: expectedDate || undefined,
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
    <div className="w-full px-4 py-4 md:px-0 md:py-0 space-y-6 pb-24 md:pb-8">
      {/* Desktop Header - Previous Style */}
      <div className="hidden md:flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/purchases/orders')} className="h-10 w-10 text-slate-500">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">{isEdit ? 'Edit' : 'New'} Purchase Order</h1>
          <p className="text-muted-foreground">{isEdit ? 'Update purchase order details' : 'Create a new purchase order'}</p>
        </div>
      </div>

      {/* Mobile Sticky Header - Modern Style */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 md:hidden -mx-4 -mt-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 bg-slate-50" onClick={() => navigate('/purchases/orders')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-slate-800 tracking-tight">{isEdit ? 'Edit' : 'Create'} Purchase Order</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-none md:border md:border-slate-200 shadow-none md:shadow-sm">
          <CardHeader className="hidden md:block">
            <CardTitle className="text-xl font-bold text-solarized-base02">Order Information</CardTitle>
          </CardHeader>
          <CardHeader className="bg-slate-50/50 border-b border-slate-50 py-4 md:hidden">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-600" />
              <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-widest">Order Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-bold md:font-normal">Supplier <span className="text-red-500">*</span></Label>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full md:bg-white border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 h-11 md:h-10" required>
                  <option value="">Select supplier</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold md:font-normal">Warehouse <span className="text-red-500">*</span></Label>
                <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="w-full md:bg-white border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 h-11 md:h-10" required>
                  <option value="">Select warehouse</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold md:font-normal">Order Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 md:hidden" />
                  <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="pl-11 md:px-3 h-11 md:h-10 rounded-lg" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold md:font-normal">Expected Delivery Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 md:hidden" />
                  <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="pl-11 md:px-3 h-11 md:h-10 rounded-lg" />
                </div>
              </div>
              <div className="md:col-span-2 lg:col-span-3 space-y-2">
                <Label className="text-sm font-bold md:font-normal">Notes</Label>
                <Textarea placeholder="Additional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="rounded-lg" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none md:border md:border-slate-200 shadow-none md:shadow-sm">
          <CardHeader className="hidden md:flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold text-solarized-base02">Ordered Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem} className="font-bold">
              <Plus className="mr-1.5 h-4 w-4" /> Add Item
            </Button>
          </CardHeader>
          <CardHeader className="bg-slate-50/50 border-b border-slate-50 py-4 md:hidden flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-600" />
              <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-widest">Ordered Items</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6 px-0 md:px-6">
            <div className="space-y-4">
              {/* Desktop view (Original Grid Table) */}
              <div className="hidden md:block space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-end p-3 border rounded-md bg-gray-50">
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs font-bold text-slate-500 uppercase">Wood Type <span className="text-red-500">*</span></Label>
                      <select value={item.wood_type_id} onChange={(e) => updateItem(index, 'wood_type_id', e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                        <option value="">Select wood type</option>
                        {woodTypes.map((wt) => <option key={wt.id} value={wt.id}>{wt.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs font-bold text-slate-500 uppercase">Quantity <span className="text-red-500">*</span></Label>
                      <Input type="number" step="0.01" min="0.01" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} className="bg-white" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs font-bold text-slate-500 uppercase">Unit <span className="text-red-500">*</span></Label>
                      <select value={item.unit} onChange={(e) => updateItem(index, 'unit', e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                        <option value="CFT">CFT</option>
                        <option value="SqFt">SqFt</option>
                        <option value="Piece">Piece</option>
                      </select>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs font-bold text-slate-500 uppercase">Unit Price <span className="text-red-500">*</span></Label>
                      <Input type="number" step="0.01" min="0" placeholder="₹" value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', e.target.value)} className="bg-white" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs font-bold text-slate-500 uppercase">Total</Label>
                      <p className="text-sm font-bold text-indigo-600 py-2">₹{((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={items.length <= 1} className="text-slate-400 text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile view (Modern Cards) */}
              <div className="md:hidden space-y-4 px-4">
                {items.map((item, index) => (
                  <MobileItemCard 
                    key={index} 
                    index={index} 
                    item={item} 
                    woodTypes={woodTypes} 
                    onUpdate={updateItem} 
                    onRemove={removeItem} 
                    canRemove={items.length > 1} 
                  />
                ))}
                <Button type="button" variant="outline" className="w-full py-6 rounded-xl border-dashed border-2 text-slate-500 font-bold" onClick={addItem}>
                  <Plus className="mr-2 h-4 w-4" /> Add Another Item
                </Button>
              </div>

              <div className="flex justify-between items-end pt-4 border-t px-4 md:px-0">
                <div className="hidden md:block">
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Total Items: {items.length}</p>
                </div>
                <div className="w-full md:w-auto text-center md:text-right space-y-1">
                  <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Grand Total</p>
                  <div className="flex items-center justify-center md:justify-end gap-2 text-2xl md:text-3xl font-bold text-solarized-base02">
                    <span className="text-xl md:text-2xl text-slate-400">₹</span>
                    <span>{calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Desktop Actions */}
        <div className="hidden md:flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => navigate('/purchases/orders')} className="px-8 font-bold">Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="bg-solarized-blue hover:bg-solarized-blue/90 px-12 font-bold">
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Order' : 'Create Order'}
          </Button>
        </div>

        {/* Mobile Sticky Actions */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-100 p-4 flex gap-3 shadow-[0_-8px_30px_rgb(0,0,0,0.06)] backdrop-blur-lg bg-white/90">
          <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl font-bold border-slate-200 text-slate-600" onClick={() => navigate('/purchases/orders')}>Cancel</Button>
          <Button 
            type="submit" 
            disabled={isSubmitting} 
            className="flex-[2] h-12 rounded-xl font-black bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100"
          >
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Order' : 'Create Order'}
          </Button>
        </div>
      </form>
    </div>
  );
}
