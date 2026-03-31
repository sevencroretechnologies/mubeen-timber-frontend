import { useState, useEffect, useCallback } from 'react';
import { leaveService, staffService } from '../../services/api';
import { showAlert } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import DataTable, { TableColumn } from 'react-data-table-component';
import {
  Calendar,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Filter,
  Download,
  MoreVertical,
  Edit,
  Trash2,
  Ban,
  View,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

interface StaffMember {
  id: number;
  full_name: string;
  staff_code?: string;
}

interface LeaveRequest {
  id: number;
  staff_member?: {
    id: number;
    full_name: string;
    staff_code?: string;
  };
  category?: {
    id: number;
    title: string;
  };
  start_date: string;
  end_date: string;
  total_days: string | number;
  reason: string;
  approval_status: string;
  created_at: string;
  approved_at?: string;
  approved_by?: {
    id: number;
    name: string;
  };
  approval_remarks?: string;
}

interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
  role_display: string;
  roles: string[];
  permissions: string[];
  primary_role: string;
  primary_role_icon: string;
  primary_role_hierarchy: number;
  staff_member_id: number | null;
}

export default function AllLeaveRequests() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);

  // Initialize user data from localStorage immediately to prevent double-fetch/flicker
  const [currentUser, setCurrentUser] = useState<UserData | null>(() => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  });

  const [isAdminUser, setIsAdminUser] = useState(() => {
    if (!currentUser) {
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) return false;
        const userData = JSON.parse(userStr);
        const adminRoles = ['admin', 'administrator', 'org', 'organisation', 'company', 'hr'];
        const userRoles = userData.roles || [userData.role];
        return userRoles.some((role: string) => adminRoles.includes(role.toLowerCase()));
      } catch {
        return false;
      }
    }
    const adminRoles = ['admin', 'administrator', 'org', 'organisation', 'company', 'hr'];
    const userRoles = currentUser.roles || [currentUser.role];
    return userRoles.some((role: string) => adminRoles.includes(role.toLowerCase()));
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Dialogs
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [viewingRequest, setViewingRequest] = useState<LeaveRequest | null>(null);
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
  const [actionRequest, setActionRequest] = useState<LeaveRequest | null>(null);
  const [editReason, setEditReason] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  // Fetch staff members for filter
  useEffect(() => {
    const fetchStaffMembers = async () => {
      if (!isAdminUser) return;

      setIsLoadingStaff(true);
      try {
        const response = await staffService.getAll({ per_page: 100 });
        setStaffMembers(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch staff members:', error);
        showAlert('error', 'Error', 'Failed to fetch staff members');
      } finally {
        setIsLoadingStaff(false);
      }
    };

    if (isAdminUser) {
      fetchStaffMembers();
    }
  }, [isAdminUser]);

  // ================= FETCH REQUESTS =================
  const fetchRequests = useCallback(
    async (currentPage: number = 1) => {
      setIsLoading(true);
      try {
        const params: Record<string, unknown> = {
          page: currentPage,
          per_page: perPage,
        };

        if (statusFilter !== 'all') params.status = statusFilter;
        if (staffFilter !== 'all') params.staff_member_id = staffFilter;
        if (startDateFilter) params.start_date = startDateFilter;
        if (endDateFilter) params.end_date = endDateFilter;
        if (searchFilter) params.search = searchFilter;

        // Use appropriate endpoint based on user role
        const response = isAdminUser
          ? await leaveService.getRequests(params)
          : await leaveService.getMyRequests(params);

        const { data, meta } = response.data;

        if (Array.isArray(data)) {
          setRequests(data);
          setTotalRows(meta?.total ?? 0);
        } else {
          setRequests([]);
          setTotalRows(0);
        }
      } catch (error) {
        console.error('Failed to fetch leave requests:', error);
        showAlert('error', 'Error', 'Failed to fetch leave requests');
        setRequests([]);
        setTotalRows(0);
      } finally {
        setIsLoading(false);
      }
    },
    [perPage, statusFilter, staffFilter, startDateFilter, endDateFilter, searchFilter, isAdminUser]
  );

  useEffect(() => {
    fetchRequests(page);
  }, [page, fetchRequests]);

  // ================= PAGINATION =================
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePerRowsChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  // ================= HANDLERS =================
  const handleView = (request: LeaveRequest) => {
    setViewingRequest(request);
    setIsViewDialogOpen(true);
  };

  const handleEditClick = (request: LeaveRequest) => {
    setEditingRequest(request);
    setEditReason(request.reason || '');
    setEditStartDate(request.start_date.split('T')[0]);
    setEditEndDate(request.end_date.split('T')[0]);
    setIsEditDialogOpen(true);
  };

  const handleCancelClick = (request: LeaveRequest) => {
    setActionRequest(request);
    setIsCancelDialogOpen(true);
  };

  const handleDeleteClick = (request: LeaveRequest) => {
    setActionRequest(request);
    setIsDeleteDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!editingRequest) return;

    try {
      const response = await leaveService.updateRequest(editingRequest.id, {
        reason: editReason,
        start_date: editStartDate,
        end_date: editEndDate,
      });

      if (response.data.success) {
        showAlert('success', 'Success', 'Leave request updated successfully');
        fetchRequests(page);
        setIsEditDialogOpen(false);
        setEditingRequest(null);
      }
    } catch (error) {
      console.error('Failed to update leave request:', error);
      showAlert('error', 'Error', 'Failed to update leave request');
    }
  };

  const handleCancel = async () => {
    if (!actionRequest) return;

    try {
      const response = await leaveService.cancelRequest(actionRequest.id);

      if (response.data.success) {
        showAlert('success', 'Success', 'Leave request cancelled');
        fetchRequests(page);
        setIsCancelDialogOpen(false);
        setActionRequest(null);
      }
    } catch (error) {
      console.error('Failed to cancel leave request:', error);
      showAlert('error', 'Error', 'Failed to cancel leave request');
    }
  };

  const handleDelete = async () => {
    if (!actionRequest) return;

    try {
      const response = await leaveService.deleteRequest(actionRequest.id);

      if (response.data.success) {
        showAlert('success', 'Success', 'Leave request deleted');
        fetchRequests(page);
        setIsDeleteDialogOpen(false);
        setActionRequest(null);
      }
    } catch (error) {
      console.error('Failed to delete leave request:', error);
      showAlert('error', 'Error', 'Failed to delete leave request');
    }
  };



  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'declined':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ================= TABLE COLUMNS =================
  const columns: TableColumn<LeaveRequest>[] = [
    // ...(isAdminUser ? [{
    //   name: 'Employee',
    //   cell: (row) => (
    //     <div>
    //       <p className="font-medium">{row.staff_member?.full_name || 'Unknown'}</p>
    //       {row.staff_member?.staff_code && (
    //         <p className="text-xs text-solarized-base01">{row.staff_member.staff_code}</p>
    //       )}
    //     </div>
    //   ),
    //   minWidth: '150px',
    // }] : []),
    {
      name: 'Leave Type',
      cell: (row) => (
        <Badge className="bg-blue-100 text-blue-800">
          {row.category?.title || 'Unknown'}
        </Badge>
      ),
      minWidth: '120px',
    },
    {
      name: 'Date Range',
      cell: (row) => (
        <div>
          <p>{formatDate(row.start_date)}</p>
          <p className="text-xs text-solarized-base01">to</p>
          <p>{formatDate(row.end_date)}</p>
        </div>
      ),
      minWidth: '140px',
    },
    {
      name: 'Days',
      selector: (row) => Math.floor(Number(row.total_days)),
      cell: (row) => Math.floor(Number(row.total_days)),
      sortable: true,
      width: '80px',
    },
    {
      name: 'Status',
      cell: (row) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(row.approval_status)}
          <StatusBadge status={row.approval_status} />
        </div>
      ),
      minWidth: '120px',
    },
    {
      name: 'Applied On',
      selector: (row) => formatDate(row.created_at),
      sortable: true,
      minWidth: '120px',
    },
    {
      name: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-2">
          {/* <Button
            variant="ghost"
            size="icon"
            onClick={() => handleView(row)}
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button> */}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleView(row)}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              {row.approval_status === 'pending' && (
                <DropdownMenuItem onClick={() => handleEditClick(row)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}

              {(row.approval_status === 'pending' || row.approval_status === 'approved') && (
                <DropdownMenuItem onClick={() => handleCancelClick(row)}>
                  <Ban className="mr-2 h-4 w-4" />
                  Cancel
                </DropdownMenuItem>
              )}

              {row.approval_status === 'pending' && (
                <DropdownMenuItem
                  onClick={() => handleDeleteClick(row)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      ignoreRowClick: true,
      width: '120px',
    },
  ];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">
            {isAdminUser ? 'All Leave Requests' : 'My Leave Requests'}
          </h1>
          <p className="text-solarized-base01">
            {isAdminUser
              ? 'Manage leave requests from staff members'
              : 'View and manage your leave requests'}
          </p>
        </div>
        {!isAdminUser && (
          <a href="/leave/apply">
            <Button className="bg-solarized-blue hover:bg-solarized-blue/90">
              Apply Leave
            </Button>
          </a>
        )}
      </div>

      {/* FILTERS - Only show for admin */}
      {isAdminUser && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee">Employee</Label>
                <Select value={staffFilter} onValueChange={setStaffFilter} disabled={isLoadingStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {staffMembers.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id.toString()}>
                        {staff.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter('all');
                  setStaffFilter('all');
                  setStartDateFilter('');
                  setEndDateFilter('');
                  setSearchFilter('');
                  setPage(1);
                }}
              >
                Clear Filters
              </Button>
              <Button
                onClick={() => fetchRequests(1)}
                disabled={isLoading}
                className="bg-solarized-blue hover:bg-solarized-blue/90"
              >
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STATS SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-solarized-base01">Total Requests</p>
                <p className="text-2xl font-bold">{totalRows}</p>
              </div>
              <Calendar className="h-8 w-8 text-solarized-blue" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-solarized-base01">Pending</p>
                <p className="text-2xl font-bold">
                  {requests.filter(r => r.approval_status === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-solarized-yellow" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-solarized-base01">Approved</p>
                <p className="text-2xl font-bold">
                  {requests.filter(r => r.approval_status === 'approved').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-solarized-green" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-solarized-base01">Declined</p>
                <p className="text-2xl font-bold">
                  {requests.filter(r => r.approval_status === 'declined').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-solarized-red" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABLE */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg">
              {isAdminUser ? 'All Leave Requests' : 'My Leave History'}
            </CardTitle>
            <div className="flex items-center gap-4">
              {!isAdminUser && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Requests</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {/* <Button
                variant="outline"
                onClick={() => fetchRequests(1)}
                disabled={isLoading}
              >
                Refresh
              </Button> */}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {!isLoading && requests.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-solarized-base01">No leave requests found</p>
              <p className="text-sm text-solarized-base01 mt-2">
                Try adjusting your filters or check back later.
              </p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={requests}
              progressPending={isLoading}
              pagination
              paginationServer
              paginationTotalRows={totalRows}
              paginationPerPage={perPage}
              paginationRowsPerPageOptions={[5, 10, 15, 20]}
              paginationDefaultPage={page}
              onChangePage={handlePageChange}
              onChangeRowsPerPage={handlePerRowsChange}
              highlightOnHover
              responsive
              noHeader
            />
          )}
        </CardContent>
      </Card>

      {/* VIEW DIALOG */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
            <DialogDescription>
              Details of leave request
            </DialogDescription>
          </DialogHeader>

          {viewingRequest && (
            <div className="space-y-6">
              {isAdminUser && (
                <div>
                  <p className="text-sm text-solarized-base01">Employee</p>
                  <p className="font-medium">
                    {viewingRequest.staff_member?.full_name || '-'}
                  </p>
                  {viewingRequest.staff_member?.staff_code && (
                    <p className="text-xs text-solarized-base01">
                      {viewingRequest.staff_member.staff_code}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {isAdminUser && (
                  <div>
                    <p className="text-sm text-solarized-base01">Leave Type</p>
                    <p className="font-medium">
                      {viewingRequest.category?.title || '-'}
                    </p>
                  </div>
                )}
                {!isAdminUser && (
                  <>
                    <div>
                      <p className="text-sm text-solarized-base01">Leave Type</p>
                      <p className="font-medium">
                        {viewingRequest.category?.title || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-solarized-base01">Status</p>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={viewingRequest.approval_status} />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-solarized-base01">Start Date</p>
                  <p>{formatDate(viewingRequest.start_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-solarized-base01">End Date</p>
                  <p>{formatDate(viewingRequest.end_date)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-solarized-base01">Total Days</p>
                  <p className="text-lg font-semibold">{Math.floor(Number(viewingRequest.total_days))} day(s)</p>
                </div>
                {isAdminUser && (
                  <div>
                    <p className="text-sm text-solarized-base01">Status</p>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={viewingRequest.approval_status} />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-solarized-base01">Reason</p>
                <p className="mt-1 p-3 bg-solarized-base3 rounded-lg">
                  {viewingRequest.reason || 'No reason provided'}
                </p>
              </div>

              <div>
                <p className="text-sm text-solarized-base01">Applied On</p>
                <p>{formatDateTime(viewingRequest.created_at)}</p>
              </div>

              {viewingRequest.approval_status !== 'pending' && (
                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-solarized-base01">Decision By</p>
                      <p className="font-medium">
                        {viewingRequest.approved_by?.name || 'System'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-solarized-base01">Decision Date</p>
                      <p>{viewingRequest.approved_at ? formatDateTime(viewingRequest.approved_at) : '-'}</p>
                    </div>
                  </div>
                  {viewingRequest.approval_remarks && (
                    <div className="mt-3">
                      <p className="text-sm text-solarized-base01">Remarks</p>
                      <p className="mt-1 p-3 bg-solarized-base3 rounded-lg">
                        {viewingRequest.approval_remarks}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOGS */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Leave Request</DialogTitle>
            <DialogDescription>
              Update your leave request details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-start-date">Start Date *</Label>
              <Input
                id="edit-start-date"
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-end-date">End Date *</Label>
              <Input
                id="edit-end-date"
                type="date"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-reason">Reason (Optional)</Label>
              <Textarea
                id="edit-reason"
                placeholder="Update your reason for leave..."
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                rows={3}
              />
            </div>

            {editingRequest && (
              <div className="bg-solarized-base3 p-3 rounded-lg">
                <p className="text-sm text-solarized-base01">Original Request:</p>
                <p className="font-medium">{editingRequest?.category?.title} - {Math.floor(Number(editingRequest.total_days))} day(s)</p>
                <p className="text-sm">
                  {formatDate(editingRequest.start_date)} to {formatDate(editingRequest.end_date)}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-solarized-blue hover:bg-solarized-blue/90"
              onClick={handleEdit}
            >
              Update Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CANCEL DIALOG */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Leave Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this leave request?
            </DialogDescription>
          </DialogHeader>

          {actionRequest && (
            <div className="bg-solarized-base3 p-3 rounded-lg">
              <p className="font-medium">{actionRequest?.category?.title} - {Math.floor(Number(actionRequest.total_days))} day(s)</p>
              <p className="text-sm">
                {formatDate(actionRequest.start_date)} to {formatDate(actionRequest.end_date)}
              </p>
              <p className="text-sm mt-2">Status: <StatusBadge status={actionRequest.approval_status} /></p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
              No, Keep It
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
            >
              Yes, Cancel Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Leave Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this leave request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {actionRequest && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
              <p className="font-medium text-red-800">{actionRequest?.category?.title} - {Math.floor(Number(actionRequest.total_days))} day(s)</p>
              <p className="text-sm text-red-600">
                {formatDate(actionRequest.start_date)} to {formatDate(actionRequest.end_date)}
              </p>
              <p className="text-sm mt-2 text-red-600">Status: <span className="font-medium">{actionRequest.approval_status}</span></p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Yes, Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
