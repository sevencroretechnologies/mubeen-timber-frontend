import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService, roleService } from '../../services/api';
import { showAlert, getErrorMessage } from '../../lib/sweetalert';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { StatusBadge } from '../../components/ui/status-badge';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import DataTable, { TableColumn } from 'react-data-table-component';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Skeleton } from '../../components/ui/skeleton';
import { Plus, Search, Users as UsersIcon, Shield, MoreHorizontal, Eye, Edit, UserCog, Mail, Calendar, Building } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

interface Role {
  id: number;
  name: string;
  is_system: boolean;
  hierarchy_level: number;
  description: string | null;
}

interface User {
  id: number;
  name: string;
  email: string;
  roles: { name: string }[];
  is_active: boolean;
  created_at: string;
  primary_role?: string;
  organization_name?: string;
  company_name?: string;
  roles_list?: string[];
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export default function UsersByOrg() {
  const navigate = useNavigate();
  const { user, hasPermission, hasRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [search, setSearch] = useState('');
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [isSavingRoles, setIsSavingRoles] = useState(false);

  // View dialog states
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [isLoadingViewUser, setIsLoadingViewUser] = useState(false);

  // Edit dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    is_active: true,
  });
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // Check if current user can assign roles (admin or company role)
  const canAssignRoles = hasRole('admin') || hasRole('company');

  // Check if current user can view/edit users (admin or company role)
  const canViewUsers = hasRole('admin') || hasRole('company');
  const canEditUsers = hasRole('admin') || hasRole('company');

  useEffect(() => {
    fetchUsers(page, perPage);
    fetchRoles();
  }, [page, perPage]); // Fetch when page or perPage changes

