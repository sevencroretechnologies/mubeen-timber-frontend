import { useState, useEffect, useCallback } from 'react';
import { performanceService, staffService } from '../../services/api';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';

import { StatusBadge } from '../../components/ui/status-badge';
import { Progress } from '../../components/ui/progress';
import { showAlert, getErrorMessage } from '../../lib/sweetalert';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';
import { Target, TrendingUp, Star, Search, X, MoreHorizontal, Plus, Eye, Edit, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import DataTable, { TableColumn } from 'react-data-table-component';

interface Goal {
  id: number;
  title: string;
  description: string;
  staff_member?: { full_name: string };
  staff_member_id: number;
  objective_type: 'kpi' | 'goal' | 'okr';
  measurement_unit: string | null;
  target_value: number | null;
  current_value: number | null;
  weight_percentage: number | null;
  start_date: string;
  due_date: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  rating: 'exceeds' | 'meets' | 'below' | 'needs_improvement' | null;
  manager_notes: string | null;
  author_id: number;
  completion_percentage?: number;
  is_overdue?: boolean;
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface StaffMember {
  id: number;
  full_name: string;
}

// Helper function to format ISO date to yyyy-MM-dd for date inputs
const formatDateForInput = (isoDate: string): string => {
  if (!isoDate) return '';
  if (isoDate.match(/^\d{4}-\d{2}-\d{2}$/)) return isoDate;
  if (isoDate.includes('T')) return isoDate.split('T')[0];

  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

// Helper function to format date for display
const formatDateForDisplay = (isoDate: string): string => {
  if (!isoDate) return '-';
  const datePart = formatDateForInput(isoDate);
  if (!datePart) return '-';

  try {
    const [year, month, day] = datePart.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return datePart;
  }
};

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);

  // Filter states (matching backend parameters)
  // Update filter initialization
  const [filters, setFilters] = useState({
    staff_member_id: 'all',
    type: 'all',
    status: 'all',
    overdue_only: false,
  });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Dialog states
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);

  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [viewingGoal, setViewingGoal] = useState<Goal | null>(null);
  const [updatingGoal, setUpdatingGoal] = useState<Goal | null>(null);
  const [ratingGoal, setRatingGoal] = useState<Goal | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    staff_member_id: '',
    objective_type: 'goal' as 'kpi' | 'goal' | 'okr',
    measurement_unit: '',
    target_value: '',
    weight_percentage: '',
    start_date: '',
    due_date: '',
  });

  const [progressData, setProgressData] = useState({
    current_value: '',
    notes: '',
  });

  const [ratingData, setRatingData] = useState({
    rating: 'meets' as 'exceeds' | 'meets' | 'below' | 'needs_improvement',
    manager_notes: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Update the fetchGoals function to handle empty staff_member_id properly
  const fetchGoals = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        per_page: perPage,
      };

      // Add backend filters
      // Only add staff_member_id if it's a valid number (not empty or "all")
      if (filters.staff_member_id && filters.staff_member_id !== "all") {
        const staffId = parseInt(filters.staff_member_id);
        if (!isNaN(staffId)) {
          params.staff_member_id = staffId;
        }
      }

      if (filters.type && filters.type !== "all") {
        params.type = filters.type;
      }

      if (filters.status && filters.status !== "all") {
        params.status = filters.status;
      }

      if (filters.overdue_only) {
        params.overdue_only = true;
      }

      // Add sorting
      if (sortField) {
        params.order_by = sortField;
        params.order = sortDirection;
      }

      const response = await performanceService.getGoals(params);

      // Handle different response structures
      if (response.data.success === false) {
        console.error('API Error:', response.data.message);
        setGoals([]);
        setMeta(null);
        return;
      }

      // Check if response.data is an array or has a data property
      const responseData = response.data;

      if (Array.isArray(responseData)) {
        // Direct array response
        setGoals(responseData);
        setMeta(null);
      } else if (responseData.data && Array.isArray(responseData.data)) {
        // Nested data property
        setGoals(responseData.data);
        setMeta(responseData.meta || null);
      } else if (responseData.success && responseData.data) {
        // Success wrapper with data
        const apiData = responseData.data;
        if (Array.isArray(apiData)) {
          setGoals(apiData);
          setMeta(null);
        } else if (apiData.data && Array.isArray(apiData.data)) {
          setGoals(apiData.data);
          setMeta(apiData.meta || null);
        } else {
          setGoals([]);
          setMeta(null);
        }
      } else {
        setGoals([]);
        setMeta(null);
      }

      // Rest of the code remains the same...
    } catch (error) {
      console.error('Failed to fetch goals:', error);
      setGoals([]);
      setMeta(null);
      setTotalRows(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage, filters, sortField, sortDirection]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  useEffect(() => {
    fetchAllStaffMembers();
  }, []);

  const fetchAllStaffMembers = async () => {
    setIsLoadingStaff(true);
    try {
      const response = await staffService.getAll({ per_page: 100 });

      if (response.data.success && response.data.data) {
        if (Array.isArray(response.data.data)) {
          setStaffMembers(response.data.data);
        } else if (response.data.data.data && Array.isArray(response.data.data.data)) {
          setStaffMembers(response.data.data.data);
        } else {
          setStaffMembers([]);
        }
      } else if (Array.isArray(response.data)) {
        setStaffMembers(response.data);
      } else if (response.data.data && Array.isArray(response.data.data)) {
        setStaffMembers(response.data.data);
      } else {
        setStaffMembers([]);
      }
    } catch (error) {
      console.error('Failed to fetch staff members:', error);
      showAlert('error', 'Error', 'Failed to load staff members');
      setStaffMembers([]);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  // Form validations
  const validateForm = () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!formData.title.trim()) {
      errors.title = 'Title is required';
      isValid = false;
    }

    if (!formData.staff_member_id) {
      errors.staff_member_id = 'Staff member is required';
      isValid = false;
    }

    if (!formData.objective_type) {
      errors.objective_type = 'Objective type is required';
      isValid = false;
    }

    if (!formData.start_date) {
      errors.start_date = 'Start date is required';
      isValid = false;
    }

    if (!formData.due_date) {
      errors.due_date = 'Due date is required';
      isValid = false;
    } else if (formData.start_date && new Date(formData.due_date) < new Date(formData.start_date)) {
      errors.due_date = 'Due date cannot be before start date';
      isValid = false;
    }

    if (formData.weight_percentage) {
      const weight = Number(formData.weight_percentage);
      if (isNaN(weight) || weight < 1 || weight > 100) {
        errors.weight_percentage = 'Weight must be between 1 and 100';
        isValid = false;
      }
    }

    setFieldErrors(errors);
    return isValid;
  };

  const validateProgressForm = () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!progressData.current_value) {
      errors.current_value = 'Current value is required';
      isValid = false;
    } else if (Number(progressData.current_value) < 0) {
      errors.current_value = 'Current value cannot be negative';
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const validateRatingForm = () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!ratingData.rating) {
      errors.rating = 'Rating is required';
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  // Form handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (!validateForm()) return;

    try {
      const data: Record<string, unknown> = {
        title: formData.title,
        description: formData.description,
        objective_type: formData.objective_type,
        start_date: formData.start_date,
        due_date: formData.due_date,
      };

      if (formData.staff_member_id) data.staff_member_id = parseInt(formData.staff_member_id);
      if (formData.measurement_unit) data.measurement_unit = formData.measurement_unit;
      if (formData.target_value) data.target_value = parseFloat(formData.target_value);
      if (formData.weight_percentage) data.weight_percentage = parseInt(formData.weight_percentage);

      if (editingGoal) {
        await performanceService.updateGoal(editingGoal.id, data);
        showAlert('success', 'Success!', 'Goal updated successfully', 2000);
      } else {
        await performanceService.createGoal(data);
        showAlert('success', 'Success!', 'Goal created successfully', 2000);
      }

      setIsGoalDialogOpen(false);
      setEditingGoal(null);
      resetForm();
      fetchGoals();
    } catch (err: any) {
      console.error('Failed to save goal:', err);
      const message = getErrorMessage(err, 'Failed to save goal. Please check the form and try again.');

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

  const handleProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingGoal) return;
    setFieldErrors({});

    if (!validateProgressForm()) return;

    try {
      const data = {
        current_value: parseFloat(progressData.current_value),
        notes: progressData.notes,
      };

      await performanceService.updateProgress(updatingGoal.id, data);
      showAlert('success', 'Success!', 'Progress updated successfully', 2000);
      setIsProgressDialogOpen(false);
      setUpdatingGoal(null);
      setProgressData({ current_value: '', notes: '' });
      fetchGoals();
    } catch (err: any) {
      console.error('Failed to update progress:', err);
      const message = getErrorMessage(err, 'Failed to update progress. Please try again.');

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

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingGoal) return;
    setFieldErrors({});

    if (!validateRatingForm()) return;

    try {
      await performanceService.rateGoal(ratingGoal.id, ratingData);
      showAlert('success', 'Success!', 'Goal rated successfully', 2000);
      setIsRatingDialogOpen(false);
      setRatingGoal(null);
      setRatingData({ rating: 'meets', manager_notes: '' });
      fetchGoals();
    } catch (err: any) {
      console.error('Failed to rate goal:', err);
      const message = getErrorMessage(err, 'Failed to rate goal. Please try again.');
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

  // Action handlers
  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFieldErrors({});
    setFormData({
      title: goal.title,
      description: goal.description || '',
      staff_member_id: goal.staff_member_id?.toString() || '',
      objective_type: goal.objective_type,
      measurement_unit: goal.measurement_unit || '',
      target_value: goal.target_value?.toString() || '',
      weight_percentage: goal.weight_percentage?.toString() || '',
      start_date: formatDateForInput(goal.start_date),
      due_date: formatDateForInput(goal.due_date),
    });
    setIsGoalDialogOpen(true);
  };

  const handleView = (goal: Goal) => {
    setViewingGoal(goal);
    setIsViewDialogOpen(true);
  };

  const handleUpdateProgress = (goal: Goal) => {
    setUpdatingGoal(goal);
    setFieldErrors({});
    setProgressData({
      current_value: goal.current_value?.toString() || '0',
      notes: '',
    });
    setIsProgressDialogOpen(true);
  };

  const handleRate = (goal: Goal) => {
    setRatingGoal(goal);
    setFieldErrors({});
    setRatingData({
      rating: goal.rating || 'meets',
      manager_notes: goal.manager_notes || '',
    });
    setIsRatingDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this objective?')) return;
    try {
      await performanceService.deleteGoal(id);
      fetchGoals();
    } catch (error) {
      console.error('Failed to delete goal:', error);
      alert('Failed to delete objective. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      staff_member_id: '',
      objective_type: 'goal',
      measurement_unit: '',
      target_value: '',
      weight_percentage: '',
      start_date: '',
      due_date: '',
    });
  };

  const handleFilterChange = (key: keyof typeof filters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const applyFilters = () => {
    setPage(1);
  };

  // Update clearFilters function
  const clearFilters = () => {
    setFilters({
      staff_member_id: 'all',
      type: 'all',
      status: 'all',
      overdue_only: false,
    });
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePerRowsChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  const handleSort = (column: any, sortDirection: 'asc' | 'desc') => {
    const fieldMap: Record<string, string> = {
      'Title': 'title',
      'Staff Member': 'staff_member.full_name',
      'Due Date': 'due_date',
      'Status': 'status',
      'Type': 'objective_type',
    };

    const field = fieldMap[column.name] || column.name;
    setSortField(field);
    setSortDirection(sortDirection);
    setPage(1);
  };

  // Helper functions for badges and progress



  const calculateProgress = (goal: Goal) => {
    if (goal.completion_percentage !== undefined) {
      return goal.completion_percentage;
    }

    if (goal.target_value && goal.target_value > 0 && goal.current_value !== null) {
      return Math.min(100, (goal.current_value / goal.target_value) * 100);
    }

    if (goal.status === 'completed') return 100;
    if (goal.status === 'in_progress') return 50;
    return 0;
  };

  const renderError = (field: string) => {
    return fieldErrors[field] ? (
      <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
    ) : null;
  };

  // Table columns
  const columns: TableColumn<Goal>[] = [
    {
      name: 'Title',
      selector: (row) => row.title,
      cell: (row) => (
        <div className="w-full">
          <span className="font-medium text-gray-900 dark:text-gray-100 block truncate" title={row.title}>{row.title}</span>
        </div>
      ),
      sortable: true,
      minWidth: '250px',
    },

    {
      name: 'Description',
      selector: (row) => row.description,
      cell: (row) => (
        <div className="w-full">
          <span className="block text-sm text-gray-500 dark:text-gray-400 truncate" title={row.description}>
            {row.description || 'No description'}
          </span>
        </div>
      ),
      sortable: true,
      minWidth: '250px',
    },
    {
      name: 'Staff Member',
      selector: (row) => row.staff_member?.full_name || 'Unassigned',
      sortable: true,
    },
    {
      name: 'Type',
      cell: (row) => (
        <StatusBadge status={row.objective_type} />
      ),
      width: '100px',
    },
    {
      name: 'Status',
      cell: (row) => (
        <StatusBadge status={(row.is_overdue && row.status !== 'completed') ? 'overdue' : row.status}>
          {row.status.replace('_', ' ')}
          {row.is_overdue && row.status !== 'completed' && ' (Overdue)'}
        </StatusBadge>
      ),
      sortable: true,
      width: '150px',
    },
    {
      name: 'Progress',
      cell: (row) => {
        const progress = calculateProgress(row);
        return (
          <div className="flex items-center gap-3">
            <Progress value={progress} className="h-2 w-24" />
            <span className="text-sm font-medium whitespace-nowrap">
              {Math.round(progress)}%
            </span>
          </div>
        );
      },
      width: '150px',
    },
    {
      name: 'Current / Target',
      cell: (row) => (
        <div>
          <span className="font-medium">
            {row.current_value !== null ? row.current_value : 0}
            {row.target_value !== null ? ` / ${row.target_value}` : ''}
          </span>
          {row.measurement_unit && (
            <span className="text-sm text-gray-500 ml-1">{row.measurement_unit}</span>
          )}
        </div>
      ),
      width: '150px',
    },
    {
      name: 'Due Date',
      cell: (row) => formatDateForDisplay(row.due_date),
      sortable: true,
      width: '120px',
    },
    {
      name: 'Rating',
      cell: (row) =>
        row.rating ? (
          <StatusBadge status={row.rating} />
        ) : (
          <span className="text-gray-400">-</span>
        ),
      width: '150px',
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
            <DropdownMenuItem onClick={() => handleUpdateProgress(row)}>
              <TrendingUp className="mr-2 h-4 w-4" />
              Update Progress
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleRate(row)}>
              <Star className="mr-2 h-4 w-4" />
              Rate
            </DropdownMenuItem>
            {/* <DropdownMenuSeparator /> */}
            <DropdownMenuItem
              onClick={() => handleDelete(row.id)}
              className="text-red-600 dark:text-red-400"
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

  // Table styles
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
    cells: {
      style: {
        padding: '16px',
      },
    },
  };

  // Stats calculations
  const inProgressCount = Array.isArray(goals) ? goals.filter((g) => g.status === 'in_progress').length : 0;
  const completedCount = Array.isArray(goals) ? goals.filter((g) => g.status === 'completed').length : 0;
  const ratedCount = Array.isArray(goals) ? goals.filter((g) => g.rating !== null).length : 0;
  const totalCount = meta?.total || (Array.isArray(goals) ? goals.length : 0);

  // Check if any filter is active
  // Check if any filter is active (excluding "all" values)
  const hasActiveFilters =
    (filters.staff_member_id && filters.staff_member_id !== 'all') ||
    (filters.type && filters.type !== 'all') ||
    (filters.status && filters.status !== 'all') ||
    filters.overdue_only;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Performance Objectives</h1>
          <p className="text-gray-600 dark:text-gray-400">Set and track performance objectives</p>
        </div>

        {/* Create Goal Dialog Trigger */}
        <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-solarized-blue hover:bg-solarized-blue/90 text-white"
              onClick={() => {
                setEditingGoal(null);
                resetForm();
                setFieldErrors({});
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Objective
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingGoal ? 'Edit Objective' : 'Create Objective'}</DialogTitle>
              <DialogDescription>
                {editingGoal ? 'Update the objective details.' : 'Create a new performance objective.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className={fieldErrors.title ? 'text-red-500' : ''}>Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => {
                        setFormData({ ...formData, title: e.target.value });
                        if (fieldErrors.title) setFieldErrors(prev => ({ ...prev, title: '' }));
                      }}
                      placeholder="Objective title"
                      className={fieldErrors.title ? 'border-red-500' : ''}
                    />
                    {renderError('title')}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staff_member_id" className={fieldErrors.staff_member_id ? 'text-red-500' : ''}>Staff Member *</Label>
                    <Select
                      value={formData.staff_member_id}
                      onValueChange={(value) => {
                        setFormData({ ...formData, staff_member_id: value });
                        if (fieldErrors.staff_member_id) setFieldErrors(prev => ({ ...prev, staff_member_id: '' }));
                      }}
                    >
                      <SelectTrigger className={fieldErrors.staff_member_id ? 'border-red-500' : ''}>
                        <SelectValue placeholder={
                          isLoadingStaff ? "Loading staff members..." : "Select staff member"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {staffMembers.length === 0 && !isLoadingStaff ? (
                          <SelectItem value="all" disabled>No staff members found</SelectItem>
                        ) : (
                          staffMembers.map((staff) => (
                            <SelectItem key={staff.id} value={staff.id.toString()}>
                              {staff.full_name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {renderError('staff_member_id')}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Objective description..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="objective_type" className={fieldErrors.objective_type ? 'text-red-500' : ''}>Type *</Label>
                    <Select
                      value={formData.objective_type}
                      onValueChange={(value: 'kpi' | 'goal' | 'okr') => {
                        setFormData({ ...formData, objective_type: value });
                        if (fieldErrors.objective_type) setFieldErrors(prev => ({ ...prev, objective_type: '' }));
                      }}
                    >
                      <SelectTrigger className={fieldErrors.objective_type ? 'border-red-500' : ''}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kpi">KPI</SelectItem>
                        <SelectItem value="goal">Goal</SelectItem>
                        <SelectItem value="okr">OKR</SelectItem>
                      </SelectContent>
                    </Select>
                    {renderError('objective_type')}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="measurement_unit" className={fieldErrors.measurement_unit ? 'text-red-500' : ''}>Measurement Unit</Label>
                    <Input
                      id="measurement_unit"
                      value={formData.measurement_unit}
                      onChange={(e) => {
                        setFormData({ ...formData, measurement_unit: e.target.value });
                        if (fieldErrors.measurement_unit) setFieldErrors(prev => ({ ...prev, measurement_unit: '' }));
                      }}
                      placeholder="e.g., %, units, hours"
                      className={fieldErrors.measurement_unit ? 'border-red-500' : ''}
                    />
                    {renderError('measurement_unit')}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight_percentage" className={fieldErrors.weight_percentage ? 'text-red-500' : ''}>Weight %</Label>
                    <Input
                      id="weight_percentage"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.weight_percentage}
                      onChange={(e) => {
                        setFormData({ ...formData, weight_percentage: e.target.value });
                        if (fieldErrors.weight_percentage) setFieldErrors(prev => ({ ...prev, weight_percentage: '' }));
                      }}
                      placeholder="1-100"
                      className={fieldErrors.weight_percentage ? 'border-red-500' : ''}
                    />
                    {renderError('weight_percentage')}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target_value" className={fieldErrors.target_value ? 'text-red-500' : ''}>Target Value</Label>
                    <Input
                      id="target_value"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.target_value}
                      onChange={(e) => {
                        setFormData({ ...formData, target_value: e.target.value });
                        if (fieldErrors.target_value) setFieldErrors(prev => ({ ...prev, target_value: '' }));
                      }}
                      placeholder="Target value"
                      className={fieldErrors.target_value ? 'border-red-500' : ''}
                    />
                    {renderError('target_value')}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start_date" className={fieldErrors.start_date ? 'text-red-500' : ''}>Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => {
                        setFormData({ ...formData, start_date: e.target.value });
                        if (fieldErrors.start_date) setFieldErrors(prev => ({ ...prev, start_date: '' }));
                      }}
                      className={fieldErrors.start_date ? 'border-red-500' : ''}
                    />
                    {renderError('start_date')}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due_date" className={fieldErrors.due_date ? 'text-red-500' : ''}>Due Date *</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => {
                        setFormData({ ...formData, due_date: e.target.value });
                        if (fieldErrors.due_date) setFieldErrors(prev => ({ ...prev, due_date: '' }));
                      }}
                      className={fieldErrors.due_date ? 'border-red-500' : ''}
                    />
                    {renderError('due_date')}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsGoalDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90 text-white">
                  {editingGoal ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Goal Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Objective Details</DialogTitle>
            </DialogHeader>
            {viewingGoal && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-solarized-base01">Title</p>
                    <p className="font-medium">{viewingGoal.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-solarized-base01">Type</p>
                    <StatusBadge status={viewingGoal.objective_type} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-solarized-base01">Description</p>
                  <p>{viewingGoal.description || '-'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-solarized-base01">Staff Member</p>
                    <p className="font-medium">{viewingGoal.staff_member?.full_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-solarized-base01">Status</p>
                    <StatusBadge status={(viewingGoal.is_overdue && viewingGoal.status !== 'completed') ? 'overdue' : viewingGoal.status}>
                      {viewingGoal.status.replace('_', ' ')}
                      {viewingGoal.is_overdue && viewingGoal.status !== 'completed' && ' (Overdue)'}
                    </StatusBadge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-solarized-base01">Rating</p>
                    {viewingGoal.rating ? (
                      <StatusBadge status={viewingGoal.rating} />
                    ) : (
                      <p>-</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-solarized-base01">Manager Notes</p>
                    <p>{viewingGoal.manager_notes || '-'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-solarized-base01">Current / Target</p>
                    <p className="font-medium">
                      {viewingGoal.current_value !== null ? viewingGoal.current_value : 0}
                      {viewingGoal.target_value !== null ? ` / ${viewingGoal.target_value}` : ''}
                      {viewingGoal.measurement_unit ? ` ${viewingGoal.measurement_unit}` : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-solarized-base01">Weight</p>
                    <p className="font-medium">{viewingGoal.weight_percentage ? `${viewingGoal.weight_percentage}%` : '-'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-solarized-base01">Start Date</p>
                    <p>{formatDateForDisplay(viewingGoal.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-solarized-base01">Due Date</p>
                    <p>{formatDateForDisplay(viewingGoal.due_date)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-solarized-base01">Progress</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={calculateProgress(viewingGoal)} className="h-2 flex-1" />
                    <span className="font-medium">{Math.round(calculateProgress(viewingGoal))}%</span>
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

        {/* Update Progress Dialog */}
        <Dialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Progress</DialogTitle>
              <DialogDescription>
                Update the current value for this objective.
              </DialogDescription>
            </DialogHeader>
            {updatingGoal && (
              <form onSubmit={handleProgressSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="current_value" className={fieldErrors.current_value ? 'text-red-500' : ''}>Current Value *</Label>
                    <Input
                      id="current_value"
                      type="number"
                      min="0"
                      step="0.01"
                      value={progressData.current_value}
                      onChange={(e) => {
                        setProgressData({ ...progressData, current_value: e.target.value });
                        if (fieldErrors.current_value) setFieldErrors(prev => ({ ...prev, current_value: '' }));
                      }}
                      className={fieldErrors.current_value ? 'border-red-500' : ''}
                    />
                    {renderError('current_value')}
                    {updatingGoal.target_value && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Target: {updatingGoal.target_value} {updatingGoal.measurement_unit || ''}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={progressData.notes}
                      onChange={(e) => setProgressData({ ...progressData, notes: e.target.value })}
                      placeholder="Progress update notes..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsProgressDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90 text-white">
                    Update Progress
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Rate Goal Dialog */}
        <Dialog open={isRatingDialogOpen} onOpenChange={setIsRatingDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rate Objective</DialogTitle>
              <DialogDescription>
                Provide rating and feedback for this objective.
              </DialogDescription>
            </DialogHeader>
            {ratingGoal && (
              <form onSubmit={handleRatingSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="rating" className={fieldErrors.rating ? 'text-red-500' : ''}>Rating *</Label>
                    <Select
                      value={ratingData.rating}
                      onValueChange={(value: 'exceeds' | 'meets' | 'below' | 'needs_improvement') => {
                        setRatingData({ ...ratingData, rating: value });
                        if (fieldErrors.rating) setFieldErrors(prev => ({ ...prev, rating: '' }));
                      }}
                    >
                      <SelectTrigger className={fieldErrors.rating ? 'border-red-500' : ''}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exceeds">Exceeds Expectations</SelectItem>
                        <SelectItem value="meets">Meets Expectations</SelectItem>
                        <SelectItem value="below">Below Expectations</SelectItem>
                        <SelectItem value="needs_improvement">Needs Improvement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manager_notes">Manager Notes</Label>
                    <Textarea
                      id="manager_notes"
                      value={ratingData.manager_notes}
                      onChange={(e) => setRatingData({ ...ratingData, manager_notes: e.target.value })}
                      placeholder="Additional feedback..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsRatingDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
                    Submit Rating
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-4">
        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Objectives</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{inProgressCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{completedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <Star className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Rated</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{ratedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search/Filters and DataTable */}
      <Card>
        <CardHeader className="pb-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Staff Member Filter */}
              <div className="space-y-2">
                <Label htmlFor="filter-staff" className="text-sm font-medium">Staff Member</Label>
                <Select
                  value={filters.staff_member_id}
                  onValueChange={(value) => handleFilterChange('staff_member_id', value)}
                >
                  <SelectTrigger id="filter-staff" className="w-full">
                    <SelectValue placeholder="All staff members" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff Members</SelectItem>
                    {staffMembers.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id.toString()}>
                        {staff.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Type Filter */}
              <div className="space-y-2">
                <Label htmlFor="filter-type" className="text-sm font-medium">Objective Type</Label>
                <Select
                  value={filters.type}
                  onValueChange={(value) => handleFilterChange('type', value)}
                >
                  <SelectTrigger id="filter-type" className="w-full">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="kpi">KPI</SelectItem>
                    <SelectItem value="goal">Goal</SelectItem>
                    <SelectItem value="okr">OKR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="filter-status" className="text-sm font-medium">Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger id="filter-status" className="w-full">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Overdue Filter */}
              <div className="space-y-2">
                <Label htmlFor="filter-overdue" className="text-sm font-medium">Overdue Only</Label>
                <div className="flex items-center h-10">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      id="filter-overdue"
                      checked={filters.overdue_only}
                      onChange={(e) => handleFilterChange('overdue_only', e.target.checked)}
                      className="h-5 w-5 rounded border-gray-300 text-solarized-blue focus:ring-solarized-blue"
                    />
                    <Label htmlFor="filter-overdue" className="ml-2 text-sm">
                      Show overdue objectives only
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  variant="outline"
                  onClick={applyFilters}
                // className="bg-solarized-blue hover:bg-solarized-blue/90 text-white"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearFilters}
                    className="border-gray-300"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear All
                  </Button>
                )}
              </div>

              {hasActiveFilters && (
                <div className="text-sm text-gray-600">
                  Showing filtered results
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !Array.isArray(goals) || goals.length === 0 ? (
            <div className="text-center py-12">
              <Target className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No objectives found</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {hasActiveFilters
                  ? 'No objectives match your filters. Try changing your filter criteria.'
                  : 'Create performance objectives to track employee performance.'}
              </p>
              {hasActiveFilters ? (
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              ) : (
                <Button
                  className="mt-4 bg-solarized-blue hover:bg-solarized-blue/90 text-white"
                  onClick={() => setIsGoalDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Objective
                </Button>
              )}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={goals}
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
  );
}