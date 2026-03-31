
import { useState, useEffect, useCallback } from 'react';
import { assetTypeService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Package,
  Eye,
} from 'lucide-react';
import DataTable, { TableColumn } from 'react-data-table-component';

interface AssetType {
  id: number;
  title: string;
  description: string;
  depreciation_rate: number;
  assets_count?: number;
}

export default function AssetTypeList() {
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAssetType, setEditingAssetType] = useState<AssetType | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    depreciation_rate: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // View modal state
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingAssetType, setViewingAssetType] = useState<AssetType | null>(null);

  // Pagination & Sorting State
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Fetch asset types with pagination
  const fetchAssetTypes = useCallback(
    async (currentPage: number = 1) => {
      setIsLoading(true);
      try {
        const params: Record<string, unknown> = {
          page: currentPage,
          per_page: perPage,
          search: searchQuery,
        };

        if (sortField) {
          params.order_by = sortField;
          params.order = sortDirection;
        }

        const response = await assetTypeService.getAll(params);
        const { data, meta } = response.data;

        if (Array.isArray(data)) {
          setAssetTypes(data);
          setTotalRows(meta?.total ?? 0);
        } else {
          setAssetTypes([]);
          setTotalRows(0);
        }
      } catch (error) {
        console.error('Failed to fetch asset types:', error);
        showAlert('error', 'Error', 'Failed to fetch asset types');
        setAssetTypes([]);
        setTotalRows(0);
      } finally {
        setIsLoading(false);
      }
    },
    [perPage, searchQuery, sortField, sortDirection]
  );

  useEffect(() => {
    fetchAssetTypes(page);
  }, [page, fetchAssetTypes]);

  // Search Handler
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };

  // Pagination Handlers
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePerRowsChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  // Sorting Handler - Only Title column is sortable
  const handleSort = (column: TableColumn<AssetType>, sortDirection: 'asc' | 'desc') => {
    if (column.name === 'Title') {
      setSortField('title');
      setSortDirection(sortDirection);
      setPage(1);
    }
  };

  const handleView = (assetType: AssetType) => {
    setViewingAssetType(assetType);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (assetType: AssetType) => {
    setEditingAssetType(assetType);
    setFormData({
      title: assetType.title,
      description: assetType.description || '',
      depreciation_rate: assetType.depreciation_rate?.toString() || '',
    });
    setFieldErrors({});
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    const result = await showConfirmDialog('Delete Asset Type', 'Are you sure you want to delete this asset type?');
    if (!result.isConfirmed) return;
    try {
      await assetTypeService.delete(id);
      showAlert('success', 'Deleted!', 'Asset type deleted successfully', 2000);
      fetchAssetTypes(page);
    } catch (error) {
      console.error('Failed to delete asset type:', error);
      const errorMessage = getErrorMessage(error, 'Failed to delete asset type');
      showAlert('error', 'Error', errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      depreciation_rate: '',
    });
    setEditingAssetType(null);
    setFieldErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!formData.title.trim()) {
      errors.title = 'Title is required';
      isValid = false;
    }

    if (!formData.depreciation_rate) {
      errors.depreciation_rate = 'Depreciation rate is required';
      isValid = false;
    } else {
      const rate = Number(formData.depreciation_rate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        errors.depreciation_rate = 'Rate must be between 0 and 100';
        isValid = false;
      }
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});

    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
      if (editingAssetType) {
        await assetTypeService.update(editingAssetType.id, formData);
        setIsDialogOpen(false); // Close dialog first
        showAlert('success', 'Success', 'Asset type updated successfully', 2000);
      } else {
        await assetTypeService.create(formData);
        setIsDialogOpen(false); // Close dialog first
        showAlert('success', 'Success', 'Asset type created successfully', 2000);
      }
      resetForm();
      fetchAssetTypes(page);
    } catch (err: any) {
      console.error('Failed to save asset type:', err);
      const errorMessage = getErrorMessage(err, 'Failed to save asset type');

      // Close the dialog FIRST
      // setIsDialogOpen(false); // Can't close if we want to show inline errors for validation

      if (err.response?.data?.errors) {
        const apiErrors: Record<string, string> = {};
        Object.keys(err.response.data.errors).forEach((key) => {
          apiErrors[key] = err.response.data.errors[key][0];
        });
        setFieldErrors(apiErrors);
        showAlert('error', 'Validation Failure', 'Please fix the errors highlighted below.');
      } else {
        setIsDialogOpen(false); // Close dialg on non-validation error? Or keep open? Usually close on generic error OR show alert.
        // Previous logic closed dialog then showed alert.
        // Better UX: keep dialog open for validation error. Close for success.
        setTimeout(() => {
          showAlert('error', 'Error', errorMessage);
        }, 100);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderError = (field: string) => {
    return fieldErrors[field] ? (
      <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
    ) : null;
  };

  // Table Columns
  const columns: TableColumn<AssetType>[] = [
    {
      name: 'Title',
      selector: (row) => row.title,
      cell: (row) => <span className="font-medium text-solarized-base02">{row.title}</span>,
      sortable: true,
      minWidth: '150px',
    },
    {
      name: 'Description',
      selector: (row) => row.description || '-',
      cell: (row) => (
        <span className="max-w-[200px] truncate">{row.description || '-'}</span>
      ),
    },
    {
      name: 'Depreciation Rate',
      selector: (row) => row.depreciation_rate,
      cell: (row) => (
        <Badge className="bg-solarized-blue/10 text-solarized-blue">
          {row.depreciation_rate ? `${row.depreciation_rate}%` : '-'}
        </Badge>
      ),
    },
    {
      name: 'Assets',
      cell: (row) => (
        <span className="text-solarized-base01">{row.assets_count ?? 0}</span>
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
            <DropdownMenuItem onClick={() => handleView(row)}>
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(row)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDelete(row.id)}
              className="text-solarized-red"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      ignoreRowClick: true,
      width: '80px',
    },
  ];

  // Custom Styles for DataTable
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">Asset Types</h1>
          <p className="text-solarized-base01">Manage asset type categories</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-solarized-blue hover:bg-solarized-blue/90"
              onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Asset Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAssetType ? "Edit Asset Type" : "Add New Asset Type"}
              </DialogTitle>
              <DialogDescription>
                {editingAssetType
                  ? "Update the asset type details."
                  : "Add a new asset type."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className={fieldErrors.title ? 'text-red-500' : ''}>Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({ ...formData, title: e.target.value });
                      if (fieldErrors.title) setFieldErrors(prev => ({ ...prev, title: '' }));
                    }}
                    placeholder="e.g., Laptop, Vehicle, Furniture"
                    className={fieldErrors.title ? 'border-red-500' : ''}
                  />
                  {renderError('title')}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Brief description of this asset type"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depreciation_rate" className={fieldErrors.depreciation_rate ? 'text-red-500' : ''}>
                    Depreciation Rate (%) *
                  </Label>
                  <Input
                    id="depreciation_rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.depreciation_rate}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        depreciation_rate: e.target.value,
                      });
                      if (fieldErrors.depreciation_rate) setFieldErrors(prev => ({ ...prev, depreciation_rate: '' }));
                    }}
                    placeholder="e.g., 20"
                    className={fieldErrors.depreciation_rate ? 'border-red-500' : ''}
                  />
                  {renderError('depreciation_rate')}
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-solarized-blue hover:bg-solarized-blue/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingAssetType
                      ? "Update"
                      : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Asset Types List</CardTitle>
          <form onSubmit={handleSearchSubmit} className="flex gap-4 mt-4">
            <Input
              placeholder="Search asset types..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <Button type="submit" variant="outline">
              <Search className="mr-2 h-4 w-4" /> Search
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {!isLoading && assetTypes.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-solarized-base02">No asset types found</h3>
              <p className="text-solarized-base01 mt-1">Get started by adding your first asset type.</p>
              <Button
                className="mt-4 bg-solarized-blue hover:bg-solarized-blue/90"
                onClick={() => {
                  resetForm();
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Asset Type
              </Button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={assetTypes}
              progressPending={isLoading}
              pagination
              paginationServer
              paginationTotalRows={totalRows}
              paginationPerPage={perPage}
              paginationDefaultPage={page}
              onChangePage={handlePageChange}
              onChangeRowsPerPage={handlePerRowsChange}
              onSort={handleSort}
              customStyles={customStyles}
              sortServer
              highlightOnHover
              responsive
            />
          )}
        </CardContent>
      </Card>

      {/* View Modal */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Asset Type Details</DialogTitle>
            <DialogDescription>
              View the details of this asset type
            </DialogDescription>
          </DialogHeader>
          {viewingAssetType && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-solarized-base01">Title</Label>
                <p className="font-medium text-solarized-base02">{viewingAssetType.title}</p>
              </div>
              <div>
                <Label className="text-solarized-base01">Description</Label>
                <p className="text-solarized-base02">{viewingAssetType.description || 'No description'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-solarized-base01">Depreciation Rate</Label>
                  <div className="mt-1">
                    <Badge className="bg-solarized-blue/10 text-solarized-blue">
                      {viewingAssetType.depreciation_rate ? `${viewingAssetType.depreciation_rate}%` : 'N/A'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-solarized-base01">Assets Count</Label>
                  <p className="text-solarized-base02">{viewingAssetType.assets_count ?? 0}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>

          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}