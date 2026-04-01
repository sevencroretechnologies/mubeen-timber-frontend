import { useState, useEffect } from 'react';
import { crmProductService, crmCustomerService, projectService } from '@/services/api';
import { showAlert } from '@/lib/sweetalert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface Customer {
  id: number;
  name: string;
}

interface Project {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  description: string | null;
  customer_id: number | null;
  project_id: number | null;
}

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productId?: number | null;
}

export default function ProductForm({ isOpen, onClose, onSuccess, productId }: ProductFormProps) {
  const isEdit = Boolean(productId);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    customer_id: '' as string | number,
    project_id: '' as string | number,
  });

  const fetchCustomers = async () => {
    try {
      const response = await crmCustomerService.getAll();
      const data = response.data?.data || response.data || [];
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await projectService.getAll();
      const data = response.data?.data || response.data || [];
      setProjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const fetchProduct = async (id: number) => {
    setIsLoading(true);
    try {
      const response = await crmProductService.getById(id);
      const data = response.data || response;
      setFormData({
        name: data.name || '',
        description: data.description || '',
        customer_id: data.customer_id || '',
        project_id: data.project_id || '',
      });
    } catch (error) {
      showAlert('error', 'Error', 'Failed to fetch product details');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
      fetchProjects();
      if (productId) {
        fetchProduct(productId);
      } else {
        // Reset form for new product
        setFormData({
          name: '',
          description: '',
          customer_id: '',
          project_id: '',
        });
      }
    }
  }, [isOpen, productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showAlert('error', 'Validation Error', 'Product name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        customer_id: formData.customer_id ? Number(formData.customer_id) : null,
        project_id: formData.project_id ? Number(formData.project_id) : null,
      };

      if (isEdit) {
        await crmProductService.update(Number(productId), payload);
        showAlert('success', 'Success', 'Product updated successfully');
      } else {
        await crmProductService.create(payload);
        showAlert('success', 'Success', 'Product created successfully');
      }
      onSuccess();
      onClose();
    } catch (error) {
      showAlert('error', 'Error', 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Product' : 'Add Product'}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-solarized-blue" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter product name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_id">Customer</Label>
              <Select
                value={formData.customer_id?.toString()}
                onValueChange={(v) => setFormData({ ...formData, customer_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Customer (Optional)" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_id">Project</Label>
              <Select
                value={formData.project_id?.toString()}
                onValueChange={(v) => setFormData({ ...formData, project_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Project (Optional)" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter product description"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-solarized-blue hover:bg-solarized-blue/90">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : isEdit ? (
                  'Update'
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
