import { useState, useEffect } from 'react';
import { adminService, roleService } from '../../services/api';
import { showAlert, getErrorMessage } from '../../lib/sweetalert';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Skeleton } from '../../components/ui/skeleton';
import { Plus, Search, Users as UsersIcon, Shield, ChevronLeft, ChevronRight, MoreHorizontal, Eye, Edit, Trash2, Key, UserCog, Mail, Calendar, Building } from 'lucide-react';
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
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export default function Users() {
  const { user, hasPermission, hasRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [isSavingRoles, setIsSavingRoles] = useState(false);

  // View dialog states
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [isLoadingViewUser, setIsLoadingViewUser] = useState(false);

  // Edit dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
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
    fetchUsers();
    fetchRoles();
  }, [page]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page };
      if (search) params.search = search;

      // Use different API endpoint based on user role
      let response;
      if (hasRole('company')) {
        response = await adminService.getUsersByCompany(params);
      } else if (hasRole('org')) {
        response = await adminService.getUsersByOrg(params);
      } else {
        response = await adminService.getUsers(params);
      }

      const responseData = response.data.data;
      const userData = responseData?.data || responseData;
      setUsers(Array.isArray(userData) ? userData : []);
      setMeta(responseData?.meta || response.data.meta || null);
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

  const handleSearch = () => {
    setPage(1);
    fetchUsers();
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
      fetchUsers();
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
      fetchUsers();
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
      0,
      true
    );

    if (result.isConfirmed) {
      try {
        await adminService.deleteUser(user.id);
        showAlert('success', 'Success!', 'User deleted successfully', 2000);
        fetchUsers();
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">Users</h1>
          <p className="text-solarized-base01">Manage system users and their access</p>
        </div>
        <Button className="bg-solarized-blue hover:bg-solarized-blue/90">
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
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} className="bg-solarized-blue hover:bg-solarized-blue/90">
              Search
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-solarized-base02">No users found</h3>
              <p className="text-solarized-base01 mt-1">Add users to manage system access.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-solarized-blue/10 text-solarized-blue text-xs">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles?.map((role) => (
                              <Badge key={role.name} className={getRoleBadgeColor(role.name)}>
                                {role.name.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              user.is_active
                                ? 'bg-solarized-green/10 text-solarized-green'
                                : 'bg-solarized-red/10 text-solarized-red'
                            }
                          >
                            {user.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewUser(user)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              {canEditUsers && (
                                <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {canAssignRoles && (
                                <DropdownMenuItem onClick={() => handleOpenRoleDialog(user)}>
                                  <UserCog className="mr-2 h-4 w-4" />
                                  Assign Roles
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {meta && meta.last_page > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-solarized-base01">
                    Showing {(meta.current_page - 1) * meta.per_page + 1} to{' '}
                    {Math.min(meta.current_page * meta.per_page, meta.total)} of {meta.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === meta.last_page}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
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
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedRoles.has(role.name)
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
                  <Badge
                    className={
                      viewingUser.is_active
                        ? 'bg-solarized-green/10 text-solarized-green'
                        : 'bg-solarized-red/10 text-solarized-red'
                    }
                  >
                    {viewingUser.is_active ? 'Active' : 'Inactive'}
                  </Badge>
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
