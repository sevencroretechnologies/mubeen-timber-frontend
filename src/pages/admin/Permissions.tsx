import { useState, useEffect } from 'react';
import { permissionService } from '../../services/api';
import { showAlert } from '../../lib/sweetalert';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Skeleton } from '../../components/ui/skeleton';
import { Search, Key, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

interface Permission {
  id: number;
  name: string;
  guard_name: string;
  module: string;
  created_at: string;
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const MODULES = [
  'all',
  'dashboard',
  'users',
  'roles',
  'staff',
  'attendance',
  'leave',
  'payroll',
  'recruitment',
  'performance',
  'assets',
  'training',
  'contracts',
  'meetings',
  'reports',
  'settings',
];

export default function Permissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');

  useEffect(() => {
    fetchPermissions();
  }, [page, moduleFilter]);

  const fetchPermissions = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page };
      if (search) params.search = search;
      if (moduleFilter !== 'all') params.module = moduleFilter;
      
      const response = await permissionService.getAll(params);
      // API returns { success: true, data: [...permissions...], message: "..." }
      // Handle both paginated (data.data) and non-paginated (data) responses
      const permissionsData = Array.isArray(response.data.data) ? response.data.data : response.data.data || response.data || [];
      setPermissions(Array.isArray(permissionsData) ? permissionsData : []);
      setMeta(response.data.meta || null);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      showAlert('error', 'Error', 'Failed to fetch permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchPermissions();
  };

  const getModuleFromPermission = (name: string) => {
    const parts = name.split('.');
    return parts[0] || 'general';
  };

  const getActionFromPermission = (name: string) => {
    const parts = name.split('.');
    return parts[1] || name;
  };

  const getModuleBadgeColor = (module: string) => {
    const colors: Record<string, string> = {
      dashboard: 'bg-solarized-blue/10 text-solarized-blue',
      users: 'bg-solarized-red/10 text-solarized-red',
      roles: 'bg-solarized-violet/10 text-solarized-violet',
      staff: 'bg-solarized-green/10 text-solarized-green',
      attendance: 'bg-solarized-cyan/10 text-solarized-cyan',
      leave: 'bg-solarized-yellow/10 text-solarized-yellow',
      payroll: 'bg-solarized-orange/10 text-solarized-orange',
      recruitment: 'bg-solarized-magenta/10 text-solarized-magenta',
      performance: 'bg-solarized-blue/10 text-solarized-blue',
      assets: 'bg-solarized-base01/10 text-solarized-base01',
      training: 'bg-solarized-green/10 text-solarized-green',
      contracts: 'bg-solarized-yellow/10 text-solarized-yellow',
      meetings: 'bg-solarized-cyan/10 text-solarized-cyan',
      reports: 'bg-solarized-violet/10 text-solarized-violet',
      settings: 'bg-solarized-base01/10 text-solarized-base01',
    };
    return colors[module] || 'bg-solarized-base01/10 text-solarized-base01';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">Permissions</h1>
          <p className="text-solarized-base01">View and manage system permissions</p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-solarized-violet/10 flex items-center justify-center">
                <Key className="h-5 w-5 text-solarized-violet" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Total Permissions</p>
                <p className="text-xl font-bold text-solarized-base02">{meta?.total || 581}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-solarized-blue/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-solarized-blue" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Modules</p>
                <p className="text-xl font-bold text-solarized-base02">16</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-solarized-green/10 flex items-center justify-center">
                <Key className="h-5 w-5 text-solarized-green" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Current Page</p>
                <p className="text-xl font-bold text-solarized-base02">{permissions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-solarized-base01" />
              <Input
                placeholder="Search permissions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by module" />
              </SelectTrigger>
              <SelectContent>
                {MODULES.map((module) => (
                  <SelectItem key={module} value={module}>
                    {module === 'all' ? 'All Modules' : module.charAt(0).toUpperCase() + module.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleSearch}>
              <Search className="h-4 w-4" /> Search
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : permissions.length === 0 ? (
            <div className="text-center py-12">
              <Key className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-solarized-base02">No permissions found</h3>
              <p className="text-solarized-base01 mt-1">Try adjusting your search or filter.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permission</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Guard</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissions.map((permission) => (
                      <TableRow key={permission.id}>
                        <TableCell className="font-mono text-sm">{permission.name}</TableCell>
                        <TableCell>
                          <Badge className={getModuleBadgeColor(getModuleFromPermission(permission.name))}>
                            {getModuleFromPermission(permission.name)}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">
                          {getActionFromPermission(permission.name).replace('_', ' ')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{permission.guard_name}</Badge>
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
    </div>
  );
}
