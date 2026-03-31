import { useState, useEffect, useCallback } from 'react';
import { payrollService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Plus, Shield, CheckCircle, Eye, Edit, Trash2, MoreHorizontal, Search } from 'lucide-react';

interface WithholdingType {
  id: number;
  title: string;
  notes: string | null;
  is_statutory: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  recurringDeductions?: {
    id: number;
    description: string;
  }[];
}

export default function WithholdingTypes() {
  const [withholdingTypes, setWithholdingTypes] = useState<WithholdingType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Pagination & Sorting State
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedType, setSelectedType] = useState<WithholdingType | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    notes: '',
    is_statutory: false,
    is_active: true,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ================= FETCH WITHHOLDING TYPES =================
  const fetchWithholdingTypes = useCallback(
    async (currentPage: number = 1) => {
      setIsLoading(true);
      try {
        const params: Record<string, unknown> = {
          page: currentPage,
          per_page: perPage,
          search: searchQuery,
          paginate: true,
        };

        if (sortField) {
          params.order_by = sortField;
          params.order = sortDirection;
        }

        const response = await payrollService.getWithholdingTypes(params);
        const { data, meta } = response.data;

        if (Array.isArray(data)) {
          setWithholdingTypes(data);
          setTotalRows(meta?.total ?? 0);
        } else {
          setWithholdingTypes([]);
          setTotalRows(0);
        }
      } catch (error) {
        console.error('Failed to fetch deduction types:', error);
        showAlert('error', 'Error', getErrorMessage(error, 'Failed to fetch deduction types'));
        setWithholdingTypes([]);
        setTotalRows(0);
      } finally {
        setIsLoading(false);
      }
    },
    [perPage, searchQuery, sortField, sortDirection]
  );

  useEffect(() => {
    fetchWithholdingTypes(page);
  }, [page, fetchWithholdingTypes]);

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
  const handleSort = (column: TableColumn<WithholdingType>, direction: 'asc' | 'desc') => {
    const columnId = String(column.id || '');
    if (columnId === 'title' || column.name === 'Title') {
      setSortField('title');
      setSortDirection(direction);
      setPage(1);
    }
  };

  // ================= CRUD OPERATIONS =================
  const resetForm = () => {
    setIsEditMode(false);
    setSelectedType(null);
    setFieldErrors({});
    setFormData({
      title: '',
      notes: '',
      is_statutory: false,
      is_active: true,
    });
  };

  const handleAddClick = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleViewClick = (type: WithholdingType) => {
    setSelectedType(type);
    setIsViewOpen(true);
  };

  const handleEditClick = (type: WithholdingType) => {
    setIsEditMode(true);
    setSelectedType(type);
    setFieldErrors({});
    setFormData({
      title: type.title,
      notes: type.notes || '',
      is_statutory: type.is_statutory,
      is_active: type.is_active,
    });
    setIsDialogOpen(true);
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

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (!validateForm()) return;

    try {
      if (isEditMode && selectedType) {
        await payrollService.updateWithholdingType(selectedType.id, formData);
        showAlert('success', 'Success', 'Deduction Types updated successfully', 2000);
      } else {
        await payrollService.createWithholdingType(formData);
        showAlert('success', 'Success', 'Deduction Types created successfully', 2000);
      }

      setIsDialogOpen(false);
      resetForm();
      fetchWithholdingTypes(page);
    } catch (err: any) {
      console.error('Failed to save deduction type:', err);

      const message = getErrorMessage(err, 'Failed to save deduction type');

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
      'Delete Deduction Types',
      'Are you sure you want to delete this deduction type?'
    );

    if (!result.isConfirmed) return;

    try {
      await payrollService.deleteWithholdingType(id);
      showAlert('success', 'Deleted!', 'Deduction Types deleted successfully', 2000);
      fetchWithholdingTypes(page);
    } catch (error) {
      console.error('Failed to delete deduction type:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete deduction type'));
    }
  };

  // ================= HELPERS =================
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const renderError = (field: string) => {
    return fieldErrors[field] ? (
      <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
    ) : null;
  };

  const activeCount = withholdingTypes.filter(type => type.is_active).length;
  const statutoryCount = withholdingTypes.filter(type => type.is_statutory).length;

  // ================= TABLE COLUMNS =================
  const columns: TableColumn<WithholdingType>[] = [
    {
      id: 'title',
      name: 'Title',
      selector: (row) => row.title,
      cell: (row) => <span className="font-medium">{row.title}</span>,
      sortable: true,
    },
    {
      name: 'Notes',
      selector: (row) => row.notes || '-',
      cell: (row) => (
        <span className="text-sm text-solarized-base01 line-clamp-2">
          {row.notes || '-'}
        </span>
      ),
    },
    {
      name: 'Statutory',
      cell: (row) => (
        <Badge
          className={
            row.is_statutory
              ? 'bg-solarized-yellow/10 text-solarized-yellow'
              : 'bg-solarized-base01/10 text-solarized-base01'
          }
        >
          {row.is_statutory ? 'Yes' : 'No'}
        </Badge>
      ),
      // width: '100px',
    },
    {
      name: 'Status',
      cell: (row) => (
        <Badge
          className={
            row.is_active
              ? 'bg-solarized-green/10 text-solarized-green'
              : 'bg-solarized-red/10 text-solarized-red'
          }
        >
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
      // width: '100px',
    },
    // {
    //   name: 'Created',
    //   selector: (row) => row.created_at,
    //   cell: (row) => <span className="text-sm">{formatDate(row.created_at)}</span>,
    //   width: '120px',
    // },
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
            <DropdownMenuItem
              onClick={() => handleDelete(row.id)}
              className="text-solarized-red"
              disabled={row.recurringDeductions && row.recurringDeductions.length > 0}
            >
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
          <h1 className="text-2xl font-bold text-solarized-base02">Deduction Types</h1>
          <p className="text-solarized-base01">Manage deduction types for payroll system</p>
        </div>
        <Button className="bg-solarized-blue hover:bg-solarized-blue/90" onClick={handleAddClick}>
          <Plus className="mr-2 h-4 w-4" />
          Add Deduction Types
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-solarized-blue/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-solarized-blue" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Total Types</p>
                <p className="text-2xl font-bold text-solarized-base02">
                  {totalRows || withholdingTypes.length}
                </p>
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
                <p className="text-sm text-solarized-base01">Active Types</p>
                <p className="text-2xl font-bold text-solarized-base02">{activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-solarized-yellow/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-solarized-yellow" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Statutory Types</p>
                <p className="text-2xl font-bold text-solarized-base02">{statutoryCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABLE */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Deduction Types List</CardTitle>
          <form onSubmit={handleSearchSubmit} className="flex gap-4 mt-4">
            <Input
              placeholder="Search by title..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <Button type="submit" variant="outline">
              <Search className="mr-2 h-4 w-4" /> Search
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {!isLoading && withholdingTypes.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="mx-auto h-12 w-12 text-solarized-base01 mb-4" />
              <h3 className="text-lg font-medium text-solarized-base02">No deduction types found</h3>
              <p className="text-solarized-base01 mt-1">Create your first deduction type to get started.</p>
              <Button
                className="mt-4 bg-solarized-blue hover:bg-solarized-blue/90"
                onClick={handleAddClick}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Deduction Type
              </Button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={withholdingTypes}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Deduction Types Details</DialogTitle>
            <DialogDescription>View the details of this deduction type</DialogDescription>
          </DialogHeader>

          {selectedType && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-solarized-base01">Title</Label>
                <p className="font-medium text-lg">{selectedType.title}</p>
              </div>

              <div>
                <Label className="text-solarized-base01">Notes</Label>
                <p className="text-sm">{selectedType.notes || 'No notes provided'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-solarized-base01">Statutory</Label>
                  <div className="mt-1">
                    <Badge
                      className={
                        selectedType.is_statutory
                          ? 'bg-solarized-yellow/10 text-solarized-yellow'
                          : 'bg-solarized-base01/10 text-solarized-base01'
                      }
                    >
                      {selectedType.is_statutory ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-solarized-base01">Status</Label>
                  <div className="mt-1">
                    <Badge
                      className={
                        selectedType.is_active
                          ? 'bg-solarized-green/10 text-solarized-green'
                          : 'bg-solarized-red/10 text-solarized-red'
                      }
                    >
                      {selectedType.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-xs text-solarized-base01">Created At</Label>
                  <p className="text-sm">{formatDate(selectedType.created_at)}</p>
                </div>
                <div>
                  <Label className="text-xs text-solarized-base01">Updated At</Label>
                  <p className="text-sm">{formatDate(selectedType.updated_at)}</p>
                </div>
              </div> */}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
            {/* <Button
              className="bg-solarized-blue hover:bg-solarized-blue/90"
              onClick={() => {
                if (selectedType) {
                  handleEditClick(selectedType);
                  setIsViewOpen(false);
                }
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button> */}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD/EDIT DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setIsDialogOpen(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Deduction Types' : 'Add Deduction Types'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? 'Update the details of this deduction type'
                : 'Add a new deduction type to the system'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title" className={fieldErrors.title ? 'text-red-500' : ''}>Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (fieldErrors.title) setFieldErrors(prev => ({ ...prev, title: '' }));
                  }}
                  placeholder="e.g., Income Tax"
                  className={fieldErrors.title ? 'border-red-500' : ''}
                />
                {renderError('title')}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className={fieldErrors.notes ? 'text-red-500' : ''}>Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => {
                    setFormData({ ...formData, notes: e.target.value });
                    if (fieldErrors.notes) setFieldErrors(prev => ({ ...prev, notes: '' }));
                  }}
                  placeholder="Optional notes about this Deduction Types..."
                  rows={3}
                  className={fieldErrors.notes ? 'border-red-500' : ''}
                />
                {renderError('notes')}
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="is_statutory">Statutory</Label>
                  <p className="text-sm text-solarized-base01">
                    Required by law
                  </p>
                </div>
                <Switch
                  id="is_statutory"
                  checked={formData.is_statutory}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_statutory: checked })}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Active</Label>
                  <p className="text-sm text-solarized-base01">
                    Currently in use
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                resetForm();
                setIsDialogOpen(false);
              }}>
                Cancel
              </Button>
              <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90">
                {isEditMode ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
