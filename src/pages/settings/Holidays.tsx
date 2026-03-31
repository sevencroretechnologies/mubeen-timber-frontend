import { useState, useEffect, useCallback } from 'react';
import { settingsService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { StatusBadge } from '../../components/ui/status-badge';
import DataTable, { TableColumn } from 'react-data-table-component';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { Plus, Calendar, Edit, Trash2, MoreHorizontal, Eye, Search, Clock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

interface Holiday {
  id: number;
  title: string;
  holiday_date: string;
  is_recurring: boolean;
  notes?: string;
}

export default function Holidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingHoliday, setViewingHoliday] = useState<Holiday | null>(null);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    holiday_date: '',
    is_recurring: false,
    notes: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchHolidays = useCallback(async (currentPage: number = 1) => {
    setIsLoading(true);
    try {
      const response = await settingsService.getHolidays({
        page: currentPage,
        per_page: perPage,
        search: search
      });
      const { data, meta } = response.data;
      setHolidays(data || []);
      setTotalRows(meta?.total || 0);
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
      showAlert('error', 'Error', 'Failed to fetch holidays');
      setHolidays([]);
      setTotalRows(0);
    } finally {
      setIsLoading(false);
    }
  }, [perPage, search]);

  useEffect(() => {
    fetchHolidays(page);
  }, [page, fetchHolidays]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePerRowsChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!formData.title.trim()) {
      errors.title = 'Holiday Name is required';
      isValid = false;
    } else if (formData.title.length > 255) {
      errors.title = 'Holiday Name must be less than 255 characters';
      isValid = false;
    }

    if (!formData.holiday_date) {
      errors.holiday_date = 'Holiday Date is required';
      isValid = false;
    } else {
      // Validate date format
      const date = new Date(formData.holiday_date);
      if (isNaN(date.getTime())) {
        errors.holiday_date = 'Invalid date format';
        isValid = false;
      }
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
      const payload = {
        title: formData.title,
        holiday_date: formData.holiday_date,
        is_recurring: formData.is_recurring,
        notes: formData.notes || null,
      };

      if (editingHoliday) {
        await settingsService.updateHoliday(editingHoliday.id, payload);
      } else {
        await settingsService.createHoliday(payload);
      }
      showAlert(
        'success',
        'Success!',
        editingHoliday ? 'Holiday updated successfully' : 'Holiday created successfully',
        2000
      );
      setIsDialogOpen(false);
      setEditingHoliday(null);
      resetForm();
      fetchHolidays(page);
    } catch (error: any) {
      console.error('Failed to save holiday:', error);

      // Handle backend validation errors (status 422)
      if (error.response?.status === 422 && error.response?.data?.errors) {
        const apiErrors: Record<string, string> = {};
        Object.keys(error.response.data.errors).forEach((key) => {
          apiErrors[key] = error.response.data.errors[key][0];
        });
        setFieldErrors(apiErrors);
        showAlert('error', 'Validation Error', 'Please fix the errors highlighted below.');
      } else {
        showAlert('error', 'Error', getErrorMessage(error, 'Failed to save holiday'));
      }
    }
  };

  const handleEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      title: holiday.title,
      holiday_date: holiday.holiday_date ? holiday.holiday_date.split('T')[0] : '',
      is_recurring: holiday.is_recurring,
      notes: holiday.notes || '',
    });
    setFieldErrors({}); // Clear any existing errors
    setIsDialogOpen(true);
  };

  const handleView = (holiday: Holiday) => {
    setViewingHoliday(holiday);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    const result = await showConfirmDialog(
      'Are you sure?',
      'You want to delete this holiday?'
    );

    if (!result.isConfirmed) return;

    try {
      await settingsService.deleteHoliday(id);
      showAlert('success', 'Deleted!', 'Holiday deleted successfully', 2000);
      fetchHolidays(page);
    } catch (error: unknown) {
      console.error('Failed to delete holiday:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete holiday'));
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      holiday_date: '',
      is_recurring: false,
      notes: ''
    });
    setFieldErrors({});
  };

  const renderError = (field: string) => {
    return fieldErrors[field] ? (
      <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
    ) : null;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const columns: TableColumn<Holiday>[] = [
    {
      name: "Holiday Name",
      selector: (row) => row.title,
      sortable: true,
      minWidth: "150px",
    },
    {
      name: "Date",
      selector: (row) => row.holiday_date,
      format: (row) => formatDate(row.holiday_date),
      sortable: true,
    },
    {
      name: "Type",
      cell: (row) => (
        <StatusBadge status={row.is_recurring ? 'recurring' : 'one-time'}>
          {row.is_recurring ? 'Recurring' : 'One-time'}
        </StatusBadge>
      ),
      width: "120px",
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">Holidays</h1>
          <p className="text-solarized-base01">Manage company holidays and observances</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-solarized-blue hover:bg-solarized-blue/90"
              onClick={() => {
                setEditingHoliday(null);
                resetForm();
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Holiday
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}</DialogTitle>
              <DialogDescription>
                {editingHoliday ? 'Update the holiday details.' : 'Add a new company holiday.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className={fieldErrors.title ? 'text-red-500' : ''}>
                    Holiday Name *
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({ ...formData, title: e.target.value });
                      if (fieldErrors.title) setFieldErrors(prev => ({ ...prev, title: '' }));
                    }}
                    placeholder="e.g., Christmas Day"
                    className={fieldErrors.title ? 'border-red-500' : ''}
                    maxLength={255}
                  />
                  {renderError('title')}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="holiday_date" className={fieldErrors.holiday_date ? 'text-red-500' : ''}>
                    Date *
                  </Label>
                  <Input
                    id="holiday_date"
                    type="date"
                    value={formData.holiday_date}
                    onChange={(e) => {
                      setFormData({ ...formData, holiday_date: e.target.value });
                      if (fieldErrors.holiday_date) setFieldErrors(prev => ({ ...prev, holiday_date: '' }));
                    }}
                    className={fieldErrors.holiday_date ? 'border-red-500' : ''}
                  />
                  {renderError('holiday_date')}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g., Office closed"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_recurring"
                    checked={formData.is_recurring}
                    onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                    className="h-4 w-4 rounded border-solarized-base1"
                  />
                  <Label htmlFor="is_recurring">Recurring annually</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90">
                  {editingHoliday ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          <form onSubmit={handleSearchSubmit} className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-solarized-base01" />
              <Input
                placeholder="Search holidays..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="outline">
              <Search className="mr-2 h-4 w-4" /> Search
            </Button>
          </form>

          <DataTable
            columns={columns}
            data={holidays}
            progressPending={isLoading}
            pagination
            paginationServer
            paginationTotalRows={totalRows}
            paginationPerPage={perPage}
            paginationRowsPerPageOptions={[10, 20, 50, 100]}
            onChangePage={handlePageChange}
            onChangeRowsPerPage={handlePerRowsChange}
            highlightOnHover
            responsive
            noDataComponent={
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-solarized-base02">No holidays found</h3>
                <p className="text-solarized-base01 mt-1">Add company holidays for the year.</p>
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* View Holiday Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-solarized-blue" />
              Holiday Details
            </DialogTitle>
            <DialogDescription>
              View detailed information about the holiday.
            </DialogDescription>
          </DialogHeader>
          {viewingHoliday && (
            <div className="space-y-6 py-4">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h3 className="text-xl font-bold text-solarized-base02">{viewingHoliday.title}</h3>
                  <StatusBadge status={viewingHoliday.is_recurring ? 'recurring' : 'one-time'} className="mt-2">
                    {viewingHoliday.is_recurring ? 'Recurring' : 'One-time'}
                  </StatusBadge>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-solarized-base01 uppercase tracking-wider font-semibold">Date</Label>
                  <div className="flex items-center gap-2 text-solarized-base02">
                    <div className="w-8 h-8 rounded-full bg-solarized-blue/10 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-solarized-blue" />
                    </div>
                    <span>{formatDate(viewingHoliday.holiday_date)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-solarized-base01 uppercase tracking-wider font-semibold">Recurrence</Label>
                  <div className="flex items-center gap-2 text-solarized-base02">
                    <div className="w-8 h-8 rounded-full bg-solarized-orange/10 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-solarized-orange" />
                    </div>
                    <span>{viewingHoliday.is_recurring ? "Occurs every year on this date" : "One-time observance"}</span>
                  </div>
                </div>

                {viewingHoliday.notes && (
                  <div className="space-y-1">
                    <Label className="text-xs text-solarized-base01 uppercase tracking-wider font-semibold">Notes</Label>
                    <div className="text-solarized-base02 p-3 bg-solarized-base03/10 rounded-md">
                      {viewingHoliday.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {/* {viewingHoliday && (
              <Button 
                className="bg-solarized-blue hover:bg-solarized-blue/90"
                onClick={() => {
                  setIsViewDialogOpen(false);
                  handleEdit(viewingHoliday);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Holiday
              </Button>
            )} */}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}