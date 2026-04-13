import { useState, useEffect, useCallback } from 'react';
import { taxRateApi } from '../../services/inventoryApi';
import type { TimberTaxRate, TaxRateFormData, TaxRateType } from '../../types/inventory';
import { showAlert, showConfirmDialog, getErrorMessage } from '@/lib/sweetalert';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DataTable, { TableColumn } from 'react-data-table-component';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Percent, 
  Eye, 
  Loader2, 
  Ghost, 
  MoreVertical, 
  Hash 
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function TaxRateSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="rounded-xl shadow-sm border border-slate-100 bg-white p-4">
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-6 w-16 rounded-lg" />
          </div>
          <div className="flex justify-between items-end mt-4 pt-3 border-t border-slate-50">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

interface TaxRateCardProps {
  rate: TimberTaxRate;
  onView: (item: TimberTaxRate) => void;
  onEdit: (item: TimberTaxRate) => void;
  onDelete: (id: number) => void;
}

function TaxRateCard({ rate, onView, onEdit, onDelete }: TaxRateCardProps) {
  return (
    <Card className="rounded-xl shadow-sm border border-slate-100 bg-white p-4 transition-all hover:shadow-md mb-4 last:mb-0">
      <div className="flex justify-between items-start mb-3">
        <div className="space-y-1 min-w-0 flex-1">
          <h3 className="font-bold text-slate-900 text-base uppercase tracking-tight truncate">{rate.name}</h3>
          {/* <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <Hash className="h-3 w-3 shrink-0" />
            <span className="truncate">Tax ID: {rate.id}</span>
          </div> */}
        </div>
        <div className="shrink-0 ml-2">
          <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
            {rate.tax_type}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between py-3 border-y border-slate-50">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400  tracking-wider">Tax Percentage</span>
          <div className="flex items-center gap-1 text-solarized-blue font-black text-xl">
            <Percent className="h-4 w-4" />
            {rate.rate}%
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button  variant='ghost'
                        size='icon'
                        className='h-7 w-7' onClick={() => onView(rate)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button  variant='ghost'
                        size='icon'
                        className='h-7 w-7' onClick={() => onEdit(rate)}>
            <Edit className="h-4 w-4  text-blue-600" />
          </Button>
          <Button  variant='ghost'
                        size='icon'
                        className='h-7 w-7' onClick={() => onDelete(rate.id)}>
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function TaxRateList() {
  const [taxRates, setTaxRates] = useState<TimberTaxRate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TimberTaxRate | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    rate: number | string;
    tax_type: TaxRateType;
  }>({
    name: '',
    rate: '',
    tax_type: 'SGST',
  });

  const fetchTaxRates = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await taxRateApi.list() as any;
      const data = response.data || response;
      setTaxRates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch tax rates:', error);
      showAlert('error', 'Error', 'Failed to load tax rates');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTaxRates();
  }, [fetchTaxRates]);

  const handleAdd = () => {
    setIsEditing(false);
    setSelectedItem(null);
    setFormData({
      name: '',
      rate: '',
      tax_type: 'SGST',
    });
    setIsFormOpen(true);
  };

  const handleEdit = (item: TimberTaxRate) => {
    setIsEditing(true);
    setSelectedItem(item);
    setFormData({
      name: item.name,
      rate: item.rate,
      tax_type: item.tax_type,
    });
    setIsFormOpen(true);
  };

  const handleView = (item: TimberTaxRate) => {
    setSelectedItem(item);
    setIsViewOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showAlert('error', 'Validation', 'Tax name is required');
      return;
    }
    if (!formData.rate && formData.rate !== 0) {
      showAlert('error', 'Validation', 'Tax rate is required');
      return;
    }
    if (Number(formData.rate) < 0) {
      showAlert('error', 'Validation', 'Tax rate must be 0 or greater');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        rate: Number(formData.rate),
      };

      if (isEditing && selectedItem) {
        await taxRateApi.update(selectedItem.id, payload);
        showAlert('success', 'Updated', 'Tax rate updated successfully', 2000);
      } else {
        await taxRateApi.create(payload);
        showAlert('success', 'Created', 'Tax rate created successfully', 2000);
      }
      setIsFormOpen(false);
      fetchTaxRates();
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to save tax rate'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const result = await showConfirmDialog('Delete Tax Rate', 'Are you sure you want to delete this tax rate?');
    if (!result.isConfirmed) return;
    try {
      await taxRateApi.delete(id);
      showAlert('success', 'Deleted', 'Tax rate deleted successfully', 2000);
      fetchTaxRates();
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete tax rate'));
    }
  };

  const filteredRates = taxRates.filter(rate =>
    rate.name.toLowerCase().includes(search.toLowerCase()) ||
    rate.tax_type.toLowerCase().includes(search.toLowerCase())
  );

  const columns: TableColumn<TimberTaxRate>[] = [
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
      name: 'Rate (%)',
      selector: (row) => row.rate,
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          {/* <Percent className="h-3.5 w-3.5 text-indigo-500" /> */}
          <span className="font-black text-slate-900">{row.rate}%</span>
        </div>
      ),
      width: '120px',
    },
    {
      name: 'Tax Type',
      selector: (row) => row.tax_type,
      sortable: true,
      cell: (row) => (
        <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
          {row.tax_type}
        </span>
      ),
      width: '120px',
    },

    {
      name: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1 pl-1">
          <Button variant='ghost'
            size='icon'
            className='h-7 w-7' onClick={() => handleView(row)} title="View">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant='ghost'
            size='icon'
            className='h-7 w-7' onClick={() => handleEdit(row)} title="Edit">
            <Edit className="h-4 w-4 text-blue-600"/>
          </Button>
          <Button variant='ghost'
            size='icon'
            className='h-7 w-7' onClick={() => handleDelete(row.id)} title="Delete">
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ),
      width: '140px',
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
    <div className="space-y-6 text-solarized-base02">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-solarized-base02">Tax Rates</h1>
          <p className="text-sm text-slate-500">Configure taxes for procurement and billing (GST, CESS, etc.)</p>
        </div>
        <Button onClick={handleAdd} className="bg-solarized-blue hover:bg-solarized-blue/90 w-full sm:w-auto shadow-md font-bold">
          <Plus className="mr-2 h-4 w-4" /> Add Tax Rate
        </Button>
      </div>

      <Card className="shadow-sm border rounded-xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 pb-4 px-4 sm:px-6 pt-6">
          <form onSubmit={(e) => { e.preventDefault(); fetchTaxRates(); }} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search taxes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 rounded-xl bg-white border-slate-200"
              />
            </div>
            <Button type="submit" variant="outline" className="h-10 rounded-xl font-bold bg-white">
              Search
            </Button>
          </form>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden sm:block">
            <DataTable
              columns={columns}
              data={filteredRates}
              progressPending={isLoading}
              customStyles={customStyles}
              pagination
              highlightOnHover
              responsive
              noDataComponent={
                <div className="text-center py-20 bg-gray-50/50 rounded-lg border border-dashed mx-6 my-6">
                  <Ghost className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No tax rates found</h3>
                  <p className="text-muted-foreground max-w-xs mx-auto mt-1">
                    Try adjusting your search or add a new tax configuration.
                  </p>
                </div>
              }
            />
          </div>
          
          <div className="sm:hidden p-4">
            {isLoading ? <TaxRateSkeleton /> : (
              filteredRates.length > 0 ? (
                filteredRates.map(rate => (
                  <TaxRateCard 
                    key={rate.id} 
                    rate={rate} 
                    onView={handleView} 
                    onEdit={handleEdit} 
                    onDelete={handleDelete} 
                  />
                ))
              ) : (
                <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-dashed">
                  <Ghost className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-slate-500 font-medium">No tax rates found</p>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Tax Rate' : 'Add New Tax Rate'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update the details for this tax rate.' : 'Create a new tax configuration for procurement.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tax Name <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g. GST 18%, SGST 9%"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tax Type <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.tax_type}
                  onValueChange={(val) => setFormData({ ...formData, tax_type: val as TaxRateType })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SGST">SGST</SelectItem>
                    <SelectItem value="CGST">CGST</SelectItem>
                    <SelectItem value="IGST">IGST</SelectItem>
                    <SelectItem value="CESS">CESS</SelectItem>
                    <SelectItem value="FLOOD_CESS">Flood CESS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Rate (%) <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    className="pl-8"
                    required
                  />
                  <Percent className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving}>Cancel</Button>
              <Button type="submit" disabled={isSaving} className="bg-solarized-blue">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? 'Saving...' : (isEditing ? 'Update Configuration' : 'Save Configuration')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-solarized-blue">
              <Percent className="h-5 w-5" />
              Tax Rate Details
            </DialogTitle>
            <DialogDescription>
              Full configuration details for this tax rate.
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Tax Name</Label>
                  <p className="text-base font-semibold text-solarized-blue">
                    {selectedItem.name}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Tax Type</Label>
                  <div className="pt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-100 text-indigo-700 border border-indigo-200">
                      {selectedItem.tax_type}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Rate Percentage</Label>
                  <p className="text-2xl font-black text-indigo-600">{selectedItem.rate}%</p>
                </div>

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
