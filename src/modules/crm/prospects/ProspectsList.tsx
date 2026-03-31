import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { prospectApi } from '../../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../../lib/sweetalert';
import { Card, CardContent, CardHeader } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { StatusBadge } from '../../../components/ui/status-badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { TrendingUp } from 'lucide-react';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Search, Users, Eye, Edit, Trash2, Plus } from 'lucide-react';

import { Prospect } from '@/types';

export default function ProspectList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Prospect[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [totalRows, setTotalRows] = useState(0);

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Prospect | null>(null);


  const fetchItems = useCallback(async (currentPage: number = 1) => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        per_page: perPage,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      const response = await prospectApi.list(params);

      // leadApi.list currently returns the data array directly or wrapped
      // We need to handle both cases based on the current api.ts implementation
      if (Array.isArray(response)) {
        setItems(response);
        setTotalRows(response.length);
      } else if (response && response.data && Array.isArray(response.data)) {
        setItems(response.data);
        setTotalRows(response.total || 0);
      } else {
        setItems([]);
        setTotalRows(0);
      }
    } catch (error) {
      console.error('Failed to fetch prospects:', error);
      setItems([]);
      setTotalRows(0);
    } finally {
      setIsLoading(false);
    }
  }, [perPage, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems(page);
    }, 300);
    return () => clearTimeout(timer);
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

  const handleAddClick = () => {
    navigate('/crm/prospects/create');
  };

  const handleView = (item: Prospect) => {
    setSelectedItem(item);
    setIsViewOpen(true);
  };

  const handleEdit = (item: Prospect) => {
    navigate(`/crm/prospects/${item.id}/edit`);
  };

  const handleDelete = async (id: number) => {
    const result = await showConfirmDialog('Delete Prospect', 'Are you sure you want to delete this prospect?');
    if (!result.isConfirmed) return;
    try {
      await prospectApi.delete(id);
      showAlert('success', 'Deleted!', 'Prospect deleted successfully', 2000);
      fetchItems(page);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete prospect'));
    }
  };

  const columns: TableColumn<Prospect>[] = [
    { name: 'Company Name', selector: (row) => row.company_name || '-', sortable: true, minWidth: '200px' },
    {
      name: 'Party Name',
      selector: (row) => row.leads?.[0]?.pivot?.lead_name || '-',
      sortable: true,
      minWidth: '200px'
    },
    { name: 'Email', selector: (row) => row.email || '-', minWidth: '180px' },
    { name: 'Phone', selector: (row) => row.phone || '-', minWidth: '150px' },
    { name: 'Status', cell: (row) => <StatusBadge status={row.status} />, width: '130px' },
    { name: 'Source', selector: (row) => row.source || '-', minWidth: '120px' },
    {
      name: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleView(row)} title="View">
            <Eye className="h-4 w-4" />
          </Button>
          {/* <Button variant="ghost" size="icon" onClick={() => handleEdit(row)} title="Edit">
            <Edit className="h-4 w-4 text-blue-600" />
          </Button> */}
          <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)} title="Delete">
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ),
      width: '140px',
    },
  ];

  const customStyles = {
    headRow: {
      style: {
        backgroundColor: '#f9fafb',
        borderBottomWidth: '1px',
        borderBottomColor: '#e5e7eb',
        borderBottomStyle: 'solid' as const,
        minHeight: '56px'
      }
    },
    headCells: {
      style: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#374151',
        paddingLeft: '16px',
        paddingRight: '16px'
      }
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Prospects</h1>
          <p className="text-muted-foreground">Manage your prospects</p>
        </div>
        {/* <Button onClick={handleAddClick} className="bg-solarized-blue hover:bg-solarized-blue/90">
          <Plus className="mr-2 h-4 w-4" /> New Prospect
        </Button> */}
      </div>

      <Card>
        <CardHeader>
          <form onSubmit={handleSearchSubmit} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search prospects..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline">Search</Button>
          </form>
        </CardHeader>
        <CardContent>
          {!isLoading && items.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p>No prospects found</p>
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

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-solarized-blue" />
              Prospect Details
            </DialogTitle>
            <DialogDescription>
              Detailed information about the prospect
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Company Name</Label>
                  <p className="text-base font-semibold text-solarized-blue">{selectedItem.company_name || '—'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Status</Label>
                  <div>
                    <StatusBadge status={selectedItem.status} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Email</Label>
                  <p className="text-sm font-medium">{selectedItem.email || '—'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Mobile</Label>
                  <p className="text-sm font-medium">{selectedItem.phone || '—'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Source</Label>
                  <p className="text-sm font-medium">{selectedItem.source || '—'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Industry</Label>
                  <p className="text-sm font-medium">{selectedItem.industry || '—'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Market Segment</Label>
                  <p className="text-sm font-medium">{selectedItem.market_segment || '—'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Customer Group</Label>
                  <p className="text-sm font-medium">{selectedItem.customer_group || '—'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Territory</Label>
                  <p className="text-sm font-medium">{selectedItem.territory || '—'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Website</Label>
                  <p className="text-sm font-medium truncate">{selectedItem.website || '—'}</p>
                </div>
              </div>

              {(selectedItem.address || selectedItem.city) && (
                <div className="space-y-1 p-3 bg-slate-50 rounded-lg border">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Address</Label>
                  <p className="text-sm leading-relaxed">
                    {selectedItem.address}
                    {selectedItem.address && (selectedItem.city || selectedItem.state) && <br />}
                    {[selectedItem.city, selectedItem.state, selectedItem.country, selectedItem.zip_code].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
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
