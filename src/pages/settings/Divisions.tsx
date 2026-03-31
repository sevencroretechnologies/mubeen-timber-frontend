import { useState, useEffect, useCallback } from 'react';
import { settingsService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { StatusBadge } from '../../components/ui/status-badge';
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
import { Plus, Building2, Edit, Trash2, MoreHorizontal, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import DataTable, { TableColumn } from 'react-data-table-component';

interface Location {
  id: number;
  title: string;
}

interface Division {
  id: number;
  title: string;
  notes: string;
  office_location?: { title: string };
  office_location_id: number;
  is_active: boolean;
}

export default function Divisions() {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingDivision, setEditingDivision] = useState<Division | null>(null);
  const [viewingDivision, setViewingDivision] = useState<Division | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    notes: '',
    office_location_id: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Pagination & Sorting State
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Fetch locations on mount
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const locRes = await settingsService.getOfficeLocations();
        setLocations(locRes.data.data || []);
      } catch (error) {
        console.error('Failed to fetch locations:', error);
      }
    };
    fetchLocations();
  }, []);

  // Fetch divisions with pagination
  const fetchDivisions = useCallback(
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

        const response = await settingsService.getDivisions(params);
        const { data, meta } = response.data;

        if (Array.isArray(data)) {
          setDivisions(data);
          setTotalRows(meta?.total ?? 0);
        } else {
          setDivisions([]);
          setTotalRows(0);
        }
      } catch (error) {
        console.error('Failed to fetch divisions:', error);
        showAlert('error', 'Error', getErrorMessage(error, 'Failed to fetch divisions'));
        setDivisions([]);
        setTotalRows(0);
      } finally {
        setIsLoading(false);
      }
    },
    [perPage, searchQuery, sortField, sortDirection]
  );

  useEffect(() => {
    fetchDivisions(page);
  }, [page, fetchDivisions]);

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

  // Sorting Handler - Only Name column is sortable
  const handleSort = (column: TableColumn<Division>, sortDirection: 'asc' | 'desc') => {
    if (column.name === 'Name') {
      setSortField('title');
      setSortDirection(sortDirection);
      setPage(1);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!formData.title.trim()) {
      errors.title = 'Department Name is required';
      isValid = false;
    } else if (formData.title.length > 255) {
      errors.title = 'Department Name must be less than 255 characters';
      isValid = false;
    }

    if (!formData.office_location_id) {
      errors.office_location_id = 'Office Location is required';
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    // Frontend validation
    if (!validateForm()) {
      return;
    }

    try {
      if (editingDivision) {
        await settingsService.updateDivision(editingDivision.id, formData);
      } else {
        await settingsService.createDivision(formData);
      }
      showAlert(
        'success',
        'Success!',
        editingDivision ? 'Division updated successfully' : 'Division created successfully',
        2000
      );
      setIsDialogOpen(false);
      setEditingDivision(null);
      resetForm();
      fetchDivisions(page);
    } catch (error: any) {
      console.error('Failed to save division:', error);

      // Handle backend validation errors (status 422)
      if (error.response?.status === 422 && error.response?.data?.errors) {
        const apiErrors: Record<string, string> = {};
        Object.keys(error.response.data.errors).forEach((key) => {
          apiErrors[key] = error.response.data.errors[key][0];
        });
        setFieldErrors(apiErrors);
        showAlert('error', 'Validation Error', 'Please fix the errors highlighted below.');
      } else {
        showAlert('error', 'Error', getErrorMessage(error, 'Failed to save division'));
      }
    }
  };

  const handleEdit = (division: Division) => {
    setEditingDivision(division);
    setFormData({
      title: division.title,
      notes: division.notes || '',
      office_location_id: division.office_location_id?.toString() || '',
    });
    setFieldErrors({}); // Clear any existing errors
    setIsDialogOpen(true);
  };

  const handleView = (division: Division) => {
    setViewingDivision(division);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    const result = await showConfirmDialog(
      'Are you sure?',
      'You want to delete this division?'
    );

    if (!result.isConfirmed) return;

    try {
      await settingsService.deleteDivision(id);
      showAlert('success', 'Deleted!', 'Division deleted successfully', 2000);
      fetchDivisions(page);
    } catch (error: unknown) {
      console.error('Failed to delete division:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete division'));
    }
  };

  const resetForm = () => {
    setFormData({ title: '', notes: '', office_location_id: '' });
    setFieldErrors({});
  };

  const renderError = (field: string) => {
    return fieldErrors[field] ? (
      <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
    ) : null;
  };

  // Table Columns
  const columns: TableColumn<Division>[] = [
    {
      name: 'Name',
      selector: (row) => row.title,
      cell: (row) => <span className="font-medium">{row.title}</span>,
      sortable: true,
    },
    {
      name: 'Office Location',
      selector: (row) => row.office_location?.title || '-',
    },
    {
      name: 'Notes',
      selector: (row) => row.notes || '-',
      cell: (row) => (
        <span className="max-w-[200px] truncate">{row.notes || '-'}</span>
      ),
    },
    {
      name: 'Status',
      cell: (row) => (
        <StatusBadge status={row.is_active ? 'active' : 'inactive'} />
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
              <Building2 className="mr-2 h-4 w-4" />
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
          <h1 className="text-2xl font-bold text-solarized-base02">Departments</h1>
          <p className="text-solarized-base01">Manage company divisions and departments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-solarized-blue hover:bg-solarized-blue/90"
              onClick={() => {
                setEditingDivision(null);
                resetForm();
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Departments
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDivision ? 'Edit Division' : 'Add New Department'}</DialogTitle>
              <DialogDescription>
                {editingDivision ? 'Update the division details.' : 'Add a new department.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className={fieldErrors.title ? 'text-red-500' : ''}>
                    Department Name *
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({ ...formData, title: e.target.value });
                      if (fieldErrors.title) setFieldErrors(prev => ({ ...prev, title: '' }));
                    }}
                    placeholder="e.g., Engineering"
                    className={fieldErrors.title ? 'border-red-500' : ''}
                    maxLength={255}
                  />
                  {renderError('title')}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="office_location_id" className={fieldErrors.office_location_id ? 'text-red-500' : ''}>
                    Office Location *
                  </Label>
                  <Select
                    value={formData.office_location_id}
                    onValueChange={(value) => {
                      setFormData({ ...formData, office_location_id: value });
                      if (fieldErrors.office_location_id) setFieldErrors(prev => ({ ...prev, office_location_id: '' }));
                    }}
                  >
                    <SelectTrigger className={fieldErrors.office_location_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id.toString()}>
                          {loc.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {renderError('office_location_id')}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Department notes"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90">
                  {editingDivision ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <form onSubmit={handleSearchSubmit} className="flex gap-4">
            <Input
              placeholder="Search departments..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <Button type="submit" variant="outline" >
              <Search className="mr-2 h-4 w-4 " /> Search
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {!isLoading && divisions.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-solarized-base02">No divisions configured</h3>
              <p className="text-solarized-base01 mt-1">Add your first division.</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={divisions}
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

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Department Details</DialogTitle>
            <DialogDescription>View department information</DialogDescription>
          </DialogHeader>
          {viewingDivision && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-solarized-base01">Department Name</Label>
                <p className="font-medium text-solarized-base02">{viewingDivision.title}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-solarized-base01">Office Location</Label>
                <p className="font-medium text-solarized-base02">
                  {viewingDivision.office_location?.title || '-'}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-solarized-base01">Notes</Label>
                <p className="text-solarized-base02">{viewingDivision.notes || '-'}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-solarized-base01">Status</Label>
                <div>
                  <StatusBadge status={viewingDivision.is_active ? 'active' : 'inactive'} />
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
    </div>
  );
}