import { useState, useEffect, useCallback } from 'react';
import { crmProductCategoryService } from '../../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../../lib/sweetalert';
import { Card, CardContent, CardHeader } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Plus, Search, MoreHorizontal, Edit, Trash2, LayoutGrid, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';

interface ProductCategory {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export default function ProductCategoryList() {
  const [items, setItems] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const fetchItems = useCallback(async (currentPage: number = 1) => {
    setIsLoading(true);
    try {
      const response = await crmProductCategoryService.getAll({
        page: currentPage,
        per_page: perPage,
        search,
      });
      const responseData = response.data;
      // Handle Laravel pagination: response.data.data.data
      const arrayData = responseData?.data?.data || responseData?.data || [];
      
      if (Array.isArray(arrayData)) {
        setItems(arrayData);
        setTotalRows(responseData?.data?.total || responseData?.pagination?.total_items || arrayData.length);
      } else {
        setItems([]);
        setTotalRows(0);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [perPage, search]);

  useEffect(() => {
    fetchItems(page);
  }, [page, fetchItems]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems();
  };

  const resetForm = () => setFormData({ name: '', description: '' });

  const handleAddClick = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleEdit = (category: ProductCategory) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name || '',
      description: category.description || '',
    });
    setIsEditOpen(true);
  };

  const handleDelete = async (id: number) => {
    const result = await showConfirmDialog(
      'Delete Category',
      'Are you sure you want to delete this category? This action cannot be undone.'
    );
    if (!result.isConfirmed) return;

    try {
      await crmProductCategoryService.delete(id);
      showAlert('success', 'Deleted!', 'Category deleted successfully', 2000);
      fetchItems();
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete category'));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await crmProductCategoryService.create(formData);
      showAlert('success', 'Success', 'Category created successfully', 2000);
      setIsAddOpen(false);
      fetchItems();
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to create category'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    setIsSubmitting(true);
    try {
      await crmProductCategoryService.update(selectedCategory.id, formData);
      showAlert('success', 'Success', 'Category updated successfully', 2000);
      setIsEditOpen(false);
      fetchItems();
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to update category'));
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleView = (category: ProductCategory) => {
    setSelectedCategory(category);
    setIsViewOpen(true);
  };

  const columns: TableColumn<ProductCategory>[] = [
    {
      name: 'Name',
      selector: (row) => row.name,
      sortable: true,
      cell: (row) => (
        <span 
          className="font-medium cursor-pointer hover:text-solarized-blue transition-colors"
          onClick={() => handleView(row)}
        >
          {row.name}
        </span>
      ),
    },
    {
      name: 'Description',
      selector: (row) => row.description || '',
      sortable: true,
      cell: (row) => <span className="text-muted-foreground line-clamp-1">{row.description || '—'}</span>,
    },
    // {
    //   name: 'Created At',
    //   selector: (row) => row.created_at,
    //   sortable: true,
    //   cell: (row) => <span>{new Date(row.created_at).toLocaleDateString()}</span>,
    // },
    {
      name: 'Actions',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleView(row)}>
              <Eye className="mr-2 h-4 w-4" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(row)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDelete(row.id)} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      width: '80px',
    },
  ];

  const customStyles = {
    headRow: {
      style: {
        backgroundColor: '#f9fafb',
        borderBottomWidth: '1px',
        borderBottomColor: '#e5e7eb',
        borderBottomStyle: 'solid' as const,
        minHeight: '56px',
      },
    },
    headCells: {
      style: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#374151',
        paddingLeft: '16px',
        paddingRight: '16px',
      },
    },
  };

  const renderForm = (onSubmit: (e: React.FormEvent) => void) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Category Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="e.g. Software, Hardware Services"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Enter category description..."
          rows={3}
        />
      </div>
      <DialogFooter>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-solarized-blue hover:bg-solarized-blue/90"
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Product Categories</h1>
          <p className="text-muted-foreground">Manage categories for your products and services</p>
        </div>
        <Button onClick={handleAddClick} className="bg-solarized-blue hover:bg-solarized-blue/90">
          <Plus className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </div>

      <Card>
        <CardHeader>
          <form onSubmit={handleSearchSubmit} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {!isLoading && items.length === 0 ? (
            <div className="text-center py-12">
              <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No categories found</p>
              <p className="text-muted-foreground">Try adjusting your search or add a new category</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={items}
              progressPending={isLoading}
              pagination
              paginationServer
              paginationTotalRows={totalRows}
              paginationDefaultPage={page}
              onChangePage={(p) => setPage(p)}
              onChangeRowsPerPage={(pp) => setPerPage(pp)}
              customStyles={customStyles}
              highlightOnHover
              responsive
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>Create a new product category</DialogDescription>
          </DialogHeader>
          {renderForm(handleCreate)}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update category information</DialogDescription>
          </DialogHeader>
          {renderForm(handleUpdate)}
        </DialogContent>
      </Dialog>

      {/* View Category Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-solarized-blue" />
              Category Details
            </DialogTitle>
            <DialogDescription>
              Details for product categorization
            </DialogDescription>
          </DialogHeader>
          {selectedCategory && (
            <div className="space-y-6 py-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Category Name</Label>
                <p className="text-lg font-semibold">{selectedCategory.name}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Description</Label>
                <div className="p-4 bg-slate-50 border rounded-lg text-sm text-slate-700 min-h-[100px]">
                  {selectedCategory.description || 'No description provided.'}
                </div>
              </div>


            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
            {/* <Button onClick={() => { setIsViewOpen(false); handleEdit(selectedCategory!); }} className="bg-solarized-blue hover:bg-solarized-blue/90">
              <Edit className="mr-2 h-4 w-4" /> Edit Category
            </Button> */}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
