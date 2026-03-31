import { useState, useEffect } from 'react';
import { payrollService, staffService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { StatusBadge } from '../../components/ui/status-badge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Skeleton } from '../../components/ui/skeleton';
import { Plus, IndianRupee, User, Calendar, Type, Eye, Edit, Trash2, MoreHorizontal, AlertCircle } from 'lucide-react';
import { Textarea } from '../../components/ui/textarea';
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

interface Benefit {
  id: number;
  staff_member_id: number;
  benefit_type_id: number;
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
  benefit_type?: {
    id: number;
    title: string;
    is_taxable: boolean;
    is_active: boolean;
  };
  author?: {
    id: number;
    name: string;
  };
}

interface BenefitType {
  id: number;
  title: string;
  notes?: string;
  is_taxable: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface FieldErrors {
  [key: string]: string | undefined;
}

export default function Benefits() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [benefitTypes, setBenefitTypes] = useState<BenefitType[]>([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);
  const [formErrors, setFormErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    benefit_type_id: '',
    description: '',
    calculation_type: 'fixed' as 'fixed' | 'percentage',
    amount: '',
    effective_from: '',
    effective_until: '',
    is_active: 'true',
  });

  const validateForm = (isEdit = false): boolean => {
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

    // Benefit type validation
    validateRequired('benefit_type_id', 'Benefit type');
    if (formData.benefit_type_id === "no-benefit-types") {
      errors.benefit_type_id = 'Please select a valid benefit type';
      isValid = false;
    }

    // Description validation
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

    if (!selectedStaff) {
      setFormErrors(prev => ({
        ...prev,
        staff_member_id: 'Please select an employee first'
      }));
      return;
    }

    try {
      const payload: any = {
        staff_member_id: Number(selectedStaff),
        benefit_type_id: Number(formData.benefit_type_id),
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

      console.log('Submitting benefit:', payload);

      await payrollService.createBenefit(payload);
      showAlert('success', 'Success!', 'Benefit created successfully', 2000);
      setIsDialogOpen(false);
      resetForm();
      if (selectedStaff) {
        fetchBenefits();
      }
    } catch (err: any) {
      console.error('Failed to create benefit:', err);
      const errorMessage = getErrorMessage(err, 'Failed to create benefit');

      if (err.response?.data?.errors) {
        const apiErrors: FieldErrors = {};
        const errors = err.response.data.errors;
        Object.keys(errors).forEach((key) => {
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
    setError('');
    setFormErrors({});

    if (!selectedBenefit) return;
    if (!validateForm(true)) return;

    try {
      const payload: any = {
        benefit_type_id: Number(formData.benefit_type_id),
        description: formData.description.trim(),
        calculation_type: formData.calculation_type,
        amount: Number(formData.amount),
        is_active: formData.is_active === 'true',
      };

      // Only include date fields if they have values
      if (formData.effective_from) {
        payload.effective_from = formData.effective_from;
      } else {
        payload.effective_from = null;
      }

      if (formData.effective_until) {
        payload.effective_until = formData.effective_until;
      } else {
        payload.effective_until = null;
      }

      console.log('Updating benefit:', payload);

      await payrollService.updateBenefit(selectedBenefit.id, payload);
      showAlert('success', 'Success!', 'Benefit updated successfully', 2000);
      setIsEditDialogOpen(false);
      resetForm();
      setSelectedBenefit(null);
      if (selectedStaff) {
        fetchBenefits();
      }
    } catch (err: any) {
      console.error('Failed to update benefit:', err);
      const errorMessage = getErrorMessage(err, 'Failed to update benefit');

      if (err.response?.data?.errors) {
        const apiErrors: FieldErrors = {};
        const errors = err.response.data.errors;
        Object.keys(errors).forEach((key) => {
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

  const handleView = (benefit: Benefit) => {
    setSelectedBenefit(benefit);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (benefit: Benefit) => {
    setSelectedBenefit(benefit);
    setError('');
    setFormErrors({});

    // Helper function to convert ISO date to YYYY-MM-DD format
    const formatDateForInput = (dateString: string | null): string => {
      if (!dateString) return '';

      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          console.warn('Invalid date:', dateString);
          return '';
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
      } catch (error) {
        console.error('Error formatting date:', error, dateString);
        return '';
      }
    };

    setFormData({
      benefit_type_id: benefit.benefit_type_id.toString(),
      description: benefit.description,
      calculation_type: benefit.calculation_type,
      amount: benefit.amount.toString(),
      effective_from: formatDateForInput(benefit.effective_from),
      effective_until: formatDateForInput(benefit.effective_until),
      is_active: benefit.is_active ? 'true' : 'false',
    });

    setIsEditDialogOpen(true);
  };

  const handleDelete = async (benefit: Benefit) => {
    const result = await showConfirmDialog(
      'Are you sure?',
      `You want to delete this benefit: "${benefit.description}"?`
    );

    if (!result.isConfirmed) return;

    try {
      await payrollService.deleteBenefit(benefit.id);
      showAlert('success', 'Deleted!', 'Benefit deleted successfully', 2000);
      if (selectedStaff) {
        fetchBenefits();
      }
    } catch (error: unknown) {
      console.error('Failed to delete benefit:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete benefit'));
    }
  };

  const resetForm = () => {
    setFormData({
      benefit_type_id: '',
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

  const renderError = (field: string) => {
    return formErrors[field] ? (
      <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
        <AlertCircle className="h-4 w-4" />
        {formErrors[field]}
      </p>
    ) : null;
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
    const fetchBenefitTypes = async () => {
      setIsLoadingTypes(true);
      try {
        const response = await payrollService.getBenefitTypes({
          paginate: false,
          active: true
        });
        console.log('Benefit types response:', response.data);

        if (response.data && response.data.data) {
          setBenefitTypes(response.data.data);
        } else if (Array.isArray(response.data)) {
          setBenefitTypes(response.data);
        } else {
          console.error('Unexpected response format:', response);
          setBenefitTypes([]);
        }
      } catch (error) {
        console.error('Failed to fetch benefit types:', error);
        setBenefitTypes([]);
      } finally {
        setIsLoadingTypes(false);
      }
    };

    fetchBenefitTypes();
  }, []);

  useEffect(() => {
    if (selectedStaff) {
      fetchBenefits();
    } else {
      setBenefits([]);
    }
  }, [selectedStaff]);

  const fetchBenefits = async () => {
    setIsLoading(true);
    try {
      const response = await payrollService.getBenefits({
        staff_member_id: Number(selectedStaff),
        paginate: false
      });
      console.log('Benefits response:', response.data);

      if (response.data && response.data.data) {
        setBenefits(response.data.data);
      } else if (Array.isArray(response.data)) {
        setBenefits(response.data);
      } else {
        setBenefits([]);
      }
    } catch (error) {
      console.error('Failed to fetch benefits:', error);
      setBenefits([]);
    } finally {
      setIsLoading(false);
    }
  };

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

  const totalFixedBenefits = benefits
    .filter(b => b.calculation_type === 'fixed')
    .reduce((sum, b) => sum + b.amount, 0);

  const activeBenefitsCount = benefits.filter(b => b.is_active).length;

  // Filter active benefit types
  const activeBenefitTypes = benefitTypes.filter(type => type.is_active);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">Benefits</h1>
          <p className="text-solarized-base01">Manage employee benefits and allowances</p>
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
              Add Benefit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Benefit</DialogTitle>
              <DialogDescription>
                Add a new benefit for {staff.find(s => s.id.toString() === selectedStaff)?.full_name || 'selected employee'}
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
                  <Label htmlFor="benefit_type_id" className={formErrors.benefit_type_id ? 'text-red-500' : ''}>
                    Benefit Type *
                  </Label>
                  {isLoadingTypes ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select
                      value={formData.benefit_type_id}
                      onValueChange={(value) => handleSelectChange('benefit_type_id', value)}
                      required
                    >
                      <SelectTrigger
                        id="benefit_type_id"
                        className={formErrors.benefit_type_id ? 'border-red-500' : ''}
                        aria-invalid={!!formErrors.benefit_type_id}
                      >
                        <SelectValue placeholder="Select benefit type" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeBenefitTypes.length > 0 ? (
                          activeBenefitTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id.toString()}>
                              {type.title}
                              {type.is_taxable && ' (Taxable)'}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-benefit-types" disabled>
                            No benefit types available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                  {renderError('benefit_type_id')}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className={formErrors.description ? 'text-red-500' : ''}>
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe this benefit..."
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
                            placeholder="e.g., 500"
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
                  Create Benefit
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Select Employee</CardTitle>
          <CardDescription>Choose an employee to view and manage their benefits</CardDescription>
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

      {/* Edit Modal */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          resetForm();
          setSelectedBenefit(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Benefit</DialogTitle>
            <DialogDescription>
              Update benefit details for {selectedBenefit?.staff_member?.full_name}
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
                <Label htmlFor="edit_benefit_type_id" className={formErrors.benefit_type_id ? 'text-red-500' : ''}>
                  Benefit Type *
                </Label>
                {isLoadingTypes ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={formData.benefit_type_id}
                    onValueChange={(value) => handleSelectChange('benefit_type_id', value)}
                    required
                  >
                    <SelectTrigger
                      id="edit_benefit_type_id"
                      className={formErrors.benefit_type_id ? 'border-red-500' : ''}
                      aria-invalid={!!formErrors.benefit_type_id}
                    >
                      <SelectValue placeholder="Select benefit type" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeBenefitTypes.length > 0 ? (
                        activeBenefitTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.title}
                            {type.is_taxable && ' (Taxable)'}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-benefit-types" disabled>
                          No benefit types available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
                {renderError('benefit_type_id')}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_description" className={formErrors.description ? 'text-red-500' : ''}>
                  Description
                </Label>
                <Textarea
                  id="edit_description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe this benefit..."
                  rows={2}
                  className={formErrors.description ? 'border-red-500' : ''}
                  aria-invalid={!!formErrors.description}
                />
                {renderError('description')}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_calculation_type" className={formErrors.calculation_type ? 'text-red-500' : ''}>
                    Calculation Type *
                  </Label>
                  <Select
                    value={formData.calculation_type}
                    onValueChange={(value) => handleSelectChange('calculation_type', value)}
                    required
                  >
                    <SelectTrigger
                      id="edit_calculation_type"
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
                  <Label htmlFor="edit_amount" className={formErrors.amount ? 'text-red-500' : ''}>
                    Amount *
                  </Label>
                  <div className="relative">
                    {formData.calculation_type === 'percentage' ? (
                      <div className="flex items-center">
                        <Input
                          id="edit_amount"
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
                          id="edit_amount"
                          name="amount"
                          type="number"
                          value={formData.amount}
                          onChange={handleChange}
                          placeholder="e.g., 500"
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
                  <Label htmlFor="edit_effective_from">Effective From</Label>
                  <Input
                    id="edit_effective_from"
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
                  <Label htmlFor="edit_effective_until" className={formErrors.effective_until ? 'text-red-500' : ''}>
                    Effective Until
                  </Label>
                  <Input
                    id="edit_effective_until"
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
                <Label htmlFor="edit_is_active">Status</Label>
                <Select
                  value={formData.is_active}
                  onValueChange={(value) => handleSelectChange('is_active', value)}
                >
                  <SelectTrigger id="edit_is_active">
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
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedBenefit(null);
                  resetForm();
                  setIsEditDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-solarized-blue hover:bg-solarized-blue/90"
              >
                Update Benefit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rest of the component remains the same (DataTable, View Dialog, etc.) */}
      {isLoading ? (
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : selectedStaff && benefits.length > 0 ? (
        <>
          <div className="grid gap-6 sm:grid-cols-3">
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-solarized-green/10 flex items-center justify-center">
                    <IndianRupee className="h-6 w-6 text-solarized-green" />
                  </div>
                  <div>
                    <p className="text-sm text-solarized-base01">Fixed Benefits Total</p>
                    <p className="text-2xl font-bold text-solarized-base02">
                      {formatCurrency(totalFixedBenefits)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-solarized-blue/10 flex items-center justify-center">
                    <Plus className="h-6 w-6 text-solarized-blue" />
                  </div>
                  <div>
                    <p className="text-sm text-solarized-base01">Active Benefits</p>
                    <p className="text-2xl font-bold text-solarized-base02">{activeBenefitsCount}</p>
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
                    <p className="text-sm text-solarized-base01">Total Benefits</p>
                    <p className="text-2xl font-bold text-solarized-base02">
                      {benefits.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Benefits List</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Benefit Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Calculation</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Taxable</TableHead>
                    <TableHead>Effective Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {benefits.map((benefit) => (
                    <TableRow key={benefit.id}>
                      <TableCell className="font-medium">
                        {benefit.benefit_type?.title || 'N/A'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={benefit.description}>
                        {benefit.description}
                      </TableCell>
                      <TableCell className="capitalize">
                        <StatusBadge status={benefit.calculation_type} />
                      </TableCell>
                      <TableCell>
                        {benefit.calculation_type === 'percentage'
                          ? `${benefit.amount}%`
                          : formatCurrency(benefit.amount)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={benefit.benefit_type?.is_taxable ? 'yes' : 'no'} />
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          <span>From: {formatDate(benefit.effective_from)}</span>
                          <span>To: {formatDate(benefit.effective_until)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={benefit.is_active ? 'active' : 'inactive'} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(benefit)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(benefit)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(benefit)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : selectedStaff ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <IndianRupee className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-solarized-base02">No benefits configured</h3>
            <p className="text-solarized-base01 mt-1">
              This employee doesn't have any benefits assigned yet.
            </p>
            <Button
              className="mt-4 bg-solarized-blue hover:bg-solarized-blue/90"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Benefit
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-solarized-base02">Select an Employee</h3>
            <p className="text-solarized-base01 mt-1">
              Choose an employee from the dropdown to view and manage their benefits.
            </p>
          </CardContent>
        </Card>
      )}

      {/* View Benefit Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Benefit Details</DialogTitle>
            <DialogDescription>
              View detailed information about this benefit
            </DialogDescription>
          </DialogHeader>
          {selectedBenefit && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-solarized-base01">Benefit Type</Label>
                  <p className="text-sm font-medium">{selectedBenefit.benefit_type?.title || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-solarized-base01">Employee</Label>
                  <p className="text-sm font-medium">{selectedBenefit.staff_member?.full_name || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-solarized-base01">Description</Label>
                  <p className="text-sm font-medium">{selectedBenefit.description}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-solarized-base01 mr-2">Calculation Type</Label>
                  <StatusBadge status={selectedBenefit.calculation_type} />
                </div>
                <div className="space-y-2">
                  <Label className="text-solarized-base01">Amount</Label>
                  <p className="text-sm font-medium">
                    {selectedBenefit.calculation_type === 'percentage'
                      ? `${selectedBenefit.amount}%`
                      : formatCurrency(selectedBenefit.amount)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-solarized-base01 mr-2">Taxable</Label>
                  <StatusBadge status={selectedBenefit.benefit_type?.is_taxable ? 'yes' : 'no'} />
                </div>
                <div className="space-y-2">
                  <Label className="text-solarized-base01">Effective From</Label>
                  <p className="text-sm font-medium">
                    {selectedBenefit.effective_from
                      ? formatDate(selectedBenefit.effective_from)
                      : 'Not set'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-solarized-base01">Effective Until</Label>
                  <p className="text-sm font-medium">
                    {selectedBenefit.effective_until
                      ? formatDate(selectedBenefit.effective_until)
                      : 'Not set'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-solarized-base01 mr-2">Status</Label>
                  <StatusBadge status={selectedBenefit.is_active ? 'active' : 'inactive'} />
                </div>
                {/* <div className="space-y-2">
                  <Label className="text-solarized-base01">Created By</Label>
                  <p className="text-sm font-medium">{selectedBenefit.author?.name || 'N/A'}</p>
                </div> */}
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