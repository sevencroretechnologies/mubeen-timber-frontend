import { useState, useEffect, useCallback, useMemo } from 'react';
import { taxGroupApi, taxRateApi } from '../../services/inventoryApi';
import type { TimberTaxGroup, TimberTaxRate } from '../../types/inventory';
import { showAlert, showConfirmDialog, getErrorMessage } from '@/lib/sweetalert';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Plus, Search, Edit, Trash2, CheckCircle2, Eye, Loader2, Ghost, X } from 'lucide-react';

// Separate form component to prevent Dialog infinite loop
interface TaxGroupFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  editing: boolean;
  initialData: {
    name: string;
    code: string;
    tax_rate_ids: number[];
    is_active: boolean;
  };
  taxRates: TimberTaxRate[];
}

function TaxGroupForm({ isOpen, onClose, onSave, editing, initialData, taxRates }: TaxGroupFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(initialData);

  // Reset form when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      setFormData(initialData);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showAlert('error', 'Validation', 'Tax group name is required');
      return;
    }
    if (formData.tax_rate_ids.length === 0) {
      showAlert('error', 'Validation', 'Please select at least one tax rate');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to save tax group'));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTaxRate = (taxRateId: number) => {
    setFormData((prev) => ({
      ...prev,
      tax_rate_ids: prev.tax_rate_ids.includes(taxRateId)
        ? prev.tax_rate_ids.filter((id) => id !== taxRateId)
        : [...prev.tax_rate_ids, taxRateId],
    }));
  };

  const selectedTaxRates = useMemo(() => {
    return taxRates.filter((tr) => formData.tax_rate_ids.includes(tr.id));
  }, [taxRates, formData.tax_rate_ids]);

  const totalRate = useMemo(() => {
    return selectedTaxRates.reduce((sum, tr) => sum + tr.rate, 0);
  }, [selectedTaxRates]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Tax Group' : 'Add New Tax Group'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Update the tax group configuration.' : 'Combine multiple tax rates into a single group.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Group Name <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g., GST 18%, Interstate IGST"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Code (Optional)</Label>
              <Input
                placeholder="e.g., GST_18, IGST_18"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
          </div>

          {/* Tax Rate Selection */}
          <div className="space-y-2">
            <Label>Select Tax Rates <span className="text-red-500">*</span></Label>
            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto bg-slate-50">
              {taxRates.length === 0 ? (
                <div className="text-center py-4 text-sm text-gray-500">
                  No tax rates available. Please add tax rates first.
                </div>
              ) : (
                <div className="space-y-2">
                  {taxRates.map((taxRate) => {
                    const isSelected = formData.tax_rate_ids.includes(taxRate.id);
                    return (
                      <div
                        key={taxRate.id}
                        onClick={() => toggleTaxRate(taxRate.id)}
                        className={`flex items-center justify-between p-3 rounded border cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-50 border-indigo-300' : 'bg-white hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleTaxRate(taxRate.id)}
                          />
                          <span className="font-medium text-sm">{taxRate.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold bg-gray-100 px-2 py-0.5 rounded">
                            {taxRate.rate}%
                          </span>
                          <span className="text-[10px] text-gray-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                            {taxRate.tax_type}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Selected Tax Rates Summary */}
          {selectedTaxRates.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Tax Rates ({selectedTaxRates.length})</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border">
                {selectedTaxRates.map((tr) => (
                  <span
                    key={tr.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200"
                  >
                    {tr.name} ({tr.rate}%)
                    <button
                      type="button"
                      onClick={() => toggleTaxRate(tr.id)}
                      className="hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <span className="ml-auto text-sm font-semibold text-slate-700">
                  Total: {totalRate}%
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })}
            />
            <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving} className="bg-solarized-blue">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? 'Saving...' : (editing ? 'Update Tax Group' : 'Create Tax Group')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TaxGroupList() {
  const [taxGroups, setTaxGroups] = useState<TimberTaxGroup[]>([]);
  const [taxRates, setTaxRates] = useState<TimberTaxRate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TimberTaxGroup | null>(null);

  // Form data state - separate from form component
  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    tax_rate_ids: number[];
    is_active: boolean;
  }>({
    name: '',
    code: '',
    tax_rate_ids: [],
    is_active: true,
  });

  const fetchTaxGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await taxGroupApi.list() as any;
      const data = response.data || response;
      setTaxGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch tax groups:', error);
      showAlert('error', 'Error', 'Failed to load tax groups');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTaxRates = useCallback(async () => {
    try {
      const response = await taxRateApi.list() as any;
      const data = response.data || response;
      setTaxRates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch tax rates:', error);
    }
  }, []);

  useEffect(() => {
    fetchTaxGroups();
    fetchTaxRates();
  }, [fetchTaxGroups, fetchTaxRates]);

  const handleAdd = useCallback(() => {
    setIsEditing(false);
    setSelectedItem(null);
    setFormData({
      name: '',
      code: '',
      tax_rate_ids: [],
      is_active: true,
    });
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((item: TimberTaxGroup) => {
    setIsEditing(true);
    setSelectedItem(item);
    setFormData({
      name: item.name,
      code: item.code || '',
      tax_rate_ids: item.tax_rate_ids || [],
      is_active: item.is_active,
    });
    setIsFormOpen(true);
  }, []);

  const handleView = useCallback((item: TimberTaxGroup) => {
    setSelectedItem(item);
    setIsViewOpen(true);
  }, []);

  const handleSave = useCallback(async (data: typeof formData) => {
    try {
      if (isEditing && selectedItem) {
        await taxGroupApi.update(selectedItem.id, data);
        showAlert('success', 'Updated', 'Tax group updated successfully', 2000);
      } else {
        await taxGroupApi.create(data);
        showAlert('success', 'Created', 'Tax group created successfully', 2000);
      }
      fetchTaxGroups();
    } catch (error) {
      throw error;
    }
  }, [isEditing, selectedItem, fetchTaxGroups]);

  const handleDelete = useCallback(async (id: number) => {
    const result = await showConfirmDialog('Delete Tax Group', 'Are you sure you want to delete this tax group?');
    if (!result.isConfirmed) return;
    try {
      await taxGroupApi.delete(id);
      showAlert('success', 'Deleted', 'Tax group deleted successfully', 2000);
      fetchTaxGroups();
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete tax group'));
    }
  }, [fetchTaxGroups]);

  // Memoized calculations
  const filteredGroups = useMemo(() => {
    return taxGroups.filter((group) =>
      group.name.toLowerCase().includes(search.toLowerCase()) ||
      (group.code?.toLowerCase() || '').includes(search.toLowerCase())
    );
  }, [taxGroups, search]);

  // Table Actions cell - memoized separately
  const ActionsCell = useCallback((row: TimberTaxGroup) => (
    <div className="flex items-center gap-1 pl-1">
      <Button variant='ghost' size='icon' className='h-7 w-7' onClick={() => handleView(row)} title="View">
        <Eye className="h-4 w-4" />
      </Button>
      <Button variant='ghost' size='icon' className='h-7 w-7' onClick={() => handleEdit(row)} title="Edit">
        <Edit className="h-4 w-4" />
      </Button>
      <Button variant='ghost' size='icon' className='h-7 w-7' onClick={() => handleDelete(row.id)} title="Delete">
        <Trash2 className="h-4 w-4 text-red-600" />
      </Button>
    </div>
  ), [handleView, handleEdit, handleDelete]);

  const columns: TableColumn<TimberTaxGroup>[] = useMemo(() => [
    {
      name: '#',
      selector: (_row, index) => (index !== undefined ? index + 1 : 0),
      width: '60px',
    },
    {
      name: 'Name',
      selector: (row) => row.name,
      sortable: true,
      cell: (row) => <span className="font-bold text-slate-700">{row.name}</span>,
    },
    {
      name: 'Code',
      selector: (row) => row.code || '-',
      sortable: true,
      cell: (row) => (
        <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600">
          {row.code || '-'}
        </span>
      ),
      width: '120px',
    },
    {
      name: 'Tax Rates',
      cell: (row) => {
        const groupRates = taxRates.filter((tr) => row.tax_rate_ids?.includes(tr.id));
        return (
          <div className="flex flex-wrap gap-1">
            {groupRates.length === 0 ? (
              <span className="text-gray-400 text-sm">-</span>
            ) : (
              groupRates.map((tr) => (
                <span
                  key={tr.id}
                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-100"
                  title={`${tr.name}: ${tr.rate}%`}
                >
                  {tr.name} ({tr.rate}%)
                </span>
              ))
            )}
          </div>
        );
      },
      minWidth: '250px',
    },
    {
      name: 'Total Rate',
      selector: (row) => row.total_rate,
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <span className="font-black text-slate-900">{row.total_rate}%</span>
        </div>
      ),
      width: '120px',
    },
    {
      name: 'Status',
      selector: (row) => row.is_active,
      sortable: true,
      cell: (row) => (
        <span className={row.is_active ? 'text-green-600' : 'text-red-500'}>
          {row.is_active ? <CheckCircle2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </span>
      ),
      width: '80px',
      center: true,
    },
    {
      name: 'Actions',
      cell: ActionsCell,
      width: '140px',
    },
  ], [taxRates, ActionsCell]);

  const customStyles = useMemo(() => ({
    headRow: {
      style: { backgroundColor: '#f9fafb', borderBottomWidth: '1px', borderBottomColor: '#e5e7eb', borderBottomStyle: 'solid' as const, minHeight: '56px' },
    },
    headCells: {
      style: { fontSize: '14px', fontWeight: '600', color: '#374151', paddingLeft: '16px', paddingRight: '16px' },
    },
  }), []);

  return (
    <div className="space-y-6 text-solarized-base02">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-solarized-base02">Tax Groups</h1>
          <p className="text-sm text-slate-500">Combine multiple tax rates into groups (e.g., CGST + SGST = GST 18%)</p>
        </div>
        <Button onClick={handleAdd} className="bg-solarized-blue hover:bg-solarized-blue/90 w-full sm:w-auto shadow-md font-bold">
          <Plus className="mr-2 h-4 w-4" /> Add Tax Group
        </Button>
      </div>

      <Card className="shadow-sm border">
        <CardHeader className="pb-3 px-6 pt-6">
          <form onSubmit={(e) => { e.preventDefault(); fetchTaxGroups(); }} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 rounded-lg"
              />
            </div>
            <Button type="submit" variant="outline" className="h-10">
              Search
            </Button>
          </form>
        </CardHeader>
        <CardContent className="px-0">
          <DataTable
            columns={columns}
            data={filteredGroups}
            progressPending={isLoading}
            customStyles={customStyles}
            pagination
            highlightOnHover
            responsive
            noDataComponent={
              <div className="text-center py-20 mx-6">
                <Ghost className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No tax groups found</h3>
                <p className="text-muted-foreground max-w-xs mx-auto mt-1">
                  Create tax groups by combining multiple tax rates for easier tax calculation.
                </p>
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <TaxGroupForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        editing={isEditing}
        initialData={formData}
        taxRates={taxRates}
      />

      {/* View Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-solarized-blue">
              <CheckCircle2 className="h-5 w-5" />
              Tax Group Details
            </DialogTitle>
            <DialogDescription>
              Full configuration details for this tax group.
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Group Name</Label>
                  <p className="text-base font-semibold text-solarized-blue">
                    {selectedItem.name}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Code</Label>
                  <p className="text-sm font-medium">
                    {selectedItem.code || '-'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Tax Rates Included</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border">
                  {taxRates.filter((tr) => selectedItem.tax_rate_ids?.includes(tr.id)).map((tr) => (
                    <span
                      key={tr.id}
                      className="px-2 py-1 rounded text-xs font-bold uppercase bg-indigo-100 text-indigo-700 border border-indigo-200"
                    >
                      {tr.name} ({tr.rate}%)
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Tax Rate</Label>
                <p className="text-2xl font-black text-indigo-600">{selectedItem.total_rate}%</p>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Status</Label>
                {selectedItem.is_active ? (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" /> Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-sm text-red-500">
                    <X className="h-4 w-4" /> Inactive
                  </span>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)} className="w-full sm:w-auto">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
