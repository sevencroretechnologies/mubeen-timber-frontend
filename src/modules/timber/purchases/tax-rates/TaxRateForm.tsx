import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { taxRateApi } from '../../services/inventoryApi';
import { TAX_TYPE, type TaxRateType } from '../../types/inventory';
import { showAlert, getErrorMessage } from '@/lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Percent, CheckCircle2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';

export default function TaxRateForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    rate: '',
    tax_type: TAX_TYPE.SGST as TaxRateType,
    is_active: true
  });

  useEffect(() => {
    if (isEdit) {
      setIsLoading(true);
      taxRateApi.get(Number(id))
        .then((data: any) => {
          const rate = data.data || data;
          setForm({
            name: rate.name,
            rate: String(rate.rate),
            tax_type: rate.tax_type,
            is_active: !!rate.is_active
          });
        })
        .catch((error) => {
          console.error('Failed to fetch tax rate:', error);
          showAlert('error', 'Error', 'Failed to load tax rate details');
          navigate('/purchases/tax-rates');
        })
        .finally(() => setIsLoading(false));
    }
  }, [id, isEdit, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name || !form.rate) {
      showAlert('warning', 'Validation Error', 'Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...form,
        rate: Number(form.rate)
      };

      if (isEdit) {
        await taxRateApi.update(Number(id), payload as any);
        showAlert('success', 'Updated', 'Tax rate updated successfully', 2000);
      } else {
        await taxRateApi.create(payload as any);
        showAlert('success', 'Created', 'Tax rate created successfully', 2000);
      }
      navigate('/purchases/tax-rates');
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to save tax rate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/purchases/tax-rates')} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isEdit ? 'Edit Tax Rate' : 'Add New Tax Rate'}
            </h1>
            <p className="text-sm text-slate-500 font-medium">Define tax configuration for billing</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Percent className="h-5 w-5 text-indigo-600" />
              Tax Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-black uppercase text-slate-400 tracking-widest">Tax Name *</Label>
                <Input 
                  id="name"
                  placeholder="e.g. GST 18%, SGST 9%" 
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="rounded-xl border-slate-200 h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_type" className="text-xs font-black uppercase text-slate-400 tracking-widest">Tax Type *</Label>
                <Select 
                  value={form.tax_type} 
                  onValueChange={(val) => setForm({ ...form, tax_type: val as TaxRateType })}
                >
                  <SelectTrigger id="tax_type" className="rounded-xl border-slate-200 h-11">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="SGST">SGST</SelectItem>
                    <SelectItem value="CGST">CGST</SelectItem>
                    <SelectItem value="IGST">IGST</SelectItem>
                    <SelectItem value="CESS">CESS</SelectItem>
                    <SelectItem value="FLOOD_CESS">Flood CESS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rate" className="text-xs font-black uppercase text-slate-400 tracking-widest">Tax Rate (%) *</Label>
                <div className="relative">
                  <Input 
                    id="rate"
                    type="number"
                    step="0.01"
                    placeholder="0.00" 
                    value={form.rate}
                    onChange={(e) => setForm({ ...form, rate: e.target.value })}
                    className="rounded-xl border-slate-200 h-11 pl-10"
                  />
                  <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* <div className="flex items-center space-x-4 pt-8">
                <Switch 
                  id="is_active" 
                  checked={form.is_active}
                  onCheckedChange={(val) => setForm({ ...form, is_active: val })}
                />
                <Label htmlFor="is_active" className="text-sm font-bold text-slate-600">Active / Enabled</Label>
              </div> */}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 mt-8">
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-12 rounded-xl text-white font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-95"
          >
            {isSubmitting ? (
               <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> 
                {isEdit ? 'Update Configuration' : 'Save Configuration'}
              </>
            )}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate('/purchases/tax-rates')}
            className="h-12 px-8 rounded-xl font-bold border-slate-200"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
