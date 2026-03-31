import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { materialRequisitionApi, warehouseApi } from '../services/inventoryApi';
import type { TimberWarehouse, TimberWoodType } from '../types/inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { showAlert, getErrorMessage } from '@/lib/sweetalert';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import api from '@/services/api';

interface RequisitionItemRow {
  wood_type_id: string;
  quantity_requested: string;
  warehouse_id: string;
  notes: string;
}

export default function MaterialRequisitionForm() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState<TimberWarehouse[]>([]);
  const [woodTypes, setWoodTypes] = useState<TimberWoodType[]>([]);
  const [priority, setPriority] = useState('medium');
  const [requiredDate, setRequiredDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<RequisitionItemRow[]>([
    { wood_type_id: '', quantity_requested: '', warehouse_id: '', notes: '' },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [whRes, wtRes] = await Promise.all([
          warehouseApi.list({ per_page: 100 }),
          api.get('/timber/wood-types', { params: { per_page: 100 } }),
        ]);
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

  const addItem = () => {
    setItems([...items, { wood_type_id: '', quantity_requested: '', warehouse_id: '', notes: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof RequisitionItemRow, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter((item) => item.wood_type_id && item.quantity_requested);
    if (validItems.length === 0) {
      showAlert('error', 'Validation', 'Please add at least one item');
      return;
    }

    setIsSubmitting(true);
    try {
      await materialRequisitionApi.create({
        priority: priority as 'low' | 'medium' | 'high' | 'urgent',
        required_date: requiredDate || undefined,
        notes: notes || undefined,
        items: validItems.map((item) => ({
          wood_type_id: Number(item.wood_type_id),
          quantity_requested: Number(item.quantity_requested),
          warehouse_id: item.warehouse_id ? Number(item.warehouse_id) : undefined,
          notes: item.notes || undefined,
        })),
      });
      showAlert('success', 'Success', 'Material requisition created successfully', 2000);
      navigate('/inventory/requisitions');
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to create requisition'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/inventory/requisitions')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">New Material Requisition</h1>
          <p className="text-muted-foreground">Request materials for a job card or project</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Requisition Details</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority <span className="text-red-500">*</span></Label>
                <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="required_date">Required Date</Label>
                <Input id="required_date" type="date" value={requiredDate} onChange={(e) => setRequiredDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" placeholder="Additional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={1} />
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
                  <div className="col-span-4 space-y-1">
                    <Label className="text-xs">Wood Type <span className="text-red-500">*</span></Label>
                    <select value={item.wood_type_id} onChange={(e) => updateItem(index, 'wood_type_id', e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm">
                      <option value="">Select wood type</option>
                      {woodTypes.map((wt) => <option key={wt.id} value={wt.id}>{wt.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Quantity <span className="text-red-500">*</span></Label>
                    <Input type="number" step="0.01" min="0.01" placeholder="Qty" value={item.quantity_requested} onChange={(e) => updateItem(index, 'quantity_requested', e.target.value)} />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Warehouse</Label>
                    <select value={item.warehouse_id} onChange={(e) => updateItem(index, 'warehouse_id', e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm">
                      <option value="">Any warehouse</option>
                      {warehouses.map((wh) => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Notes</Label>
                    <Input placeholder="Notes" value={item.notes} onChange={(e) => updateItem(index, 'notes', e.target.value)} />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={items.length <= 1}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/inventory/requisitions')}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="bg-solarized-blue hover:bg-solarized-blue/90">
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Creating...' : 'Create Requisition'}
          </Button>
        </div>
      </form>
    </div>
  );
}
