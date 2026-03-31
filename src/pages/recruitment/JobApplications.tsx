import { useState, useEffect, useCallback } from 'react';
import { recruitmentService } from '../../services/api';
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
} from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { StatusBadge } from '../../components/ui/status-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Textarea } from '../../components/ui/textarea';
import DataTable, { TableColumn } from 'react-data-table-component';
import {
  Plus,
  Eye,
  Edit,
  MoreHorizontal,
  User,
  Briefcase,
  Calendar,
  Star,
  FileText,
  CheckCircle,
  XCircle,
  Award,
  Search,
} from 'lucide-react';

interface JobApplication {
  id: number;
  job_posting_id: number;
  candidate_id: number;
  job_stage_id: number | null;
  applied_date: string;
  rating: number | null;
  notes: string | null;
  custom_answers: string[] | null;
  status: 'pending' | 'shortlisted' | 'rejected' | 'hired';
  created_at: string;
  updated_at: string;
  job?: {
    id: number;
    title: string;
    category?: { title: string };
  };
  candidate?: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
  stage?: {
    id: number;
    title: string;
    color: string;
  } | null;
}

interface Job {
  id: number;
  title: string;
  status: 'draft' | 'open' | 'closed';
  applications_count: number;
}

interface Candidate {
  id: number;
  name: string;
  email: string;
  phone: string;
}

interface JobStage {
  id: number;
  title: string;
  color: string;
}

