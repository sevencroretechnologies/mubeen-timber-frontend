import { useState, useEffect, useCallback } from 'react';
import { payrollService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { StatusBadge } from '../../components/ui/status-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Plus, Edit, Trash2, IndianRupee, CheckCircle, Search, MoreHorizontal, Eye } from 'lucide-react';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import DataTable, { TableColumn } from 'react-data-table-component';

interface BenefitType {
  id: number;
  title: string;
  notes: string | null;
  is_taxable: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  staffBenefits?: {
    id: number;
    description: string;
  }[];
}

export default function BenefitTypes() {
  const [benefitTypes, setBenefitTypes] = useState<BenefitType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    notes: '',
    is_taxable: false,
    is_active: true,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // View modal state
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingBenefitType, setViewingBenefitType] = useState<BenefitType | null>(null);

  // Pagination & Sorting State
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Fetch benefit types with pagination
  const fetchBenefitTypes = useCallback(
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

        const response = await payrollService.getBenefitTypes(params);
        const { data, meta } = response.data;

        if (Array.isArray(data)) {
          setBenefitTypes(data);
          setTotalRows(meta?.total ?? 0);
        } else {
          setBenefitTypes([]);
          setTotalRows(0);
        }
      } catch (error) {
        console.error('Failed to fetch benefit types:', error);
        showAlert('error', 'Error', 'Failed to fetch benefit types');
        setBenefitTypes([]);
        setTotalRows(0);
      } finally {
        setIsLoading(false);
      }
    },
    [perPage, searchQuery, sortField, sortDirection]
  );

  useEffect(() => {
    fetchBenefitTypes(page);
  }, [page, fetchBenefitTypes]);

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
  const handleSort = (column: TableColumn<BenefitType>, sortDirection: 'asc' | 'desc') => {
    if (column.name === 'Title') {
      setSortField('title');
      setSortDirection(sortDirection);
      setPage(1);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!formData.title.trim()) {
      errors.title = 'Title is required';
      isValid = false;
    } else if (formData.title.length > 255) {
      errors.title = 'Title must be less than 255 characters';
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (!validateForm()) return;

    try {
      if (isEditMode && editingId) {
        await payrollService.updateBenefitType(editingId, formData);
      } else {
        await payrollService.createBenefitType(formData);
      }

      showAlert(
        'success',
        'Success!',
        isEditMode ? 'Benefit type updated successfully' : 'Benefit type created successfully',
        2000
      );
      setIsDialogOpen(false);
      resetForm();
      fetchBenefitTypes(page);
    } catch (err: any) {
      console.error('Failed to save benefit type:', err);

      const message = getErrorMessage(err, 'Failed to save benefit type');

      // Handle backend validation errors
      if (err.response?.data?.errors) {
        const apiErrors: Record<string, string> = {};
        Object.keys(err.response.data.errors).forEach((key) => {
          apiErrors[key] = err.response.data.errors[key][0];
        });
        setFieldErrors(apiErrors);
      } else {
        showAlert('error', 'Error', message);
      }
    }
  };

  const handleEdit = (benefitType: BenefitType) => {
    setIsEditMode(true);
    setEditingId(benefitType.id);
    setFieldErrors({});
    setFormData({
      title: benefitType.title,
      notes: benefitType.notes || '',
      is_taxable: benefitType.is_taxable,
      is_active: benefitType.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleView = (benefitType: BenefitType) => {
    setViewingBenefitType(benefitType);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    const result = await showConfirmDialog(
      'Are you sure?',
      'You want to delete this benefit type? This action cannot be undone.'
    );

    if (!result.isConfirmed) return;

    try {
      await payrollService.deleteBenefitType(id);
      showAlert('success', 'Deleted!', 'Benefit type deleted successfully', 2000);
      fetchBenefitTypes(page);
    } catch (error: unknown) {
      console.error('Failed to delete benefit type:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete benefit type'));
    }
  };

  const resetForm = () => {
    setIsEditMode(false);
    setEditingId(null);
    setFieldErrors({});
    setFormData({
      title: '',
      notes: '',
      is_taxable: false,
      is_active: true,
    });
  };

  const renderError = (field: string) => {
    return fieldErrors[field] ? (
      <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
    ) : null;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Table Columns
  const columns: TableColumn<BenefitType>[] = [
    {
      name: 'Title',
      selector: (row) => row.title,
      cell: (row) => <span className="font-medium">{row.title}</span>,
      sortable: true,
    },
    {
      name: 'Notes',
      selector: (row) => row.notes || 'No notes',
      cell: (row) => (
        <span className="max-w-[200px] truncate">{row.notes || 'No notes'}</span>
      ),
    },
    {
      name: 'Taxable',
      cell: (row) => (
        <StatusBadge status={row.is_taxable ? 'yes' : 'no'} />
      ),
    },
    {
      name: 'Status',
      cell: (row) => (
        <StatusBadge status={row.is_active ? 'active' : 'inactive'} />
      ),
    },
    // {
    //   name: 'Created',
    //   selector: (row) => row.created_at,
    //   cell: (row) => <span className="text-sm">{formatDate(row.created_at)}</span>,
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
              disabled={row.staffBenefits && row.staffBenefits.length > 0}
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

  const activeCount = benefitTypes.filter(type => type.is_active).length;
  const taxableCount = benefitTypes.filter(type => type.is_taxable).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">Benefit Types</h1>
          <p className="text-solarized-base01">Manage benefit types for payroll system</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) {
            resetForm();
          }
          setIsDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button
              className="bg-solarized-blue hover:bg-solarized-blue/90"
              onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Benefit Type
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {isEditMode ? 'Edit Benefit Type' : 'Add Benefit Type'}
              </DialogTitle>
              <DialogDescription>
                {isEditMode
                  ? 'Update the details of this benefit type'
                  : 'Add a new benefit type to the system'}
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
                    placeholder="e.g., Housing Allowance"
                    className={fieldErrors.title ? 'border-red-500' : ''}
                  />
                  {renderError('title')}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className={fieldErrors.notes ? 'text-red-500' : ''}>Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => {
                      setFormData({ ...formData, notes: e.target.value });
                      if (fieldErrors.notes) setFieldErrors(prev => ({ ...prev, notes: '' }));
                    }}
                    placeholder="Optional notes about this benefit type..."
                    rows={3}
                    className={fieldErrors.notes ? 'border-red-500' : ''}
                  />
                  {renderError('notes')}
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="is_taxable">Taxable</Label>
                    <p className="text-sm text-solarized-base01">
                      Whether this benefit type is subject to taxation
                    </p>
                  </div>
                  <Switch
                    id="is_taxable"
                    checked={formData.is_taxable}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_taxable: checked })}
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="is_active">Active</Label>
                    <p className="text-sm text-solarized-base01">
                      Whether this benefit type is currently active
                    </p>
                  </div>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-solarized-blue hover:bg-solarized-blue/90"
                >
                  {isEditMode ? 'Update' : 'Create'} Benefit Type
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-solarized-green/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-solarized-green" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Total Types</p>
                <p className="text-2xl font-bold text-solarized-base02">
                  {totalRows || benefitTypes.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-solarized-blue/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-solarized-blue" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Active Types</p>
                <p className="text-2xl font-bold text-solarized-base02">{activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-solarized-yellow/10 flex items-center justify-center">
                <IndianRupee className="h-6 w-6 text-solarized-yellow" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Taxable Types</p>
                <p className="text-2xl font-bold text-solarized-base02">
                  {taxableCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Benefit Types List</CardTitle>
          <form onSubmit={handleSearchSubmit} className="flex gap-4 mt-4">
            <Input
              placeholder="Search benefit types..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <Button type="submit" variant="outline">
              <Search className="mr-2 h-4 w-4" /> Search
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {!isLoading && benefitTypes.length === 0 ? (
            <div className="text-center py-12">
              <IndianRupee className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-solarized-base02">
                No benefit types found
              </h3>
              <p className="text-solarized-base01 mt-1">
                Create your first benefit type to get started.
              </p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={benefitTypes}
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
            <DialogTitle>Benefit Type Details</DialogTitle>
            <DialogDescription>
              View the details of this benefit type
            </DialogDescription>
          </DialogHeader>
          {viewingBenefitType && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-solarized-base01">Title</Label>
                  <p className="font-medium text-solarized-base02">{viewingBenefitType.title}</p>
                </div>
                <div>
                  <Label className="text-solarized-base01">Status</Label>
                  <div className="mt-1">
                    <StatusBadge status={viewingBenefitType.is_active ? 'active' : 'inactive'} />
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-solarized-base01">Notes</Label>
                <p className="text-solarized-base02">{viewingBenefitType.notes || 'No notes'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-solarized-base01">Taxable</Label>
                  <div className="mt-1">
                    <StatusBadge status={viewingBenefitType.is_taxable ? 'yes' : 'no'} />
                  </div>
                </div>
                {/* <div>
                  <Label className="text-solarized-base01">Created</Label>
                  <p className="text-solarized-base02">{formatDate(viewingBenefitType.created_at)}</p>
                </div> */}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            <Button
              className="bg-solarized-blue hover:bg-solarized-blue/90"
              onClick={() => {
                if (viewingBenefitType) {
                  handleEdit(viewingBenefitType);
                  setIsViewDialogOpen(false);
                }
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
