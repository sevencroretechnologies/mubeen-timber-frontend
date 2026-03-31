import { useState, useEffect, useCallback } from 'react';
import { crmCampaignService } from '../../../services/api';
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
import { Plus, Search, MoreHorizontal, Eye, Edit, Trash2, Megaphone } from 'lucide-react';

interface Campaign {
  id: number;
  name: string;
  campaign_code: string | null;
  created_at: string;
}

export default function CampaignsList() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({ name: '', campaign_code: '' });

  const fetchItems = useCallback(async (currentPage: number = 1) => {
    setIsLoading(true);
    try {
      const response = await crmCampaignService.getAll({
        page: currentPage,
        per_page: perPage,
        search,
      });

      const responseData = response.data;

      // Backend returns { message, data (paginated), pagination }
      // responseData.data is a Laravel paginator with .data array
      if (responseData?.data?.data && Array.isArray(responseData.data.data)) {
        setItems(responseData.data.data);
        setTotalRows(responseData.pagination?.total_items ?? responseData.data.total ?? responseData.data.data.length);
      } else if (responseData?.data && Array.isArray(responseData.data)) {
        setItems(responseData.data);
        setTotalRows(responseData.pagination?.total_items ?? responseData.data.length);
      } else if (Array.isArray(responseData)) {
        setItems(responseData);
        setTotalRows(responseData.length);
      } else {
        setItems([]);
        setTotalRows(0);
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      setItems([]);
      setTotalRows(0);
    } finally {
      setIsLoading(false);
    }
  }, [perPage, search]);

  useEffect(() => { fetchItems(page); }, [page, fetchItems]);

  const handleSearchSubmit = (e: React.FormEvent) => { e.preventDefault(); setPage(1); };
  const resetForm = () => setFormData({ name: '', campaign_code: '' });
  const handleAddClick = () => { resetForm(); setIsAddOpen(true); };
  const handleView = (item: Campaign) => { setSelected(item); setIsViewOpen(true); };

  const handleEdit = (item: Campaign) => {
    setSelected(item);
    setFormData({
      name: item.name || '',
      campaign_code: item.campaign_code || '',
    });
    setIsEditOpen(true);
  };

  const handleDelete = async (id: number) => {
    const result = await showConfirmDialog('Delete Campaign', 'Are you sure you want to delete this campaign? This action cannot be undone.');
    if (!result.isConfirmed) return;
    try {
      await crmCampaignService.delete(id);
      showAlert('success', 'Deleted!', 'Campaign deleted successfully', 2000);
      fetchItems(page);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete campaign'));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await crmCampaignService.create(formData);
      showAlert('success', 'Success', 'Campaign created successfully', 2000);
      setIsAddOpen(false);
      fetchItems(page);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to create campaign'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setIsSubmitting(true);
    try {
      await crmCampaignService.update(selected.id, formData);
      showAlert('success', 'Success', 'Campaign updated successfully', 2000);
      setIsEditOpen(false);
      fetchItems(page);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to update campaign'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: TableColumn<Campaign>[] = [
    {
      name: 'Campaign Name',
      selector: (row) => row.name,
      sortable: true,
      cell: (row) => <span className="font-medium">{row.name}</span>,
      minWidth: '200px',
    },
    {
      name: 'Campaign Code',
      selector: (row) => row.campaign_code || '-',
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
        <Label htmlFor="name">Campaign Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="e.g. Summer Sale, Product Launch"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="campaign_code">Campaign Code</Label>
        <Input
          id="campaign_code"
          value={formData.campaign_code}
          onChange={(e) => setFormData({ ...formData, campaign_code: e.target.value })}
          placeholder="e.g. SS2026, PL001"
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
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">Manage your CRM campaigns</p>
        </div>
        <Button onClick={handleAddClick} className="bg-solarized-blue hover:bg-solarized-blue/90">
          <Plus className="mr-2 h-4 w-4" /> Add Campaign
        </Button>
      </div>

      <Card>
        <CardHeader>
          <form onSubmit={handleSearchSubmit} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
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
              <Megaphone className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No campaigns found</p>
              <p className="text-muted-foreground">Try adjusting your search or add a new campaign</p>
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
              onChangePage={(p) => setPage(p)}
              onChangeRowsPerPage={(pp) => { setPerPage(pp); setPage(1); }}
              customStyles={customStyles}
              highlightOnHover
              responsive
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-solarized-blue" />
              Campaign Details
            </DialogTitle>
            <DialogDescription>
              Detailed information about the campaign
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Campaign Name</Label>
                  <p className="text-base font-semibold text-solarized-blue">{selected.name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Campaign Code</Label>
                  <p className="text-sm font-medium">{selected.campaign_code || '-'}</p>
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

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Campaign</DialogTitle>
            <DialogDescription>Create a new campaign</DialogDescription>
          </DialogHeader>
          {renderForm(handleCreate)}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
            <DialogDescription>Update campaign information</DialogDescription>
          </DialogHeader>
          {renderForm(handleUpdate)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
