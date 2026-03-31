import { useState, useEffect } from 'react';
import { settingsService, staffService } from '../../services/api';
import { showAlert, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { StatusBadge } from '../../components/ui/status-badge';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Switch } from '../../components/ui/switch';
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
import {
  CalendarIcon,
  Eye,
  Edit,
  Trash2,
  Plus,
  Bell,
  Check,
  Filter,
  Search,
  MoreHorizontal,
  X,
  Users,
  Star
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

/* =========================
   TYPES
========================= */
interface CompanyNotice {
  id: number;
  title: string;
  content: string;
  publish_date: string;
  expire_date: string | null;
  is_company_wide: boolean;
  is_featured: boolean;
  author_id: number;
  author?: {
    id: number;
    name: string;
    email: string;
  };
  recipients?: StaffMember[];
  created_at: string;
  updated_at: string;
}

interface StaffMember {
  id: number;
  full_name: string;
}

interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
  from: number;
  to: number;
  has_more_pages: boolean;
}

/* =========================
   COMPONENT
========================= */
export default function CompanyNotices() {
  const [notices, setNotices] = useState<CompanyNotice[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    active_only: false,
    featured_only: false,
  });

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<CompanyNotice | null>(null);
  const [viewingNotice, setViewingNotice] = useState<CompanyNotice | null>(null);

  // Staff members for recipients
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    publish_date: new Date().toISOString().split('T')[0], // yyyy-MM-dd format
    expire_date: '',
    is_company_wide: true,
    is_featured: false,
    recipient_ids: [] as number[],
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /* =========================
     FETCH NOTICES
  ========================= */
  useEffect(() => {
    fetchNotices();
  }, [page, filters]);

  useEffect(() => {
    if (search) {
      const debounceTimer = setTimeout(() => {
        fetchNotices();
      }, 500);
      return () => clearTimeout(debounceTimer);
    } else {
      fetchNotices();
    }
  }, [search]);

  const fetchNotices = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        ...filters,
      };
      if (search) params.search = search;

      const response = await settingsService.getAll(params);
      setNotices(response.data.data || []);
      setMeta(response.data.meta);
    } catch (error) {
      console.error('Failed to fetch notices:', error);
      showAlert('error', 'Error', 'Failed to fetch company notices');
    } finally {
      setIsLoading(false);
    }
  };

  /* =========================
     FETCH STAFF MEMBERS
  ========================= */
  useEffect(() => {
    if (!formData.is_company_wide) {
      fetchStaffMembers();
    }
  }, [formData.is_company_wide]);

  const fetchStaffMembers = async () => {
    setIsLoadingStaff(true);
    try {
      const response = await staffService.getAll({ per_page: 100 });
      setStaffMembers(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch staff members:', error);
      setStaffMembers([]);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  /* =========================
     FORM VALIDATION
  ========================= */
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

    if (!formData.content.trim()) {
      errors.content = 'Content is required';
      isValid = false;
    }

    if (!formData.publish_date) {
      errors.publish_date = 'Publish date is required';
      isValid = false;
    } else {
      const publishDate = new Date(formData.publish_date);
      if (isNaN(publishDate.getTime())) {
        errors.publish_date = 'Invalid publish date';
        isValid = false;
      }
    }

    if (formData.expire_date) {
      const expireDate = new Date(formData.expire_date);
      const publishDate = new Date(formData.publish_date);

      if (isNaN(expireDate.getTime())) {
        errors.expire_date = 'Invalid expire date';
        isValid = false;
      } else if (expireDate <= publishDate) {
        errors.expire_date = 'Expire date must be after publish date';
        isValid = false;
      }
    }

    if (!formData.is_company_wide && formData.recipient_ids.length === 0) {
      errors.recipient_ids = 'At least one recipient is required when not company-wide';
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const renderError = (field: string) => {
    return fieldErrors[field] ? (
      <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
    ) : null;
  };

  /* =========================
     FORM HANDLERS
  ========================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    // Frontend validation
    if (!validateForm()) {
      return;
    }

    try {
      const payload = {
        ...formData,
        recipient_ids: formData.is_company_wide ? [] : formData.recipient_ids,
      };

      if (editingNotice) {
        await settingsService.update(editingNotice.id, payload);
        showAlert('success', 'Success!', 'Notice updated successfully', 2000);
      } else {
        await settingsService.create(payload);
        showAlert('success', 'Success!', 'Notice created successfully', 2000);
      }

      setIsDialogOpen(false);
      setEditingNotice(null);
      resetForm();
      fetchNotices();
    } catch (error: any) {
      console.error('Failed to save notice:', error);

      // Handle backend validation errors (status 422)
      if (error.response?.status === 422 && error.response?.data?.errors) {
        const apiErrors: Record<string, string> = {};
        Object.keys(error.response.data.errors).forEach((key) => {
          apiErrors[key] = error.response.data.errors[key][0];
        });
        setFieldErrors(apiErrors);
        showAlert('error', 'Validation Error', 'Please fix the errors highlighted below.');
      } else {
        showAlert('error', 'Error', getErrorMessage(error, 'Failed to save notice'));
      }
    }
  };

  const handleEdit = (notice: CompanyNotice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      content: notice.content,
      publish_date: notice.publish_date.split('T')[0],
      expire_date: notice.expire_date ? notice.expire_date.split('T')[0] : '',
      is_company_wide: notice.is_company_wide,
      is_featured: notice.is_featured,
      recipient_ids: notice.recipients?.map(r => r.id) || [],
    });
    setFieldErrors({}); // Clear any existing errors
    setIsDialogOpen(true);
  };

  const handleView = (notice: CompanyNotice) => {
    setViewingNotice(notice);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    const result = await showAlert(
      'warning',
      'Are you sure?',
      'This action cannot be undone. The notice will be permanently deleted.'
    );

    if (!result.isConfirmed) return;

    try {
      await settingsService.delete(id);
      showAlert('success', 'Deleted!', 'Notice deleted successfully', 2000);
      fetchNotices();
    } catch (error) {
      console.error('Failed to delete notice:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete notice'));
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await settingsService.markAsRead(id);
      showAlert('success', 'Success!', 'Notice marked as read', 1500);
      fetchNotices();
    } catch (error) {
      console.error('Failed to mark notice as read:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to mark notice as read'));
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      publish_date: new Date().toISOString().split('T')[0],
      expire_date: '',
      is_company_wide: true,
      is_featured: false,
      recipient_ids: [],
    });
    setFieldErrors({});
    setEditingNotice(null);
  };

  /* =========================
     HELPER FUNCTIONS
  ========================= */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isExpired = (expireDate: string | null) => {
    if (!expireDate) return false;
    return new Date(expireDate) < new Date();
  };

  const isActive = (publishDate: string, expireDate: string | null) => {
    const now = new Date();
    const publish = new Date(publishDate);
    if (expireDate) {
      const expire = new Date(expireDate);
      return now >= publish && now <= expire;
    }
    return now >= publish;
  };



  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page when searching
  };

  /* =========================
     COLUMNS
  ========================= */
  const columns: TableColumn<CompanyNotice>[] = [
    {
      name: 'Title',
      selector: (row) => row.title,
      sortable: true,
      cell: (row) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.title}</span>
            {row.is_featured && (
              <Badge
                variant="outline"
                className="bg-yellow-100 hover:bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border-transparent flex items-center px-2 py-0.5"
              >
                Featured
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {truncateContent(row.content, 60)}
          </p>
        </div>
      ),
      width: '40%',
    },
    {
      name: 'Status',
      cell: (row) => {
        if (isExpired(row.expire_date)) return <StatusBadge status="expired" />;
        if (isActive(row.publish_date, row.expire_date)) return <StatusBadge status="active" />;
        return <StatusBadge status="scheduled" />;
      },
      width: '120px',
    },
    {
      name: 'Publish Date',
      selector: (row) => row.publish_date,
      format: (row) => formatDate(row.publish_date),
      sortable: true,
      width: '150px',
    },
    {
      name: 'Expire Date',
      selector: (row) => row.expire_date || '',
      format: (row) => row.expire_date ? formatDate(row.expire_date) : '-',
      sortable: true,
      width: '150px',
    },
    {
      name: 'Type',
      cell: (row) => (
        <StatusBadge status={row.is_company_wide ? 'company_wide' : 'specific'}>
          {row.is_company_wide ? 'Company Wide' : 'Specific'}
          {!row.is_company_wide && row.recipients && (
            <span className="ml-1">({row.recipients.length})</span>
          )}
        </StatusBadge>
      ),
      width: '180px',
    },
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
            <DropdownMenuItem onClick={() => handleView(row)}>
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(row)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleMarkAsRead(row.id)}>
              <Check className="mr-2 h-4 w-4" />
              Mark as Read
            </DropdownMenuItem>
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
      button: true,
      width: '80px',
    },
  ];

  const handlePageChange = (page: number) => {
    setPage(page);
  };

  const handlePerRowsChange = async (_newPerPage: number, page: number) => {
    setPage(page);
  };

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Company Notices</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage company-wide announcements and notices</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-solarized-blue hover:bg-solarized-blue/90 text-white"
              onClick={() => {
                setEditingNotice(null);
                resetForm();
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Notice
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingNotice ? 'Edit Notice' : 'Create Notice'}
              </DialogTitle>
              <DialogDescription>
                {editingNotice
                  ? 'Update the company notice details'
                  : 'Create a new company notice or announcement'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                {/* Title */}
                <div>
                  <Label htmlFor="title" className={fieldErrors.title ? 'text-red-500' : ''}>
                    Title *
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({ ...formData, title: e.target.value });
                      if (fieldErrors.title) setFieldErrors(prev => ({ ...prev, title: '' }));
                    }}
                    placeholder="Enter notice title"
                    className={fieldErrors.title ? 'border-red-500' : ''}
                    maxLength={255}
                  />
                  {renderError('title')}
                </div>

                {/* Content */}
                <div>
                  <Label htmlFor="content" className={fieldErrors.content ? 'text-red-500' : ''}>
                    Content *
                  </Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => {
                      setFormData({ ...formData, content: e.target.value });
                      if (fieldErrors.content) setFieldErrors(prev => ({ ...prev, content: '' }));
                    }}
                    placeholder="Enter notice content..."
                    rows={8}
                    className={fieldErrors.content ? 'border-red-500' : ''}
                  />
                  {renderError('content')}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="publish_date" className={fieldErrors.publish_date ? 'text-red-500' : ''}>
                      Publish Date *
                    </Label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="publish_date"
                        type="date"
                        value={formData.publish_date}
                        onChange={(e) => {
                          setFormData({ ...formData, publish_date: e.target.value });
                          if (fieldErrors.publish_date) setFieldErrors(prev => ({ ...prev, publish_date: '' }));
                          if (fieldErrors.expire_date) setFieldErrors(prev => ({ ...prev, expire_date: '' }));
                        }}
                        className={`pl-10 ${fieldErrors.publish_date ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {renderError('publish_date')}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expire_date" className={fieldErrors.expire_date ? 'text-red-500' : ''}>
                      Expire Date (Optional)
                    </Label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="expire_date"
                        type="date"
                        value={formData.expire_date}
                        onChange={(e) => {
                          setFormData({ ...formData, expire_date: e.target.value });
                          if (fieldErrors.expire_date) setFieldErrors(prev => ({ ...prev, expire_date: '' }));
                        }}
                        className={`pl-10 ${fieldErrors.expire_date ? 'border-red-500' : ''}`}
                        min={formData.publish_date}
                      />
                    </div>
                    {renderError('expire_date')}
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Company Wide</Label>
                      <p className="text-sm text-gray-500">
                        Send this notice to all staff members
                      </p>
                    </div>
                    <Switch
                      checked={formData.is_company_wide}
                      onCheckedChange={(checked) => {
                        setFormData({ ...formData, is_company_wide: checked });
                        if (!checked && fieldErrors.recipient_ids) {
                          setFieldErrors(prev => ({ ...prev, recipient_ids: '' }));
                        }
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Featured Notice</Label>
                      <p className="text-sm text-gray-500">
                        Pin this notice to the top
                      </p>
                    </div>
                    <Switch
                      checked={formData.is_featured}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_featured: checked })
                      }
                    />
                  </div>
                </div>

                {/* Recipients (if not company-wide) */}
                {!formData.is_company_wide && (
                  <div>
                    <Label className={fieldErrors.recipient_ids ? 'text-red-500' : ''}>Recipients *</Label>
                    <p className="text-sm text-gray-500 mb-2">
                      Select specific staff members who should receive this notice
                    </p>
                    {isLoadingStaff ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <div className="space-y-3">
                        <Select
                          value=""
                          onValueChange={(value) => {
                            const id = parseInt(value);
                            if (!formData.recipient_ids.includes(id)) {
                              setFormData({
                                ...formData,
                                recipient_ids: [...formData.recipient_ids, id],
                              });
                              if (fieldErrors.recipient_ids) {
                                setFieldErrors(prev => ({ ...prev, recipient_ids: '' }));
                              }
                            }
                          }}
                        >
                          <SelectTrigger className={fieldErrors.recipient_ids ? 'border-red-500' : ''}>
                            <SelectValue placeholder="Select staff members..." />
                          </SelectTrigger>
                          <SelectContent>
                            {staffMembers
                              .filter(staff => !formData.recipient_ids.includes(staff.id))
                              .map((staff) => (
                                <SelectItem key={staff.id} value={staff.id.toString()}>
                                  {staff.full_name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {renderError('recipient_ids')}

                        {/* Selected recipients */}
                        {formData.recipient_ids.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm">Selected Recipients:</Label>
                            <div className="flex flex-wrap gap-2">
                              {formData.recipient_ids.map((id) => {
                                const staff = staffMembers.find(s => s.id === id);
                                return staff ? (
                                  <Badge
                                    key={id}
                                    variant="secondary"
                                    className="flex items-center gap-1 pl-2"
                                  >
                                    {staff.full_name}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormData({
                                          ...formData,
                                          recipient_ids: formData.recipient_ids.filter(rid => rid !== id),
                                        });
                                      }}
                                      className="ml-1 hover:text-red-500 p-1"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90">
                  {editingNotice ? 'Update' : 'Create'} Notice
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* FILTERS AND SEARCH */}
      <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search notices..."
                  value={search}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Button
                variant={filters.active_only ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setFilters({ ...filters, active_only: !filters.active_only });
                  setPage(1);
                }}
                className={filters.active_only ? "bg-green-600 hover:bg-green-700" : ""}
              >
                <Filter className="mr-2 h-4 w-4" />
                Active Only
              </Button>
              <Button
                variant={filters.featured_only ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setFilters({ ...filters, featured_only: !filters.featured_only });
                  setPage(1);
                }}
                className={filters.featured_only ? "bg-yellow-600 hover:bg-yellow-700" : ""}
              >
                <Star className="mr-2 h-4 w-4" />
                Featured
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* STATS */}
      <div className="grid gap-6 sm:grid-cols-4">
        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Notices</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{meta?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Bell className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {notices.filter(n => isActive(n.publish_date, n.expire_date)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Featured</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {notices.filter(n => n.is_featured).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <Bell className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Expired</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {notices.filter(n => isExpired(n.expire_date)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NOTICES TABLE */}
      <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
        <CardHeader>
          <CardTitle>Company Notices</CardTitle>
          <CardDescription>
            {filters.active_only && 'Showing active notices only. '}
            {filters.featured_only && 'Showing featured notices only. '}
            {search && `Search results for "${search}"`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : notices.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No notices found</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {search || filters.active_only || filters.featured_only
                  ? 'Try changing your search or filters'
                  : 'Create your first company notice'}
              </p>
              <Button
                className="bg-solarized-blue hover:bg-solarized-blue/90 text-white"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Notice
              </Button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={notices}
              progressPending={isLoading}
              pagination
              paginationServer
              paginationTotalRows={meta?.total || 0}
              paginationPerPage={meta?.per_page || 15}
              paginationDefaultPage={page}
              onChangePage={handlePageChange}
              onChangeRowsPerPage={handlePerRowsChange}
              highlightOnHover
              responsive
              noDataComponent={
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No notices found</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {search || filters.active_only || filters.featured_only
                      ? 'Try changing your search or filters'
                      : 'Create your first company notice'}
                  </p>
                  <Button
                    className="bg-solarized-blue hover:bg-solarized-blue/90 text-white mt-4"
                    onClick={() => setIsDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Notice
                  </Button>
                </div>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* VIEW NOTICE DIALOG */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="text-xl">Notice Details</DialogTitle>
          </DialogHeader>

          {viewingNotice && (
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {viewingNotice.title}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {(() => {
                    if (isExpired(viewingNotice.expire_date)) return <StatusBadge status="expired" />;
                    if (isActive(viewingNotice.publish_date, viewingNotice.expire_date)) return <StatusBadge status="active" />;
                    return <StatusBadge status="scheduled" />;
                  })()}
                  {viewingNotice.is_featured && (
                    <Badge
                      variant="outline"
                      className="bg-yellow-100 hover:bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border-transparent flex items-center px-2 py-0.5"
                    >
                      Featured
                    </Badge>
                  )}
                  <StatusBadge status={viewingNotice.is_company_wide ? 'company_wide' : 'specific'}>
                    {viewingNotice.is_company_wide ? 'Company Wide' : 'Specific Recipients'}
                  </StatusBadge>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                    Publish Date
                  </Label>
                  <p className="font-medium text-gray-900 dark:text-gray-100 mt-1">
                    {formatDate(viewingNotice.publish_date)}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                    Expire Date
                  </Label>
                  <p className="font-medium text-gray-900 dark:text-gray-100 mt-1">
                    {viewingNotice.expire_date ? formatDate(viewingNotice.expire_date) : 'No expiration'}
                  </p>
                </div>
              </div>

              {!viewingNotice.is_company_wide && viewingNotice.recipients && viewingNotice.recipients.length > 0 && (
                <div>
                  <Label className="text-gray-500 dark:text-gray-400 text-sm font-medium block mb-2">
                    Recipients
                  </Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {viewingNotice.recipients.map((recipient) => (
                      <Badge
                        key={recipient.id}
                        variant="secondary"
                        className="flex items-center gap-1 pl-2"
                      >
                        <Users className="h-3 w-3" />
                        {recipient.full_name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-gray-500 dark:text-gray-400 text-sm font-medium block mb-2">
                  Content
                </Label>
                <div className="mt-1 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {viewingNotice.content}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <Label className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                    Created By
                  </Label>
                  <p className="font-medium text-gray-900 dark:text-gray-100 mt-1">
                    {viewingNotice.author?.name || 'Unknown'}
                  </p>
                  {viewingNotice.author?.email && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {viewingNotice.author.email}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                    Created At
                  </Label>
                  <p className="font-medium text-gray-900 dark:text-gray-100 mt-1">
                    {formatDate(viewingNotice.created_at)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}