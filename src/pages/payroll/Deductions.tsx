import { useState, useEffect, useCallback } from 'react';
import { payrollService, staffService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
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
import { Skeleton } from '../../components/ui/skeleton';
import { Plus, Minus, User, Type, Eye, Edit, Trash2, Shield, IndianRupee, MoreHorizontal, AlertCircle } from 'lucide-react';
import { Textarea } from '../../components/ui/textarea';
import DataTable, { TableColumn } from 'react-data-table-component';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Alert, AlertDescription } from '../../components/ui/alert';

interface StaffMember {
  id: number;
  full_name: string;
}

interface Deduction {
  id: number;
  staff_member_id: number;
  withholding_type_id: number;
  description: string;
  calculation_type: 'fixed' | 'percentage';
  amount: number;
  effective_from: string | null;
  effective_until: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  staff_member?: {
    id: number;
    full_name: string;
  };
  withholding_type?: {
    id: number;
    title: string;
    notes?: string;
    is_statutory: boolean;
    is_active: boolean;
  };
  author?: {
    id: number;
    name: string;
  };
}

interface WithholdingType {
  id: number;
  title: string;
  notes?: string;
  is_statutory: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface FieldErrors {
  [key: string]: string | undefined;
}

export default function Deductions() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [withholdingTypes, setWithholdingTypes] = useState<WithholdingType[]>([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [selectedDeduction, setSelectedDeduction] = useState<Deduction | null>(null);
  const [formErrors, setFormErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);

  const [formData, setFormData] = useState({
    withholding_type_id: '',
    description: '',
    calculation_type: 'fixed' as 'fixed' | 'percentage',
    amount: '',
    effective_from: '',
    effective_until: '',
    is_active: 'true',
  });

  const fetchDeductions = useCallback(async (currentPage: number = 1) => {
    if (!selectedStaff) {
      setDeductions([]);
      setTotalRows(0);
      return;
    }

    setIsLoading(true);
    try {
      const response = await payrollService.getDeductions({
        staff_member_id: Number(selectedStaff),
        page: currentPage,
        per_page: perPage,
        paginate: true
      });
      console.log('Deductions response:', response.data);

      const { data, meta } = response.data;

      setDeductions(data || []);
      setTotalRows(meta?.total || 0);

    } catch (error) {
      console.error('Failed to fetch deductions:', error);
      setDeductions([]);
      setTotalRows(0);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStaff, perPage]);

  useEffect(() => {
    fetchDeductions(page);
  }, [page, fetchDeductions]);

  // Reset page when selected staff changes
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    } else {
      fetchDeductions(1);
    }
  }, [selectedStaff]);

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    let isValid = true;

    // Helper to validate required fields
    const validateRequired = (field: keyof typeof formData, label: string) => {
      if (!formData[field] || (typeof formData[field] === 'string' && !formData[field].trim())) {
        errors[field] = `${label} is required`;
        isValid = false;
      }
    };

    // Check if staff is selected (for create only)
    if (isDialogOpen && !selectedStaff) {
      errors.staff_member_id = 'Please select an employee first';
      isValid = false;
    }

    // Withholding type validation
    validateRequired('withholding_type_id', 'Deduction type');
    if (formData.withholding_type_id === "no-withholding-types") {
      errors.withholding_type_id = 'Please select a valid deduction type';
      isValid = false;
    }

    // Description validation
    validateRequired('description', 'Description');
    if (formData.description && formData.description.trim().length > 255) {
      errors.description = 'Description must be less than 255 characters';
      isValid = false;
    }

    // Calculation type validation
    validateRequired('calculation_type', 'Calculation type');

