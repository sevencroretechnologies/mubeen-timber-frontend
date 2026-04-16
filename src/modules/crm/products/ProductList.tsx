import { useState, useEffect } from 'react';
import { crmProductService } from '@/services/api';
import { showAlert, showConfirmDialog } from '@/lib/sweetalert';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProductForm from './ProductForm';
import { Plus, Search, Package, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Product {
  id: number;
  name: string;
  description: string | null;
  price?: number | string;
  org_id?: number | string;
  company_id?: number | string;
  created_at: string;
}

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [viewProductData, setViewProductData] = useState<Product | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: any = { search };
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
  }, [search]);

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

  const handleView = (product: Product) => {
    setViewProductData(product);
    setIsViewOpen(true);
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
          </div>

          {/* Products Table */}
          {/* Products Table - Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-solarized-base2">
                  <th className="text-left py-3 px-4 text-sm font-medium text-solarized-base01">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-solarized-base01">Description</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-solarized-base01">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-solarized-base01">
                      Loading...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-12">
                      <Package className="mx-auto h-12 w-12 text-solarized-base01 mb-4" />
                      <p className="text-lg font-medium text-solarized-base02">No products found</p>
                      <p className="text-sm text-solarized-base01">Try adjusting your search or add a new product</p>
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="border-b border-solarized-base2 hover:bg-solarized-base3/50">
                      <td className="py-3 px-4 font-medium">{product.name}</td>
                      <td className="py-3 px-4 text-solarized-base01 max-w-xs truncate">
                        {product.description || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleView(product)}
                            title="View"
                          >
                            <Eye className="h-4 w-4 text-solarized-blue" />
                          </Button>
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

          {/* Products List - Mobile Card View */}
          <div className="block md:hidden space-y-3">
            {loading ? (
              <div className="text-center py-8 text-solarized-base01">Loading...</div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-solarized-base01 mb-4" />
                <p className="text-lg font-medium text-solarized-base02">No products found</p>
              </div>
            ) : (
              products.map((product) => (
                <div key={product.id} className="bg-white rounded-xl shadow p-4 border border-solarized-base2">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-solarized-base02">
                      {product.name || '—'}
                    </h3>
                    {/* <span className="text-sm font-medium text-solarized-blue">
                      ₹{product.price || 0}
                    </span> */}
                  </div>

                  <p className="text-xs text-solarized-base01 mb-3">
                    {product.description || 'No description'}
                  </p>
{/* 
                  <div className="space-y-1.5 pt-2 border-t border-solarized-base3">
                    <div className="flex justify-between text-xs">
                      <span className="text-solarized-base01">Org ID:</span>
                      <span className="font-medium">{product.org_id || '—'}</span>
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="text-solarized-base01">Company ID:</span>
                      <span className="font-medium">{product.company_id || '—'}</span>
                    </div>

                    <div className="flex justify-between text-xs pt-1">
                      <span className="text-solarized-base01">Created:</span>
                      <span className="font-medium text-solarized-base01">
                        {product.created_at ? String(product.created_at).split('T')[0] : '—'}
                      </span>
                    </div>
                  </div> */}

                  <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-solarized-base3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(product)}
                      className="h-8 px-2"
                    >
                      <Eye className="h-4 w-4 mr-1 text-solarized-blue" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(product)}
                      className="h-8 px-2"
                    >
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                      className="h-8 px-2 text-solarized-red hover:text-solarized-red"
                    >
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <ProductForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
        productId={selectedProductId}
      />

      {/* Product Detail Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-xl font-bold text-solarized-base02 tracking-tight">
              Product Details
            </DialogTitle>
          </DialogHeader>
          
          {viewProductData && (
            <div className="py-6 space-y-6">
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-solarized-base01 tracking-widest">
                  Product Name
                </p>
                <p className="font-semibold text-solarized-base02 text-xl leading-snug">
                  {viewProductData.name}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <p className="text-[10px] uppercase font-bold text-solarized-base01 tracking-widest">
                  Description
                </p>
                <div className="p-4 bg-solarized-base3/5 rounded-xl border border-solarized-base2/10">
                  <p className="text-solarized-base01 text-sm leading-relaxed whitespace-pre-wrap">
                    {viewProductData.description || 'No additional details available for this product.'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={() => setIsViewOpen(false)} 
                  className="bg-solarized-blue hover:bg-solarized-blue/90 px-8 rounded-fulltransition-all"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
