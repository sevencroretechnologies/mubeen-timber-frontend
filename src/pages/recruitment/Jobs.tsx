// Jobs.tsx
import { useState, useEffect, useCallback } from 'react';
import { recruitmentService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { StatusBadge } from '../../components/ui/status-badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import DataTable, { TableColumn } from 'react-data-table-component';
import {
  Plus, Briefcase, MapPin, Users,
  MoreHorizontal, Eye, Edit, Trash2,
  Calendar, DollarSign, Award, Target, Search,
} from 'lucide-react';

// ==================== LOCAL TYPE DEFINITIONS ====================
interface Job {
  id: number;
  title: string;
  job_category_id?: number;
  office_location_id?: number;
  division_id?: number;
  positions?: number;
  description?: string;
  requirements?: string;
  skills?: string;
  experience_required?: string;
  salary_from?: number;
  salary_to?: number;
  status: string;
  start_date?: string;
  end_date?: string;
  category?: {
    id: number;
    title: string;
    description?: string;
  };
  office_location?: {
    id: number;
    title: string;
    address?: string;
  };
  division?: {
    id: number;
    title: string;
  };
  applications_count: number;
  created_at: string;
}

interface DropdownOption {
  id: number;
  name: string;
  originalData?: unknown;
}

interface FormData {
  title: string;
  job_category_id: string | null;
  office_location_id: string | null;
  division_id: string | null;
  positions: string;
  description: string;
  requirements: string;
  skills: string;
  experience_required: string;
  salary_from: string;
  salary_to: string;
  status: string;
  start_date: string;
  end_date: string;
}
// ==================== END LOCAL TYPE DEFINITIONS ====================

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Pagination & Sorting State
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [viewingJob, setViewingJob] = useState<Job | null>(null);

  const [dropdowns, setDropdowns] = useState({
    categories: [] as DropdownOption[],
    locations: [] as DropdownOption[],
    divisions: [] as DropdownOption[],
  });

  const [formData, setFormData] = useState<FormData>({
    title: '',
    job_category_id: null,
    office_location_id: null,
    division_id: null,
    positions: '',
    description: '',
    requirements: '',
    skills: '',
    experience_required: '',
    salary_from: '',
    salary_to: '',
    status: 'draft',
    start_date: '',
    end_date: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ================= FETCH JOBS =================
  const fetchJobs = useCallback(
    async (currentPage: number = 1) => {
      setIsLoading(true);
      try {
        const params: Record<string, unknown> = {
          page: currentPage,
          per_page: perPage,
          search: searchQuery,
        };

        if (statusFilter && statusFilter !== 'all') {
          params.status = statusFilter;
        }

        if (sortField) {
          params.order_by = sortField;
          params.order = sortDirection;
        }

        const response = await recruitmentService.getJobs(params);
        const { data, meta } = response.data;

        if (Array.isArray(data)) {
          setJobs(data);
          setTotalRows(meta?.total ?? 0);
        } else {
          setJobs([]);
          setTotalRows(0);
        }
      } catch (error) {
        console.error('Failed to fetch jobs:', error);
        showAlert('error', 'Error', getErrorMessage(error, 'Failed to fetch jobs'));
        setJobs([]);
        setTotalRows(0);
      } finally {
        setIsLoading(false);
      }
    },
    [perPage, searchQuery, statusFilter, sortField, sortDirection]
  );

  useEffect(() => {
    fetchJobs(page);
    fetchDropdownData();
  }, [page, fetchJobs]);

  // ================= FETCH DROPDOWN DATA =================
  const fetchDropdownData = async () => {
    try {
      const [categoriesRes, locationsRes, divisionsRes] = await Promise.all([
        recruitmentService.getJobCategories(),
        recruitmentService.getOfficeLocations(),
        recruitmentService.getDivisions(),
      ]);

      const processDropdownData = (response: unknown, isNested: boolean = false): DropdownOption[] => {
        try {
          let dataArray: unknown[] = [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const res = response as any;

          if (isNested && res?.data?.data?.data && Array.isArray(res.data.data.data)) {
            dataArray = res.data.data.data;
          } else if (res?.data?.data && Array.isArray(res.data.data)) {
            dataArray = res.data.data;
          } else if (Array.isArray(res?.data)) {
            dataArray = res.data;
          }

          return dataArray.map((item: unknown) => {
            const i = item as { id: number; title?: string; name?: string; label?: string };
            return {
              id: i.id,
              name: i.title || i.name || i.label || `Item ${i.id}`,
              originalData: item,
            };
          });
        } catch {
          return [];
        }
      };

      setDropdowns({
        categories: processDropdownData(categoriesRes, true),
        locations: processDropdownData(locationsRes, false),
        divisions: processDropdownData(divisionsRes, false),
      });
    } catch (error) {
      console.error('Failed to fetch dropdown data:', error);
    }
  };

  // ================= SEARCH =================
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };

  // ================= PAGINATION =================
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePerRowsChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  // ================= SORTING =================
  const handleSort = (column: TableColumn<Job>, direction: 'asc' | 'desc') => {
    const columnId = String(column.id || '');
    if (columnId === 'title' || column.name === 'Job Title') {
      setSortField('title');
      setSortDirection(direction);
      setPage(1);
    }
  };

  // ================= CRUD OPERATIONS =================
  const resetForm = () => {
    setFormData({
      title: '',
      job_category_id: null,
      office_location_id: null,
      division_id: null,
      positions: '',
      description: '',
      requirements: '',
      skills: '',
      experience_required: '',
      salary_from: '',
      salary_to: '',
      status: 'draft',
      start_date: '',
      end_date: '',
    });
    setFieldErrors({});
  };

  const handleAddClick = () => {
    setEditingJob(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleViewClick = async (job: Job) => {
    try {
      const response = await recruitmentService.getJobById(job.id);
      if (response.data.success) {
        setViewingJob(response.data.data);
        setIsViewOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch job details:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to fetch job details'));
    }
  };

  const handleEditClick = (job: Job) => {
    setEditingJob(job);
    setFieldErrors({});
    setFormData({
      title: job.title || '',
      job_category_id: job.job_category_id?.toString() || null,
      office_location_id: job.office_location_id?.toString() || null,
      division_id: job.division_id?.toString() || null,
      positions: job.positions?.toString() || '',
      description: job.description || '',
      requirements: job.requirements || '',
      skills: job.skills || '',
      experience_required: job.experience_required || '',
      salary_from: job.salary_from?.toString() || '',
      salary_to: job.salary_to?.toString() || '',
      status: job.status || 'draft',
      start_date: job.start_date || '',
      end_date: job.end_date || '',
    });
    setIsDialogOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!formData.title.trim()) {
      errors.title = 'Job Title is required';
      isValid = false;
    } else if (formData.title.length > 255) {
      errors.title = 'Job Title must be less than 255 characters';
      isValid = false;
    }

    if (formData.positions && (isNaN(Number(formData.positions)) || Number(formData.positions) < 1)) {
      errors.positions = 'Positions must be at least 1';
      isValid = false;
    }

    if (formData.experience_required && formData.experience_required.length > 100) {
      errors.experience_required = 'Experience required must be less than 100 characters';
      isValid = false;
    }

    if (formData.salary_from && Number(formData.salary_from) < 0) {
      errors.salary_from = 'Salary From must be at least 0';
      isValid = false;
    }

    if (formData.salary_to && Number(formData.salary_to) < 0) {
      errors.salary_to = 'Salary To must be at least 0';
      isValid = false;
    }

    if (formData.start_date && formData.end_date) {
      if (new Date(formData.end_date) < new Date(formData.start_date)) {
        errors.end_date = 'End Date must be after or equal to Start Date';
        isValid = false;
      }
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    try {
      const apiData: Record<string, unknown> = {
        title: formData.title,
        status: formData.status,
      };

      if (formData.description) apiData.description = formData.description;
      if (formData.requirements) apiData.requirements = formData.requirements;
      if (formData.skills) apiData.skills = formData.skills;
      if (formData.experience_required) apiData.experience_required = formData.experience_required;
      if (formData.positions) apiData.positions = parseInt(formData.positions);
      if (formData.salary_from) apiData.salary_from = parseFloat(formData.salary_from);
      if (formData.salary_to) apiData.salary_to = parseFloat(formData.salary_to);

      apiData.job_category_id = formData.job_category_id ? parseInt(formData.job_category_id) : null;
      apiData.office_location_id = formData.office_location_id ? parseInt(formData.office_location_id) : null;
      apiData.division_id = formData.division_id ? parseInt(formData.division_id) : null;

      apiData.start_date = formData.start_date || null;
      apiData.end_date = formData.end_date || null;

      if (editingJob) {
        await recruitmentService.updateJob(editingJob.id, apiData);
        showAlert('success', 'Success', 'Job updated successfully', 2000);
      } else {
        await recruitmentService.createJob(apiData);
        showAlert('success', 'Success', 'Job created successfully', 2000);
      }

      setIsDialogOpen(false);
      setEditingJob(null);
      resetForm();
      fetchJobs(page);
    } catch (err: any) {
      console.error('Failed to save job:', err);

      const message = getErrorMessage(err, 'Failed to save job');

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

  const handleDelete = async (id: number) => {
    const result = await showConfirmDialog(
      'Delete Job',
      'Are you sure you want to delete this job posting?'
    );

    if (!result.isConfirmed) return;

    try {
      await recruitmentService.deleteJob(id);
      showAlert('success', 'Deleted!', 'Job deleted successfully', 2000);
      fetchJobs(page);
    } catch (error) {
      console.error('Failed to delete job:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete job'));
    }
  };

  const handlePublish = async (id: number) => {
    try {
      await recruitmentService.publishJob(id);
      showAlert('success', 'Success', 'Job published successfully', 2000);
      fetchJobs(page);
    } catch (error) {
      console.error('Failed to publish job:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to publish job'));
    }
  };

  const handleClose = async (id: number) => {
    try {
      await recruitmentService.closeJob(id);
      showAlert('success', 'Success', 'Job closed successfully', 2000);
      fetchJobs(page);
    } catch (error) {
      console.error('Failed to close job:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to close job'));
    }
  };

  const renderError = (field: string) => {
    return fieldErrors[field] ? (
      <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
    ) : null;
  };

  // ================= HELPERS =================


  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Stats
  const openJobsCount = jobs.filter(job => job.status === 'open').length;
  const totalPositions = jobs.reduce((sum, job) => sum + (job.positions || 0), 0);
  const totalApplications = jobs.reduce((sum, job) => sum + (job.applications_count || 0), 0);

  // ================= TABLE COLUMNS =================
  const columns: TableColumn<Job>[] = [
    {
      id: 'title',
      name: 'Job Title',
      cell: (row) => (
        <div>
          <div className="font-semibold text-solarized-base02">{row.title}</div>
          {/* {row.experience_required && (
            <span className="text-sm text-solarized-base01">{row.experience_required}</span>
          )} */}
        </div>
      ),
      sortable: true,
    },
    {
      id: 'Experience',
      name: 'Experience',
      cell: (row) => (
        <div>
          {row.experience_required && (
            <span className="text-sm text-solarized-base01">{row.experience_required}</span>
          )}
        </div>
      ),
      sortable: true,
    },

    {
      name: 'Category',
      cell: (row) => (
        <Badge variant="outline" className="bg-solarized-base2">
          {row.category?.title || '-'}
        </Badge>
      ),
    },
    {
      name: 'Location',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <MapPin className="h-4 w-4 text-solarized-base01" />
          <span>{row.office_location?.title || '-'}</span>
        </div>
      ),
    },
    {
      name: 'Positions',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-solarized-blue" />
          <span>{row.positions || 0}</span>
        </div>
      ),
      width: '100px',
    },
    {
      name: 'Salary',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <DollarSign className="h-4 w-4 text-solarized-green" />
          <span className="text-sm">
            {row.salary_from || row.salary_to
              ? `${formatCurrency(row.salary_from)} - ${formatCurrency(row.salary_to)}`
              : '-'}
          </span>
        </div>
      ),
    },
    {
      name: 'Applications',
      cell: (row) => (
        <span className="font-medium">{row.applications_count || 0}</span>
      ),
      width: '130px',
    },
    {
      name: 'Status',
      cell: (row) => (
        <StatusBadge status={row.status} />
      ),
      width: '100px',
    },
    {
      name: 'Posted',
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm">
          <Calendar className="h-4 w-4 text-solarized-base01" />
          <span>{formatDate(row.created_at)}</span>
        </div>
      ),
      minWidth: '130px',
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
            <DropdownMenuItem onClick={() => handleViewClick(row)}>
              <Eye className="mr-2 h-4 w-4" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEditClick(row)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            {row.status === 'draft' && (
              <DropdownMenuItem onClick={() => handlePublish(row.id)} className="text-solarized-green">
                <Target className="mr-2 h-4 w-4" /> Publish
              </DropdownMenuItem>
            )}
            {row.status === 'open' && (
              <DropdownMenuItem onClick={() => handleClose(row.id)} className="text-solarized-yellow">
                <Briefcase className="mr-2 h-4 w-4" /> Close Job
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => handleDelete(row.id)} className="text-solarized-red">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
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
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">Job Postings</h1>
          <p className="text-solarized-base01">Manage job openings and recruitment</p>
        </div>
        <Button className="bg-solarized-blue hover:bg-solarized-blue/90" onClick={handleAddClick}>
          <Plus className="mr-2 h-4 w-4" />
          Post New Job
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-solarized-blue/10 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-solarized-blue" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Total Jobs</p>
                <p className="text-2xl font-bold text-solarized-base02">{totalRows || jobs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-solarized-green/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-solarized-green" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Open Positions</p>
                <p className="text-2xl font-bold text-solarized-base02">{totalPositions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-solarized-violet/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-solarized-violet" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Total Applications</p>
                <p className="text-2xl font-bold text-solarized-base02">{totalApplications}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-solarized-yellow/10 flex items-center justify-center">
                <Award className="h-6 w-6 text-solarized-yellow" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Active Recruiting</p>
                <p className="text-2xl font-bold text-solarized-base02">{openJobsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABLE */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Job Listings</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1">
              <Input
                placeholder="Search by title..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <Button type="submit" variant="outline">
                <Search className="mr-2 h-4 w-4" /> Search
              </Button>
            </form>
            <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!isLoading && jobs.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="mx-auto h-12 w-12 text-solarized-base01 mb-4" />
              <h3 className="text-lg font-medium text-solarized-base02">No job postings found</h3>
              <p className="text-solarized-base01 mt-1">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Create your first job posting to start recruiting.'}
              </p>
              <Button className="mt-4 bg-solarized-blue hover:bg-solarized-blue/90" onClick={handleAddClick}>
                <Plus className="mr-2 h-4 w-4" />
                Post New Job
              </Button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={jobs}
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
              defaultSortFieldId="title"
              defaultSortAsc={true}
              highlightOnHover
              responsive
            />
          )}
        </CardContent>
      </Card>

      {/* VIEW DIALOG */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Job Details</DialogTitle>
            <DialogDescription>View the full details of this job posting</DialogDescription>
          </DialogHeader>

          {viewingJob && (
            <div className="space-y-6 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-solarized-base02">{viewingJob.title}</h2>
                  <div className="flex items-center gap-4 mt-2">
                    <StatusBadge status={viewingJob.status} />
                    <span className="text-solarized-base01 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Posted {formatDate(viewingJob.created_at)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-solarized-blue">
                    {formatCurrency(viewingJob.salary_from)} - {formatCurrency(viewingJob.salary_to)}
                  </div>
                  <span className="text-sm text-solarized-base01">per year</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label className="text-solarized-base01">Category</Label>
                  <p className="font-medium">{viewingJob.category?.title || '-'}</p>
                </div>
                <div>
                  <Label className="text-solarized-base01">Location</Label>
                  <p className="font-medium flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {viewingJob.office_location?.title || '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-solarized-base01">Department</Label>
                  <p className="font-medium">{viewingJob.division?.title || '-'}</p>
                </div>
                <div>
                  <Label className="text-solarized-base01">Positions</Label>
                  <p className="font-medium flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {viewingJob.positions || 0}
                  </p>
                </div>
                <div>
                  <Label className="text-solarized-base01">Experience</Label>
                  <p className="font-medium">{viewingJob.experience_required || '-'}</p>
                </div>
                <div>
                  <Label className="text-solarized-base01">Applications</Label>
                  <p className="font-medium">{viewingJob.applications_count || 0}</p>
                </div>
              </div>

              {viewingJob.description && (
                <div>
                  <Label className="text-solarized-base01">Description</Label>
                  <p className="mt-1 whitespace-pre-wrap">{viewingJob.description}</p>
                </div>
              )}

              {viewingJob.requirements && (
                <div>
                  <Label className="text-solarized-base01">Requirements</Label>
                  <p className="mt-1 whitespace-pre-wrap">{viewingJob.requirements}</p>
                </div>
              )}

              {viewingJob.skills && (
                <div>
                  <Label className="text-solarized-base01">Required Skills</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {viewingJob.skills.split(',').map((skill, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-solarized-blue/10 text-solarized-blue">
                        {skill.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
            {/* {viewingJob && (
              <Button
                className="bg-solarized-blue hover:bg-solarized-blue/90"
                onClick={() => {
                  handleEditClick(viewingJob);
                  setIsViewOpen(false);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )} */}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD/EDIT DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingJob ? 'Edit Job Posting' : 'Post New Job'}</DialogTitle>
            <DialogDescription>
              {editingJob ? 'Update the job posting details.' : 'Create a new job posting.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-solarized-base02">Basic Information</h3>

              <div className="space-y-2">
                <Label htmlFor="title" className={fieldErrors.title ? 'text-red-500' : ''}>Job Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (fieldErrors.title) setFieldErrors(prev => ({ ...prev, title: '' }));
                  }}
                  placeholder="e.g., Software Engineer"
                  className={fieldErrors.title ? 'border-red-500' : ''}
                />
                {renderError('title')}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className={fieldErrors.job_category_id ? 'text-red-500' : ''}>Category</Label>
                  <Select
                    value={formData.job_category_id || undefined}
                    onValueChange={(value) => {
                      setFormData({ ...formData, job_category_id: value });
                      if (fieldErrors.job_category_id) setFieldErrors(prev => ({ ...prev, job_category_id: '' }));
                    }}
                  >
                    <SelectTrigger className={fieldErrors.job_category_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {dropdowns.categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {renderError('job_category_id')}
                </div>

                <div className="space-y-2">
                  <Label className={fieldErrors.office_location_id ? 'text-red-500' : ''}>Location</Label>
                  <Select
                    value={formData.office_location_id || undefined}
                    onValueChange={(value) => {
                      setFormData({ ...formData, office_location_id: value });
                      if (fieldErrors.office_location_id) setFieldErrors(prev => ({ ...prev, office_location_id: '' }));
                    }}
                  >
                    <SelectTrigger className={fieldErrors.office_location_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {dropdowns.locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id.toString()}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {renderError('office_location_id')}
                </div>

                <div className="space-y-2">
                  <Label className={fieldErrors.division_id ? 'text-red-500' : ''}>Department</Label>
                  <Select
                    value={formData.division_id || undefined}
                    onValueChange={(value) => {
                      setFormData({ ...formData, division_id: value });
                      if (fieldErrors.division_id) setFieldErrors(prev => ({ ...prev, division_id: '' }));
                    }}
                  >
                    <SelectTrigger className={fieldErrors.division_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select division" />
                    </SelectTrigger>
                    <SelectContent>
                      {dropdowns.divisions.map((div) => (
                        <SelectItem key={div.id} value={div.id.toString()}>
                          {div.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {renderError('division_id')}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-solarized-base02">Job Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="positions" className={fieldErrors.positions ? 'text-red-500' : ''}>Number of Positions</Label>
                  <Input
                    id="positions"
                    type="number"
                    min="1"
                    value={formData.positions}
                    onChange={(e) => {
                      setFormData({ ...formData, positions: e.target.value });
                      if (fieldErrors.positions) setFieldErrors(prev => ({ ...prev, positions: '' }));
                    }}
                    placeholder="e.g., 2"
                    className={fieldErrors.positions ? 'border-red-500' : ''}
                  />
                  {renderError('positions')}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience_required" className={fieldErrors.experience_required ? 'text-red-500' : ''}>Experience Required</Label>
                  <Input
                    id="experience_required"
                    value={formData.experience_required}
                    onChange={(e) => {
                      setFormData({ ...formData, experience_required: e.target.value });
                      if (fieldErrors.experience_required) setFieldErrors(prev => ({ ...prev, experience_required: '' }));
                    }}
                    placeholder="e.g., 3-5 years"
                    className={fieldErrors.experience_required ? 'border-red-500' : ''}
                  />
                  {renderError('experience_required')}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salary_from" className={fieldErrors.salary_from ? 'text-red-500' : ''}>Salary From</Label>
                  <Input
                    id="salary_from"
                    type="number"
                    min="0"
                    value={formData.salary_from}
                    onChange={(e) => {
                      setFormData({ ...formData, salary_from: e.target.value });
                      if (fieldErrors.salary_from) setFieldErrors(prev => ({ ...prev, salary_from: '' }));
                    }}
                    placeholder="e.g., 50000"
                    className={fieldErrors.salary_from ? 'border-red-500' : ''}
                  />
                  {renderError('salary_from')}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salary_to" className={fieldErrors.salary_to ? 'text-red-500' : ''}>Salary To</Label>
                  <Input
                    id="salary_to"
                    type="number"
                    min="0"
                    value={formData.salary_to}
                    onChange={(e) => {
                      setFormData({ ...formData, salary_to: e.target.value });
                      if (fieldErrors.salary_to) setFieldErrors(prev => ({ ...prev, salary_to: '' }));
                    }}
                    placeholder="e.g., 80000"
                    className={fieldErrors.salary_to ? 'border-red-500' : ''}
                  />
                  {renderError('salary_to')}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date" className={fieldErrors.start_date ? 'text-red-500' : ''}>Start Date</Label>
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
                  <Label htmlFor="end_date" className={fieldErrors.end_date ? 'text-red-500' : ''}>End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => {
                      setFormData({ ...formData, end_date: e.target.value });
                      if (fieldErrors.end_date) setFieldErrors(prev => ({ ...prev, end_date: '' }));
                    }}
                    className={fieldErrors.end_date ? 'border-red-500' : ''}
                  />
                  {renderError('end_date')}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-solarized-base02">Job Description</h3>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed job description..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea
                  id="requirements"
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  placeholder="Job requirements..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Required Skills</Label>
                <Textarea
                  id="skills"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  placeholder="e.g., JavaScript, React, Node.js"
                  rows={2}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90">
                {editingJob ? 'Update Job' : 'Create Job'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
