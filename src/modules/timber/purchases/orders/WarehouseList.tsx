import { useState, useEffect, useCallback } from 'react';
import { warehouseApi } from '../../services/inventoryApi';
import type { TimberWarehouse, WarehouseFormData } from '../../types/inventory';
import { showAlert, showConfirmDialog, getErrorMessage } from '@/lib/sweetalert';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Plus, Warehouse, Edit, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function WarehouseList() {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState<TimberWarehouse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<WarehouseFormData>({
    name: '',
    code: '',
    address: '',
    city: '',
    is_default: false,
    is_active: true,
  });

  const fetchWarehouses = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await warehouseApi.list({ per_page: 100 }) as Record<string, unknown>;
      const data = (response.data || response) as TimberWarehouse[];
      setWarehouses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
      setWarehouses([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const openCreateForm = () => {
    setEditingId(null);
    setFormData({ name: '', code: '', address: '', city: '', is_default: false, is_active: true });
    setIsFormOpen(true);
  };

  const openEditForm = (wh: TimberWarehouse) => {
    setEditingId(wh.id);
    setFormData({
      name: wh.name,
      code: wh.code || '',
      address: wh.address || '',
      city: wh.city || '',
      is_default: wh.is_default,
      is_active: wh.is_active,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showAlert('error', 'Validation', 'Warehouse name is required');
      return;
    }
    try {
      if (editingId) {
        await warehouseApi.update(editingId, formData);
        showAlert('success', 'Updated', 'Warehouse updated successfully', 2000);
      } else {
        await warehouseApi.create(formData);
        showAlert('success', 'Created', 'Warehouse created successfully', 2000);
      }
      setIsFormOpen(false);
      fetchWarehouses();
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to save warehouse'));
    }
  };

  const handleDelete = async (id: number) => {
    const result = await showConfirmDialog('Delete Warehouse', 'Are you sure you want to delete this warehouse?');
    if (!result.isConfirmed) return;
    try {
      await warehouseApi.delete(id);
      showAlert('success', 'Deleted', 'Warehouse deleted successfully', 2000);
      fetchWarehouses();
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete warehouse'));
    }
  };

  const columns: TableColumn<TimberWarehouse>[] = [
    {
      name: '#',
      selector: (_row, index) => (index !== undefined ? index + 1 : 0),
      width: '60px',
    },
    {
      name: 'Name',
      selector: (row) => row.name,
      sortable: true,
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      name: 'Code',
      selector: (row) => row.code || '-',
    },
    {
      name: 'City',
      selector: (row) => row.city || '-',
    },
    {
      name: 'Default',
      cell: (row) => row.is_default ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Default</span> : '-',
      width: '100px',
    },
    {
      name: 'Status',
      cell: (row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
      width: '100px',
    },
    {
      name: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEditForm(row)} title="Edit"><Edit className="h-4 w-4 text-blue-600" /></Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)} title="Delete"><Trash2 className="h-4 w-4 text-red-600" /></Button>
        </div>
      ),
      width: '100px',
    },
  ];

  const customStyles = {
    headRow: {
      style: { backgroundColor: '#f9fafb', borderBottomWidth: '1px', borderBottomColor: '#e5e7eb', borderBottomStyle: 'solid' as const, minHeight: '56px' },
    },
    headCells: {
      style: { fontSize: '14px', fontWeight: '600', color: '#374151', paddingLeft: '16px', paddingRight: '16px' },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02 tracking-tight">Warehouses</h1>
          <p className="text-sm text-muted-foreground">Manage warehouse locations for stock storage</p>
        </div>
        <Button 
          size="sm" 
          onClick={openCreateForm} 
          className="bg-solarized-blue hover:bg-solarized-blue/90 shadow-sm shrink-0"
        >
          <Plus className="mr-2 h-4 w-4" /> New Warehouse
        </Button>
      </div>

      <Card className="border-none shadow-sm md:border md:shadow-none">
        <CardContent className="p-0 sm:p-6">
          {/* Desktop View */}
          <div className="hidden md:block">
            <DataTable
              columns={columns}
              data={warehouses}
              progressPending={isLoading}
              customStyles={customStyles}
              highlightOnHover
              responsive
              noDataComponent={
                <div className="text-center py-12 text-muted-foreground">
                  <Warehouse className="mx-auto h-12 w-12 mb-4 opacity-20" />
                  <p>No warehouses found</p>
                </div>
              }
            />
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 p-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-gray-200">
                <Loader2 className="h-8 w-8 animate-spin text-solarized-blue/20 mb-2" />
                <p className="text-sm text-muted-foreground animate-pulse">Loading warehouses...</p>
              </div>
            ) : warehouses.length === 0 ? (
              <div className="text-center py-20 rounded-xl border border-dashed border-gray-200">
                <Warehouse className="mx-auto h-12 w-12 mb-4 opacity-10" />
                <p className="text-muted-foreground">No warehouses found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {warehouses.map((wh) => (
                  <div key={wh.id} className="responsive-card p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 leading-tight mb-1">{wh.name}</h3>
                        <p className="text-xs text-muted-foreground font-normal">{wh.code || 'No Code'}</p>
                      </div>
                      <div className="shrink-0 flex gap-2">
                        {wh.is_default && (
                          <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wider">Default</span>
                        )}
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${wh.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {wh.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-[10px] text-gray-400 font-medium mb-1">City</p>
                        <p className="font-bold text-gray-900">{wh.city || '-'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 font-medium mb-1">Created</p>
                        <p className="font-bold text-gray-900">
                          {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditForm(wh)} className="h-9 px-4 text-solarized-blue font-bold bg-blue-50/50 hover:bg-blue-50">
                        <Edit className="h-4 w-4 mr-1.5" /> EDIT
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(wh.id)} className="h-9 px-4 text-red-700 font-bold bg-red-50/50 hover:bg-red-50">
                        <Trash2 className="h-4 w-4 mr-1.5" /> DELETE
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit' : 'New'} Warehouse</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wh-name">Name <span className="text-red-500">*</span></Label>
              <Input id="wh-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Warehouse name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-code">Code</Label>
              <Input id="wh-code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="e.g., WH-001" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-address">Address</Label>
              <Input id="wh-address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Address" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-city">City</Label>
              <Input id="wh-city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="City" />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="wh-default" checked={formData.is_default} onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
                <Label htmlFor="wh-default">Default Warehouse</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="wh-active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
                <Label htmlFor="wh-active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90">{editingId ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
