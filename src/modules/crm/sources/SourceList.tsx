import { useState, useEffect, useCallback } from 'react';
import { crmSourceService } from '../../../services/api';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Plus, Search, MoreHorizontal, Edit, Trash2, LayoutGrid, Eye } from 'lucide-react';

interface Source {
  id: number;
  name: string;
  source_code: string | null;
  created_at: string;
}

export default function SourceList() {
  const [items, setItems] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    source_code: '',
  });

  const fetchItems = useCallback(async (currentPage: number = 1) => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = {
        page: currentPage,
        per_page: perPage,
        search,
      };
      const response = await crmSourceService.getAll(params);

      // The backend SourceController returns Source::all() - a plain array
      // Handle all possible response shapes gracefully
      const responseData = response.data;

      if (Array.isArray(responseData)) {
        // Plain array response (current backend behaviour)
        setItems(responseData);
        setTotalRows(responseData.length);
      } else if (responseData && Array.isArray(responseData.data)) {
        // Paginated response: { data: [...], meta: { total: ... } }
        setItems(responseData.data);
        setTotalRows(responseData.meta?.total ?? responseData.data.length);
      } else if (responseData?.data && Array.isArray(responseData.data.data)) {
        // Doubly-nested paginated response
        setItems(responseData.data.data);
        setTotalRows(responseData.data.meta?.total ?? responseData.data.data.length);
      } else {
        setItems([]);
        setTotalRows(0);
      }
    } catch (error) {
      console.error('Failed to fetch sources:', error);
      setItems([]);
      setTotalRows(0);
    } finally {
      setIsLoading(false);
    }
  }, [perPage, search]);

  useEffect(() => {
    fetchItems(page);
  }, [page, fetchItems]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handlePageChange = (newPage: number) => setPage(newPage);
  const handlePerRowsChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  const resetForm = () => setFormData({ name: '', source_code: '' });

  const handleAddClick = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleEdit = (source: Source) => {
    setSelectedSource(source);
    setFormData({
      name: source.name || '',
      source_code: source.source_code || '',
    });
    setIsEditOpen(true);
  };

  const handleDelete = async (id: number) => {
    const result = await showConfirmDialog(
      'Delete Source',
      'Are you sure you want to delete this source? This action cannot be undone.'
    );
    if (!result.isConfirmed) return;

    try {
      await crmSourceService.delete(id);
      showAlert('success', 'Deleted!', 'Source deleted successfully', 2000);
      fetchItems(page);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete source'));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await crmSourceService.create(formData);
      showAlert('success', 'Success', 'Source created successfully', 2000);
      setIsAddOpen(false);
      fetchItems(page);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to create source'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSource) return;
    setIsSubmitting(true);
    try {
      await crmSourceService.update(selectedSource.id, formData);
      showAlert('success', 'Success', 'Source updated successfully', 2000);
      setIsEditOpen(false);
      fetchItems(page);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to update source'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: TableColumn<Source>[] = [
    {
      name: 'Source Name',
      selector: (row) => row.name,
      sortable: true,
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      name: 'Source Code',
      selector: (row) => row.source_code || '-',
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
            <DropdownMenuItem onClick={() => { setSelectedSource(row); setIsViewOpen(true); }}>
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
    cells: {
      style: {
        paddingLeft: '16px',
        paddingRight: '16px',
      },
    },
  };

  const renderForm = (onSubmit: (e: React.FormEvent) => void) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Source Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="e.g. Website, Email, Cold Call"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="source_code">Source Code</Label>
        <Input
          id="source_code"
          value={formData.source_code}
          onChange={(e) => setFormData({ ...formData, source_code: e.target.value })}
          placeholder="e.g. WEB, EMAIL, CC"
        />
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
          <h1 className="text-2xl font-bold">Lead Sources</h1>
          <p className="text-muted-foreground">Manage lead acquisition sources</p>
        </div>
        <Button onClick={handleAddClick} className="bg-solarized-blue hover:bg-solarized-blue/90">
          <Plus className="mr-2 h-4 w-4" /> Add Source
        </Button>
      </div>

      <Card>
        <CardHeader>
          <form onSubmit={handleSearchSubmit} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sources..."
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
              <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No sources found</p>
              <p className="text-muted-foreground">Try adjusting your search or add a new source</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={items}
              progressPending={isLoading}
              pagination
              paginationServer
              paginationTotalRows={totalRows}
              paginationPerPage={perPage}
              paginationDefaultPage={page}
              onChangePage={handlePageChange}
              onChangeRowsPerPage={handlePerRowsChange}
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
            <DialogTitle>Add Source</DialogTitle>
            <DialogDescription>Create a new lead source</DialogDescription>
          </DialogHeader>
          {renderForm(handleCreate)}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Source</DialogTitle>
            <DialogDescription>Update lead source information</DialogDescription>
          </DialogHeader>
          {renderForm(handleUpdate)}
        </DialogContent>
      </Dialog>
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-solarized-blue" />
              Source Details
            </DialogTitle>
            <DialogDescription>
              Detailed information about the lead source
            </DialogDescription>
          </DialogHeader>
          {selectedSource && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Source Name</Label>
                  <p className="text-base font-semibold text-solarized-blue">{selectedSource.name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Source Code</Label>
                  <p className="text-sm font-medium">{selectedSource.source_code || '-'}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
