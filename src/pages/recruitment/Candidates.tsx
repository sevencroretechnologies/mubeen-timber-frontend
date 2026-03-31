import { useState, useEffect, useCallback } from 'react';
import { recruitmentService, candidateSourceService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { StatusBadge } from '../../components/ui/status-badge';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Textarea } from '../../components/ui/textarea';
import {
  Plus,
  Search,
  User,
  Mail,
  Phone,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Archive,
  ArchiveRestore,
  Calendar,
  MapPin,
  Linkedin,
  FileText,
  Download,
} from 'lucide-react';

interface Candidate {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  candidate_source_id?: number;
  candidate_source?: { id: number; title: string };
  date_of_birth?: string;
  gender?: string;
  address?: string;
  linkedin_url?: string;
  resume_path?: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  applications_count?: number;
  applications?: Application[];
}

interface Application {
  id: number;
  job_id: number;
  candidate_id: number;
  status: string;
  stage_id?: number;
  created_at: string;
  updated_at: string;
  job?: {
    id: number;
    title: string;
  };
}

interface CandidateSource {
  id: number;
  title: string;
}

export default function Candidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateSources, setCandidateSources] = useState<CandidateSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Pagination & Sorting State
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter State
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [isArchivedFilter, setIsArchivedFilter] = useState<boolean | null>(false);

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [viewingCandidate, setViewingCandidate] = useState<Candidate | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'new',
    candidate_source_id: '',
    date_of_birth: '',
    gender: '',
    address: '',
    linkedin_url: '',
    resume: null as File | null,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ================= FETCH CANDIDATES =================
  const fetchCandidates = useCallback(
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
        if (sourceFilter && sourceFilter !== 'all') {
          params.candidate_source_id = Number(sourceFilter);
        }
        if (isArchivedFilter !== null) {
          params.is_archived = isArchivedFilter ? 'true' : 'false';
        }

        if (sortField) {
          params.order_by = sortField;
          params.order = sortDirection;
        }

        const response = await recruitmentService.getCandidates(params);
        const { data, meta } = response.data;

        if (Array.isArray(data)) {
          setCandidates(data);
          setTotalRows(meta?.total ?? 0);
        } else {
          setCandidates([]);
          setTotalRows(0);
        }
      } catch (error) {
        console.error('Failed to fetch candidates:', error);
        showAlert('error', 'Error', getErrorMessage(error, 'Failed to fetch candidates'));
        setCandidates([]);
        setTotalRows(0);
      } finally {
        setIsLoading(false);
      }
    },
    [perPage, searchQuery, statusFilter, sourceFilter, isArchivedFilter, sortField, sortDirection]
  );

  useEffect(() => {
    fetchCandidates(page);
    fetchCandidateSources();
  }, [page, fetchCandidates]);

  const fetchCandidateSources = async () => {
    try {
      const response = await candidateSourceService.getAll({ page: 1, per_page: 100 }); // Fetch all or reasonable amount
      if (response.data && Array.isArray(response.data.data)) {
        setCandidateSources(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch candidate sources:', error);
    }
  };

  // ================= SEARCH =================
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleApplyFilters = () => {
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setStatusFilter('all');
    setSourceFilter('all');
    setIsArchivedFilter(false);
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
  const handleSort = (column: TableColumn<Candidate>, direction: 'asc' | 'desc') => {
    const columnId = String(column.id || '');
    if (columnId === 'name' || column.name === 'Candidate') {
      setSortField('name');
      setSortDirection(direction);
      setPage(1);
    }
  };

  // ================= CRUD OPERATIONS =================
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      status: 'new',
      candidate_source_id: '',
      date_of_birth: '',
      gender: '',
      address: '',
      linkedin_url: '',
      resume: null,
    });
    setFieldErrors({});
  };

  const handleAddClick = () => {
    setEditingCandidate(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleViewClick = (candidate: Candidate) => {
    setViewingCandidate(candidate);
    setIsViewOpen(true);
  };

  const handleEditClick = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    setFieldErrors({});
    setFormData({
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone || '',
      status: candidate.status || 'new',
      candidate_source_id: candidate.candidate_source_id ? String(candidate.candidate_source_id) : '',
      date_of_birth: candidate.date_of_birth || '',
      gender: candidate.gender || '',
      address: candidate.address || '',
      linkedin_url: candidate.linkedin_url || '',
      resume: null,
    });
    setIsDialogOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!formData.name.trim()) {
      errors.name = 'Full Name is required';
      isValid = false;
    } else if (formData.name.length > 255) {
      errors.name = 'Full Name must be less than 255 characters';
      isValid = false;
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
      isValid = false;
    }

    if (formData.phone && formData.phone.length > 20) {
      errors.phone = 'Phone must be less than 20 characters';
      isValid = false;
    }

    if (formData.linkedin_url) {
      try {
        new URL(formData.linkedin_url);
      } catch {
        errors.linkedin_url = 'Invalid URL format';
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
      if (editingCandidate) {
        await recruitmentService.updateCandidate(editingCandidate.id, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          status: formData.status,
        });
        showAlert('success', 'Success', 'Candidate updated successfully', 2000);
      } else {
        const formDataToSend = new FormData();
        formDataToSend.append('name', formData.name);
        formDataToSend.append('email', formData.email);
        formDataToSend.append('phone', formData.phone);
        formDataToSend.append('status', formData.status);
        if (formData.candidate_source_id) formDataToSend.append('candidate_source_id', formData.candidate_source_id);
        if (formData.date_of_birth) formDataToSend.append('date_of_birth', formData.date_of_birth);
        if (formData.gender) formDataToSend.append('gender', formData.gender);
        if (formData.address) formDataToSend.append('address', formData.address);
        if (formData.linkedin_url) formDataToSend.append('linkedin_url', formData.linkedin_url);
        if (formData.resume) formDataToSend.append('resume', formData.resume);

        await recruitmentService.createCandidate(formDataToSend);
        showAlert('success', 'Success', 'Candidate created successfully', 2000);
      }

      setIsDialogOpen(false);
      setEditingCandidate(null);
      resetForm();
      fetchCandidates(page);
    } catch (err: any) {
      console.error('Failed to save candidate:', err);
      const message = getErrorMessage(err, 'Failed to save candidate');

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

  const renderError = (field: string) => {
    return fieldErrors[field] ? (
      <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
    ) : null;
  };

  const handleDelete = async (id: number) => {
    const result = await showConfirmDialog(
      'Delete Candidate',
      'Are you sure you want to delete this candidate?'
    );

    if (!result.isConfirmed) return;

    try {
      await recruitmentService.deleteCandidate(id);
      showAlert('success', 'Deleted!', 'Candidate deleted successfully', 2000);
      fetchCandidates(page);
    } catch (error) {
      console.error('Failed to delete candidate:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete candidate'));
    }
  };

  const handleArchive = async (id: number) => {
    try {
      await recruitmentService.archiveCandidate(id);
      showAlert('success', 'Archived', 'Candidate archived successfully', 2000);
      fetchCandidates(page);
    } catch (error) {
      console.error('Failed to archive candidate:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to archive candidate'));
    }
  };

  const handleUnarchive = async (id: number) => {
    try {
      await recruitmentService.updateCandidate(id, { is_archived: false });
      showAlert('success', 'Unarchived', 'Candidate unarchived successfully', 2000);
      fetchCandidates(page);
    } catch (error) {
      console.error('Failed to unarchive candidate:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to unarchive candidate'));
    }
  };

  const downloadResume = async (candidate: Candidate) => {
    if (!candidate.resume_path) {
      showAlert('error', 'Error', 'No resume available for download');
      return;
    }

    try {
      const response = await recruitmentService.downloadResume(candidate.id);

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // Extract filename from path or default to candidate name
      const filename = candidate.resume_path.split('/').pop() || `${candidate.name}_resume`;
      link.setAttribute('download', filename);

      document.body.appendChild(link);
      link.click();

      // Cleanup
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download resume:', error);
      showAlert('error', 'Error', 'Failed to download resume');
    }
  };

  // ================= HELPERS =================
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // ================= TABLE COLUMNS =================
  const columns: TableColumn<Candidate>[] = [
    {
      id: 'name',
      name: 'Candidate',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-solarized-blue/10 text-solarized-blue">
              {row.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{row.name}</div>
            {row.is_archived && (
              <Badge variant="outline" className="text-xs border-solarized-yellow/50 text-solarized-yellow">
                Archived
              </Badge>
            )}
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      name: 'Contact',
      cell: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-sm">
            <Mail className="h-3 w-3 text-solarized-base01" />
            <span className="truncate max-w-[150px]">{row.email}</span>
          </div>
          {row.phone && (
            <div className="flex items-center gap-1 text-sm text-solarized-base01">
              <Phone className="h-3 w-3" />
              <span>{row.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      name: 'Source',
      cell: (row) => (
        <Badge variant="outline" className="text-xs">
          {row.candidate_source?.title || 'Unknown'}
        </Badge>
      ),
      // width: '120px',
    },
    {
      name: 'Applications',
      cell: (row) => <span className="font-medium">{row.applications_count || 0}</span>,
      width: '130px',
    },
    {
      name: 'Status',
      cell: (row) => (
        <StatusBadge status={row.status} />
      ),
      // width: '110px',
    },
    // {
    //   name: 'Created',
    //   cell: (row) => <span className="text-sm text-solarized-base01">{formatDate(row.created_at)}</span>,
    // },
    {
      name: 'Actions',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
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
            {row.resume_path && (
              <DropdownMenuItem onClick={() => downloadResume(row)}>
                <Download className="mr-2 h-4 w-4" /> Download Resume
              </DropdownMenuItem>
            )}
            {!row.is_archived ? (
              <DropdownMenuItem onClick={() => handleArchive(row.id)} className="text-solarized-yellow">
                <Archive className="mr-2 h-4 w-4" /> Archive
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => handleUnarchive(row.id)} className="text-solarized-green">
                <ArchiveRestore className="mr-2 h-4 w-4" /> Unarchive
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
          <h1 className="text-2xl font-bold text-solarized-base02">Candidates</h1>
          <p className="text-solarized-base01">Manage job applicants and candidates</p>
        </div>
        <Button className="bg-solarized-blue hover:bg-solarized-blue/90" onClick={handleAddClick}>
          <Plus className="mr-2 h-4 w-4" />
          Add Candidate
        </Button>
      </div>

      {/* TABLE */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Candidates List</CardTitle>
          <div className="flex flex-wrap gap-4 mt-4">
            <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 min-w-[200px]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-solarized-base01" />
                <Input
                  placeholder="Search by name, email, phone..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>
            </form>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="screening">Screening</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="offered">Offered</SelectItem>
                <SelectItem value="hired">Hired</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {candidateSources.map((source) => (
                  <SelectItem key={source.id} value={String(source.id)}>{source.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={isArchivedFilter === null ? 'all' : isArchivedFilter ? 'true' : 'false'}
              onValueChange={(value) => {
                if (value === 'all') setIsArchivedFilter(null);
                else setIsArchivedFilter(value === 'true');
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Archive" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Active</SelectItem>
                <SelectItem value="true">Archived</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={handleApplyFilters} className="button">
              <Search className="mr-2 h-4 w-4" /> Search
            </Button>
            <Button variant="outline" onClick={handleClearFilters}>
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!isLoading && candidates.length === 0 ? (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-solarized-base01 mb-4" />
              <h3 className="text-lg font-medium text-solarized-base02">No candidates found</h3>
              <p className="text-solarized-base01 mt-1">Add candidates or adjust your filters.</p>
              <Button className="mt-4 bg-solarized-blue hover:bg-solarized-blue/90" onClick={handleAddClick}>
                <Plus className="mr-2 h-4 w-4" />
                Add Candidate
              </Button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={candidates}
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
              defaultSortFieldId="name"
              defaultSortAsc={true}
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
            <DialogTitle>Candidate Profile</DialogTitle>
            <DialogDescription>View candidate details</DialogDescription>
          </DialogHeader>

          {viewingCandidate && (
            <div className="space-y-6 py-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-solarized-blue/10 text-solarized-blue text-lg">
                    {getInitials(viewingCandidate.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold text-solarized-base02">{viewingCandidate.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={viewingCandidate.status} />
                    {viewingCandidate.is_archived && (
                      <Badge variant="outline" className="border-solarized-yellow/50 text-solarized-yellow">
                        Archived
                      </Badge>
                    )}
                    <Badge variant="outline">{viewingCandidate.candidate_source?.title || 'Unknown'}</Badge>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-solarized-base01 flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Email
                  </Label>
                  <p className="font-medium">{viewingCandidate.email}</p>
                </div>
                <div>
                  <Label className="text-solarized-base01 flex items-center gap-2">
                    <Phone className="h-4 w-4" /> Phone
                  </Label>
                  <p className="font-medium">{viewingCandidate.phone || '-'}</p>
                </div>
                {viewingCandidate.date_of_birth && (
                  <div>
                    <Label className="text-solarized-base01 flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Date of Birth
                    </Label>
                    <p className="font-medium">{formatDate(viewingCandidate.date_of_birth)}</p>
                  </div>
                )}
                {viewingCandidate.gender && (
                  <div>
                    <Label className="text-solarized-base01">Gender</Label>
                    <p className="font-medium">{viewingCandidate.gender}</p>
                  </div>
                )}
                {viewingCandidate.linkedin_url && (
                  <div className="md:col-span-2">
                    <Label className="text-solarized-base01 flex items-center gap-2">
                      <Linkedin className="h-4 w-4" /> LinkedIn
                    </Label>
                    <a
                      href={viewingCandidate.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-solarized-blue hover:underline font-medium"
                    >
                      {viewingCandidate.linkedin_url}
                    </a>
                  </div>
                )}
                {viewingCandidate.address && (
                  <div className="md:col-span-2">
                    <Label className="text-solarized-base01 flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Address
                    </Label>
                    <p className="font-medium">{viewingCandidate.address}</p>
                  </div>
                )}
                <div>
                  <Label className="text-solarized-base01">Applications</Label>
                  <p className="font-medium">{viewingCandidate.applications_count || 0} applications</p>
                </div>
                {/* <div>
                  <Label className="text-solarized-base01">Created</Label>
                  <p className="font-medium">{formatDate(viewingCandidate.created_at)}</p>
                </div> */}
                {viewingCandidate.resume_path && (
                  <div className="md:col-span-2">
                    <Label className="text-solarized-base01 flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Resume
                    </Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadResume(viewingCandidate)}
                      className="flex items-center gap-2 mt-1"
                    >
                      <Download className="h-4 w-4" />
                      Download Resume
                    </Button>
                  </div>
                )}
              </div>

              {viewingCandidate.applications && viewingCandidate.applications.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-solarized-base02">Job Applications</h4>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Job Title</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Applied Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingCandidate.applications.map((app) => (
                          <TableRow key={app.id}>
                            <TableCell className="font-medium">{app.job?.title || 'Unknown Job'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{app.status}</Badge>
                            </TableCell>
                            <TableCell>{formatDate(app.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
            {/* {viewingCandidate && (
              <Button
                className="bg-solarized-blue hover:bg-solarized-blue/90"
                onClick={() => {
                  handleEditClick(viewingCandidate);
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCandidate ? 'Edit Candidate' : 'Add Candidate'}</DialogTitle>
            <DialogDescription>
              {editingCandidate ? 'Update the candidate details.' : 'Add a new candidate.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4 md:grid-cols-2">
              {!editingCandidate && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="resume">Resume (PDF, DOC)</Label>
                  <Input
                    id="resume"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setFormData({ ...formData, resume: file });
                    }}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name" className={fieldErrors.name ? 'text-red-500' : ''}>Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                  }}
                  placeholder="e.g., John Doe"
                  className={fieldErrors.name ? 'border-red-500' : ''}
                />
                {renderError('name')}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className={fieldErrors.email ? 'text-red-500' : ''}>Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));
                  }}
                  placeholder="e.g., john@example.com"
                  className={fieldErrors.email ? 'border-red-500' : ''}
                />
                {renderError('email')}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className={fieldErrors.phone ? 'text-red-500' : ''}>Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (fieldErrors.phone) setFieldErrors(prev => ({ ...prev, phone: '' }));
                  }}
                  placeholder="e.g., +1 555-1234"
                  className={fieldErrors.phone ? 'border-red-500' : ''}
                />
                {renderError('phone')}
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
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="screening">Screening</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="offered">Offered</SelectItem>
                    <SelectItem value="hired">Hired</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!editingCandidate && (
                <>
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Select
                      value={formData.candidate_source_id}
                      onValueChange={(value) => setFormData({ ...formData, candidate_source_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        {candidateSources.map((source) => (
                          <SelectItem key={source.id} value={String(source.id)}>{source.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => setFormData({ ...formData, gender: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="linkedin_url" className={fieldErrors.linkedin_url ? 'text-red-500' : ''}>LinkedIn URL</Label>
                    <Input
                      id="linkedin_url"
                      value={formData.linkedin_url}
                      onChange={(e) => {
                        setFormData({ ...formData, linkedin_url: e.target.value });
                        if (fieldErrors.linkedin_url) setFieldErrors(prev => ({ ...prev, linkedin_url: '' }));
                      }}
                      placeholder="https://linkedin.com/in/username"
                      className={fieldErrors.linkedin_url ? 'border-red-500' : ''}
                    />
                    {renderError('linkedin_url')}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Enter full address"
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90">
                {editingCandidate ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}