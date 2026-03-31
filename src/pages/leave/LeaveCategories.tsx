import { useState, useEffect, useCallback } from 'react';
import { leaveService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { StatusBadge } from '../../components/ui/status-badge';
import { Switch } from '../../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { Skeleton } from '../../components/ui/skeleton';
import { Plus, Edit, Trash2, Calendar, MoreHorizontal } from 'lucide-react';
import DataTable, { TableColumn } from 'react-data-table-component';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

/* =========================
   TYPES (REALISTIC API)
========================= */
interface LeaveCategory {
  id: number;
  name?: string;
  title?: string;
  annual_quota?: number | null;
  is_paid?: boolean;
  is_carry_forward_allowed?: boolean;
  max_carry_forward_days?: number | null;
  is_active?: boolean;
}

/* =========================
   COMPONENT
========================= */
export default function LeaveCategories() {
  const [categories, setCategories] = useState<LeaveCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<LeaveCategory | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    annual_quota: '10',
    is_paid: true,
    is_active: true,
    is_carry_forward_allowed: false,
    max_carry_forward_days: '0',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /* =========================
     FETCH
  ========================= */
  const fetchCategories = useCallback(async (currentPage: number = 1) => {
    setIsLoading(true);
    try {
      const params = {
        page: currentPage,
        per_page: perPage
      };
      const response = await leaveService.getCategories(params);
      const { data, meta } = response.data;

      let categoriesArray: any[] = [];

      if (Array.isArray(data)) {
        categoriesArray = data;
      } else if (data && Array.isArray(data.data)) {
        categoriesArray = data.data;
      }

      const mapped = categoriesArray.map((cat) => ({
        ...cat,
        name: cat.name ?? cat.title ?? 'Unnamed Category',
      }));

      setCategories(mapped);
      setTotalRows(meta?.total || 0);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      showAlert('error', 'Error', 'Failed to fetch leave categories');
    } finally {
      setIsLoading(false);
    }
  }, [perPage]);

  useEffect(() => {
    fetchCategories(page);
  }, [page, fetchCategories]);

  /* =========================
     PAGINATION HANDLERS
  ========================= */
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePerRowsChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!formData.name.trim()) {
      errors.name = 'Category Name is required';
      isValid = false;
    } else if (formData.name.length > 255) {
      errors.name = 'Category Name must be less than 255 characters';
      isValid = false;
    }

    if (!formData.annual_quota) {
      errors.annual_quota = 'Annual Quota is required';
      isValid = false;
    } else if (Number(formData.annual_quota) < 0) {
      errors.annual_quota = 'Annual Quota must be at least 0';
      isValid = false;
    }

    if (formData.is_carry_forward_allowed) {
      if (!formData.max_carry_forward_days) {
        errors.max_carry_forward_days = 'Max Carry Forward Days is required';
        isValid = false;
      } else if (Number(formData.max_carry_forward_days) < 0) {
        errors.max_carry_forward_days = 'Max Carry Forward Days must be at least 0';
        isValid = false;
      }
    }

    setFieldErrors(errors);
    return isValid;
  };

  /* =========================
     SUBMIT
  ========================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (!validateForm()) return;

    const payload = {
      title: formData.name,
      annual_quota: Number(formData.annual_quota),
      is_paid: formData.is_paid,
      is_active: formData.is_active,
      is_carry_forward_allowed: formData.is_carry_forward_allowed,
      max_carry_forward_days: formData.is_carry_forward_allowed
        ? Number(formData.max_carry_forward_days)
        : 0,
    };

    try {
      if (editingCategory) {
        await leaveService.updateCategory(editingCategory.id, payload);
      } else {
        await leaveService.createCategory(payload);
      }

      showAlert(
        'success',
        'Success!',
        editingCategory ? 'Leave category updated successfully' : 'Leave category created successfully',
        2000
      );
      setIsDialogOpen(false);
      setEditingCategory(null);
      resetForm();
      fetchCategories(page);
    } catch (err: any) {
      console.error('Failed to save category:', err);

      const message = getErrorMessage(err, 'Failed to save leave category');

      // Handle backend validation errors
      if (err.response?.data?.errors) {
        const apiErrors: Record<string, string> = {};
        Object.keys(err.response.data.errors).forEach((key) => {
          // Map backend 'title' error to frontend 'name' field
          if (key === 'title') {
            apiErrors['name'] = err.response.data.errors[key][0];
          } else {
            apiErrors[key] = err.response.data.errors[key][0];
          }
        });
        setFieldErrors(apiErrors);
      } else {
        showAlert('error', 'Error', message);
      }
    }
  };

  /* =========================
     EDIT (SAFE)
  ========================= */
  const handleEdit = (category: LeaveCategory) => {
    setEditingCategory(category);
    setFieldErrors({});
    setFormData({
      name: category.name ?? category.title ?? '',
      annual_quota:
        category.annual_quota !== null && category.annual_quota !== undefined
          ? category.annual_quota.toString()
          : '0',
      is_paid: Boolean(category.is_paid),
      is_active: category.is_active !== undefined ? Boolean(category.is_active) : true,
      is_carry_forward_allowed: Boolean(category.is_carry_forward_allowed),
      max_carry_forward_days:
        category.max_carry_forward_days !== null &&
          category.max_carry_forward_days !== undefined
          ? category.max_carry_forward_days.toString()
          : '0',
    });
    setIsDialogOpen(true);
  };

  /* =========================
     DELETE
  ========================= */
  const handleDelete = async (id: number) => {
    const result = await showConfirmDialog(
      'Are you sure?',
      'You want to delete this leave category?'
    );

    if (!result.isConfirmed) return;

    try {
      await leaveService.deleteCategory(id);
      showAlert('success', 'Deleted!', 'Leave category deleted successfully', 2000);
      fetchCategories(page);
    } catch (error: unknown) {
      console.error('Failed to delete category:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete leave category'));
    }
  };

  const resetForm = () => {
    setFieldErrors({});
    setFormData({
      name: '',
      annual_quota: '10',
      is_paid: true,
      is_active: true,
      is_carry_forward_allowed: false,
      max_carry_forward_days: '0',
    });
  };

  const renderError = (field: string) => {
    return fieldErrors[field] ? (
      <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
    ) : null;
  };

  /* =========================
     COLUMNS
  ========================= */
  const columns: TableColumn<LeaveCategory>[] = [
    {
      name: 'Name',
      selector: (row) => row.name || 'Unnamed',
      sortable: true,
      minWidth: '200px',
    },
    {
      name: 'Annual Quota',
      selector: (row) => row.annual_quota ?? 0,
      format: (row) => `${row.annual_quota ?? 0} days`,
      sortable: true,
    },
    {
      name: 'Type',
      cell: (row) => (
        <StatusBadge status={row.is_paid ? 'paid' : 'unpaid'} />
      ),
    },
    {
      name: 'Carry Forward',
      cell: (row) => (
        row.is_carry_forward_allowed
          ? `Up to ${row.max_carry_forward_days ?? 0} days`
          : 'Not allowed'
      ),
      minWidth: '150px',
    },
    {
      name: 'Status',
      cell: (row) => (
        <StatusBadge status={row.is_active ? 'active' : 'inactive'} />
      ),
    },
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
            <DropdownMenuItem onClick={() => handleEdit(row)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDelete(row.id)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    },
  ];

  /* =========================
     UI
  ========================= */
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Leave Categories</h1>
          <p className="text-muted-foreground">Manage leave types and policies</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-solarized-blue hover:bg-solarized-blue/90"
              onClick={() => {
                setEditingCategory(null);
                resetForm();
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </DialogTitle>
              <DialogDescription>
                {editingCategory
                  ? 'Update leave category details'
                  : 'Create a new leave category'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div>
                  <Label className={fieldErrors.name ? 'text-red-500' : ''}>Category Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                    }}
                    className={fieldErrors.name ? 'border-red-500' : ''}
                  />
                  {renderError('name')}
                </div>

                <div>
                  <Label className={fieldErrors.annual_quota ? 'text-red-500' : ''}>Annual Quota (days)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.annual_quota}
                    onChange={(e) => {
                      setFormData({ ...formData, annual_quota: e.target.value });
                      if (fieldErrors.annual_quota) setFieldErrors(prev => ({ ...prev, annual_quota: '' }));
                    }}
                    className={fieldErrors.annual_quota ? 'border-red-500' : ''}
                  />
                  {renderError('annual_quota')}
                </div>

                <div className="flex items-center justify-between">
                  <Label>Paid Leave</Label>
                  <Switch
                    checked={formData.is_paid}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_paid: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Active Status</Label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Allow Carry Forward</Label>
                  <Switch
                    checked={formData.is_carry_forward_allowed}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        is_carry_forward_allowed: checked,
                      })
                    }
                  />
                </div>

                {formData.is_carry_forward_allowed && (
                  <div>
                    <Label className={fieldErrors.max_carry_forward_days ? 'text-red-500' : ''}>Max Carry Forward Days</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.max_carry_forward_days}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          max_carry_forward_days: e.target.value,
                        });
                        if (fieldErrors.max_carry_forward_days) setFieldErrors(prev => ({ ...prev, max_carry_forward_days: '' }));
                      }}
                      className={fieldErrors.max_carry_forward_days ? 'border-red-500' : ''}
                    />
                    {renderError('max_carry_forward_days')}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90">
                  {editingCategory ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading && !categories.length ? (
            <Skeleton className="h-12 w-full" />
          ) : categories.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <p>No categories found</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={categories}
              progressPending={isLoading}
              pagination
              paginationServer
              paginationTotalRows={totalRows}
              paginationPerPage={perPage}
              paginationRowsPerPageOptions={[5, 10, 15, 20]}
              paginationDefaultPage={page}
              onChangePage={handlePageChange}
              onChangeRowsPerPage={handlePerRowsChange}
              highlightOnHover
              responsive
              noHeader
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
