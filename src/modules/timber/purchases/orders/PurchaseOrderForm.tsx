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
import { ArrowLeft, Save, Plus, Trash2, Calendar, Building2, Package, MoreHorizontal, ChevronLeft, LayoutGrid, ListIcon, IndianRupee } from 'lucide-react';
import api from '@/services/api';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

interface POItemRow {
  wood_type_id: string;
  quantity: string;
  unit: string;
  unit_price: string;
  notes: string;
}

interface POItemRowProps {
  item: POItemRow;
  index: number;
  woodTypes: TimberWoodType[];
  onUpdate: (index: number, field: keyof POItemRow, value: string) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

function MobileItemCard({ item, index, woodTypes, onUpdate, onRemove, canRemove }: POItemRowProps) {
  return (
    <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden bg-white">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Item #{index + 1}</span>
        {canRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)} className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50">
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
            className="w-full bg-slate-50 border-slate-200 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
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
              {/* <option value="Running/Ft">Running/Ft</option> */}
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
          <span className="text-xs font-medium text-slate-400 uppercase tracking-tighter">Line Total</span>
          <span className="text-lg font-bold text-indigo-600">₹{((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </Card>
  );
}

function DesktopItemRow({ item, index, woodTypes, onUpdate, onRemove, canRemove }: POItemRowProps) {
  return (
    <div className="grid grid-cols-12 gap-4 items-end p-4 hover:bg-slate-50 transition-colors rounded-xl border border-transparent hover:border-slate-200">
      <div className="col-span-1 text-slate-400 font-bold text-center pb-2.5">#{index + 1}</div>
      <div className="col-span-4 space-y-1.5">
        {index === 0 && <Label className="text-xs font-bold text-slate-500 uppercase">Wood Type</Label>}
        <select 
          value={item.wood_type_id} 
          onChange={(e) => onUpdate(index, 'wood_type_id', e.target.value)} 
          className="w-full border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 h-10"
        >
          <option value="">Select wood type</option>
          {woodTypes.map((wt) => <option key={wt.id} value={wt.id}>{wt.name}</option>)}
        </select>
      </div>
      <div className="col-span-2 space-y-1.5">
        {index === 0 && <Label className="text-xs font-bold text-slate-500 uppercase">Quantity</Label>}
        <Input type="number" step="0.01" placeholder="Qty" value={item.quantity} onChange={(e) => onUpdate(index, 'quantity', e.target.value)} className="h-10 border-slate-200 rounded-lg text-center" />
      </div>
      <div className="col-span-1.5 space-y-1.5">
        {index === 0 && <Label className="text-xs font-bold text-slate-500 uppercase ml-3">Unit</Label>}
        <select value={item.unit} onChange={(e) => onUpdate(index, 'unit', e.target.value)} className="w-full border-slate-200 rounded-lg px-2 py-2 text-sm h-10 focus:ring-2 focus:ring-indigo-500">
          <option value="CFT">CFT</option>
          <option value="SqFt">SqFt</option>
          <option value="Piece">Piece</option>
        </select>
      </div>
      <div className="col-span-2 space-y-1.5">
        {index === 0 && <Label className="text-xs font-bold text-slate-500 uppercase">Unit Price</Label>}
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
          <Input type="number" step="0.01" placeholder="Rate" value={item.unit_price} onChange={(e) => onUpdate(index, 'unit_price', e.target.value)} className="h-10 pl-6 border-slate-200 rounded-lg text-right font-medium" />
        </div>
      </div>
      <div className="col-span-1.5 flex flex-col items-end pb-2.5">
        {index === 0 && <Label className="text-xs font-bold text-slate-500 uppercase mb-1">Total</Label>}
        <span className="text-sm font-bold text-indigo-600">₹{((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
      </div>
      <div className="col-span-0.5 flex justify-center pb-1">
        {canRemove && (
          <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(index)} className="h-8 w-8 text-slate-300 hover:text-red-500">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
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
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
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
        const supData = (supRes as any).data;
        setSuppliers(Array.isArray(supData) ? supData as TimberSupplier[] : []);
        const whData = (whRes as any).data;
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
              unit: item.wood_type?.unit || 'CFT',
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
    <div className="min-h-screen bg-slate-50/50 md:bg-transparent -mx-4 -mt-6 sm:mx-0 sm:mt-0 pb-20 md:pb-8">
      {/* Sticky Mobile Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 md:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 bg-slate-50" onClick={() => navigate('/purchases/orders')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-slate-800 tracking-tight">{isEdit ? 'Edit' : 'Create'} Purchase Order</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto md:py-6 md:px-4">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" className="h-10 w-10 border-slate-200" onClick={() => navigate('/purchases/orders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{isEdit ? 'Edit' : 'New'} Purchase Order</h1>
            <p className="text-slate-500 font-medium">Manage timber procurement requests</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
          {/* Section 1: Basic Details */}
          <div className="px-4 md:px-0">
            <Card className="rounded-2xl border-none shadow-sm md:shadow-md md:border md:border-slate-100 bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-50 py-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-indigo-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-800 uppercase tracking-wide">Order Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase ml-1">Supplier <span className="text-red-500">*</span></Label>
                    <select 
                      value={supplierId} 
                      onChange={(e) => setSupplierId(e.target.value)} 
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-medium" 
                      required
                    >
                      <option value="">Select supplier</option>
                      {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase ml-1">Warehouse <span className="text-red-500">*</span></Label>
                    <select 
                      value={warehouseId} 
                      onChange={(e) => setWarehouseId(e.target.value)} 
                      className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-medium" 
                      required
                    >
                      <option value="">Select warehouse</option>
                      {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase ml-1">Order Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="pl-11 bg-slate-50 border-slate-200 rounded-xl h-12 font-medium" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase ml-1">Expected Delivery</Label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="pl-11 bg-slate-50 border-slate-200 rounded-xl h-12 font-medium" />
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase ml-1">Notes / Instructions</Label>
                    <Textarea 
                      placeholder="Enter any special instructions for the supplier..." 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)} 
                      rows={3} 
                      className="bg-slate-50 border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section 2: Items List */}
          <div className="px-4 md:px-0">
            <Card className="rounded-2xl border-none shadow-sm md:shadow-md md:border md:border-slate-100 bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-50 py-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Package className="h-4 w-4 text-emerald-600" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-800 uppercase tracking-wide">Ordered Items</CardTitle>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="hidden md:flex rounded-lg border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold bg-white">
                  <Plus className="mr-1.5 h-4 w-4" /> Add New Item
                </Button>
              </CardHeader>
              <CardContent className="pt-6 px-3 md:px-6">
                {/* Desktop view (Rows) */}
                <div className="hidden md:block space-y-1">
                  {items.map((item, index) => (
                    <DesktopItemRow 
                      key={index} 
                      index={index} 
                      item={item} 
                      woodTypes={woodTypes} 
                      onUpdate={updateItem} 
                      onRemove={removeItem} 
                      canRemove={items.length > 1} 
                    />
                  ))}
                </div>

                {/* Mobile view (Cards) */}
                <div className="md:hidden space-y-4">
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
                  <Button type="button" variant="outline" className="w-full py-6 rounded-xl border-dashed border-2 border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 font-bold" onClick={addItem}>
                    <Plus className="mr-2 h-4 w-4" /> Add Another Item
                  </Button>
                </div>

                {/* Summary Section */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-slate-400">
                        <LayoutGrid className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">{items.length} Items Selected</span>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Grand Total Amount</p>
                      <div className="flex items-center justify-end gap-2 text-3xl font-black text-slate-900">
                         <IndianRupee className="h-6 w-6 text-indigo-500" />
                         <span>{calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons (Desktop) */}
          <div className="hidden md:flex justify-end gap-4 p-4 mt-4">
            <Button type="button" variant="outline" size="lg" onClick={() => navigate('/purchases/orders')} className="rounded-xl px-8 font-bold border-slate-200">Cancel</Button>
            <Button type="submit" size="lg" disabled={isSubmitting} className="rounded-xl px-12 font-black bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
              <Save className="mr-2 h-5 w-5" />
              {isSubmitting ? 'Processing...' : isEdit ? 'Update Purchase Order' : 'Submit Purchase Order'}
            </Button>
          </div>
        </form>
      </div>

      {/* Sticky Mobile Actions */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-100 p-4 flex gap-3 shadow-[0_-8px_30px_rgb(0,0,0,0.06)] backdrop-blur-lg bg-white/90">
        <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl font-bold border-slate-200 text-slate-600" onClick={() => navigate('/purchases/orders')}>Cancel</Button>
        <Button 
          type="button" 
          onClick={(e) => handleSubmit(e as any)} 
          disabled={isSubmitting} 
          className="flex-[2] h-12 rounded-xl font-black bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100"
        >
          {isSubmitting ? 'Saving...' : 'Submit Order'}
        </Button>
      </div>
    </div>
  );
}
