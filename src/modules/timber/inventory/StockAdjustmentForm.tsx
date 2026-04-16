import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { stockApi, warehouseApi } from '../services/inventoryApi';
import type { TimberWarehouse, TimberWoodType } from '../types/inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { showAlert, getErrorMessage } from '@/lib/sweetalert';
import { ArrowLeft, Save } from 'lucide-react';
import api from '@/services/api';

export default function StockAdjustmentForm() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState<TimberWarehouse[]>([]);
  const [woodTypes, setWoodTypes] = useState<TimberWoodType[]>([]);
  const [formData, setFormData] = useState({
    wood_type_id: '',
    warehouse_id: '',
    quantity: '',
    unit_price: '',
    notes: '',
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.wood_type_id || !formData.warehouse_id || !formData.quantity) {
      showAlert('error', 'Validation', 'Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await stockApi.adjust({
        wood_type_id: Number(formData.wood_type_id),
        warehouse_id: Number(formData.warehouse_id),
        quantity: Number(formData.quantity),
        unit_price: formData.unit_price ? Number(formData.unit_price) : undefined,
        notes: formData.notes || undefined,
      });
      showAlert('success', 'Success', 'Stock adjustment recorded successfully', 2000);
      navigate('/inventory');
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to record stock adjustment'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02 tracking-tight">Stock Adjustment</h1>
          <p className="text-sm text-muted-foreground">Manually adjust stock levels for a wood type</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/inventory')} 
          className="h-8 px-3 text-xs font-semibold border-gray-200 hover:bg-gray-50 flex items-center gap-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back To
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Adjustment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className="space-y-2">
                <Label htmlFor="warehouse_id">Warehouse <span className="text-red-500">*</span></Label>
                <select
                  id="warehouse_id"
                  value={formData.warehouse_id}
                  onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wood_type_id">Wood Type <span className="text-red-500">*</span></Label>
                <select
                  id="wood_type_id"
                  value={formData.wood_type_id}
                  onChange={(e) => setFormData({ ...formData, wood_type_id: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select wood type</option>
                  {woodTypes.map((wt) => (
                    <option key={wt.id} value={wt.id}>{wt.name}</option>
                  ))}
                </select>
              </div>



              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity <span className="text-red-500">*</span></Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  placeholder="Positive to add, negative to deduct"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">Use positive values to add stock, negative to deduct</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_price">Unit Price (optional)</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Price per unit"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes / Reason</Label>
              <Textarea
                id="notes"
                placeholder="Reason for adjustment..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate('/inventory')}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-solarized-blue hover:bg-solarized-blue/90">
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Saving...' : 'Save Adjustment'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
