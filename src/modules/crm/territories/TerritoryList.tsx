import { useState, useEffect, useCallback } from 'react';
import { crmTerritoryService, userApi } from '../../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../../lib/sweetalert';
import { Card, CardContent, CardHeader } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Plus, Search, MoreHorizontal, Edit, Trash2, MapPin, Eye } from 'lucide-react';

interface Territory {
  id: number;
  territory_name: string;
  territory_manager: number | null;
  manager?: {
    id: number;
    name: string;
  };
  created_at: string;
}

interface User {
  id: number;
  name: string;
}

export default function TerritoryList() {
  const [items, setItems] = useState<Territory[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    territory_name: '',
    territory_manager: '' as string | number,
  });

  const fetchUsers = async () => {
    try {
      const usersData = await userApi.list({ per_page: 500 });
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = {
        search,
      };
      const response = await crmTerritoryService.getAll(params);

      // Backend returns simple array [ ... ]
      if (Array.isArray(response.data)) {
        setItems(response.data);
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        setItems(response.data.data);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error('Failed to fetch territories:', error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchItems();
    fetchUsers();
  }, [fetchItems]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems();
  };

  const resetForm = () => setFormData({
    territory_name: '',
    territory_manager: ''
  });

  const handleAddClick = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleView = (territory: Territory) => {
    setSelectedTerritory(territory);
    setIsViewOpen(true);
  };

  const handleEdit = (territory: Territory) => {
    setSelectedTerritory(territory);
    setFormData({
      territory_name: territory.territory_name || '',
      territory_manager: territory.territory_manager || '',
    });
    setIsEditOpen(true);
  };

  const handleDelete = async (id: number) => {
    const result = await showConfirmDialog(
      'Delete Territory',
      'Are you sure you want to delete this territory? This action cannot be undone.'
    );
    if (!result.isConfirmed) return;

    try {
      await crmTerritoryService.delete(id);
      showAlert('success', 'Deleted!', 'Territory deleted successfully', 2000);
      fetchItems();
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete territory'));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await crmTerritoryService.create({
        ...formData,
        territory_manager: formData.territory_manager || null
      });
      showAlert('success', 'Success', 'Territory created successfully', 2000);
      setIsAddOpen(false);
      fetchItems();
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to create territory'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTerritory) return;
    setIsSubmitting(true);
    try {
      await crmTerritoryService.update(selectedTerritory.id, {
        ...formData,
        territory_manager: formData.territory_manager || null
      });
      showAlert('success', 'Success', 'Territory updated successfully', 2000);
      setIsEditOpen(false);
      fetchItems();
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to update territory'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: TableColumn<Territory>[] = [
    {
      name: 'Territory Name',
      selector: (row) => row.territory_name,
      sortable: true,
      cell: (row) => <span className="font-medium">{row.territory_name}</span>,
    },
    {
      name: 'Territory Manager',
      cell: (row) => (
        row.manager ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {row.manager.name}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      ),
      sortable: true,
    },
    // {
    //   name: 'Created At',
    //   selector: (row) => row.created_at,
    //   sortable: true,
    //   cell: (row) => <span>{new Date(row.created_at).toLocaleDateString()}</span>,
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
            <DropdownMenuItem onClick={() => handleView(row)}>
              <Eye className="mr-2 h-4 w-4" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(row)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDelete(row.id)} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      width: '80px',
    },
  ];

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

  const renderForm = (onSubmit: (e: React.FormEvent) => void) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="territory_name">Territory Name *</Label>
        <Input
          id="territory_name"
          value={formData.territory_name}
          onChange={(e) => setFormData({ ...formData, territory_name: e.target.value })}
          required
          placeholder="e.g. North Region, East Zone"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="territory_manager">Territory Manager</Label>
        <Select
          value={formData.territory_manager?.toString()}
          onValueChange={(v) => setFormData({ ...formData, territory_manager: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a manager" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id.toString()}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-solarized-blue hover:bg-solarized-blue/90"
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Territories</h1>
          <p className="text-muted-foreground">Manage sales regions and managers</p>
        </div>
        <Button onClick={handleAddClick} className="bg-solarized-blue hover:bg-solarized-blue/90">
          <Plus className="mr-2 h-4 w-4" /> Add Territory
        </Button>
      </div>

      <Card>
        <CardHeader>
          <form onSubmit={handleSearchSubmit} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search territories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {!isLoading && items.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No territories found</p>
              <p className="text-muted-foreground">Try adjusting your search or add a new territory</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={items}
              progressPending={isLoading}
              customStyles={customStyles}
              highlightOnHover
              responsive
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Territory</DialogTitle>
            <DialogDescription>Create a new sales territory</DialogDescription>
          </DialogHeader>
          {renderForm(handleCreate)}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Territory</DialogTitle>
            <DialogDescription>Update territory information</DialogDescription>
          </DialogHeader>
          {renderForm(handleUpdate)}
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-solarized-blue" />
              Territory Details
            </DialogTitle>
            <DialogDescription>
              Detailed information about the territory
            </DialogDescription>
          </DialogHeader>
          {selectedTerritory && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Territory Name</Label>
                  <p className="text-base font-semibold text-solarized-blue">{selectedTerritory.territory_name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Manager</Label>
                  <p className="text-sm font-medium">
                    {typeof selectedTerritory.manager === 'object' ? selectedTerritory.manager?.name : selectedTerritory.manager || 'Not Assigned'}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
