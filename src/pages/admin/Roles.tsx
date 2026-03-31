import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { roleService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
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
  DialogTrigger,
} from '../../components/ui/dialog';
import { Skeleton } from '../../components/ui/skeleton';
import { Plus, Shield, Edit, Trash2, MoreHorizontal, Users, Key, Lock, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

interface Role {
  id: number;
  name: string;
  guard_name: string;
  is_system: boolean;
  hierarchy_level: number;
  description: string | null;
  icon: string | null;
  permissions_count: number;
  users_count: number;
  created_at: string;
}

export default function Roles() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
    hierarchy_level: 99,
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const response = await roleService.getAll();
      setRoles(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      showAlert('error', 'Error', 'Failed to fetch roles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await roleService.update(editingRole.id, formData);
      } else {
        await roleService.create(formData);
      }
      showAlert(
        'success',
        'Success!',
        editingRole ? 'Role updated successfully' : 'Role created successfully',
        2000
      );
      setIsDialogOpen(false);
      setEditingRole(null);
      resetForm();
      fetchRoles();
    } catch (error: unknown) {
      console.error('Failed to save role:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to save role'));
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      icon: role.icon || '',
      hierarchy_level: role.hierarchy_level,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number, isSystem: boolean) => {
    if (isSystem) {
      return;
    }

    const result = await showConfirmDialog(
      'Are you sure?',
      'You want to delete this role?'
    );

    if (!result.isConfirmed) return;

    try {
      await roleService.delete(id);
      showAlert('success', 'Deleted!', 'Role deleted successfully', 2000);
      fetchRoles();
    } catch (error: unknown) {
      console.error('Failed to delete role:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete role'));
    }
  };

  const handleEditPermissions = (roleId: number) => {
    navigate(`/admin/roles/${roleId}/permissions`);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', icon: '', hierarchy_level: 99 });
  };

  const systemRolesCount = roles.filter(r => r.is_system).length;

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-solarized-red/10 text-solarized-red',
      org: 'bg-solarized-purple/10 text-solarized-purple',
      company: 'bg-solarized-yellow/10 text-solarized-yellow',
      hr: 'bg-solarized-blue/10 text-solarized-blue',
      user: 'bg-solarized-green/10 text-solarized-green',
    };
    return colors[role] || 'bg-solarized-violet/10 text-solarized-violet';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">Roles</h1>
          <p className="text-solarized-base01">Manage user roles and their permissions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-solarized-blue hover:bg-solarized-blue/90"
              onClick={() => {
                setEditingRole(null);
                resetForm();
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
              <DialogDescription>
                {editingRole ? 'Update the role details.' : 'Create a new role for the system.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Role Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., team_lead"
                    required
                    disabled={editingRole?.is_system}
                  />
                  <p className="text-xs text-solarized-base01">
                    Use lowercase with underscores (e.g., team_lead)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the role's purpose and responsibilities"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="icon">Icon</Label>
                    <Input
                      id="icon"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="e.g., Shield, Users"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hierarchy_level">Hierarchy Level</Label>
                    <Input
                      id="hierarchy_level"
                      type="number"
                      min={1}
                      max={99}
                      value={formData.hierarchy_level}
                      onChange={(e) => setFormData({ ...formData, hierarchy_level: parseInt(e.target.value) || 99 })}
                      disabled={editingRole?.is_system}
                    />
                    <p className="text-xs text-solarized-base01">
                      Lower = higher priority (1-99)
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90">
                  {editingRole ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 sm:grid-cols-4">
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-solarized-blue/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-solarized-blue" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Total Roles</p>
                <p className="text-xl font-bold text-solarized-base02">{roles.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-solarized-violet/10 flex items-center justify-center">
                <Key className="h-5 w-5 text-solarized-violet" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Total Permissions</p>
                <p className="text-xl font-bold text-solarized-base02">
                  {roles.reduce((sum, r) => sum + (r.permissions_count || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-solarized-green/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-solarized-green" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Users Assigned</p>
                <p className="text-xl font-bold text-solarized-base02">
                  {roles.reduce((sum, r) => sum + (r.users_count || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-solarized-red/10 flex items-center justify-center">
                <Lock className="h-5 w-5 text-solarized-red" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">System Roles</p>
                <p className="text-xl font-bold text-solarized-base02">{systemRolesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : roles.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-solarized-base02">No roles configured</h3>
              <p className="text-solarized-base01 mt-1">Create roles to manage user access.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <Badge className={getRoleBadgeColor(role.name)}>
                          {role.name.replace('_', ' ')}
                        </Badge>
                        {role.description && (
                          <span className="text-xs text-solarized-base01 mt-1 max-w-xs truncate">
                            {role.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{role.hierarchy_level}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Key className="h-4 w-4 text-solarized-violet" />
                        {role.permissions_count || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-solarized-blue" />
                        {role.users_count || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      {role.is_system ? (
                        <Badge variant="outline" className="bg-solarized-red/10 text-solarized-red border-solarized-red/20">
                          <Lock className="h-3 w-3 mr-1" />
                          System
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-solarized-green/10 text-solarized-green border-solarized-green/20">
                          Custom
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditPermissions(role.id)}
                          title="Edit Permissions"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(role)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditPermissions(role.id)}>
                              <Key className="mr-2 h-4 w-4" />
                              Edit Permissions
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-solarized-red"
                              onClick={() => handleDelete(role.id, role.is_system)}
                              disabled={role.is_system}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
