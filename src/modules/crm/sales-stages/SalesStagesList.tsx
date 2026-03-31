import { useState, useEffect, useCallback } from 'react';
import { crmSalesStageService } from '../../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../../lib/sweetalert';
import { Card, CardContent, CardHeader } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../../../components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Plus, Search, MoreHorizontal, Edit, Trash2, Layers } from 'lucide-react';

interface SalesStage {
  id: number;
  stage_name: string;
  display_order: number | null;
  is_active: boolean;
  created_at: string;
}

export default function SalesStagesList() {
  const [items, setItems] = useState<SalesStage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selected, setSelected] = useState<SalesStage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({ stage_name: '', display_order: '' });

  const fetchItems = useCallback(async (currentPage: number = 1) => {
    setIsLoading(true);
    try {
      const response = await crmSalesStageService.getAll({ page: currentPage, per_page: perPage, search });
      const { data, meta } = response.data;
      setItems(Array.isArray(data) ? data : []);
      setTotalRows(meta?.total ?? 0);
    } catch (error) {
      console.error('Failed to fetch sales stages:', error);
      setItems([]);
      setTotalRows(0);
    } finally {
      setIsLoading(false);
    }
  }, [perPage, search]);

  useEffect(() => { fetchItems(page); }, [page, fetchItems]);

  const handleSearchSubmit = (e: React.FormEvent) => { e.preventDefault(); setPage(1); };
  const resetForm = () => setFormData({ stage_name: '', display_order: '' });
  const handleAddClick = () => { resetForm(); setIsAddOpen(true); };

  const handleEdit = (item: SalesStage) => {
    setSelected(item);
    setFormData({
      stage_name: item.stage_name || '',
      display_order: item.display_order?.toString() || '',
    });
    setIsEditOpen(true);
  };

  const handleDelete = async (id: number) => {
    const result = await showConfirmDialog('Delete Sales Stage', 'Are you sure you want to delete this sales stage?');
    if (!result.isConfirmed) return;
    try {
      await crmSalesStageService.delete(id);
      showAlert('success', 'Deleted!', 'Sales stage deleted successfully', 2000);
      fetchItems(page);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete sales stage'));
    }
  };

  const buildPayload = () => ({
    ...formData,
    display_order: formData.display_order ? parseInt(formData.display_order) : null,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await crmSalesStageService.create(buildPayload());
      showAlert('success', 'Success', 'Sales stage created successfully', 2000);
      setIsAddOpen(false);
      fetchItems(page);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to create sales stage'));
    } finally { setIsSubmitting(false); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setIsSubmitting(true);
    try {
      await crmSalesStageService.update(selected.id, buildPayload());
      showAlert('success', 'Success', 'Sales stage updated successfully', 2000);
      setIsEditOpen(false);
      fetchItems(page);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to update sales stage'));
    } finally { setIsSubmitting(false); }
  };

  const columns: TableColumn<SalesStage>[] = [
    { name: 'Stage Name', cell: (row) => <span className="font-medium">{row.stage_name}</span>, minWidth: '200px' },
    { name: 'Order', selector: (row) => row.display_order ?? '-' },
    {
      name: 'Status',
      cell: (row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    { name: 'Created', selector: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : '-' },
    {
      name: 'Actions',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
      <div><Label>Stage Name *</Label><Input value={formData.stage_name} onChange={(e) => setFormData({ ...formData, stage_name: e.target.value })} required /></div>
      <div><Label>Display Order</Label><Input type="number" value={formData.display_order} onChange={(e) => setFormData({ ...formData, display_order: e.target.value })} /></div>
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
        <div><h1 className="text-2xl font-bold">Sales Stages</h1><p className="text-muted-foreground">Manage your sales pipeline stages</p></div>
        <Button onClick={handleAddClick} className="bg-solarized-blue hover:bg-solarized-blue/90"><Plus className="mr-2 h-4 w-4" /> Add Stage</Button>
      </div>
      <Card>
        <CardHeader>
          <form onSubmit={handleSearchSubmit} className="flex gap-4">
            <Input placeholder="Search stages..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button type="submit" variant="outline"><Search className="mr-2 h-4 w-4" /> Search</Button>
          </form>
        </CardHeader>
        <CardContent>
          {!isLoading && items.length === 0 ? (
            <div className="text-center py-12"><Layers className="mx-auto h-12 w-12 text-muted-foreground mb-4" /><p>No sales stages found</p></div>
          ) : (
            <DataTable columns={columns} data={items} progressPending={isLoading} pagination paginationServer
              paginationTotalRows={totalRows} paginationPerPage={perPage} paginationDefaultPage={page}
              onChangePage={(p) => setPage(p)} onChangeRowsPerPage={(pp) => { setPerPage(pp); setPage(1); }}
              customStyles={customStyles} highlightOnHover responsive />
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent><DialogHeader><DialogTitle>Add Sales Stage</DialogTitle><DialogDescription>Create a new sales stage</DialogDescription></DialogHeader>{renderForm(handleCreate)}</DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent><DialogHeader><DialogTitle>Edit Sales Stage</DialogTitle><DialogDescription>Update sales stage information</DialogDescription></DialogHeader>{renderForm(handleUpdate)}</DialogContent>
      </Dialog>
    </div>
  );
}
