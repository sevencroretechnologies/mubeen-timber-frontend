import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roleService, permissionService } from '../../services/api';
import { showAlert, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { Skeleton } from '../../components/ui/skeleton';
import { ArrowLeft, Save, Shield, ChevronDown, ChevronRight, Check } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../components/ui/collapsible';

interface Permission {
  id: number;
  name: string;
  resource: string;
  action: string;
  description: string | null;
  sort_order: number;
}

interface ResourceGroup {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  sort_order: number;
  permissions: Permission[];
}

interface Role {
  id: number;
  name: string;
  is_system: boolean;
  hierarchy_level: number;
  description: string | null;
  permissions: Permission[];
}

export default function RolePermissions() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role | null>(null);
  const [resourceGroups, setResourceGroups] = useState<ResourceGroup[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [roleResponse, permissionsResponse] = await Promise.all([
        roleService.getById(parseInt(id!)),
        permissionService.getGrouped(),
      ]);

      const roleData = roleResponse.data.data;
      setRole(roleData);
      setResourceGroups(permissionsResponse.data.data || []);

      const rolePermissions = new Set<string>(
        roleData.permissions?.map((p: Permission) => p.name) || []
      );
      setSelectedPermissions(rolePermissions);

      const allSlugs = new Set<string>(
        (permissionsResponse.data.data || []).map((r: ResourceGroup) => r.slug)
      );
      setExpandedResources(allSlugs);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      showAlert('error', 'Error', 'Failed to fetch role permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionToggle = (permissionName: string) => {
    setSelectedPermissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(permissionName)) {
        newSet.delete(permissionName);
      } else {
        newSet.add(permissionName);
      }
      return newSet;
    });
  };

  const handleSelectAllResource = (resource: ResourceGroup) => {
    const resourcePermissions = resource.permissions.map((p) => p.name);
    const allSelected = resourcePermissions.every((p) => selectedPermissions.has(p));

    setSelectedPermissions((prev) => {
      const newSet = new Set(prev);
      if (allSelected) {
        resourcePermissions.forEach((p) => newSet.delete(p));
      } else {
        resourcePermissions.forEach((p) => newSet.add(p));
      }
      return newSet;
    });
  };

  const toggleResourceExpanded = (slug: string) => {
    setExpandedResources((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(slug)) {
        newSet.delete(slug);
      } else {
        newSet.add(slug);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    if (!id) return;

    setIsSaving(true);
    try {
      await roleService.syncPermissions(parseInt(id), {
        permissions: Array.from(selectedPermissions),
      });
      showAlert('success', 'Success!', 'Permissions saved successfully', 2000);
      navigate('/admin/roles');
    } catch (error: unknown) {
      console.error('Failed to save permissions:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to save permissions'));
    } finally {
      setIsSaving(false);
    }
  };

  const isResourceFullySelected = (resource: ResourceGroup) => {
    return resource.permissions.every((p) => selectedPermissions.has(p.name));
  };

  const isResourcePartiallySelected = (resource: ResourceGroup) => {
    const selected = resource.permissions.filter((p) => selectedPermissions.has(p.name));
    return selected.length > 0 && selected.length < resource.permissions.length;
  };

  const getActionBadgeColor = (action: string) => {
    const colors: Record<string, string> = {
      view: 'bg-solarized-blue/10 text-solarized-blue',
      create: 'bg-solarized-green/10 text-solarized-green',
      edit: 'bg-solarized-yellow/10 text-solarized-yellow',
      delete: 'bg-solarized-red/10 text-solarized-red',
      approve: 'bg-solarized-violet/10 text-solarized-violet',
      export: 'bg-solarized-cyan/10 text-solarized-cyan',
      generate: 'bg-solarized-orange/10 text-solarized-orange',
    };
    return colors[action] || 'bg-solarized-base01/10 text-solarized-base01';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-solarized-base02">Role not found</h3>
        <Button variant="outline" onClick={() => navigate('/admin/roles')} className="mt-4">
          Back to Roles
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/roles')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-solarized-base02">
              Edit Permissions: {role.name}
            </h1>
            <p className="text-solarized-base01">
              {role.description || 'Configure permissions for this role'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              role.is_system
                ? 'bg-solarized-red/10 text-solarized-red border-solarized-red/20'
                : 'bg-solarized-green/10 text-solarized-green border-solarized-green/20'
            }
          >
            {role.is_system ? 'System Role' : 'Custom Role'}
          </Badge>
          <Badge variant="outline">Level: {role.hierarchy_level}</Badge>
        </div>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            Permissions ({selectedPermissions.size} selected)
          </CardTitle>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-solarized-blue hover:bg-solarized-blue/90"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {resourceGroups.map((resource) => (
            <Collapsible
              key={resource.slug}
              open={expandedResources.has(resource.slug)}
              onOpenChange={() => toggleResourceExpanded(resource.slug)}
            >
              <div className="border rounded-lg">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 hover:bg-solarized-base3/50">
                    <div className="flex items-center gap-3">
                      {expandedResources.has(resource.slug) ? (
                        <ChevronDown className="h-5 w-5 text-solarized-base01" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-solarized-base01" />
                      )}
                      <div className="text-left">
                        <h3 className="font-medium text-solarized-base02">{resource.name}</h3>
                        {resource.description && (
                          <p className="text-sm text-solarized-base01">{resource.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-solarized-base01">
                        {resource.permissions.filter((p) => selectedPermissions.has(p.name)).length}
                        /{resource.permissions.length}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectAllResource(resource);
                        }}
                        className={
                          isResourceFullySelected(resource)
                            ? 'bg-solarized-green/10 border-solarized-green/20'
                            : ''
                        }
                      >
                        {isResourceFullySelected(resource) ? (
                          <>
                            <Check className="mr-1 h-3 w-3" />
                            All Selected
                          </>
                        ) : (
                          'Select All'
                        )}
                      </Button>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {resource.permissions.map((permission) => (
                      <div
                        key={permission.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedPermissions.has(permission.name)
                          ? 'bg-solarized-blue/5 border-solarized-blue/20'
                          : 'hover:bg-solarized-base3/50'
                          }`}
                        onClick={() => handlePermissionToggle(permission.name)}
                      >
                        <Checkbox
                          checked={selectedPermissions.has(permission.name)}
                          onCheckedChange={() => handlePermissionToggle(permission.name)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge className={getActionBadgeColor(permission.action)}>
                              {permission.action}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-solarized-base02 mt-1">
                            {permission.name.replace(/_/g, ' ')}
                          </p>
                          {permission.description && (
                            <p className="text-xs text-solarized-base01 mt-0.5 truncate">
                              {permission.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate('/admin/roles')}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-solarized-blue hover:bg-solarized-blue/90"
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