export default function JobApplications() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stages, setStages] = useState<JobStage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Pagination & Sorting State
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter State
  const [selectedJob, setSelectedJob] = useState<string>('all');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [actionType, setActionType] = useState<'move' | 'rate' | 'note' | ''>('');

  const [formData, setFormData] = useState({
    job_id: '',
    candidate_id: '',
    custom_answers: '',
    job_stage_id: '',
    rating: '3',
    note: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ================= FETCH DATA =================
  const fetchApplications = useCallback(
    async (currentPage: number = 1) => {
      setIsLoading(true);
      try {
        const params: Record<string, unknown> = {
          page: currentPage,
          per_page: perPage,
          paginate: true,
        };

        if (selectedJob && selectedJob !== 'all') params.job_posting_id = Number(selectedJob);
        if (selectedStage && selectedStage !== 'all') params.job_stage_id = Number(selectedStage);
        if (selectedStatus && selectedStatus !== 'all') params.status = selectedStatus;

        if (sortField) {
          params.order_by = sortField;
          params.order = sortDirection;
        }

        const response = await recruitmentService.getJobApplications(params);
        const { data, meta } = response.data;

        if (Array.isArray(data)) {
          setApplications(data);
          setTotalRows(meta?.total ?? 0);
        } else {
          setApplications([]);
          setTotalRows(0);
        }
      } catch (error) {
        console.error('Failed to fetch applications:', error);
        showAlert('error', 'Error', getErrorMessage(error, 'Failed to fetch applications'));
        setApplications([]);
        setTotalRows(0);
      } finally {
        setIsLoading(false);
      }
    },
    [perPage, selectedJob, selectedStage, selectedStatus, sortField, sortDirection]
  );

  const fetchDropdownData = async () => {
    try {
      const [jobsRes, candidatesRes, stagesRes] = await Promise.all([
        recruitmentService.getJobs({ paginate: false }),
        recruitmentService.getCandidates({ paginate: false }),
        recruitmentService.getJobStages({ paginate: false }),
      ]);

      if (jobsRes.data?.data) setJobs(jobsRes.data.data);
      if (candidatesRes.data?.data) setCandidates(candidatesRes.data.data);
      if (stagesRes.data?.data) setStages(stagesRes.data.data);
    } catch (error) {
      console.error('Failed to fetch dropdown data:', error);
    }
  };

  useEffect(() => {
    fetchApplications(page);
  }, [page, fetchApplications]);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  // ================= PAGINATION =================
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePerRowsChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  // ================= SORTING =================
  const handleSort = (column: TableColumn<JobApplication>, direction: 'asc' | 'desc') => {
    const columnId = String(column.id || '');
    if (columnId === 'candidate' || column.name === 'Candidate') {
      setSortField('candidate_id');
      setSortDirection(direction);
      setPage(1);
    } else if (columnId === 'applied_date' || column.name === 'Applied Date') {
      setSortField('applied_date');
      setSortDirection(direction);
      setPage(1);
    }
  };

  // ================= FILTER HANDLERS =================
  const handleApplyFilters = () => {
    setPage(1);
    fetchApplications(1);
  };

  // ================= CRUD OPERATIONS =================


  const resetForm = () => {
    setFieldErrors({});
    setFormData({
      job_id: '',
      candidate_id: '',
      custom_answers: '',
      job_stage_id: '',
      rating: '3',
      note: '',
    });
  };

  const handleAddClick = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleViewClick = (application: JobApplication) => {
    setSelectedApplication(application);
    setIsViewOpen(true);
  };

  const handleActionClick = (application: JobApplication, type: 'move' | 'rate' | 'note') => {
    setSelectedApplication(application);
    setActionType(type);
    setFieldErrors({});
    setFormData({
      ...formData,
      job_stage_id: application.job_stage_id?.toString() || '',
      rating: application.rating?.toString() || '3',
      note: '',
    });
    setIsActionDialogOpen(true);
  };

  const validateCreateForm = () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!formData.job_id) {
      errors.job_id = 'Job is required';
      isValid = false;
    }
    if (!formData.candidate_id) {
      errors.candidate_id = 'Candidate is required';
      isValid = false;
    }
    if (formData.custom_answers) {
      try {
        JSON.parse(formData.custom_answers);
      } catch {
        errors.custom_answers = 'Invalid JSON format';
        isValid = false;
      }
    }

    setFieldErrors(errors);
    return isValid;
  };

  const validateActionForm = () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (actionType === 'move' && !formData.job_stage_id) {
      errors.job_stage_id = 'Stage is required';
      isValid = false;
    }
    if (actionType === 'note' && !formData.note.trim()) {
      errors.note = 'Note content is required';
      isValid = false;
    }
    // Rating usually defaults to '3', but if cleared manually:
    if (actionType === 'rate' && !formData.rating) {
      errors.rating = 'Rating is required';
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (!validateCreateForm()) {
      return;
    }

    try {
      await recruitmentService.createJobApplication(Number(formData.job_id), {
        candidate_id: Number(formData.candidate_id),
        custom_answers: formData.custom_answers ? JSON.parse(formData.custom_answers) : undefined,
      });

      showAlert('success', 'Success', 'Application created successfully', 2000);
      setIsDialogOpen(false);
      resetForm();
      fetchApplications(page);
    } catch (err: any) {
      console.error('Failed to create application:', err);
      const message = getErrorMessage(err, 'Failed to create application');

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

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    if (!selectedApplication || !actionType) return;

    if (!validateActionForm()) {
      return;
    }

    try {
      switch (actionType) {
        case 'move':
          await recruitmentService.moveJobApplicationStage(selectedApplication.id, {
            job_stage_id: Number(formData.job_stage_id),
          });
          showAlert('success', 'Success', 'Application moved to new stage', 2000);
          break;
        case 'rate':
          await recruitmentService.rateJobApplication(selectedApplication.id, {
            rating: Number(formData.rating),
            notes: formData.note || selectedApplication.notes || '',
          });
          showAlert('success', 'Success', 'Application rated successfully', 2000);
          break;
        case 'note':
          await recruitmentService.addJobApplicationNote(selectedApplication.id, {
            note: formData.note,
          });
          showAlert('success', 'Success', 'Note added successfully', 2000);
          break;
      }

      setIsActionDialogOpen(false);
      resetForm();
      setActionType('');
      fetchApplications(page);
    } catch (err: any) {
      console.error('Failed to perform action:', err);
      const message = getErrorMessage(err, 'Failed to perform action');

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

  const renderError = (field: string) => {
    return fieldErrors[field] ? (
      <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
    ) : null;
  };

  const handleQuickAction = async (
    application: JobApplication,
    action: 'shortlist' | 'reject' | 'hire'
  ) => {
    try {
      switch (action) {
        case 'shortlist':
          await recruitmentService.shortlistJobApplication(application.id);
          showAlert('success', 'Success', 'Candidate shortlisted', 2000);
          break;
        case 'reject':
          await recruitmentService.rejectJobApplication(application.id);
          showAlert('success', 'Success', 'Application rejected', 2000);
          break;
        case 'hire':
          await recruitmentService.hireJobApplication(application.id);
          showAlert('success', 'Success', 'Candidate hired successfully', 2000);
          break;
      }
      fetchApplications(page);
    } catch (error) {
      console.error('Failed to perform quick action:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to perform action'));
    }
  };

  // ================= HELPERS =================
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };



  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-solarized-base01">-</span>;
    return (
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
              }`}
          />
        ))}
      </div>
    );
  };

  // Stats
  const stats = {
    total: totalRows,
    pending: applications.filter((a) => a.status === 'pending').length,
    shortlisted: applications.filter((a) => a.status === 'shortlisted').length,
    hired: applications.filter((a) => a.status === 'hired').length,
  };

  const openJobs = jobs.filter((job) => job.status === 'open');

  // ================= TABLE COLUMNS =================
  const columns: TableColumn<JobApplication>[] = [
    {
      id: 'candidate',
      name: 'Candidate',
      cell: (row) => (
        <div>
          <p className="font-medium">{row.candidate?.name || 'Unknown'}</p>
          <p className="text-sm text-solarized-base01">{row.candidate?.email}</p>
        </div>
      ),
      sortable: true,
    },
    {
      name: 'Job',
      selector: (row) => row.job?.title || 'N/A',
    },
    // {
    //   name: 'Stage',
    //   cell: (row) =>
    //     row.stage ? (
    //       <Badge
    //         style={{
    //           backgroundColor: `${row.stage.color}20`,
    //           color: row.stage.color,
    //         }}
    //       >
    //         {row.stage.title}
    //       </Badge>
    //     ) : (
    //       <Badge variant="outline">No Stage</Badge>
    //     ),
    //   width: '130px',
    // },
    {
      id: 'applied_date',
      name: 'Applied Date',
      selector: (row) => row.applied_date,
      cell: (row) => formatDate(row.applied_date),
      sortable: true,
      // width: '130px',
    },
    {
      name: 'Rating',
      cell: (row) => renderStars(row.rating),
      // width: '110px',
    },
    {
      name: 'Status',
      cell: (row) => (
        <StatusBadge status={row.status} />
      ),
      // width: '110px',
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
            <DropdownMenuItem onClick={() => handleActionClick(row, 'move')}>
              <Briefcase className="mr-2 h-4 w-4" /> Move Stage
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleActionClick(row, 'rate')}>
              <Star className="mr-2 h-4 w-4" /> Rate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleActionClick(row, 'note')}>
              <FileText className="mr-2 h-4 w-4" /> Add Note
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleQuickAction(row, 'shortlist')}
              disabled={row.status === 'shortlisted'}
              className="text-solarized-blue"
            >
              <CheckCircle className="mr-2 h-4 w-4" /> Shortlist
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleQuickAction(row, 'reject')}
              disabled={row.status === 'rejected'}
              className="text-solarized-red"
            >
              <XCircle className="mr-2 h-4 w-4" /> Reject
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleQuickAction(row, 'hire')}
              disabled={row.status === 'hired'}
              className="text-solarized-green"
            >
              <Award className="mr-2 h-4 w-4" /> Hire
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      ignoreRowClick: true,
      width: '80px',
    },
  ];

  // Custom Styles
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
          <h1 className="text-2xl font-bold text-solarized-base02">Job Applications</h1>
          <p className="text-solarized-base01">Manage and track job applications</p>
        </div>
        <Button className="bg-solarized-blue hover:bg-solarized-blue/90" onClick={handleAddClick}>
          <Plus className="mr-2 h-4 w-4" />
          New Application
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-solarized-blue/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-solarized-blue" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Total Applications</p>
                <p className="text-2xl font-bold text-solarized-base02">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-solarized-yellow/10 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-solarized-yellow" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Pending Review</p>
                <p className="text-2xl font-bold text-solarized-base02">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-solarized-green/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-solarized-green" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Shortlisted</p>
                <p className="text-2xl font-bold text-solarized-base02">{stats.shortlisted}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-solarized-violet/10 flex items-center justify-center">
                <Award className="h-6 w-6 text-solarized-violet" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Hired</p>
                <p className="text-2xl font-bold text-solarized-base02">{stats.hired}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Card */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Filter Applications</CardTitle>
          <CardDescription>Filter by job or status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Select value={selectedJob} onValueChange={setSelectedJob}>
              <SelectTrigger>
                <SelectValue placeholder="All Jobs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id.toString()}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger>
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id.toString()}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      {stage.title}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select> */}

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="shortlisted">Shortlisted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="hired">Hired</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={handleApplyFilters}
              className="button w-24"
            >
              <Search className="mr-2 h-4 w-4" />Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* TABLE */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Applications List</CardTitle>
        </CardHeader>
        <CardContent>
          {!isLoading && applications.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="mx-auto h-12 w-12 text-solarized-base01 mb-4" />
              <h3 className="text-lg font-medium text-solarized-base02">No applications found</h3>
              <p className="text-solarized-base01 mt-1">
                {selectedJob !== 'all' || selectedStage !== 'all' || selectedStatus !== 'all'
                  ? 'Try changing your filters'
                  : 'Start by creating your first job application'}
              </p>
              <Button
                className="mt-4 bg-solarized-blue hover:bg-solarized-blue/90"
                onClick={handleAddClick}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Application
              </Button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={applications}
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
              defaultSortFieldId="applied_date"
              defaultSortAsc={false}
              highlightOnHover
              responsive
            />
          )}
        </CardContent>
      </Card>

      {/* VIEW DIALOG */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>Complete information about this job application</DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-6 py-4">
              <Tabs defaultValue="details">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="candidate">Candidate</TabsTrigger>
                  <TabsTrigger value="notes">Notes & Rating</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-solarized-base01">Job Title</Label>
                      <p className="font-medium">{selectedApplication.job?.title || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-solarized-base01">Status</Label>
                      <div className="mt-1">
                        <StatusBadge status={selectedApplication.status} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-solarized-base01">Stage</Label>
                      {selectedApplication.stage ? (
                        <Badge
                          style={{
                            backgroundColor: `${selectedApplication.stage.color}`,
                            color: selectedApplication.stage.color,
                          }}
                        >
                          {selectedApplication.stage.title}
                        </Badge>
                      ) : (
                        <p>No Stage</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-solarized-base01">Applied Date</Label>
                      <p className="font-medium">{formatDate(selectedApplication.applied_date)}</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="candidate" className="space-y-4">
                  {selectedApplication.candidate && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-solarized-base01">Name</Label>
                        <p className="font-medium">{selectedApplication.candidate.name}</p>
                      </div>
                      <div>
                        <Label className="text-solarized-base01">Email</Label>
                        <p className="font-medium">{selectedApplication.candidate.email}</p>
                      </div>
                      <div>
                        <Label className="text-solarized-base01">Phone</Label>
                        <p className="font-medium">{selectedApplication.candidate.phone || 'N/A'}</p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="notes" className="space-y-4">
                  <div>
                    <Label className="text-solarized-base01">Rating</Label>
                    {renderStars(selectedApplication.rating)}
                  </div>
                  <div>
                    <Label className="text-solarized-base01">Notes</Label>
                    <div className="bg-solarized-base03/10 p-4 rounded mt-1">
                      {selectedApplication.notes || 'No notes added'}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Application</DialogTitle>
            <DialogDescription>Add a new job application</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className={fieldErrors.job_id ? 'text-red-500' : ''}>Job *</Label>
                <Select
                  value={formData.job_id}
                  onValueChange={(value) => {
                    setFormData({ ...formData, job_id: value });
                    if (fieldErrors.job_id) setFieldErrors(prev => ({ ...prev, job_id: '' }));
                  }}
                >
                  <SelectTrigger className={fieldErrors.job_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select job" />
                  </SelectTrigger>
                  <SelectContent>
                    {openJobs.map((job) => (
                      <SelectItem key={job.id} value={job.id.toString()}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {renderError('job_id')}
                {openJobs.length === 0 && (
                  <p className="text-sm text-solarized-red">No open jobs available.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className={fieldErrors.candidate_id ? 'text-red-500' : ''}>Candidate *</Label>
                <Select
                  value={formData.candidate_id}
                  onValueChange={(value) => {
                    setFormData({ ...formData, candidate_id: value });
                    if (fieldErrors.candidate_id) setFieldErrors(prev => ({ ...prev, candidate_id: '' }));
                  }}
                >
                  <SelectTrigger className={fieldErrors.candidate_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select candidate" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id.toString()}>
                        {candidate.name} ({candidate.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {renderError('candidate_id')}
              </div>

              <div className="space-y-2">
                <Label className={fieldErrors.custom_answers ? 'text-red-500' : ''}>Custom Answers (JSON)</Label>
                <Textarea
                  value={formData.custom_answers}
                  onChange={(e) => {
                    setFormData({ ...formData, custom_answers: e.target.value });
                    if (fieldErrors.custom_answers) setFieldErrors(prev => ({ ...prev, custom_answers: '' }));
                  }}
                  placeholder='{"question": "answer"}'
                  rows={3}
                  className={fieldErrors.custom_answers ? 'border-red-500' : ''}
                />
                {renderError('custom_answers')}
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
                Create Application
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ACTION DIALOG */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'move' && 'Move to Stage'}
              {actionType === 'rate' && 'Rate Application'}
              {actionType === 'note' && 'Add Note'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAction}>
            <div className="space-y-4 py-4">
              {actionType === 'move' && (
                <div className="space-y-2">
                  <Label className={fieldErrors.job_stage_id ? 'text-red-500' : ''}>Select Stage *</Label>
                  <Select
                    value={formData.job_stage_id}
                    onValueChange={(value) => {
                      setFormData({ ...formData, job_stage_id: value });
                      if (fieldErrors.job_stage_id) setFieldErrors(prev => ({ ...prev, job_stage_id: '' }));
                    }}
                  >
                    <SelectTrigger className={fieldErrors.job_stage_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id.toString()}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: stage.color }}
                            />
                            {stage.title}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {renderError('job_stage_id')}
                </div>
              )}

              {actionType === 'rate' && (
                <>
                  <div className="space-y-2">
                    <Label className={fieldErrors.rating ? 'text-red-500' : ''}>Rating (1-5)</Label>
                    <Select
                      value={formData.rating}
                      onValueChange={(value) => setFormData({ ...formData, rating: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select rating" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${i < num ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                    }`}
                                />
                              ))}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {renderError('rating')}
                  </div>
                  <div className="space-y-2">
                    <Label>Note</Label>
                    <Textarea
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      placeholder="Enter your notes..."
                      rows={3}
                    />
                  </div>
                </>
              )}

              {actionType === 'note' && (
                <div className="space-y-2">
                  <Label className={fieldErrors.note ? 'text-red-500' : ''}>Note *</Label>
                  <Textarea
                    value={formData.note}
                    onChange={(e) => {
                      setFormData({ ...formData, note: e.target.value });
                      if (fieldErrors.note) setFieldErrors(prev => ({ ...prev, note: '' }));
                    }}
                    placeholder="Enter your notes..."
                    rows={4}
                    className={fieldErrors.note ? 'border-red-500' : ''}
                  />
                  {renderError('note')}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsActionDialogOpen(false);
                  setActionType('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-solarized-blue hover:bg-solarized-blue/90"
              >
                {actionType === 'move' && 'Move'}
                {actionType === 'rate' && 'Save Rating'}
                {actionType === 'note' && 'Add Note'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}