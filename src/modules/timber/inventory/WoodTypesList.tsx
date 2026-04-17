import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { woodTypeApi } from '../services/inventoryApi';
import type { TimberWoodType } from '../types/inventory';
import { showAlert, showConfirmDialog, getErrorMessage } from '@/lib/sweetalert';
import { Card, CardContent } from '@/components/ui/card';
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
import { Plus, Search, TreePine, Eye, Edit, Trash2, Loader2 } from 'lucide-react';

export default function WoodTypesList() {
  const navigate = useNavigate();
  const [woodTypes, setWoodTypes] = useState<TimberWoodType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TimberWoodType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: '',
    default_rate: '',
    unit: 'CFT',
    description: '',
  });

  const fetchWoodTypes = useCallback(async (currentPage: number = 1) => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page: currentPage, per_page: perPage };
      if (search) params.search = search;

      const response = await woodTypeApi.list(params) as Record<string, unknown>;
      const data = (response.data || response) as TimberWoodType[] | Record<string, unknown>;
      const pagination = response.pagination as Record<string, number> | undefined;
      const total = (response.total ?? pagination?.total_items ?? 0) as number;

      setWoodTypes(Array.isArray(data) ? data : []);
      setTotalRows(total);
    } catch (error) {
      console.error('Failed to fetch wood types:', error);
      setWoodTypes([]);
      setTotalRows(0);
    } finally {
      setIsLoading(false);
    }
  }, [perPage, search]);

  useEffect(() => {
    const timer = setTimeout(() => fetchWoodTypes(page), 300);
    return () => clearTimeout(timer);
  }, [page, fetchWoodTypes]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchWoodTypes(1);
  };

  const handleAdd = () => {
    setIsEditing(false);
    setSelectedItem(null);
    setFormData({ name: '', code: '', category: '', default_rate: '', unit: 'CFT', description: '' });
    setIsFormOpen(true);
  };

  const handleEdit = (item: TimberWoodType) => {
    setIsEditing(true);
    setSelectedItem(item);
    setFormData({
      name: item.name,
      code: item.code || '',
      category: item.category || '',
      default_rate: String(item.default_rate),
      unit: item.unit,
      description: item.description || '',
    });
    setIsFormOpen(true);
  };

  const handleView = (item: TimberWoodType) => {
    setSelectedItem(item);
    setIsViewOpen(true);
  };

  const handleDelete = async (id: number) => {
    const result = await showConfirmDialog('Delete Wood Type', 'Are you sure? This cannot be undone.');
    if (!result.isConfirmed) return;
    try {
      await woodTypeApi.delete(id);
      showAlert('success', 'Deleted!', 'Wood type deleted successfully', 2000);
      fetchWoodTypes(page);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete'));
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showAlert('error', 'Validation', 'Name is required');
      return;
    }
    if (!formData.default_rate || Number(formData.default_rate) < 0) {
      showAlert('error', 'Validation', 'Default rate must be a positive number');
      return;
    }
    if (!formData.unit.trim()) {
      showAlert('error', 'Validation', 'Unit is required');
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
        category: formData.category.trim() || undefined,
        default_rate: Number(formData.default_rate),
        unit: formData.unit.trim(),
        description: formData.description.trim() || undefined,
      };

      if (isEditing && selectedItem) {
        await woodTypeApi.update(selectedItem.id, data);
        showAlert('success', 'Updated!', 'Wood type updated successfully', 2000);
      } else {
        await woodTypeApi.create(data);
        showAlert('success', 'Created!', 'Wood type created successfully', 2000);
      }
      setIsFormOpen(false);
      fetchWoodTypes(page);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to save'));
    } finally {
      setIsSaving(false);
    }
  };

  const columns: TableColumn<TimberWoodType>[] = [
    {
      name: '#',
      selector: (_row, index) => (page - 1) * perPage + (index !== undefined ? index + 1 : 0),
      width: '60px',
    },
    {
      name: 'Name',
      selector: (row) => row.name,
      sortable: true,
      minWidth: '180px',
      cell: (row) => (
        <div>
          <span className="font-medium">{row.name}</span>
          {row.code && <span className="text-xs text-muted-foreground ml-2">({row.code})</span>}
        </div>
      ),
    },
    {
      name: 'Category',
      selector: (row) => row.category || '-',
      sortable: true,
      cell: (row) => row.category ? <span className="px-2 py-1 rounded-full text-xs bg-slate-100">{row.category}</span> : '-',
    },
    {
      name: 'Default Rate',
      selector: (row) => row.default_rate,
      sortable: true,
      right: true,
      cell: (row) => <span className="font-medium">₹{Number(row.default_rate).toFixed(2)}/{row.unit}</span>,
    },
    {
      name: 'Unit',
      selector: (row) => row.unit,
      width: '80px',
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
          <Button variant="ghost" size="icon" onClick={() => handleView(row)} title="View"><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => handleEdit(row)} title="Edit"><Edit className="h-4 w-4 text-blue-600" /></Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)} title="Delete"><Trash2 className="h-4 w-4 text-red-600" /></Button>
        </div>
      ),
      width: '120px',
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">Wood Types</h1>
          <p className="text-muted-foreground">Manage timber wood types, categories and rates</p>
        </div>
        <Button onClick={handleAdd} className="bg-solarized-blue hover:bg-solarized-blue/90">
          <Plus className="mr-2 h-4 w-4" /> Add Wood Type
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearchSubmit} className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, code or category..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Button type="submit" variant="outline">Search</Button>
          </form>

          {/* Mobile Card List (< md) */}
          <div className="block md:hidden space-y-3 pb-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-solarized-blue" />
              </div>
            ) : woodTypes.length === 0 ? (
              <div className="text-center py-10 px-6 bg-slate-50 rounded-xl border border-dashed">
                <TreePine className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No wood types found</p>
              </div>
            ) : (
              woodTypes.map((item) => (
                <div key={item.id} className="bg-white rounded-xl shadow-sm p-4 border border-slate-100 transition-all hover:border-slate-200">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-slate-800 text-sm truncate pr-2">
                      {item.name || '—'}
                    </h3>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {item.created_at ? String(item.created_at).split('T')[0] : '—'}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
                    {item.description || 'No description available'}
                  </p>

                  {/* Details - 2 Column Row */}
                  <div className="grid grid-cols-2 gap-32 mt-3 text-[11px]">
                    <div className="space-y-0.5">
                      <p className="text-slate-400 uppercase font-bold tracking-tight">Type</p>
                      <p className="font-semibold text-slate-700">{item.category || '—'}</p>
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-slate-400 uppercase font-bold tracking-tight">Status</p>
                      <span className={`inline-block font-semibold ${item.is_active ? 'text-green-600' : 'text-slate-500'}`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 pt-3 border-t border-slate-50 flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => handleView(item)} title="View">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => handleEdit(item)} title="Edit">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDelete(item.id)} title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table (md+) */}
          <div className="hidden md:block">
            <DataTable
              columns={columns}
              data={woodTypes}
              progressPending={isLoading}
              pagination
              paginationServer
              paginationTotalRows={totalRows}
              paginationPerPage={perPage}
              paginationDefaultPage={page}
              onChangePage={(newPage) => setPage(newPage)}
              onChangeRowsPerPage={(newPerPage) => { setPerPage(newPerPage); setPage(1); }}
              customStyles={customStyles}
              highlightOnHover
              responsive
              noDataComponent={
                <div className="text-center py-12 text-muted-foreground">
                  <TreePine className="mx-auto h-12 w-12 mb-4 opacity-20" />
                  <p>No wood types found</p>
                  <p className="text-xs mt-1">Add your first wood type to get started</p>
                </div>
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Wood Type' : 'Add New Wood Type'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g., Teak, Pine, Plywood"
                value={formData.name}
                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  placeholder="e.g., TEAK-001"
                  value={formData.code}
                  onChange={(e) => setFormData(p => ({ ...p, code: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  placeholder="e.g., Hardwood, Softwood"
                  value={formData.category}
                  onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Rate (₹) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.default_rate}
                  onChange={(e) => setFormData(p => ({ ...p, default_rate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit <span className="text-red-500">*</span></Label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData(p => ({ ...p, unit: e.target.value }))}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="CFT">CFT</option>
                  <option value="SQFT">SQFT</option>
                  <option value="PCS">PCS</option>
                  <option value="SQM">SQM</option>
                  <option value="RUN">RUN</option>
                  <option value="NOS">NOS</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Optional description..."
                value={formData.description}
                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-solarized-blue">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TreePine className="h-5 w-5 text-solarized-blue" />
              Wood Type Details
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="h-12 w-12 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-blue-600">
                  <TreePine className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-bold">{selectedItem.name}</p>
                  {selectedItem.code && <p className="text-sm text-muted-foreground">{selectedItem.code}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs text-muted-foreground uppercase">Category</Label><p className="text-sm font-medium">{selectedItem.category || '-'}</p></div>
                <div><Label className="text-xs text-muted-foreground uppercase">Unit</Label><p className="text-sm font-medium">{selectedItem.unit}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs text-muted-foreground uppercase">Default Rate</Label><p className="text-lg font-bold text-green-600">₹{Number(selectedItem.default_rate).toFixed(2)}</p></div>
                <div><Label className="text-xs text-muted-foreground uppercase">Status</Label>
                <p>{selectedItem.is_active ? <span className="text-green-600">Active</span> : <span className="text-gray-500">Inactive</span>}</p></div>
              </div>
              {selectedItem.description && (
                <div><Label className="text-xs text-muted-foreground uppercase">Description</Label><p className="text-sm">{selectedItem.description}</p></div>
              )}
              <div className="text-xs text-muted-foreground">
                <p>Created: {new Date(selectedItem.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
