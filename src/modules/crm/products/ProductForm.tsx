import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { crmProductService, crmProductCategoryService } from '../../../services/api';
import { showAlert, getErrorMessage } from '../../../lib/sweetalert';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';

interface ProductCategory {
  id: number;
  name: string;
}

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productId?: number | null;
}

export default function ProductForm({ isOpen, onClose, onSuccess, productId }: ProductFormProps) {
  const isEdit = Boolean(productId);

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category_id: '' as string | number,
    stock: '' as number | string,
    amount: '' as number | string,
    description: '',
    long_description: '',
    slug: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      if (productId) {
        fetchProduct(productId);
      } else {
        // Reset form for new product
        setFormData({
          name: '',
          category_id: '',
          stock: '',
          amount: '',
          description: '',
          long_description: '',
          slug: '',
        });
      }
    }
  }, [isOpen, productId]);

  const fetchCategories = async () => {
    try {
      const response = await crmProductCategoryService.getAll();
      const responseData = response.data;
      const arrayData = responseData?.data?.data || responseData?.data || [];
      setCategories(Array.isArray(arrayData) ? arrayData : []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchProduct = async (id: number) => {
    setIsLoading(true);
    try {
      const response = await crmProductService.getById(id);
      const data = response.data;
      setFormData({
        name: data.name || '',
        category_id: data.category_id || '',
        stock: data.stock ?? '',
        amount: data.amount ?? '',
        description: data.description || '',
        long_description: data.long_description || '',
        slug: data.slug || '',
      });
    } catch (error) {
      showAlert('error', 'Error', 'Failed to fetch product details');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        category_id: formData.category_id || null,
        description: formData.description || null,
        long_description: formData.long_description || null,
        slug: formData.slug || null,
      };

      if (isEdit) {
        await crmProductService.update(Number(productId), payload);
        showAlert('success', 'Success', 'Product updated successfully', 2000);
      } else {
        await crmProductService.create(payload);
        showAlert('success', 'Success', 'Product created successfully', 2000);
      }
      onSuccess();
      onClose();
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to save product'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium border-b pb-2">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g. Premium Support Plan"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category_id">Category</Label>
                  <Select
                    value={formData.category_id?.toString()}
                    onValueChange={(v) => setFormData({ ...formData, category_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL friendly name)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g. premium-support-plan"
                />
              </div>

              <h3 className="text-sm font-medium border-b pb-2 pt-2">Pricing & Inventory</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount / Price (₹) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value === '' ? '' : Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Initial Stock Level</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value === '' ? '' : Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <h3 className="text-sm font-medium border-b pb-2 pt-2">Descriptions</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Short Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="A brief summary of the product..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="long_description">Detailed Specification</Label>
                  <Textarea
                    id="long_description"
                    value={formData.long_description}
                    onChange={(e) => setFormData({ ...formData, long_description: e.target.value })}
                    placeholder="Detailed features, terms, or specifications..."
                    rows={4}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-solarized-blue hover:bg-solarized-blue/90">
                {isSubmitting ? 'Saving...' : 'Save Product'}
              </Button>
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  );
}
