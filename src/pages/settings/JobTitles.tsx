import { useState, useEffect, useCallback } from 'react';
import { settingsService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { StatusBadge } from '../../components/ui/status-badge';
import DataTable, { TableColumn } from 'react-data-table-component';
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
import { Plus, Briefcase, Edit, Trash2, MoreHorizontal, Eye, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

interface Division {
  id: number;
  title: string;
}

interface JobTitle {
  id: number;
  title: string;
  notes: string;
  division?: { title: string };
  division_id: number;
  is_active: boolean;
}

export default function JobTitles() {
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingJobTitle, setEditingJobTitle] = useState<JobTitle | null>(null);
  const [viewingJobTitle, setViewingJobTitle] = useState<JobTitle | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    title: '',
    notes: '',
    division_id: '',
  });

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const fetchJobTitles = useCallback(async (currentPage: number = 1) => {
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

      const response = await settingsService.getJobTitles(params);
      const { data, meta } = response.data;
      setJobTitles(data || []);
      setTotalRows(meta?.total || 0);
    } catch (error) {
      console.error('Failed to fetch job titles:', error);
      showAlert('error', 'Error', 'Failed to fetch job titles');
      setJobTitles([]);
      setTotalRows(0);
    } finally {
      setIsLoading(false);
    }
  }, [perPage, searchQuery, sortField, sortDirection]);

  // Fetch divisions for dropdown
  const fetchDivisions = async () => {
    try {
      const response = await settingsService.getDivisions({ per_page: 100 });
      const data = response.data.data;
      if (Array.isArray(data)) {
        setDivisions(data);
      } else if (data && Array.isArray(data.data)) {
        setDivisions(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch divisions', error);
    }
  };

  useEffect(() => {
    fetchJobTitles(page);
  }, [page, fetchJobTitles]);

  useEffect(() => {
    if (isDialogOpen) {
      fetchDivisions();
    }
  }, [isDialogOpen]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!formData.title.trim()) {
      errors.title = 'Title is required';
      isValid = false;
    }
    if (!formData.division_id) {
      errors.division_id = 'Division is required';
      isValid = false;
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
      if (editingJobTitle) {
        await settingsService.updateJobTitle(editingJobTitle.id, formData);
      } else {
        await settingsService.createJobTitle(formData);
      }
      showAlert(
        'success',
        'Success!',
        editingJobTitle ? 'Job title updated successfully' : 'Job title created successfully',
        2000
      );
      setIsDialogOpen(false);
      setEditingJobTitle(null);
      resetForm();
      fetchJobTitles(page);
    } catch (err: unknown) {
      console.error('Failed to save job title:', err);
      const message = getErrorMessage(err, 'Failed to save job title');
      showAlert('error', 'Error', message);
    }
  };

  const handleEdit = (jobTitle: JobTitle) => {
    setEditingJobTitle(jobTitle);
    setFieldErrors({});
    setFormData({
      title: jobTitle.title,
      notes: jobTitle.notes || '',
      division_id: jobTitle.division_id?.toString() || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    const result = await showConfirmDialog(
      'Are you sure?',
      'You want to delete this job title?'
    );

    if (!result.isConfirmed) return;

    try {
      await settingsService.deleteJobTitle(id);
      showAlert('success', 'Deleted!', 'Job title deleted successfully', 2000);
      fetchJobTitles(page);
    } catch (error: unknown) {
      console.error('Failed to delete job title:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete job title'));
    }
  };

  const resetForm = () => {
    setFormData({ title: '', notes: '', division_id: '' });
    setFieldErrors({});
  };

  const handleView = (jobTitle: JobTitle) => {
    setViewingJobTitle(jobTitle);
    setIsViewDialogOpen(true);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePerRowsChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  const handleSort = (column: TableColumn<JobTitle>, direction: 'asc' | 'desc') => {
    if (column.sortField) {
      setSortField(column.sortField);
      setSortDirection(direction);
      setPage(1);
    }
  };

  const renderError = (field: string) => {
    return fieldErrors[field] ? (
      <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
    ) : null;
  };

  const columns: TableColumn<JobTitle>[] = [
    {
      name: "Title",
      selector: (row) => row.title,
      sortable: true,
      sortField: 'title',
      // minWidth: "150px",
    },
    {
      name: "Department",
      selector: (row) => row.division?.title || "-",
      sortable: true,
      sortField: 'division_id',
    },
    {
      name: "Notes",
      selector: (row) => row.notes || "-",
      sortable: true,
      sortField: 'notes',
      grow: 2,
    },
    {
      name: "Status",
      cell: (row) => (
        <StatusBadge status={row.is_active ? 'active' : 'inactive'} />
      ),
      // width: "100px",
    },
    {
      name: "Actions",
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
      width: "80px",
    },
  ];

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
          <h1 className="text-2xl font-bold text-solarized-base02">Job Titles</h1>
          <p className="text-solarized-base01">Manage job titles and designations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-solarized-blue hover:bg-solarized-blue/90"
              onClick={() => {
                setEditingJobTitle(null);
                resetForm();
                setFieldErrors({});
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Job Title
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingJobTitle ? 'Edit Job Title' : 'Add New Job Title'}</DialogTitle>
              <DialogDescription>
                {editingJobTitle ? 'Update the job title details.' : 'Add a new job title.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Software Engineer"
                    className={fieldErrors.title ? 'border-red-500' : ''}
                  />
                  {renderError('title')}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="division_id">Department *</Label>
                  <Select
                    value={formData.division_id}
                    onValueChange={(value) => setFormData({ ...formData, division_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {divisions.map((div) => (
                        <SelectItem key={div.id} value={div.id.toString()}>
                          {div.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {renderError('division_id')}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Job title notes"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90">
                  {editingJobTitle ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          {/* <CardTitle>Job Titles List</CardTitle> */}
          <form onSubmit={handleSearchSubmit} className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-solarized-base01" />
              <Input
                placeholder="Search job titles..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="outline">
              <Search className="mr-2 h-4 w-4" /> Search
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {!isLoading && jobTitles.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-solarized-base02">No job titles configured</h3>
              <p className="text-solarized-base01 mt-1">Add your first job title.</p>
              <Button
                className="mt-4 bg-solarized-blue hover:bg-solarized-blue/90"
                onClick={() => {
                  setEditingJobTitle(null);
                  resetForm();
                  setFieldErrors({});
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Job Title
              </Button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={jobTitles}
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

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Job Title Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-solarized-base01">Title</Label>
              <p className="font-medium text-solarized-base02">{viewingJobTitle?.title}</p>
            </div>
            <div>
              <Label className="text-solarized-base01">Department</Label>
              <p className="text-solarized-base02">{viewingJobTitle?.division?.title || '-'}</p>
            </div>
            <div>
              <Label className="text-solarized-base01">Notes</Label>
              <p className="text-solarized-base02">{viewingJobTitle?.notes || '-'}</p>
            </div>
            <div>
              <Label className="text-solarized-base01">Status</Label>
              <div className="mt-1">
                <StatusBadge status={viewingJobTitle?.is_active ? 'active' : 'inactive'} />
              </div>
            </div>
          </div>
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
