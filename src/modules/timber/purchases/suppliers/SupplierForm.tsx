import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supplierApi } from '../../services/inventoryApi';
import type { TimberSupplier } from '../../types/inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { showAlert, getErrorMessage } from '@/lib/sweetalert';
import { ArrowLeft, Save } from 'lucide-react';

export default function SupplierForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    gst_number: '',
    pan_number: '',
    bank_name: '',
    bank_account_number: '',
    bank_ifsc_code: '',
    payment_terms: '',
    notes: '',
    is_active: true,
  });

  useEffect(() => {
    if (isEdit && id) {
      setIsLoadingData(true);
      supplierApi.get(Number(id))
        .then((data) => {
          const supplier = data as TimberSupplier;
          setFormData({
            name: supplier.name || '',
            contact_person: supplier.contact_person || '',
            email: supplier.email || '',
            phone: supplier.phone || '',
            address: supplier.address || '',
            city: supplier.city || '',
            state: supplier.state || '',
            gst_number: supplier.gst_number || '',
            pan_number: supplier.pan_number || '',
            bank_name: supplier.bank_name || '',
            bank_account_number: supplier.bank_account_number || '',
            bank_ifsc_code: supplier.bank_ifsc_code || '',
            payment_terms: supplier.payment_terms || '',
            notes: supplier.notes || '',
            is_active: supplier.is_active ?? true,
          });
        })
        .catch((error) => {
          console.error('Failed to fetch supplier:', error);
          showAlert('error', 'Error', 'Failed to load supplier data');
        })
        .finally(() => setIsLoadingData(false));
    }
  }, [id, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showAlert('error', 'Validation', 'Supplier name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        is_active: formData.is_active,
      };

      if (isEdit && id) {
        await supplierApi.update(Number(id), payload);
        showAlert('success', 'Updated', 'Supplier updated successfully', 2000);
      } else {
        await supplierApi.create(payload);
        showAlert('success', 'Created', 'Supplier created successfully', 2000);
      }
      navigate('/purchases/suppliers');
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, `Failed to ${isEdit ? 'update' : 'create'} supplier`));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData) {
    return <div className="flex justify-center py-12"><p>Loading supplier data...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/purchases/suppliers')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">{isEdit ? 'Edit' : 'New'} Supplier</h1>
          <p className="text-muted-foreground">{isEdit ? 'Update supplier details' : 'Add a new timber supplier'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Supplier Name <span className="text-red-500">*</span></Label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Enter supplier name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input id="contact_person" name="contact_person" value={formData.contact_person} onChange={handleChange} placeholder="Contact person name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="supplier@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone number" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Address</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" name="address" value={formData.address} onChange={handleChange} placeholder="Full address" rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" value={formData.city} onChange={handleChange} placeholder="City" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" value={formData.state} onChange={handleChange} placeholder="State" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tax & Banking</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="gst_number">GST Number</Label>
                <Input id="gst_number" name="gst_number" value={formData.gst_number} onChange={handleChange} placeholder="GST Number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pan_number">PAN Number</Label>
                <Input id="pan_number" name="pan_number" value={formData.pan_number} onChange={handleChange} placeholder="PAN Number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input id="bank_name" name="bank_name" value={formData.bank_name} onChange={handleChange} placeholder="Bank name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_account_number">Account Number</Label>
                <Input id="bank_account_number" name="bank_account_number" value={formData.bank_account_number} onChange={handleChange} placeholder="Account number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_ifsc_code">IFSC Code</Label>
                <Input id="bank_ifsc_code" name="bank_ifsc_code" value={formData.bank_ifsc_code} onChange={handleChange} placeholder="IFSC code" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_terms">Payment Terms</Label>
                <Input id="payment_terms" name="payment_terms" value={formData.payment_terms} onChange={handleChange} placeholder="e.g., Net 30" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Additional</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} placeholder="Additional notes about the supplier" rows={3} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/purchases/suppliers')}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="bg-solarized-blue hover:bg-solarized-blue/90">
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Supplier' : 'Create Supplier'}
          </Button>
        </div>
      </form>
    </div>
  );
}
