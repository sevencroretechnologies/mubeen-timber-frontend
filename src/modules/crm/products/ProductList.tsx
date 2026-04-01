import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { crmProductService, crmCustomerService, projectService } from '@/services/api';
import { showAlert, showConfirmDialog } from '@/lib/sweetalert';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ProductForm from './ProductForm';
import { Plus, Search, Package, Filter } from 'lucide-react';

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
  customer?: Customer;
  project?: Project;
  created_at: string;
}

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  // Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

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

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: any = { search };
      if (customerFilter !== 'all') params.customer_id = customerFilter;
      if (projectFilter !== 'all') params.project_id = projectFilter;

      const response = await crmProductService.getAll(params);
      const data = response.data?.data?.data || response.data?.data || response.data || [];
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      showAlert('error', 'Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchProjects();
  }, [search, customerFilter, projectFilter]);

  const handleDelete = async (id: number) => {
    const result = await showConfirmDialog(
      'Delete Product',
      'Are you sure you want to delete this product?'
    );
    if (result.isConfirmed) {
      try {
        await crmProductService.delete(id);
        showAlert('success', 'Deleted', 'Product deleted successfully');
        fetchProducts();
      } catch (error) {
        showAlert('error', 'Error', 'Failed to delete product');
      }
    }
  };

  const handleCreate = () => {
    setSelectedProductId(null);
    setIsFormOpen(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProductId(product.id);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    fetchProducts();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">Products</h1>
          <p className="text-sm text-solarized-base01">Manage your products</p>
        </div>
        <Button onClick={handleCreate} className="bg-solarized-blue hover:bg-solarized-blue/90">
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-solarized-base01" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Customer Filter */}
            <div className="w-full md:w-48">
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project Filter */}
            <div className="w-full md:w-48">
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Products Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-solarized-base2">
                  <th className="text-left py-3 px-4 text-sm font-medium text-solarized-base01">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-solarized-base01">Description</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-solarized-base01">Customer</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-solarized-base01">Project</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-solarized-base01">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-solarized-base01">
                      Loading...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <Package className="mx-auto h-12 w-12 text-solarized-base01 mb-4" />
                      <p className="text-lg font-medium text-solarized-base02">No products found</p>
                      <p className="text-sm text-solarized-base01">Try adjusting your filters or add a new product</p>
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="border-b border-solarized-base2 hover:bg-solarized-base3/50">
                      <td className="py-3 px-4 font-medium">{product.name}</td>
                      <td className="py-3 px-4 text-solarized-base01 max-w-xs truncate">
                        {product.description || '-'}
                      </td>
                      <td className="py-3 px-4">
                        {product.customer ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                            {product.customer.name}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {product.project ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                            {product.project.name}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(product)}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(product.id)}
                            className="text-solarized-red hover:text-solarized-red"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ProductForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
        productId={selectedProductId}
      />
    </div>
  );
}