    // Amount validation
    validateRequired('amount', 'Amount');
    if (formData.amount) {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount)) {
        errors.amount = 'Amount must be a valid number';
        isValid = false;
      } else if (amount < 0) {
        errors.amount = 'Amount must be greater than or equal to 0';
        isValid = false;
      } else if (formData.calculation_type === 'percentage' && amount > 100) {
        errors.amount = 'Percentage cannot exceed 100%';
        isValid = false;
      }
    }

    // Date validation
    if (formData.effective_from && formData.effective_until) {
      const fromDate = new Date(formData.effective_from);
      const untilDate = new Date(formData.effective_until);
      if (untilDate <= fromDate) {
        errors.effective_until = 'Effective until must be after effective from date';
        isValid = false;
      }
    }

    setFormErrors(errors);

    if (!isValid) {
      // Focus first error
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField);
        if (element) {
          element.focus();
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }

    return isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFormErrors({});

    if (!validateForm()) {
      return;
    }

    // Check if a valid withholding type is selected
    if (formData.withholding_type_id === "no-withholding-types" || !formData.withholding_type_id) {
      setFormErrors(prev => ({
        ...prev,
        withholding_type_id: 'Deduction type is required'
      }));
      return;
    }

    try {
      const payload: any = {
        staff_member_id: Number(selectedStaff),
        withholding_type_id: Number(formData.withholding_type_id),
        description: formData.description.trim(),
        calculation_type: formData.calculation_type,
        amount: Number(formData.amount),
        is_active: formData.is_active === 'true',
      };

      // Only include date fields if they have values
      if (formData.effective_from) {
        payload.effective_from = formData.effective_from;
      }
      if (formData.effective_until) {
        payload.effective_until = formData.effective_until;
      }

      console.log('Submitting deduction:', payload);

      await payrollService.createDeduction(payload);
      showAlert('success', 'Success!', 'Deduction created successfully', 2000);
      setIsDialogOpen(false);
      resetForm();
      fetchDeductions(page);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const errorMessage = getErrorMessage(err, 'Failed to create deduction');

      if (error.response?.data?.errors) {
        const apiErrors: FieldErrors = {};
        const errors = error.response.data.errors;
        Object.keys(errors).forEach(key => {
          apiErrors[key] = errors[key][0];
        });
        setFormErrors(apiErrors);

        // Focus first API error
        const firstErrorField = Object.keys(apiErrors)[0];
        if (firstErrorField) {
          const element = document.getElementById(firstErrorField);
          if (element) {
            element.focus();
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }

      setError(errorMessage);
      showAlert('error', 'Creation Failed', errorMessage);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDeduction) return;

    setError('');
    setFormErrors({});

    if (!validateForm()) {
      return;
    }

    try {
      const payload: any = {
        withholding_type_id: Number(formData.withholding_type_id),
        description: formData.description.trim(),
        calculation_type: formData.calculation_type,
        amount: Number(formData.amount),
        is_active: formData.is_active === 'true',
      };

      // Only include date fields if they have values
      if (formData.effective_from) {
        payload.effective_from = formData.effective_from;
      }
      if (formData.effective_until) {
        payload.effective_until = formData.effective_until;
      }

      console.log('Updating deduction:', payload);

      await payrollService.updateDeduction(selectedDeduction.id, payload);
      showAlert('success', 'Success!', 'Deduction updated successfully', 2000);
      setIsEditDialogOpen(false);
      resetForm();
      setSelectedDeduction(null);
      fetchDeductions(page);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const errorMessage = getErrorMessage(err, 'Failed to update deduction');

      if (error.response?.data?.errors) {
        const apiErrors: FieldErrors = {};
        const errors = error.response.data.errors;
        Object.keys(errors).forEach(key => {
          apiErrors[key] = errors[key][0];
        });
        setFormErrors(apiErrors);

        // Focus first API error
        const firstErrorField = Object.keys(apiErrors)[0];
        if (firstErrorField) {
          const element = document.getElementById(firstErrorField);
          if (element) {
            element.focus();
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }

      setError(errorMessage);
      showAlert('error', 'Update Failed', errorMessage);
    }
  };

  const handleView = (deduction: Deduction) => {
    setSelectedDeduction(deduction);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (deduction: Deduction) => {
    setSelectedDeduction(deduction);
    setError('');
    setFormErrors({});

    // Format dates from ISO to YYYY-MM-DD for date inputs
    const formatDateForInput = (dateString: string | null) => {
      if (!dateString) return '';
      try {
        return new Date(dateString).toISOString().split('T')[0];
      } catch (error) {
        return '';
      }
    };

    setFormData({
      withholding_type_id: deduction.withholding_type_id.toString(),
      description: deduction.description,
      calculation_type: deduction.calculation_type,
      amount: deduction.amount.toString(),
      effective_from: formatDateForInput(deduction.effective_from),
      effective_until: formatDateForInput(deduction.effective_until),
      is_active: deduction.is_active ? 'true' : 'false',
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (deduction: Deduction) => {
    const result = await showConfirmDialog(
      'Are you sure?',
      `You want to delete this deduction: "${deduction.description}"?`
    );

    if (!result.isConfirmed) return;

    try {
      await payrollService.deleteDeduction(deduction.id);
      showAlert('success', 'Deleted!', 'Deduction deleted successfully', 2000);
      fetchDeductions(page);
    } catch (error: unknown) {
      console.error('Failed to delete deduction:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete deduction'));
    }
  };

  const resetForm = () => {
    setFormData({
      withholding_type_id: '',
      description: '',
      calculation_type: 'fixed',
      amount: '',
      effective_from: '',
      effective_until: '',
      is_active: 'true',
    });
    setError('');
    setFormErrors({});
  };

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await staffService.getAll({ per_page: 100 });
        setStaff(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch staff:', error);
      }
    };

    fetchStaff();
  }, []);

  useEffect(() => {
    const fetchWithholdingTypes = async () => {
      setIsLoadingTypes(true);
      try {
        const response = await payrollService.getWithholdingTypes?.({
          paginate: false,
          active: true
        }) || { data: { success: true, data: [] } };

        console.log('Withholding types response:', response.data);

        if (response.data && response.data.data) {
          setWithholdingTypes(response.data.data);
        } else if (Array.isArray(response.data)) {
          setWithholdingTypes(response.data);
        } else {
          console.error('Unexpected response format:', response);
          setWithholdingTypes([]);
        }
      } catch (error) {
        console.error('Failed to fetch withholding types:', error);
        // Fallback to some common deduction types
        setWithholdingTypes([
          { id: 1, title: 'Income Tax', is_statutory: true, is_active: true },
          { id: 2, title: 'Provident Fund', is_statutory: true, is_active: true },
          { id: 3, title: 'Health Insurance', is_statutory: false, is_active: true },
          { id: 4, title: 'Loan Repayment', is_statutory: false, is_active: true },
          { id: 5, title: 'Advance Salary', is_statutory: false, is_active: true },
        ]);
      } finally {
        setIsLoadingTypes(false);
      }
    };

    fetchWithholdingTypes();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
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

  // Pagination Handlers
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePerRowsChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  const renderError = (field: string) => {
    return formErrors[field] ? (
      <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
        <AlertCircle className="h-4 w-4" />
        {formErrors[field]}
      </p>
    ) : null;
  };

  const columns: TableColumn<Deduction>[] = [
    {
      name: 'Deduction Type',
      selector: (row) => row.withholding_type?.title || 'N/A',
      sortable: true,
      cell: (row) => (
        <span className="font-medium">
          {row.withholding_type?.title || 'N/A'}
        </span>
      ),
    },
    {
      name: 'Description',
      selector: (row) => row.description,
      cell: (row) => (
        <span className="max-w-xs truncate" title={row.description}>
          {row.description}
        </span>
      ),
    },
    {
      name: 'Calculation',
      selector: (row) => row.calculation_type,
      cell: (row) => (
        <StatusBadge status={row.calculation_type} />
      ),
    },
    {
      name: 'Amount',
      selector: (row) => row.amount,
      cell: (row) => (
        <span>
          {row.calculation_type === 'percentage'
            ? `${row.amount}%`
            : formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      name: 'Statutory',
      selector: (row) => row.withholding_type?.is_statutory || false ? 'Yes' : 'No',
      cell: (row) => (
        <StatusBadge status={row.withholding_type?.is_statutory ? 'yes' : 'no'} />
      ),
    },
    {
      name: 'Effective Period',
      cell: (row) => (
        <div className="flex flex-col text-sm">
          <span>From: {formatDate(row.effective_from)}</span>
          <span>To: {formatDate(row.effective_until)}</span>
        </div>
      )
    },
    {
      name: 'Status',
      selector: (row) => row.is_active ? 'Active' : 'Inactive',
      cell: (row) => (
        <StatusBadge status={row.is_active ? 'active' : 'inactive'} />
      ),
    },
    {
      name: 'Actions',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
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
      button: true,
    },
  ];

  const totalFixedDeductions = deductions
    .filter(d => d.calculation_type === 'fixed')
    .reduce((sum, d) => sum + d.amount, 0);

  const activeDeductionsCount = deductions.filter(d => d.is_active).length;
  const statutoryDeductionsCount = deductions.filter(d => d.withholding_type?.is_statutory).length;

  // Filter active withholding types
  const activeWithholdingTypes = withholdingTypes.filter(type => type.is_active);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">Recurring Deductions</h1>
          <p className="text-solarized-base01">Manage employee recurring deductions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button
              className="bg-solarized-blue hover:bg-solarized-blue/90"
              onClick={() => resetForm()}
              disabled={!selectedStaff}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Deduction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Deduction</DialogTitle>
              <DialogDescription>
                Add a new recurring deduction for {staff.find(s => s.id.toString() === selectedStaff)?.full_name || 'selected employee'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} noValidate>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="withholding_type_id" className={formErrors.withholding_type_id ? 'text-red-500' : ''}>
                    Deduction Type *
                  </Label>
                  {isLoadingTypes ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select
                      value={formData.withholding_type_id}
                      onValueChange={(value) => handleSelectChange('withholding_type_id', value)}
                      required
                    >
                      <SelectTrigger 
                        id="withholding_type_id" 
                        className={formErrors.withholding_type_id ? 'border-red-500' : ''}
                        aria-invalid={!!formErrors.withholding_type_id}
                      >
                        <SelectValue placeholder="Select deduction type" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeWithholdingTypes.length > 0 ? (
                          activeWithholdingTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id.toString()}>
                              {type.title}
                              {type.is_statutory && ' (Statutory)'}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-withholding-types" disabled>
                            No deduction types available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                  {renderError('withholding_type_id')}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className={formErrors.description ? 'text-red-500' : ''}>
                    Description *
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe this deduction..."
                    rows={2}
                    className={formErrors.description ? 'border-red-500' : ''}
                    aria-invalid={!!formErrors.description}
                  />
                  {renderError('description')}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="calculation_type" className={formErrors.calculation_type ? 'text-red-500' : ''}>
                      Calculation Type *
                    </Label>
                    <Select
                      value={formData.calculation_type}
                      onValueChange={(value) => handleSelectChange('calculation_type', value)}
                      required
                    >
                      <SelectTrigger 
                        id="calculation_type" 
                        className={formErrors.calculation_type ? 'border-red-500' : ''}
                        aria-invalid={!!formErrors.calculation_type}
                      >
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                      </SelectContent>
                    </Select>
                    {renderError('calculation_type')}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount" className={formErrors.amount ? 'text-red-500' : ''}>
                      Amount *
                    </Label>
                    <div className="relative">
                      {formData.calculation_type === 'percentage' ? (
                        <div className="flex items-center">
                          <Input
                            id="amount"
                            name="amount"
                            type="number"
                            value={formData.amount}
                            onChange={handleChange}
                            placeholder="e.g., 10"
                            min="0"
                            max="100"
                            step="0.01"
                            required
                            className={`pr-10 ${formErrors.amount ? 'border-red-500' : ''}`}
                            aria-invalid={!!formErrors.amount}
                          />
                          <span className="absolute right-3 top-2.5 text-solarized-base01">%</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <span className="absolute left-3 top-2.5 text-solarized-base01">
                            <IndianRupee className="h-4 w-4" />
                          </span>
                          <Input
                            id="amount"
                            name="amount"
                            type="number"
                            value={formData.amount}
                            onChange={handleChange}
                            placeholder="e.g., 100"
                            min="0"
                            step="0.01"
                            required
                            className={`pl-7 ${formErrors.amount ? 'border-red-500' : ''}`}
                            aria-invalid={!!formErrors.amount}
                          />
                        </div>
                      )}
                    </div>
                    {renderError('amount')}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="effective_from">Effective From</Label>
                    <Input
                      id="effective_from"
                      name="effective_from"
                      type="date"
                      value={formData.effective_from}
                      onChange={handleChange}
                      className={formErrors.effective_from ? 'border-red-500' : ''}
                      aria-invalid={!!formErrors.effective_from}
                    />
                    {renderError('effective_from')}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="effective_until" className={formErrors.effective_until ? 'text-red-500' : ''}>
                      Effective Until
                    </Label>
                    <Input
                      id="effective_until"
                      name="effective_until"
                      type="date"
                      value={formData.effective_until}
                      onChange={handleChange}
                      min={formData.effective_from}
                      className={formErrors.effective_until ? 'border-red-500' : ''}
                      aria-invalid={!!formErrors.effective_until}
                    />
                    {renderError('effective_until')}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="is_active">Status</Label>
                  <Select
                    value={formData.is_active}
                    onValueChange={(value) => handleSelectChange('is_active', value)}
                  >
                    <SelectTrigger id="is_active">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-solarized-blue hover:bg-solarized-blue/90"
                >
                  Create Deduction
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Select Employee</CardTitle>
          <CardDescription>Choose an employee to view and manage their deductions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formErrors.staff_member_id && (
              <div className="text-sm text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {formErrors.staff_member_id}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {selectedStaff && deductions.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-4">
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-solarized-red/10 flex items-center justify-center">
                  <Minus className="h-6 w-6 text-solarized-red" />
                </div>
                <div>
                  <p className="text-sm text-solarized-base01">Total Deductions</p>
                  <p className="text-2xl font-bold text-solarized-base02">{totalRows}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-solarized-green/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-solarized-green" />
                </div>
                <div>
                  <p className="text-sm text-solarized-base01">Statutory Deductions</p>
                  <p className="text-2xl font-bold text-solarized-base02">{statutoryDeductionsCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-solarized-yellow/10 flex items-center justify-center">
                  <Type className="h-6 w-6 text-solarized-yellow" />
                </div>
                <div>
                  <p className="text-sm text-solarized-base01">Active Deductions</p>
                  <p className="text-2xl font-bold text-solarized-base02">{activeDeductionsCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-solarized-blue/10 flex items-center justify-center">
                  <Minus className="h-6 w-6 text-solarized-blue" />
                </div>
                <div>
                  <p className="text-sm text-solarized-base01">Fixed Deductions</p>
                  <p className="text-2xl font-bold text-solarized-base02">
                    {formatCurrency(totalFixedDeductions)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          resetForm();
          setSelectedDeduction(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Deduction</DialogTitle>
            <DialogDescription>
              Edit details for this deduction.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} noValidate>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-withholding_type_id" className={formErrors.withholding_type_id ? 'text-red-500' : ''}>
                  Deduction Type *
                </Label>
                {isLoadingTypes ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={formData.withholding_type_id}
                    onValueChange={(value) => handleSelectChange('withholding_type_id', value)}
                    required
                  >
                    <SelectTrigger 
                      id="edit-withholding_type_id" 
                      className={formErrors.withholding_type_id ? 'border-red-500' : ''}
                      aria-invalid={!!formErrors.withholding_type_id}
                    >
                      <SelectValue placeholder="Select deduction type" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeWithholdingTypes.length > 0 ? (
                        activeWithholdingTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.title}
                            {type.is_statutory && ' (Statutory)'}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-withholding-types" disabled>
                          No deduction types available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
                {renderError('withholding_type_id')}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description" className={formErrors.description ? 'text-red-500' : ''}>
                  Description *
                </Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe this deduction..."
                  required
                  rows={2}
                  className={formErrors.description ? 'border-red-500' : ''}
                  aria-invalid={!!formErrors.description}
                />
                {renderError('description')}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-calculation_type" className={formErrors.calculation_type ? 'text-red-500' : ''}>
                    Calculation Type *
                  </Label>
                  <Select
                    value={formData.calculation_type}
                    onValueChange={(value) => handleSelectChange('calculation_type', value)}
                    required
                  >
                    <SelectTrigger 
                      id="edit-calculation_type" 
                      className={formErrors.calculation_type ? 'border-red-500' : ''}
                      aria-invalid={!!formErrors.calculation_type}
                    >
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                      <SelectItem value="percentage">Percentage</SelectItem>
                    </SelectContent>
                  </Select>
                  {renderError('calculation_type')}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-amount" className={formErrors.amount ? 'text-red-500' : ''}>
                    Amount *
                  </Label>
                  <div className="relative">
                    {formData.calculation_type === 'percentage' ? (
                      <div className="flex items-center">
                        <Input
                          id="edit-amount"
                          name="amount"
                          type="number"
                          value={formData.amount}
                          onChange={handleChange}
                          placeholder="e.g., 10"
                          min="0"
                          max="100"
                          step="0.01"
                          required
                          className={`pr-10 ${formErrors.amount ? 'border-red-500' : ''}`}
                          aria-invalid={!!formErrors.amount}
                        />
                        <span className="absolute right-3 top-2.5 text-solarized-base01">%</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <span className="absolute left-3 top-2.5 text-solarized-base01">
                          <IndianRupee className="h-4 w-4" />
                        </span>
                        <Input
                          id="edit-amount"
                          name="amount"
                          type="number"
                          value={formData.amount}
                          onChange={handleChange}
                          placeholder="e.g., 100"
                          min="0"
                          step="0.01"
                          required
                          className={`pl-7 ${formErrors.amount ? 'border-red-500' : ''}`}
                          aria-invalid={!!formErrors.amount}
                        />
                      </div>
                    )}
                  </div>
                  {renderError('amount')}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-effective_from">Effective From</Label>
                  <Input
                    id="edit-effective_from"
                    name="effective_from"
                    type="date"
                    value={formData.effective_from}
                    onChange={handleChange}
                    className={formErrors.effective_from ? 'border-red-500' : ''}
                    aria-invalid={!!formErrors.effective_from}
                  />
                  {renderError('effective_from')}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-effective_until" className={formErrors.effective_until ? 'text-red-500' : ''}>
                    Effective Until
                  </Label>
                  <Input
                    id="edit-effective_until"
                    name="effective_until"
                    type="date"
                    value={formData.effective_until}
                    onChange={handleChange}
                    min={formData.effective_from}
                    className={formErrors.effective_until ? 'border-red-500' : ''}
                    aria-invalid={!!formErrors.effective_until}
                  />
                  {renderError('effective_until')}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-is_active">Status</Label>
                <Select
                  value={formData.is_active}
                  onValueChange={(value) => handleSelectChange('is_active', value)}
                >
                  <SelectTrigger id="edit-is_active">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-solarized-blue hover:bg-solarized-blue/90"
              >
                Update Deduction
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rest of the component remains the same (DataTable, View Dialog, etc.) */}
      {isLoading && !deductions.length ? (
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : selectedStaff && deductions.length > 0 ? (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Deductions List</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={deductions}
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
          </CardContent>
        </Card>
      ) : selectedStaff ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <Minus className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-solarized-base02">No deductions configured</h3>
            <p className="text-solarized-base01 mt-1">
              This employee doesn't have any deductions assigned yet.
            </p>
            <Button
              className="mt-4 bg-solarized-blue hover:bg-solarized-blue/90"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Deduction
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-solarized-base02">Select an Employee</h3>
            <p className="text-solarized-base01 mt-1">
              Choose an employee from the dropdown to view and manage their deductions.
            </p>
          </CardContent>
        </Card>
      )}

      {/* View Deduction Dialog (remains unchanged) */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Deduction Details</DialogTitle>
          </DialogHeader>
          {selectedDeduction && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-1">Deduction Type</h4>
                  <p>{selectedDeduction.withholding_type?.title}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Statutory</h4>
                  <StatusBadge status={selectedDeduction.withholding_type?.is_statutory ? 'yes' : 'no'} />
                </div>
                <div className="col-span-2">
                  <h4 className="font-semibold mb-1">Description</h4>
                  <p className="text-gray-700">{selectedDeduction.description}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Amount</h4>
                  <p>
                    {selectedDeduction.calculation_type === 'percentage'
                      ? `${selectedDeduction.amount}%`
                      : formatCurrency(selectedDeduction.amount)}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Calculation Type</h4>
                  <p className="capitalize">{selectedDeduction.calculation_type}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Effective From</h4>
                  <p>{formatDate(selectedDeduction.effective_from)}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Effective Until</h4>
                  <p>{formatDate(selectedDeduction.effective_until)}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Status</h4>
                  <StatusBadge status={selectedDeduction.is_active ? 'active' : 'inactive'} />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Created By</h4>
                  <p>{selectedDeduction.author?.name || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}