import { useState, useEffect, useCallback } from 'react';
import { payrollService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Plus,
  Calculator,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  MoreVertical,
  Eye,
  Search,
  IndianRupee,
  MoreHorizontal,
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import DataTable, { TableColumn } from 'react-data-table-component';

interface TaxSlab {
  id: number;
  title: string;
  income_from: number;
  income_to: number;
  fixed_amount: number;
  percentage: number;
  is_active: boolean;
  author?: {
    id: number;
    name: string;
    email: string;
  };
}

interface CalculatedTax {
  income: number;
  tax: number;
  slab: TaxSlab | null;
}

export default function TaxSlabs() {
  const [slabs, setSlabs] = useState<TaxSlab[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [annualIncome, setAnnualIncome] = useState('');
  const [calculatedTax, setCalculatedTax] = useState<CalculatedTax | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedSlab, setSelectedSlab] = useState<TaxSlab | null>(null);
  const [editingSlab, setEditingSlab] = useState<TaxSlab | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Sorting State
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [formData, setFormData] = useState({
    title: '',
    income_from: '',
    income_to: '',
    fixed_amount: '',
    percentage: '',
    is_active: true,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Fetch tax slabs with pagination
  const fetchSlabs = useCallback(
    async (currentPage: number = 1) => {
      setIsLoading(true);
      setError(null);
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

        const response = await payrollService.getTaxSlabs(params);
        const { data, meta } = response.data;

        if (Array.isArray(data)) {
          setSlabs(data);
          setTotalRows(meta?.total ?? 0);
        } else if (response.data.data && Array.isArray(response.data.data)) {
          setSlabs(response.data.data);
          if (response.data.meta) {
            setTotalRows(response.data.meta.total ?? 0);
          } else if (response.data.total !== undefined) {
            setTotalRows(response.data.total);
          }
        } else {
          setSlabs([]);
          setTotalRows(0);
        }
      } catch (error: unknown) {
        console.error('Failed to fetch tax slabs:', error);
        const errorMessage = getErrorMessage(error, 'Failed to load tax slabs');
        setError(errorMessage);
        showAlert('error', 'Error', errorMessage);
        setSlabs([]);
        setTotalRows(0);
      } finally {
        setIsLoading(false);
      }
    },
    [perPage, searchQuery, sortField, sortDirection]
  );

  useEffect(() => {
    fetchSlabs(page);
  }, [page, fetchSlabs]);

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

  // Sorting Handler
  const handleSort = (column: TableColumn<TaxSlab>, direction: 'asc' | 'desc') => {
    const columnId = String(column.id || '');

    // Map column IDs to database field names
    const fieldMap: Record<string, string> = {
      'title': 'title',
      'income_range': 'income_from',
      'fixed_amount': 'fixed_amount',
      'percentage': 'percentage',
    };

    const fieldName = fieldMap[columnId];

    if (fieldName) {
      setSortField(fieldName);
      setSortDirection(direction);
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

    if (!formData.income_from) {
      errors.income_from = 'Income From is required';
      isValid = false;
    } else if (Number(formData.income_from) < 0) {
      errors.income_from = 'Income From must be at least 0';
      isValid = false;
    }

    if (!formData.income_to) {
      errors.income_to = 'Income To is required';
      isValid = false;
    } else {
      const from = Number(formData.income_from);
      const to = Number(formData.income_to);
      if (to <= from) {
        errors.income_to = 'Income To must be greater than Income From';
        isValid = false;
      }
    }

    if (formData.fixed_amount && Number(formData.fixed_amount) < 0) {
      errors.fixed_amount = 'Fixed Amount must be at least 0';
      isValid = false;
    }

    if (formData.percentage) {
      const pct = Number(formData.percentage);
      if (pct < 0) {
        errors.percentage = 'Percentage must be at least 0';
        isValid = false;
      } else if (pct > 100) {
        errors.percentage = 'Percentage cannot exceed 100';
        isValid = false;
      }
    }

    setFieldErrors(errors);
    return isValid;
  };

  // Handle form submission for create/update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!validateForm()) return;

    try {
      const data = {
        title: formData.title,
        income_from: Number(formData.income_from),
        income_to: Number(formData.income_to),
        fixed_amount: formData.fixed_amount ? Number(formData.fixed_amount) : 0,
        percentage: formData.percentage ? Number(formData.percentage) : 0,
        is_active: formData.is_active,
      };

      if (editingSlab) {
        await payrollService.updateTaxSlab(editingSlab.id, data);
      } else {
        await payrollService.createTaxSlab(data);
      }

      showAlert(
        'success',
        'Success!',
        editingSlab ? 'Tax slab updated successfully' : 'Tax slab created successfully',
        2000
      );
      setIsDialogOpen(false);
      resetForm();
      fetchSlabs(page);
    } catch (err: any) {
      console.error('Failed to save tax slab:', err);
      const errorMessage = getErrorMessage(err, 'Failed to save tax slab');

      // Handle backend validation errors
      if (err.response?.data?.errors) {
        const apiErrors: Record<string, string> = {};
        Object.keys(err.response.data.errors).forEach((key) => {
          apiErrors[key] = err.response.data.errors[key][0];
        });
        setFieldErrors(apiErrors);
        // Error display is handled by inline validation
      } else {
        setError(errorMessage);
        showAlert('error', 'Error', errorMessage);
      }
    }
  };

  // Handle delete
  const handleDelete = async (slab: TaxSlab) => {
    const result = await showConfirmDialog(
      'Are you sure?',
      `You want to delete this tax slab: "${slab.title}"?`
    );

    if (!result.isConfirmed) return;

    try {
      await payrollService.deleteTaxSlab(slab.id);
      showAlert('success', 'Deleted!', 'Tax slab deleted successfully', 2000);
      fetchSlabs(page);
    } catch (error: unknown) {
      console.error('Failed to delete tax slab:', error);
      const errorMessage = getErrorMessage(error, 'Failed to delete tax slab');
      setError(errorMessage);
      showAlert('error', 'Error', errorMessage);
    }
  };

  // Handle view
  const handleView = (slab: TaxSlab) => {
    setSelectedSlab(slab);
    setIsViewDialogOpen(true);
  };

  // Handle edit
  const handleEdit = (slab: TaxSlab) => {
    setEditingSlab(slab);
    setFieldErrors({});
    setFormData({
      title: slab.title,
      income_from: slab.income_from.toString(),
      income_to: slab.income_to.toString(),
      fixed_amount: slab.fixed_amount !== null ? slab.fixed_amount.toString() : '',
      percentage: slab.percentage !== null ? slab.percentage.toString() : '',
      is_active: slab.is_active,
    });
    setIsDialogOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setFieldErrors({});
    setFormData({
      title: '',
      income_from: '',
      income_to: '',
      fixed_amount: '',
      percentage: '',
      is_active: true,
    });
    setEditingSlab(null);
  };

  const renderError = (field: string) => {
    return fieldErrors[field] ? (
      <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
    ) : null;
  };

  // Calculate tax
  const handleCalculateTax = async () => {
    if (!annualIncome) return;

    setIsCalculating(true);
    setError(null);
    try {
      const response = await payrollService.calculateTax({
        income: Number(annualIncome)
      });
      setCalculatedTax(response.data.data);
    } catch (error: any) {
      console.error('Failed to calculate tax:', error);
      setError(error.response?.data?.message || 'Failed to calculate tax');
      // Fallback calculation
      const income = Number(annualIncome);
      let tax = 0;
      let foundSlab = null;

      for (const slab of slabs) {
        if (slab.is_active && income >= slab.income_from && income <= slab.income_to) {
          foundSlab = slab;
          let calculated = slab.fixed_amount;
          if (slab.percentage > 0) {
            calculated += (income - slab.income_from) * (slab.percentage / 100);
          }
          tax = calculated;
          break;
        }
      }

      setCalculatedTax({
        income,
        tax,
        slab: foundSlab
      });
    } finally {
      setIsCalculating(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (percentage: number) => {
    return `${percentage}%`;
  };

  // Table Columns
  const columns: TableColumn<TaxSlab>[] = [
    {
      id: 'title',
      name: 'Title',
      selector: (row) => row.title,
      sortable: true,
      minWidth: '150px',
    },
    {
      id: 'income_range',
      name: 'Income Range',
      cell: (row) => (
        <span>
          {formatCurrency(row.income_from)} - {formatCurrency(row.income_to)}
        </span>
      ),
      sortable: true,
    },
    {
      id: 'fixed_amount',
      name: 'Fixed Amount',
      cell: (row) => (
        <span>{row.fixed_amount > 0 ? formatCurrency(row.fixed_amount) : '-'}</span>
      ),
      sortable: true,
    },
    {
      id: 'percentage',
      name: 'Rate',
      cell: (row) => (
        <span>{row.percentage > 0 ? formatPercentage(row.percentage) : '-'}</span>
      ),
      sortable: true,
    },
    {
      name: 'Status',
      cell: (row) => (
        <Badge
          variant={row.is_active ? "default" : "secondary"}
          className={row.is_active
            ? "bg-green-100 text-green-800 hover:bg-green-100"
            : "bg-gray-100 text-gray-800 hover:bg-gray-100"
          }
        >
          {row.is_active ? (
            <>
              <CheckCircle className="h-3 w-3 mr-1" />
              Active
            </>
          ) : (
            <>
              <XCircle className="h-3 w-3 mr-1" />
              Inactive
            </>
          )}
        </Badge>
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
              onClick={() => handleDelete(row)}
              className="text-red-600"
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
          <h1 className="text-2xl font-bold text-solarized-base02">Tax Slabs</h1>
          <p className="text-solarized-base01">Configure income tax brackets and rates</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Add button */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-solarized-blue hover:bg-solarized-blue/90"
                onClick={() => {
                  resetForm();
                  setError(null);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Tax Slab
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingSlab ? 'Edit Tax Slab' : 'Add Tax Slab'}
                </DialogTitle>
                <DialogDescription>
                  {editingSlab
                    ? 'Update the income tax bracket details.'
                    : 'Add a new income tax bracket.'
                  }
                </DialogDescription>
              </DialogHeader>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className={fieldErrors.title ? 'text-red-500' : ''}>Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({ ...formData, title: e.target.value });
                      if (fieldErrors.title) setFieldErrors(prev => ({ ...prev, title: '' }));
                    }}
                    placeholder="e.g., Basic Rate"
                    className={fieldErrors.title ? 'border-red-500' : ''}
                  />
                  {renderError('title')}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="income_from" className={fieldErrors.income_from ? 'text-red-500' : ''}>Income From *</Label>
                    <Input
                      id="income_from"
                      type="number"
                      min="0"
                      step="1"
                      value={formData.income_from}
                      onChange={(e) => {
                        setFormData({ ...formData, income_from: e.target.value });
                        if (fieldErrors.income_from) setFieldErrors(prev => ({ ...prev, income_from: '' }));
                      }}
                      placeholder="0"
                      className={fieldErrors.income_from ? 'border-red-500' : ''}
                    />
                    {renderError('income_from')}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="income_to" className={fieldErrors.income_to ? 'text-red-500' : ''}>Income To *</Label>
                    <Input
                      id="income_to"
                      type="number"
                      min="0"
                      step="1"
                      value={formData.income_to}
                      onChange={(e) => {
                        setFormData({ ...formData, income_to: e.target.value });
                        if (fieldErrors.income_to) setFieldErrors(prev => ({ ...prev, income_to: '' }));
                      }}
                      placeholder="10000"
                      className={fieldErrors.income_to ? 'border-red-500' : ''}
                    />
                    {renderError('income_to')}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fixed_amount" className={fieldErrors.fixed_amount ? 'text-red-500' : ''}>Fixed Amount</Label>
                    <Input
                      id="fixed_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.fixed_amount}
                      onChange={(e) => {
                        setFormData({ ...formData, fixed_amount: e.target.value });
                        if (fieldErrors.fixed_amount) setFieldErrors(prev => ({ ...prev, fixed_amount: '' }));
                      }}
                      placeholder="0"
                      className={fieldErrors.fixed_amount ? 'border-red-500' : ''}
                    />
                    {renderError('fixed_amount')}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="percentage" className={fieldErrors.percentage ? 'text-red-500' : ''}>Tax Rate (%)</Label>
                    <Input
                      id="percentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.percentage}
                      onChange={(e) => {
                        setFormData({ ...formData, percentage: e.target.value });
                        if (fieldErrors.percentage) setFieldErrors(prev => ({ ...prev, percentage: '' }));
                      }}
                      placeholder="10"
                      className={fieldErrors.percentage ? 'border-red-500' : ''}
                    />
                    {renderError('percentage')}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active" className="cursor-pointer">
                    Active Status
                  </Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-solarized-blue hover:bg-solarized-blue/90"
                  >
                    {editingSlab ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error Alert */}
      {error && !isDialogOpen && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tax Slabs Table */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Tax Brackets</CardTitle>
              <form onSubmit={handleSearchSubmit} className="flex gap-4 mt-4">
                <Input
                  placeholder="Search tax slabs..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <Button type="submit" variant="outline">
                  <Search className="mr-2 h-4 w-4" /> Search
                </Button>
              </form>
            </CardHeader>
            <CardContent>
              {!isLoading && slabs.length === 0 && !searchQuery ? (
                <div className="text-center py-12">
                  <Calculator className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-solarized-base02">
                    No tax slabs found
                  </h3>
                  <p className="text-solarized-base01 mt-1">
                    Create your first tax slab to get started.
                  </p>
                  <Button
                    className="mt-4 bg-solarized-blue hover:bg-solarized-blue/90"
                    onClick={() => {
                      resetForm();
                      setIsDialogOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Tax Slab
                  </Button>
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={slabs}
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
        </div>

        {/* Tax Calculator */}
        <div>
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Tax Calculator
              </CardTitle>
              <CardDescription>Calculate tax based on annual income</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="income">Annual Income</Label>
                <Input
                  id="income"
                  type="number"
                  min="0"
                  step="1"
                  value={annualIncome}
                  onChange={(e) => {
                    setAnnualIncome(e.target.value);
                    setCalculatedTax(null);
                  }}
                  placeholder="Enter annual income"
                />
              </div>

              <Button
                onClick={handleCalculateTax}
                disabled={!annualIncome || isCalculating}
                className="w-full bg-solarized-blue hover:bg-solarized-blue/90"
              >
                {isCalculating ? 'Calculating...' : 'Calculate Tax'}
              </Button>

              {calculatedTax && (
                <div className="space-y-4 mt-4">
                  <div className="p-4 bg-solarized-base3 rounded-lg text-center">
                    <p className="text-sm text-solarized-base01">Estimated Tax</p>
                    <p className="text-3xl font-bold text-solarized-red">
                      {formatCurrency(calculatedTax.tax)}
                    </p>
                    <p className="text-xs text-solarized-base01 mt-2">
                      Effective Rate: {calculatedTax.income > 0
                        ? ((calculatedTax.tax / calculatedTax.income) * 100).toFixed(2)
                        : '0.00'}%
                    </p>
                  </div>

                  {calculatedTax.slab && (
                    <div className="p-4 bg-solarized-base2 rounded-lg">
                      <p className="text-sm font-medium text-solarized-base01 mb-2">
                        Applied Tax Slab:
                      </p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-solarized-base01">Title:</span>
                          <span className="font-medium">{calculatedTax.slab.title}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-solarized-base01">Range:</span>
                          <span className="font-medium">
                            {formatCurrency(calculatedTax.slab.income_from)} - {formatCurrency(calculatedTax.slab.income_to)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-solarized-base01">Fixed Amount:</span>
                          <span className="font-medium">
                            {calculatedTax.slab.fixed_amount > 0
                              ? formatCurrency(calculatedTax.slab.fixed_amount)
                              : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-solarized-base01">Rate:</span>
                          <span className="font-medium">
                            {calculatedTax.slab.percentage > 0
                              ? formatPercentage(calculatedTax.slab.percentage)
                              : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!calculatedTax.slab && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800 text-center">
                        No tax slab found for the specified income range.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* View Tax Slab Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tax Slab Details</DialogTitle>
            <DialogDescription>
              View detailed information about this tax slab
            </DialogDescription>
          </DialogHeader>
          {selectedSlab && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="text-solarized-base01">Title</Label>
                  <p className="text-sm font-medium">{selectedSlab.title}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-solarized-base01">Income From</Label>
                  <p className="text-sm font-medium">{formatCurrency(selectedSlab.income_from)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-solarized-base01">Income To</Label>
                  <p className="text-sm font-medium">{formatCurrency(selectedSlab.income_to)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-solarized-base01">Fixed Amount</Label>
                  <p className="text-sm font-medium">
                    {selectedSlab.fixed_amount > 0 ? formatCurrency(selectedSlab.fixed_amount) : '-'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-solarized-base01">Tax Rate</Label>
                  <p className="text-sm font-medium">
                    {selectedSlab.percentage > 0 ? formatPercentage(selectedSlab.percentage) : '-'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-solarized-base01">Status</Label>
                  <div>
                    <Badge
                      className={
                        selectedSlab.is_active
                          ? 'bg-solarized-green/10 text-solarized-green'
                          : 'bg-solarized-red/10 text-solarized-red'
                      }
                    >
                      {selectedSlab.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                {selectedSlab.author && (
                  <div className="space-y-2">
                    <Label className="text-solarized-base01">Created By</Label>
                    <p className="text-sm font-medium">{selectedSlab.author.name}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {/* <Button
              className="bg-solarized-blue hover:bg-solarized-blue/90"
              onClick={() => {
                if (selectedSlab) {
                  handleEdit(selectedSlab);
                  setIsViewDialogOpen(false);
                }
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button> */}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