  const fetchUsers = async (currentPage: number, currentPerPage: number) => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page: currentPage, per_page: currentPerPage };
      if (search) params.search = search;

      const response = await adminService.getUsersByOrg(params);
      const responseData = response.data.data;
      const userData = responseData?.data || responseData;
      setUsers(Array.isArray(userData) ? userData : []);

      const metaData = responseData?.meta || response.data.meta || null;
      setMeta(metaData);
      setTotalRows(metaData?.total || 0);

    } catch (error) {
      console.error('Failed to fetch users:', error);
      showAlert('error', 'Error', 'Failed to fetch users');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await roleService.getAll();
      setAllRoles(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePerRowsChange = async (newPerPage: number, page: number) => {
    setPerPage(newPerPage);
    setPage(1); // Reset to first page when changing rows per page
  };

  const handleSearch = () => {
    setPage(1);
    fetchUsers(1, perPage);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleOpenRoleDialog = (user: User) => {
    setSelectedUser(user);
    setSelectedRoles(new Set(user.roles?.map((r) => r.name) || []));
    setIsRoleDialogOpen(true);
  };

  const handleRoleToggle = (roleName: string) => {
    setSelectedRoles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(roleName)) {
        newSet.delete(roleName);
      } else {
        newSet.add(roleName);
      }
      return newSet;
    });
  };

  const handleSaveRoles = async () => {
    if (!selectedUser) return;

    setIsSavingRoles(true);
    try {
      await adminService.assignUserRoles(selectedUser.id, {
        roles: Array.from(selectedRoles),
      });
      showAlert('success', 'Success!', 'Roles assigned successfully', 2000);
      setIsRoleDialogOpen(false);
      setSelectedUser(null);
      fetchUsers(page, perPage);
    } catch (error: unknown) {
      console.error('Failed to assign roles:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to assign roles'));
    } finally {
      setIsSavingRoles(false);
    }
  };

  const handleViewUser = async (user: User) => {
    setIsLoadingViewUser(true);
    setIsViewDialogOpen(true);
    try {
      const response = await adminService.getUser(user.id);
      setViewingUser(response.data.data);
    } catch (error: unknown) {
      console.error('Failed to fetch user details:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to fetch user details'));
      setIsViewDialogOpen(false);
    } finally {
      setIsLoadingViewUser(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      is_active: user.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    setIsUpdatingUser(true);
    try {
      await adminService.updateUser(editingUser.id, editFormData);
      showAlert('success', 'Success!', 'User updated successfully', 2000);
      setIsEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers(page, perPage);
    } catch (error: unknown) {
      console.error('Failed to update user:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to update user'));
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.id === user?.id) {
      showAlert('error', 'Error', 'Cannot delete your own account');
      return;
    }

    const result = await showAlert(
      'warning',
      'Delete User',
      `Are you sure you want to delete ${user.name}? This action cannot be undone.`,
      0,);

    if (result.isConfirmed) {
      try {
        await adminService.deleteUser(user.id);
        showAlert('success', 'Success!', 'User deleted successfully', 2000);
        fetchUsers(page, perPage);
      } catch (error: unknown) {
        console.error('Failed to delete user:', error);
        showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete user'));
      }
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-solarized-red/10 text-solarized-red',
      org: 'bg-solarized-purple/10 text-solarized-purple',
      company: 'bg-solarized-yellow/10 text-solarized-yellow',
      hr: 'bg-solarized-blue/10 text-solarized-blue',
      user: 'bg-solarized-green/10 text-solarized-green',
    };
    return colors[role] || colors.user;
  };

  const columns: TableColumn<User>[] = [
    {
      name: 'User',
      selector: (row) => row.name,
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-solarized-blue/10 text-solarized-blue text-xs">
              {getInitials(row.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{row.name}</span>
          </div>
        </div>
      ),
      width: '250px',
    },
    {
      name: 'Email',
      selector: (row) => row.email,
      sortable: true,
    },
    {
      name: 'Roles',
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles?.map((role) => (
            <Badge key={role.name} className={getRoleBadgeColor(role.name)}>
              {role.name.replace('_', ' ')}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      name: 'Status',
      cell: (row) => (
        <StatusBadge status={row.is_active ? 'active' : 'inactive'} />
      ),
      sortable: true,
      selector: (row) => row.is_active ? 'Active' : 'Inactive',
      width: '120px',
    },
    {
      name: 'Created',
      selector: (row) => row.created_at,
      format: (row) => new Date(row.created_at).toLocaleDateString(),
      sortable: true,
      width: '150px',
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
            <DropdownMenuItem onClick={() => handleViewUser(row)}>
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
            {canEditUsers && (
              <DropdownMenuItem onClick={() => handleEditUser(row)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            {canAssignRoles && (
              <DropdownMenuItem onClick={() => handleOpenRoleDialog(row)}>
                <UserCog className="mr-2 h-4 w-4" />
                Assign Roles
              </DropdownMenuItem>
            )}
            {/* {canEditUsers && (
                   <DropdownMenuItem className="text-red-500" onClick={() => handleDeleteUser(row)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                 </DropdownMenuItem>
                )} */}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      button: true,
      width: '80px',
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">Organization Users</h1>
          <p className="text-solarized-base01">Manage users within your organization</p>
        </div>
        <Button className="bg-solarized-blue hover:bg-solarized-blue/90" onClick={() => navigate('/staff/create')}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-4">
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-solarized-blue/10 flex items-center justify-center">
                <UsersIcon className="h-5 w-5 text-solarized-blue" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Total Users</p>
                <p className="text-xl font-bold text-solarized-base02">{meta?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-solarized-red/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-solarized-red" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Administrators</p>
                <p className="text-xl font-bold text-solarized-base02">
                  {users.filter((u) => u.roles?.some((r) => r.name === 'admin')).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-solarized-green/10 flex items-center justify-center">
                <UsersIcon className="h-5 w-5 text-solarized-green" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Active</p>
                <p className="text-xl font-bold text-solarized-base02">
                  {users.filter((u) => u.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-solarized-base01/10 flex items-center justify-center">
                <UsersIcon className="h-5 w-5 text-solarized-base01" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Inactive</p>
                <p className="text-xl font-bold text-solarized-base02">
                  {users.filter((u) => !u.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-solarized-base01" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyPress}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} className="bg-solarized-blue hover:bg-solarized-blue/90">
              Search
            </Button>
          </div>

          <DataTable
            columns={columns}
            data={users}
            progressPending={isLoading}
            pagination
            paginationServer
            paginationTotalRows={totalRows}
            paginationPerPage={perPage}
            paginationRowsPerPageOptions={[10, 20, 50, 100]}
            paginationDefaultPage={page}
            onChangePage={handlePageChange}
            onChangeRowsPerPage={handlePerRowsChange}
            highlightOnHover
            responsive
            noDataComponent={
              <div className="text-center py-12">
                <UsersIcon className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-solarized-base02">No users found</h3>
                <p className="text-solarized-base01 mt-1">Add users to manage system access.</p>
              </div>
            }
          />

        </CardContent>
      </Card>

      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Roles</DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <>
                  Select roles for <strong>{selectedUser.name}</strong>. Users can have multiple roles.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3 max-h-[300px] overflow-y-auto">
            {allRoles.map((role) => (
              <div
                key={role.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedRoles.has(role.name)
                  ? 'bg-solarized-blue/5 border-solarized-blue/20'
                  : 'hover:bg-solarized-base3/50'
                  }`}
                onClick={() => handleRoleToggle(role.name)}
              >
                <Checkbox
                  checked={selectedRoles.has(role.name)}
                  onCheckedChange={() => handleRoleToggle(role.name)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-solarized-base02">
                      {role.name.replace(/_/g, ' ')}
                    </span>
                    {role.is_system && (
                      <Badge variant="outline" className="text-xs bg-solarized-red/10 text-solarized-red border-solarized-red/20">
                        System
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      Level {role.hierarchy_level}
                    </Badge>
                  </div>
                  {role.description && (
                    <p className="text-xs text-solarized-base01 mt-1">{role.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRoles}
              disabled={isSavingRoles || selectedRoles.size === 0}
              className="bg-solarized-blue hover:bg-solarized-blue/90"
            >
              {isSavingRoles ? 'Saving...' : 'Save Roles'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View User Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>View User Details</DialogTitle>
            <DialogDescription>Detailed information about the user</DialogDescription>
          </DialogHeader>
          {isLoadingViewUser ? (
            <div className="py-8 flex justify-center">
              <Skeleton className="h-32 w-full" />
            </div>
          ) : viewingUser ? (
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-solarized-blue/10 text-solarized-blue text-xl">
                    {getInitials(viewingUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold text-solarized-base02">{viewingUser.name}</h3>
                  <p className="text-sm text-solarized-base01 flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {viewingUser.email}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-solarized-base01">Status</span>
                  <StatusBadge status={viewingUser.is_active ? 'active' : 'inactive'} />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-solarized-base01">Primary Role</span>
                  <Badge className={getRoleBadgeColor(viewingUser.primary_role || 'user')}>
                    {viewingUser.primary_role?.replace('_', ' ') || 'N/A'}
                  </Badge>
                </div>

                {viewingUser.organization_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-solarized-base01">Organization</span>
                    <span className="text-sm font-medium text-solarized-base02 flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {viewingUser.organization_name}
                    </span>
                  </div>
                )}

                {viewingUser.company_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-solarized-base01">Company</span>
                    <span className="text-sm font-medium text-solarized-base02 flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {viewingUser.company_name}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-solarized-base01">Created</span>
                  <span className="text-sm font-medium text-solarized-base02 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(viewingUser.created_at).toLocaleDateString()}
                  </span>
                </div>

                {viewingUser.roles_list && viewingUser.roles_list.length > 0 && (
                  <div className="pt-2">
                    <span className="text-sm text-solarized-base01 block mb-2">All Roles</span>
                    <div className="flex flex-wrap gap-1">
                      {viewingUser.roles_list.map((role: string) => (
                        <Badge key={role} className={getRoleBadgeColor(role)}>
                          {role.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Enter user name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-is-active"
                checked={editFormData.is_active}
                onCheckedChange={(checked) =>
                  setEditFormData({ ...editFormData, is_active: checked as boolean })
                }
              />
              <Label htmlFor="edit-is-active" className="cursor-pointer">
                Active User
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateUser}
              disabled={isUpdatingUser || !editFormData.name || !editFormData.email}
              className="bg-solarized-blue hover:bg-solarized-blue/90"
            >
              {isUpdatingUser ? 'Updating...' : 'Update User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
