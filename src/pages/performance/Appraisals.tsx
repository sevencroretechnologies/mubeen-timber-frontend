import { useState, useEffect } from 'react';
import { performanceService, staffService } from '../../services/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ui/status-badge';
import { showAlert, getErrorMessage } from '../../lib/sweetalert';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Skeleton } from '../../components/ui/skeleton';
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
import {
  Plus,
  Star,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  FileText,
  PlayCircle,
  Search,
  X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import DataTable, { TableColumn } from 'react-data-table-component';

// ============ TYPES ============
interface StaffMember {
  id: number;
  full_name: string;
  email?: string;
  position?: string;
}

interface AppraisalCycle {
  id: number;
  title: string;
  cycle_start: string;
  cycle_end: string;
  review_deadline?: string;
  status: 'draft' | 'active' | 'closed';
  notes?: string;
  records_count?: number;
  author?: { name: string };
}

interface AppraisalRecord {
  id: number;
  staff_member?: StaffMember;
  reviewer?: { name: string; id: number };
  cycle?: AppraisalCycle;
  appraisal_cycle_id: number;
  staff_member_id: number;
  status: 'pending' | 'self_review' | 'completed';
  overall_rating?: number;
  self_assessment?: string;
  career_goals?: string;
  manager_feedback?: string;
  strengths?: string;
  improvements?: string;
  self_submitted_at?: string;
  manager_submitted_at?: string;
  created_at: string;
  updated_at: string;
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// ============ HELPER FUNCTIONS ============
const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatDateForInput = (dateString: string): string => {
  if (!dateString) return '';
  if (dateString.includes('T')) {
    return dateString.split('T')[0];
  }
  return dateString;
};

const getInitials = (name?: string): string => {
  if (!name) return '??';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// ============ MAIN COMPONENT ============
export default function Appraisals() {
  const [activeTab, setActiveTab] = useState<'records' | 'cycles'>('records');

  // Appraisal Records State
  const [records, setRecords] = useState<AppraisalRecord[]>([]);
  const [recordsMeta, setRecordsMeta] = useState<PaginationMeta | null>(null);
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [recordsTotalRows, setRecordsTotalRows] = useState(0);
  const [recordsSearch, setRecordsSearch] = useState('');

  // Appraisal Cycles State
  const [cycles, setCycles] = useState<AppraisalCycle[]>([]);
  const [cyclesMeta, setCyclesMeta] = useState<PaginationMeta | null>(null);
  const [cyclesPage, setCyclesPage] = useState(1);
  const [cyclesPerPage, setCyclesPerPage] = useState(10);
  const [cyclesTotalRows, setCyclesTotalRows] = useState(0);
  const [cyclesSearch, setCyclesSearch] = useState('');

  // General State
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCycles, setIsLoadingCycles] = useState(true);

  // Dialog States
  const [isCycleDialogOpen, setIsCycleDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isSelfReviewDialogOpen, setIsSelfReviewDialogOpen] = useState(false);
  const [isManagerReviewDialogOpen, setIsManagerReviewDialogOpen] = useState(false);

  // Selected Items
  const [selectedCycle, setSelectedCycle] = useState<AppraisalCycle | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AppraisalRecord | null>(null);
  const [editingCycle, setEditingCycle] = useState<AppraisalCycle | null>(null);

  // Form Data
  const [cycleForm, setCycleForm] = useState({
    title: '',
    cycle_start: '',
    cycle_end: '',
    review_deadline: '',
    notes: '',
  });

  const [selfReviewForm, setSelfReviewForm] = useState({
    self_assessment: '',
    career_goals: '',
  });

  const [managerReviewForm, setManagerReviewForm] = useState({
    manager_feedback: '',
    overall_rating: 3,
    strengths: '',
    improvements: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ============ EFFECTS ============
  useEffect(() => {
    if (activeTab === 'records') {
      fetchAppraisalRecords();
    } else {
      fetchAppraisalCycles();
    }
  }, [activeTab, recordsPage, recordsPerPage, recordsSearch, cyclesPage, cyclesPerPage, cyclesSearch]);

  // ============ API FUNCTIONS ============
  const fetchAppraisalRecords = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = {
        page: recordsPage,
        per_page: recordsPerPage,
      };

      if (recordsSearch) {
        params.search = recordsSearch;
      }

      const response = await performanceService.getAppraisals(params);
      console.log('Records response:', response.data);

      if (response.data.success) {
        const data = response.data.data;
        if (data && Array.isArray(data.data)) {
          setRecords(data.data);
          setRecordsMeta({
            current_page: data.current_page,
            last_page: data.last_page,
            per_page: data.per_page,
            total: data.total,
          });
          setRecordsTotalRows(data.total);
        } else if (Array.isArray(data)) {
          setRecords(data);
          setRecordsMeta(null);
          setRecordsTotalRows(data.length);
        }
      } else {
        setRecords([]);
        setRecordsMeta(null);
        setRecordsTotalRows(0);
      }
    } catch (error) {
      console.error('Failed to fetch appraisal records:', error);
      setRecords([]);
      setRecordsMeta(null);
      setRecordsTotalRows(0);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAppraisalCycles = async () => {
    setIsLoadingCycles(true);
    try {
      const params: Record<string, unknown> = {
        page: cyclesPage,
        per_page: cyclesPerPage,
      };

      if (cyclesSearch) {
        params.search = cyclesSearch;
      }

      const response = await performanceService.getAppraisalCycles(params);
      console.log('Cycles response:', response.data);

      if (response.data.success) {
        const data = response.data.data;
        if (data && Array.isArray(data.data)) {
          setCycles(data.data);
          setCyclesMeta({
            current_page: data.current_page,
            last_page: data.last_page,
            per_page: data.per_page,
            total: data.total,
          });
          setCyclesTotalRows(data.total);
        } else if (Array.isArray(data)) {
          setCycles(data);
          setCyclesMeta(null);
          setCyclesTotalRows(data.length);
        }
      } else {
        setCycles([]);
        setCyclesMeta(null);
        setCyclesTotalRows(0);
      }
    } catch (error) {
      console.error('Failed to fetch appraisal cycles:', error);
      setCycles([]);
      setCyclesMeta(null);
      setCyclesTotalRows(0);
    } finally {
      setIsLoadingCycles(false);
    }
  };

  // ============ CYCLE FUNCTIONS ============
  const validateCycleForm = () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!cycleForm.title.trim()) {
      errors.title = 'Title is required';
      isValid = false;
    }
    if (!cycleForm.cycle_start) {
      errors.cycle_start = 'Start date is required';
      isValid = false;
    }
    if (!cycleForm.cycle_end) {
      errors.cycle_end = 'End date is required';
      isValid = false;
    } else if (cycleForm.cycle_start && new Date(cycleForm.cycle_end) < new Date(cycleForm.cycle_start)) {
      errors.cycle_end = 'End date cannot be before start date';
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (!validateCycleForm()) {
      return;
    }

    try {
      if (editingCycle) {
        // Update existing cycle
        await performanceService.updateAppraisalCycle(editingCycle.id, cycleForm);
        showAlert('success', 'Success!', 'Appraisal cycle updated successfully', 2000);
      } else {
        // Create new cycle
        await performanceService.createAppraisalCycle(cycleForm);
        showAlert('success', 'Success!', 'Appraisal cycle created successfully', 2000);
      }
      setIsCycleDialogOpen(false);
      resetCycleForm();
      fetchAppraisalCycles();
    } catch (err: any) {
      console.error('Failed to save appraisal cycle:', err);
      const message = getErrorMessage(err, 'Failed to save appraisal cycle.');

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

  const handleActivateCycle = async (cycleId: number) => {
    if (!confirm('Activating this cycle will create appraisal records for all active staff members. Continue?')) return;

    try {
      await performanceService.activateCycle(cycleId);
      showAlert('success', 'Success!', 'Cycle activated successfully', 2000);
      fetchAppraisalCycles();
    } catch (error) {
      console.error('Failed to activate cycle:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to activate cycle.'));
    }
  };

  const handleCloseCycle = async (cycleId: number) => {
    if (!confirm('Are you sure you want to close this cycle?')) return;

    try {
      await performanceService.closeCycle(cycleId);
      showAlert('success', 'Success!', 'Cycle closed successfully', 2000);
      fetchAppraisalCycles();
    } catch (error) {
      console.error('Failed to close cycle:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to close cycle.'));
    }
  };

  const handleDeleteCycle = async (cycleId: number) => {
    if (!confirm('Are you sure you want to delete this cycle?')) return;

    try {
      await performanceService.deleteCycle(cycleId);
      showAlert('success', 'Success!', 'Cycle deleted successfully', 2000);
      fetchAppraisalCycles();
    } catch (error) {
      console.error('Failed to delete cycle:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete cycle.'));
    }
  };

  // ============ REVIEW FUNCTIONS ============
  const handleSubmitSelfReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    try {
      await performanceService.submitSelfReview(selectedRecord.id, selfReviewForm);
      showAlert('success', 'Success!', 'Self review submitted successfully', 2000);
      setIsSelfReviewDialogOpen(false);
      setSelfReviewForm({ self_assessment: '', career_goals: '' });
      fetchAppraisalRecords();
    } catch (error) {
      console.error('Failed to submit self review:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to submit self review.'));
    }
  };

  const validateManagerReviewForm = () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!managerReviewForm.manager_feedback.trim()) {
      errors.manager_feedback = 'Manager feedback is required';
      isValid = false;
    }
    if (!managerReviewForm.overall_rating) {
      errors.overall_rating = 'Overall rating is required';
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmitManagerReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setFieldErrors({});

    if (!validateManagerReviewForm()) {
      return;
    }

    try {
      // Ensure overall_rating is a number
      const data = {
        ...managerReviewForm,
        overall_rating: Number(managerReviewForm.overall_rating)
      };

      await performanceService.submitManagerReview(selectedRecord.id, data);
      showAlert('success', 'Success!', 'Manager review submitted successfully', 2000);
      setIsManagerReviewDialogOpen(false);
      setManagerReviewForm({
        manager_feedback: '',
        overall_rating: 3,
        strengths: '',
        improvements: '',
      });
      fetchAppraisalRecords();
    } catch (err: any) {
      console.error('Failed to submit manager review:', err);
      const message = getErrorMessage(err, 'Failed to submit manager review.');

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

  // ============ HELPER FUNCTIONS ============
  const getCycleStatusBadge = (status: string) => {
    const variants: Record<string, { icon: React.ReactNode }> = {
      draft: { icon: <FileText className="h-3 w-3 mr-1" /> },
      active: { icon: <PlayCircle className="h-3 w-3 mr-1" /> },
      closed: { icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    };
    const variant = variants[status] || variants.draft;
    return (
      <StatusBadge status={status} className="flex items-center gap-1">
        {variant.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </StatusBadge>
    );
  };

  const getRecordStatusBadge = (status: string) => {
    const variants: Record<string, { icon: React.ReactNode }> = {
      pending: { icon: <Clock className="h-3 w-3 mr-1" /> },
      self_review: { icon: <FileText className="h-3 w-3 mr-1" /> },
      completed: { icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    };
    const variant = variants[status] || variants.pending;
    return (
      <StatusBadge status={status} className="flex items-center gap-1">
        {variant.icon}
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </StatusBadge>
    );
  };

  const renderRating = (rating?: number | string) => {
    // Convert to number if it's a string
    const numericRating = typeof rating === 'string' ? parseFloat(rating) : rating;

    if (numericRating === undefined || numericRating === null || isNaN(numericRating)) {
      return <span className="text-gray-500 text-sm">Not rated</span>;
    }

    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= Math.round(numericRating)
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300'
              }`}
          />
        ))}
        <span className="ml-1 text-sm font-medium">{numericRating.toFixed(1)}</span>
      </div>
    );
  };

  const resetCycleForm = () => {
    setCycleForm({
      title: '',
      cycle_start: '',
      cycle_end: '',
      review_deadline: '',
      notes: '',
    });
    setEditingCycle(null);
    setFieldErrors({});
  };

  const renderError = (field: string) => {
    return fieldErrors[field] ? (
      <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
    ) : null;
  };

  // ============ TABLE COLUMNS ============
  const recordsColumns: TableColumn<AppraisalRecord>[] = [
    {
      name: 'Employee',
      selector: (row) => row.staff_member?.full_name || 'Unknown',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              {getInitials(row.staff_member?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {row.staff_member?.full_name || 'Unknown'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {row.staff_member?.position || '-'}
            </p>
          </div>
        </div>
      ),
      sortable: true,
      minWidth: '200px',
    },
    {
      name: 'Appraisal Period',
      selector: (row) => row.cycle?.title || '-',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.cycle?.title || '-'}</p>
          {row.cycle && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(row.cycle.cycle_start)} - {formatDate(row.cycle.cycle_end)}
            </p>
          )}
        </div>
      ),
    },
    {
      name: 'Reviewer',
      selector: (row) => row.reviewer?.name || 'Not assigned',
      sortable: true,
    },
    {
      name: 'Rating',
      cell: (row) => renderRating(row.overall_rating),
    },
    {
      name: 'Status',
      cell: (row) => getRecordStatusBadge(row.status),
      sortable: true,
    },
    {
      name: 'Last Updated',
      cell: (row) => formatDate(row.updated_at),
      sortable: true,
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
            <DropdownMenuItem onClick={() => {
              setSelectedRecord(row);
              setIsViewDialogOpen(true);
            }}>
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>

            {row.status === 'pending' && (
              <DropdownMenuItem onClick={() => {
                setSelectedRecord(row);
                setIsSelfReviewDialogOpen(true);
                setFieldErrors({});
              }}>
                <FileText className="mr-2 h-4 w-4" />
                Submit Self Review
              </DropdownMenuItem>
            )}

            {(row.status === 'pending' || row.status === 'self_review') && (
              <DropdownMenuItem onClick={() => {
                setSelectedRecord(row);
                setIsManagerReviewDialogOpen(true);
                setFieldErrors({});
              }}>
                <Star className="mr-2 h-4 w-4" />
                Submit Manager Review
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      ignoreRowClick: true,
      width: '80px',
    },
  ];

  const cyclesColumns: TableColumn<AppraisalCycle>[] = [
    {
      name: 'Title',
      selector: (row) => row.title,
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">{row.title}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatDate(row.cycle_start)} - {formatDate(row.cycle_end)}
          </p>
        </div>
      ),
      sortable: true,
      minWidth: '250px',
    },
    {
      name: 'Review Deadline',
      selector: (row) => row.review_deadline || 'Not set',
      cell: (row) => formatDate(row.review_deadline) || 'Not set',
      sortable: true,
    },
    {
      name: 'Status',
      cell: (row) => getCycleStatusBadge(row.status),
      sortable: true,
    },
    {
      name: 'Records',
      cell: (row) => (
        <StatusBadge status="default" className="text-sm">
          {row.records_count || 0} records
        </StatusBadge>
      ),
    },
    {
      name: 'Created By',
      selector: (row) => row.author?.name || 'System',
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
            <DropdownMenuItem onClick={() => {
              setSelectedCycle(row);
              setIsViewDialogOpen(true);
            }}>
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>

            {row.status === 'draft' && (
              <>
                <DropdownMenuItem onClick={() => {
                  setEditingCycle(row);
                  setCycleForm({
                    title: row.title,
                    cycle_start: formatDateForInput(row.cycle_start),
                    cycle_end: formatDateForInput(row.cycle_end),
                    review_deadline: row.review_deadline ? formatDateForInput(row.review_deadline) : '',
                    notes: row.notes || '',
                  });
                  setIsCycleDialogOpen(true);
                }}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => handleActivateCycle(row.id)}>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Activate Cycle
                </DropdownMenuItem>
              </>
            )}

            {row.status === 'active' && (
              <DropdownMenuItem onClick={() => handleCloseCycle(row.id)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Close Cycle
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            {row.status === 'draft' && (
              <DropdownMenuItem
                onClick={() => handleDeleteCycle(row.id)}
                className="text-red-600 dark:text-red-400"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
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

  // ============ STATS CALCULATION ============
  const recordsStats = {
    total: recordsMeta?.total || records.length,
    pending: records.filter(r => r.status === 'pending').length,
    selfReview: records.filter(r => r.status === 'self_review').length,
    completed: records.filter(r => r.status === 'completed').length,
    avgRating: records.length > 0
      ? (records.reduce((sum, r) => {
        const rating = typeof r.overall_rating === 'string'
          ? parseFloat(r.overall_rating)
          : r.overall_rating || 0;
        return sum + rating;
      }, 0) / records.length).toFixed(1)
      : '0.0'
  };

  const cyclesStats = {
    total: cyclesMeta?.total || cycles.length,
    draft: cycles.filter(c => c.status === 'draft').length,
    active: cycles.filter(c => c.status === 'active').length,
    closed: cycles.filter(c => c.status === 'closed').length,
  };

  // ============ HANDLERS ============
  const handleRecordsSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRecordsPage(1);
  };

  const handleClearRecordsSearch = () => {
    setRecordsSearch('');
    setRecordsPage(1);
  };

  const handleCyclesSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCyclesPage(1);
  };

  const handleClearCyclesSearch = () => {
    setCyclesSearch('');
    setCyclesPage(1);
  };

  const handleRecordsPageChange = (newPage: number) => {
    setRecordsPage(newPage);
  };

  const handleRecordsPerRowsChange = (newPerPage: number) => {
    setRecordsPerPage(newPerPage);
    setRecordsPage(1);
  };

  const handleCyclesPageChange = (newPage: number) => {
    setCyclesPage(newPage);
  };

  const handleCyclesPerRowsChange = (newPerPage: number) => {
    setCyclesPerPage(newPerPage);
    setCyclesPage(1);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Performance Appraisals
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage appraisal cycles and performance reviews
          </p>
        </div>

        {activeTab === 'cycles' && (
          <Dialog open={isCycleDialogOpen} onOpenChange={setIsCycleDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-solarized-blue hover:bg-solarized-blue/90 text-white"
                onClick={() => {
                  setEditingCycle(null);
                  resetCycleForm();
                  setFieldErrors({});
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Cycle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingCycle ? 'Edit Cycle' : 'Create Appraisal Cycle'}</DialogTitle>
                <DialogDescription>
                  {editingCycle ? 'Update the appraisal cycle details.' : 'Create a new appraisal cycle.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateCycle}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className={fieldErrors.title ? 'text-red-500' : ''}>Cycle Title *</Label>
                    <Input
                      id="title"
                      value={cycleForm.title}
                      onChange={(e) => {
                        setCycleForm({ ...cycleForm, title: e.target.value });
                        if (fieldErrors.title) setFieldErrors(prev => ({ ...prev, title: '' }));
                      }}
                      placeholder="e.g., Q1 2024 Performance Review"
                      className={fieldErrors.title ? 'border-red-500' : ''}
                    />
                    {renderError('title')}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cycle_start" className={fieldErrors.cycle_start ? 'text-red-500' : ''}>Start Date *</Label>
                      <Input
                        id="cycle_start"
                        type="date"
                        value={cycleForm.cycle_start}
                        onChange={(e) => {
                          setCycleForm({ ...cycleForm, cycle_start: e.target.value });
                          if (fieldErrors.cycle_start) setFieldErrors(prev => ({ ...prev, cycle_start: '' }));
                        }}
                        className={fieldErrors.cycle_start ? 'border-red-500' : ''}
                      />
                      {renderError('cycle_start')}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cycle_end" className={fieldErrors.cycle_end ? 'text-red-500' : ''}>End Date *</Label>
                      <Input
                        id="cycle_end"
                        type="date"
                        value={cycleForm.cycle_end}
                        onChange={(e) => {
                          setCycleForm({ ...cycleForm, cycle_end: e.target.value });
                          if (fieldErrors.cycle_end) setFieldErrors(prev => ({ ...prev, cycle_end: '' }));
                        }}
                        className={fieldErrors.cycle_end ? 'border-red-500' : ''}
                      />
                      {renderError('cycle_end')}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="review_deadline">Review Deadline</Label>
                    <Input
                      id="review_deadline"
                      type="date"
                      value={cycleForm.review_deadline}
                      onChange={(e) => setCycleForm({ ...cycleForm, review_deadline: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={cycleForm.notes}
                      onChange={(e) => setCycleForm({ ...cycleForm, notes: e.target.value })}
                      placeholder="Additional notes or instructions..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCycleDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90 text-white">
                    {editingCycle ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* TABS */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="records" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Appraisal Records
          </TabsTrigger>
          <TabsTrigger value="cycles" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Appraisal Cycles
          </TabsTrigger>
        </TabsList>

        {/* ============ RECORDS TAB ============ */}
        <TabsContent value="records" className="space-y-6">
          {/* STATS */}
          <div className="grid gap-6 sm:grid-cols-4">
            <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Appraisals</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{recordsStats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{recordsStats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{recordsStats.completed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                    <Star className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Avg Rating</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{recordsStats.avgRating}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* TABLE */}
          <Card>
            <CardHeader className="pb-4">
              <form onSubmit={handleRecordsSearchSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search records by employee name or cycle..."
                    value={recordsSearch}
                    onChange={(e) => setRecordsSearch(e.target.value)}
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <Button type="submit" variant="outline">
                  <Search className="mr-2 h-4 w-4" /> Search
                </Button>
                {recordsSearch && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClearRecordsSearch}
                    className="whitespace-nowrap"
                  >
                    Clear
                  </Button>
                )}
              </form>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No appraisal records found</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {recordsSearch
                      ? 'No records match your search. Try a different search term.'
                      : 'Create an appraisal cycle and activate it to generate records.'}
                  </p>
                </div>
              ) : (
                <DataTable
                  columns={recordsColumns}
                  data={records}
                  progressPending={isLoading}
                  pagination
                  paginationServer
                  paginationTotalRows={recordsTotalRows}
                  paginationPerPage={recordsPerPage}
                  paginationDefaultPage={recordsPage}
                  onChangePage={handleRecordsPageChange}
                  onChangeRowsPerPage={handleRecordsPerRowsChange}
                  customStyles={customStyles}
                  highlightOnHover
                  responsive
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ CYCLES TAB ============ */}
        <TabsContent value="cycles" className="space-y-6">
          {/* STATS */}
          <div className="grid gap-6 sm:grid-cols-4">
            <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Cycles</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{cyclesStats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Draft</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{cyclesStats.draft}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <PlayCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{cyclesStats.active}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Closed</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{cyclesStats.closed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CYCLES TABLE */}
          <Card>
            <CardHeader className="pb-4">
              <form onSubmit={handleCyclesSearchSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search cycles by title..."
                    value={cyclesSearch}
                    onChange={(e) => setCyclesSearch(e.target.value)}
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <Button type="submit" variant="outline">
                  <Search className="mr-2 h-4 w-4" /> Search
                </Button>
                {cyclesSearch && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClearCyclesSearch}
                    className="whitespace-nowrap"
                  >
                    Clear
                  </Button>
                )}
              </form>
            </CardHeader>

            <CardContent>
              {isLoadingCycles ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : cycles.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No appraisal cycles found</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {cyclesSearch
                      ? 'No cycles match your search. Try a different search term.'
                      : 'Create an appraisal cycle to start the performance review process.'}
                  </p>
                  <Button
                    className="mt-4 bg-solarized-blue hover:bg-solarized-blue/90 text-white"
                    onClick={() => setIsCycleDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Cycle
                  </Button>
                </div>
              ) : (
                <DataTable
                  columns={cyclesColumns}
                  data={cycles}
                  progressPending={isLoadingCycles}
                  pagination
                  paginationServer
                  paginationTotalRows={cyclesTotalRows}
                  paginationPerPage={cyclesPerPage}
                  paginationDefaultPage={cyclesPage}
                  onChangePage={handleCyclesPageChange}
                  onChangeRowsPerPage={handleCyclesPerRowsChange}
                  customStyles={customStyles}
                  highlightOnHover
                  responsive
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============ DIALOGS ============ */}

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedRecord ? 'Appraisal Record Details' : 'Appraisal Cycle Details'}
            </DialogTitle>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600 dark:text-gray-400">Employee</Label>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {selectedRecord.staff_member?.full_name}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600 dark:text-gray-400">Appraisal Cycle</Label>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {selectedRecord.cycle?.title}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600 dark:text-gray-400">Status</Label>
                  <div className="mt-1">
                    {getRecordStatusBadge(selectedRecord.status)}
                  </div>
                </div>
                <div>
                  <Label className="text-gray-600 dark:text-gray-400">Overall Rating</Label>
                  <div className="mt-1">
                    {renderRating(selectedRecord.overall_rating)}
                  </div>
                </div>
              </div>

              {selectedRecord.self_assessment && (
                <div>
                  <Label className="text-gray-600 dark:text-gray-400">Self Assessment</Label>
                  <p className="font-medium text-gray-900 dark:text-gray-100 mt-1 whitespace-pre-wrap">
                    {selectedRecord.self_assessment}
                  </p>
                </div>
              )}

              {selectedRecord.career_goals && (
                <div>
                  <Label className="text-gray-600 dark:text-gray-400">Career Goals</Label>
                  <p className="font-medium text-gray-900 dark:text-gray-100 mt-1 whitespace-pre-wrap">
                    {selectedRecord.career_goals}
                  </p>
                </div>
              )}

              {selectedRecord.manager_feedback && (
                <div>
                  <Label className="text-gray-600 dark:text-gray-400">Manager Feedback</Label>
                  <p className="font-medium text-gray-900 dark:text-gray-100 mt-1 whitespace-pre-wrap">
                    {selectedRecord.manager_feedback}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600 dark:text-gray-400">Self Submitted</Label>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {selectedRecord.self_submitted_at ? formatDate(selectedRecord.self_submitted_at) : 'Not submitted'}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600 dark:text-gray-400">Manager Submitted</Label>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {selectedRecord.manager_submitted_at ? formatDate(selectedRecord.manager_submitted_at) : 'Not submitted'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedCycle && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600 dark:text-gray-400">Title</Label>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{selectedCycle.title}</p>
                </div>
                <div>
                  <Label className="text-gray-600 dark:text-gray-400">Status</Label>
                  <div className="mt-1">
                    {getCycleStatusBadge(selectedCycle.status)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-600 dark:text-gray-400">Start Date</Label>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {formatDate(selectedCycle.cycle_start)}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600 dark:text-gray-400">End Date</Label>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {formatDate(selectedCycle.cycle_end)}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600 dark:text-gray-400">Review Deadline</Label>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {selectedCycle.review_deadline ? formatDate(selectedCycle.review_deadline) : 'Not set'}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-gray-600 dark:text-gray-400">Notes</Label>
                <p className="font-medium text-gray-900 dark:text-gray-100 mt-1 whitespace-pre-wrap">
                  {selectedCycle.notes || 'No notes'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600 dark:text-gray-400">Appraisal Records</Label>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {selectedCycle.records_count || 0} records
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600 dark:text-gray-400">Created by</Label>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {selectedCycle.author?.name || 'System'}
                  </p>
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

      {/* Self Review Dialog */}
      <Dialog open={isSelfReviewDialogOpen} onOpenChange={setIsSelfReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Self Review</DialogTitle>
            <DialogDescription>
              Complete your self-assessment for this appraisal period.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitSelfReview}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="self_assessment">Self Assessment *</Label>
                <Textarea
                  id="self_assessment"
                  value={selfReviewForm.self_assessment}
                  onChange={(e) => setSelfReviewForm({ ...selfReviewForm, self_assessment: e.target.value })}
                  placeholder="Describe your achievements, challenges, and learnings..."
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="career_goals">Career Goals</Label>
                <Textarea
                  id="career_goals"
                  value={selfReviewForm.career_goals}
                  onChange={(e) => setSelfReviewForm({ ...selfReviewForm, career_goals: e.target.value })}
                  placeholder="What are your career goals for the next period?"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsSelfReviewDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90 text-white">
                Submit Self Review
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manager Review Dialog */}
      <Dialog open={isManagerReviewDialogOpen} onOpenChange={setIsManagerReviewDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Submit Manager Review</DialogTitle>
            <DialogDescription>
              Provide feedback and rating for this employee.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitManagerReview}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="manager_feedback" className={fieldErrors.manager_feedback ? 'text-red-500' : ''}>Manager Feedback *</Label>
                <Textarea
                  id="manager_feedback"
                  value={managerReviewForm.manager_feedback}
                  onChange={(e) => {
                    setManagerReviewForm({ ...managerReviewForm, manager_feedback: e.target.value });
                    if (fieldErrors.manager_feedback) setFieldErrors(prev => ({ ...prev, manager_feedback: '' }));
                  }}
                  placeholder="Provide constructive feedback..."
                  rows={4}
                  className={fieldErrors.manager_feedback ? 'border-red-500' : ''}
                />
                {renderError('manager_feedback')}
              </div>

              <div className="space-y-2">
                <Label htmlFor="overall_rating" className={fieldErrors.overall_rating ? 'text-red-500' : ''}>Overall Rating *</Label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Button
                      key={rating}
                      type="button"
                      variant={managerReviewForm.overall_rating === rating ? "default" : "outline"}
                      className="h-10 w-10 p-0"
                      onClick={() => setManagerReviewForm({ ...managerReviewForm, overall_rating: rating })}
                    >
                      <Star className={`h-5 w-5 ${managerReviewForm.overall_rating >= rating ? 'fill-current' : ''}`} />
                    </Button>
                  ))}
                  <span className="ml-2 text-sm font-medium">
                    {managerReviewForm.overall_rating}.0
                  </span>
                </div>
                {renderError('overall_rating')}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="strengths">Strengths</Label>
                  <Textarea
                    id="strengths"
                    value={managerReviewForm.strengths}
                    onChange={(e) => setManagerReviewForm({ ...managerReviewForm, strengths: e.target.value })}
                    placeholder="Key strengths..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="improvements">Areas for Improvement</Label>
                  <Textarea
                    id="improvements"
                    value={managerReviewForm.improvements}
                    onChange={(e) => setManagerReviewForm({ ...managerReviewForm, improvements: e.target.value })}
                    placeholder="Areas for improvement..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsManagerReviewDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
                Submit Manager Review
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}