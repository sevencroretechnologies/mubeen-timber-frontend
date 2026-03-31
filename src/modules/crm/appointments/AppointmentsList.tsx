import { useState, useEffect, useCallback } from 'react';
import { crmAppointmentService } from '../../../services/api';
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
import { Plus, Search, MoreHorizontal, Eye, Edit, Trash2, CalendarClock } from 'lucide-react';

const STATUS_OPTIONS = ['Open', 'Closed', 'Cancelled'];

interface Appointment {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone_number: string | null;
  scheduled_time: string;
  status: string;
  customer_details: string | null;
  created_at: string;
}

export default function AppointmentsList() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    customer_name: '', customer_email: '', customer_phone_number: '',
    scheduled_time: '', status: 'Open', customer_details: '',
  });

  const fetchItems = useCallback(async (currentPage: number = 1) => {
    setIsLoading(true);
    try {
      const response = await crmAppointmentService.getAll({ page: currentPage, per_page: perPage, search });
      const { data, meta } = response.data;
      setItems(Array.isArray(data) ? data : []);
      setTotalRows(meta?.total ?? 0);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      setItems([]);
      setTotalRows(0);
    } finally {
      setIsLoading(false);
    }
  }, [perPage, search]);

  useEffect(() => { fetchItems(page); }, [page, fetchItems]);

  const handleSearchSubmit = (e: React.FormEvent) => { e.preventDefault(); setPage(1); };

  const resetForm = () => setFormData({
    customer_name: '', customer_email: '', customer_phone_number: '',
    scheduled_time: '', status: 'Open', customer_details: '',
  });

  const handleAddClick = () => { resetForm(); setIsAddOpen(true); };
  const handleView = (item: Appointment) => { setSelected(item); setIsViewOpen(true); };

  const handleEdit = (item: Appointment) => {
    setSelected(item);
    setFormData({
      customer_name: item.customer_name || '', customer_email: item.customer_email || '',
      customer_phone_number: item.customer_phone_number || '',
      scheduled_time: item.scheduled_time ? item.scheduled_time.slice(0, 16) : '',
      status: item.status || 'Open', customer_details: item.customer_details || '',
    });
    setIsEditOpen(true);
  };

  const handleDelete = async (id: number) => {
    const result = await showConfirmDialog('Delete Appointment', 'Are you sure you want to delete this appointment?');
    if (!result.isConfirmed) return;
    try {
      await crmAppointmentService.delete(id);
      showAlert('success', 'Deleted!', 'Appointment deleted successfully', 2000);
      fetchItems(page);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete appointment'));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await crmAppointmentService.create(formData);
      showAlert('success', 'Success', 'Appointment created successfully', 2000);
      setIsAddOpen(false);
      fetchItems(page);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to create appointment'));
    } finally { setIsSubmitting(false); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setIsSubmitting(true);
    try {
      await crmAppointmentService.update(selected.id, formData);
      showAlert('success', 'Success', 'Appointment updated successfully', 2000);
      setIsEditOpen(false);
      fetchItems(page);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to update appointment'));
    } finally { setIsSubmitting(false); }
  };

  const columns: TableColumn<Appointment>[] = [
    { name: 'Customer', cell: (row) => <span className="font-medium">{row.customer_name}</span>, minWidth: '180px' },
    { name: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
    { name: 'Scheduled', selector: (row) => row.scheduled_time ? new Date(row.scheduled_time).toLocaleString() : '-' },
    { name: 'Email', selector: (row) => row.customer_email || '-' },
    { name: 'Phone', selector: (row) => row.customer_phone_number || '-' },
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
        <div><Label>Customer Name *</Label><Input value={formData.customer_name} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })} required /></div>
        <div><Label>Customer Email *</Label><Input type="email" value={formData.customer_email} onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })} required /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Phone</Label><Input value={formData.customer_phone_number} onChange={(e) => setFormData({ ...formData, customer_phone_number: e.target.value })} /></div>
        <div><Label>Scheduled Time *</Label><Input type="datetime-local" value={formData.scheduled_time} onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })} required /></div>
      </div>
      <div>
        <Label>Status *</Label>
        <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Details</Label><Textarea value={formData.customer_details} onChange={(e) => setFormData({ ...formData, customer_details: e.target.value })} rows={3} /></div>
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
        <div><h1 className="text-2xl font-bold">Appointments</h1><p className="text-muted-foreground">Manage your CRM appointments</p></div>
        <Button onClick={handleAddClick} className="bg-solarized-blue hover:bg-solarized-blue/90"><Plus className="mr-2 h-4 w-4" /> Add Appointment</Button>
      </div>
      <Card>
        <CardHeader>
          <form onSubmit={handleSearchSubmit} className="flex gap-4">
            <Input placeholder="Search appointments..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button type="submit" variant="outline"><Search className="mr-2 h-4 w-4" /> Search</Button>
          </form>
        </CardHeader>
        <CardContent>
          {!isLoading && items.length === 0 ? (
            <div className="text-center py-12"><CalendarClock className="mx-auto h-12 w-12 text-muted-foreground mb-4" /><p>No appointments found</p></div>
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
          <DialogHeader><DialogTitle>Appointment Details</DialogTitle><DialogDescription>View appointment information</DialogDescription></DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-sm text-muted-foreground">Customer</p><p className="font-medium">{selected.customer_name}</p></div>
                <div><p className="text-sm text-muted-foreground">Email</p><p className="font-medium">{selected.customer_email}</p></div>
                <div><p className="text-sm text-muted-foreground">Phone</p><p className="font-medium">{selected.customer_phone_number || '-'}</p></div>
                <div><p className="text-sm text-muted-foreground">Status</p><StatusBadge status={selected.status} /></div>
                <div><p className="text-sm text-muted-foreground">Scheduled</p><p className="font-medium">{selected.scheduled_time ? new Date(selected.scheduled_time).toLocaleString() : '-'}</p></div>
                <div><p className="text-sm text-muted-foreground">Details</p><p className="font-medium">{selected.customer_details || '-'}</p></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Add Appointment</DialogTitle><DialogDescription>Create a new appointment</DialogDescription></DialogHeader>{renderForm(handleCreate)}</DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Edit Appointment</DialogTitle><DialogDescription>Update appointment information</DialogDescription></DialogHeader>{renderForm(handleUpdate)}</DialogContent>
      </Dialog>
    </div>
  );
}
