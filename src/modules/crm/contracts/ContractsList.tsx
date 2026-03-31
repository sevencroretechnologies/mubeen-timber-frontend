import { useState, useEffect, useCallback } from 'react';
import { crmContractService } from '../../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../../lib/sweetalert';
import { Card, CardContent, CardHeader } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { StatusBadge } from '../../../components/ui/status-badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Plus, Search, MoreHorizontal, Eye, Edit, Trash2, FileText } from 'lucide-react';

const STATUS_OPTIONS = ['Draft', 'Active', 'Paused', 'Fulfilled', 'Cancelled'];

interface Contract {
  id: number;
  party_name: string;
  contract_type: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  contract_value: number | null;
  description: string | null;
  created_at: string;
}

export default function ContractsList() {
  const [items, setItems] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selected, setSelected] = useState<Contract | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    party_name: '', contract_type: '', status: 'Draft',
    start_date: '', end_date: '', contract_value: '', description: '',
  });

  const fetchItems = useCallback(async (currentPage: number = 1) => {
    setIsLoading(true);
    try {
      const response = await crmContractService.getAll({ page: currentPage, per_page: perPage, search });
      const { data, meta } = response.data;
      setItems(Array.isArray(data) ? data : []);
      setTotalRows(meta?.total ?? 0);
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
      setItems([]);
      setTotalRows(0);
    } finally {
      setIsLoading(false);
    }
  }, [perPage, search]);

  useEffect(() => { fetchItems(page); }, [page, fetchItems]);

  const handleSearchSubmit = (e: React.FormEvent) => { e.preventDefault(); setPage(1); };

  const resetForm = () => setFormData({
    party_name: '', contract_type: '', status: 'Draft',
    start_date: '', end_date: '', contract_value: '', description: '',
  });

  const handleAddClick = () => { resetForm(); setIsAddOpen(true); };
  const handleView = (item: Contract) => { setSelected(item); setIsViewOpen(true); };

  const handleEdit = (item: Contract) => {
    setSelected(item);
    setFormData({
      party_name: item.party_name || '', contract_type: item.contract_type || '',
      status: item.status || 'Draft',
      start_date: item.start_date ? item.start_date.split('T')[0] : '',
      end_date: item.end_date ? item.end_date.split('T')[0] : '',
      contract_value: item.contract_value?.toString() || '',
      description: item.description || '',
    });
    setIsEditOpen(true);
  };

  const handleDelete = async (id: number) => {
    const result = await showConfirmDialog('Delete Contract', 'Are you sure you want to delete this contract?');
    if (!result.isConfirmed) return;
    try {
      await crmContractService.delete(id);
      showAlert('success', 'Deleted!', 'Contract deleted successfully', 2000);
      fetchItems(page);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete contract'));
    }
  };

  const buildPayload = () => ({
    ...formData,
    contract_value: formData.contract_value ? parseFloat(formData.contract_value) : null,
    start_date: formData.start_date || null,
    end_date: formData.end_date || null,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await crmContractService.create(buildPayload());
      showAlert('success', 'Success', 'Contract created successfully', 2000);
      setIsAddOpen(false);
      fetchItems(page);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to create contract'));
    } finally { setIsSubmitting(false); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setIsSubmitting(true);
    try {
      await crmContractService.update(selected.id, buildPayload());
      showAlert('success', 'Success', 'Contract updated successfully', 2000);
      setIsEditOpen(false);
      fetchItems(page);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to update contract'));
    } finally { setIsSubmitting(false); }
  };

  const columns: TableColumn<Contract>[] = [
    { name: 'Party', cell: (row) => <span className="font-medium">{row.party_name}</span>, minWidth: '180px' },
    { name: 'Type', selector: (row) => row.contract_type || '-' },
    { name: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
    { name: 'Value', cell: (row) => row.contract_value ? `$${row.contract_value.toLocaleString()}` : '-' },
    { name: 'Start', selector: (row) => row.start_date || '-' },
    { name: 'End', selector: (row) => row.end_date || '-' },
    {
      name: 'Actions',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleView(row)}><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(row)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDelete(row.id)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      width: '80px',
    },
  ];

  const customStyles = {
    headRow: { style: { backgroundColor: '#f9fafb', borderBottomWidth: '1px', borderBottomColor: '#e5e7eb', borderBottomStyle: 'solid' as const, minHeight: '56px' } },
    headCells: { style: { fontSize: '14px', fontWeight: '600', color: '#374151', paddingLeft: '16px', paddingRight: '16px' } },
  };

  const renderForm = (onSubmit: (e: React.FormEvent) => void) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Party Name *</Label><Input value={formData.party_name} onChange={(e) => setFormData({ ...formData, party_name: e.target.value })} required /></div>
        <div><Label>Contract Type</Label><Input value={formData.contract_type} onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Status *</Label>
          <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Contract Value</Label><Input type="number" value={formData.contract_value} onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Start Date</Label><Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} /></div>
        <div><Label>End Date</Label><Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} /></div>
      </div>
      <div><Label>Description</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} /></div>
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting} className="bg-solarized-blue hover:bg-solarized-blue/90">
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">CRM Contracts</h1><p className="text-muted-foreground">Manage your CRM contracts</p></div>
        <Button onClick={handleAddClick} className="bg-solarized-blue hover:bg-solarized-blue/90"><Plus className="mr-2 h-4 w-4" /> Add Contract</Button>
      </div>
      <Card>
        <CardHeader>
          <form onSubmit={handleSearchSubmit} className="flex gap-4">
            <Input placeholder="Search contracts..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button type="submit" variant="outline"><Search className="mr-2 h-4 w-4" /> Search</Button>
          </form>
        </CardHeader>
        <CardContent>
          {!isLoading && items.length === 0 ? (
            <div className="text-center py-12"><FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" /><p>No contracts found</p></div>
          ) : (
            <DataTable columns={columns} data={items} progressPending={isLoading} pagination paginationServer
              paginationTotalRows={totalRows} paginationPerPage={perPage} paginationDefaultPage={page}
              onChangePage={(p) => setPage(p)} onChangeRowsPerPage={(pp) => { setPerPage(pp); setPage(1); }}
              customStyles={customStyles} highlightOnHover responsive />
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Contract Details</DialogTitle><DialogDescription>View contract information</DialogDescription></DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-sm text-muted-foreground">Party</p><p className="font-medium">{selected.party_name}</p></div>
                <div><p className="text-sm text-muted-foreground">Type</p><p className="font-medium">{selected.contract_type || '-'}</p></div>
                <div><p className="text-sm text-muted-foreground">Status</p><StatusBadge status={selected.status} /></div>
                <div><p className="text-sm text-muted-foreground">Value</p><p className="font-medium">{selected.contract_value ? `$${selected.contract_value.toLocaleString()}` : '-'}</p></div>
                <div><p className="text-sm text-muted-foreground">Start Date</p><p className="font-medium">{selected.start_date || '-'}</p></div>
                <div><p className="text-sm text-muted-foreground">End Date</p><p className="font-medium">{selected.end_date || '-'}</p></div>
              </div>
              {selected.description && <div><p className="text-sm text-muted-foreground">Description</p><p className="font-medium">{selected.description}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Add Contract</DialogTitle><DialogDescription>Create a new CRM contract</DialogDescription></DialogHeader>{renderForm(handleCreate)}</DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Edit Contract</DialogTitle><DialogDescription>Update contract information</DialogDescription></DialogHeader>{renderForm(handleUpdate)}</DialogContent>
      </Dialog>
    </div>
  );
}
