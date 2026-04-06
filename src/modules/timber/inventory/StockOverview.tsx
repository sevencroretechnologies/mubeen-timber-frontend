import { useState, useEffect, useCallback } from 'react';
import { stockApi } from '../services/inventoryApi';
import type { TimberStockLedger } from '../types/inventory';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Search, Package, AlertTriangle, Eye, Settings, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { showAlert, getErrorMessage } from '@/lib/sweetalert';

export default function StockOverview() {
  const navigate = useNavigate();
  const [stock, setStock] = useState<TimberStockLedger[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [selectedItem, setSelectedItem] = useState<TimberStockLedger | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isThresholdOpen, setIsThresholdOpen] = useState(false);
  const [isSavingThreshold, setIsSavingThreshold] = useState(false);
  const [thresholdData, setThresholdData] = useState({
    minimum_threshold: '',
    maximum_threshold: '',
  });

  const fetchStock = useCallback(async (currentPage: number = 1) => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page: currentPage, per_page: perPage };
      if (search) params.search = search;

      const response = await stockApi.overview(params) as Record<string, unknown>;
      const data = (response.data || response) as TimberStockLedger[] | Record<string, unknown>;
      const pagination = response.pagination as Record<string, number> | undefined;
      const total = (response.total ?? pagination?.total_items ?? 0) as number;

      setStock(Array.isArray(data) ? data : []);
      setTotalRows(total);
    } catch (error) {
      console.error('Failed to fetch stock:', error);
      setStock([]);
      setTotalRows(0);
    } finally {
      setIsLoading(false);
    }
  }, [perPage, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStock(page);
    }, 300);
    return () => clearTimeout(timer);
  }, [page, fetchStock]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStock(1);
  };

  const handleView = (item: TimberStockLedger) => {
    setSelectedItem(item);
    setIsViewOpen(true);
  };

  const handleEditThreshold = (item: TimberStockLedger) => {
    setSelectedItem(item);
    setThresholdData({
      minimum_threshold: String(item.minimum_threshold ?? ''),
      maximum_threshold: String(item.maximum_threshold ?? ''),
    });
    setIsThresholdOpen(true);
  };

  const handleSaveThreshold = async () => {
    if (!selectedItem) return;

    const min = parseFloat(thresholdData.minimum_threshold);
    const max = parseFloat(thresholdData.maximum_threshold);

    if (isNaN(min) || min < 0) {
      showAlert('error', 'Validation', 'Minimum threshold must be a valid number');
      return;
    }

    if (thresholdData.maximum_threshold && (isNaN(max) || max < 0)) {
      showAlert('error', 'Validation', 'Maximum threshold must be a valid number');
      return;
    }

    if (min > 0 && max > 0 && min >= max) {
      showAlert('error', 'Validation', 'Minimum threshold must be less than maximum threshold');
      return;
    }

    setIsSavingThreshold(true);
    try {
      await stockApi.setThreshold(selectedItem.wood_type_id, {
        minimum_threshold: min,
        maximum_threshold: thresholdData.maximum_threshold ? max : undefined,
      });
      showAlert('success', 'Saved', 'Threshold settings updated successfully', 2000);
      setIsThresholdOpen(false);
      fetchStock(page);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to update thresholds'));
    } finally {
      setIsSavingThreshold(false);
    }
  };

  const getStockLevelBadge = (item: TimberStockLedger) => {
    if (item.current_quantity <= item.minimum_threshold) {
      return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertTriangle className="h-3 w-3" /> Low</span>;
    }
    if (item.current_quantity >= item.maximum_threshold && item.maximum_threshold > 0) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Overstock</span>;
    }
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Normal</span>;
  };

  const columns: TableColumn<TimberStockLedger>[] = [
    {
      name: '#',
      selector: (_row, index) => (page - 1) * perPage + (index !== undefined ? index + 1 : 0),
      width: '60px',
    },
    {
      name: 'Wood Type',
      selector: (row) => row.wood_type?.name || '-',
      sortable: true,
      minWidth: '180px',
    },
    {
      name: 'Warehouse',
      selector: (row) => row.warehouse?.name || '-',
      sortable: true,
    },
    {
      name: 'Current Qty',
      selector: (row) => row.current_quantity,
      sortable: true,
      right: true,
      cell: (row) => <span className="font-semibold">{Number(row.current_quantity).toFixed(2)}</span>,
    },
    {
      name: 'Available Qty',
      selector: (row) => row.available_quantity,
      sortable: true,
      right: true,
      cell: (row) => Number(row.available_quantity).toFixed(2),
    },
    // {
    //   name: 'Avg Cost',
    //   selector: (row) => row.average_cost,
    //   sortable: true,
    //   right: true,
    //   cell: (row) => `₹${Number(row.average_cost).toFixed(2)}`,
    // },
    {
      name: 'Status',
      cell: (row) => getStockLevelBadge(row),
      width: '120px',
    },
    {
      name: 'Actions',
      cell: (row) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleView(row)} title="View Details">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleEditThreshold(row)} title="Edit Thresholds">
            <Settings className="h-4 w-4 text-blue-600" />
          </Button>
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">Stock Overview</h1>
          <p className="text-muted-foreground">View current inventory levels across all warehouses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/inventory/movements')}>
            View Movements
          </Button>
          <Button onClick={() => navigate('/inventory/adjust')} className="bg-solarized-blue hover:bg-solarized-blue/90">
            Stock Adjustment
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <form onSubmit={handleSearchSubmit} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by wood type or warehouse..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Button type="submit" variant="outline">Search</Button>
          </form>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={stock}
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
                <Package className="mx-auto h-12 w-12 mb-4 opacity-20" />
                <p>No stock records found</p>
              </div>
            }
          />
        </CardContent>
      </Card>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-solarized-blue" />
              Stock Details
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs text-muted-foreground uppercase">Wood Type</Label><p className="text-base font-semibold">{selectedItem.wood_type?.name}</p></div>
                <div><Label className="text-xs text-muted-foreground uppercase">Warehouse</Label><p className="text-sm font-medium">{selectedItem.warehouse?.name}</p></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="text-xs text-muted-foreground uppercase">Current Qty</Label><p className="text-lg font-bold">{Number(selectedItem.current_quantity).toFixed(2)}</p></div>
                <div><Label className="text-xs text-muted-foreground uppercase">Reserved</Label><p className="text-sm">{Number(selectedItem.reserved_quantity).toFixed(2)}</p></div>
                <div><Label className="text-xs text-muted-foreground uppercase">Available</Label><p className="text-sm font-medium text-green-700">{Number(selectedItem.available_quantity).toFixed(2)}</p></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="text-xs text-muted-foreground uppercase">Avg Cost</Label><p className="text-sm">₹{Number(selectedItem.average_cost).toFixed(2)}</p></div>
                <div><Label className="text-xs text-muted-foreground uppercase">Last Purchase</Label><p className="text-sm">₹{Number(selectedItem.last_purchase_price).toFixed(2)}</p></div>
                <div><Label className="text-xs text-muted-foreground uppercase">Status</Label>{getStockLevelBadge(selectedItem)}</div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="text-xs text-muted-foreground uppercase">Min Threshold</Label><p className="text-sm">{Number(selectedItem.minimum_threshold).toFixed(2)}</p></div>
                <div><Label className="text-xs text-muted-foreground uppercase">Max Threshold</Label><p className="text-sm">{Number(selectedItem.maximum_threshold).toFixed(2)}</p></div>
                <div><Label className="text-xs text-muted-foreground uppercase">Reorder Point</Label><p className="text-sm">{Number(selectedItem.reorder_point).toFixed(2)}</p></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Threshold Settings Modal */}
      <Dialog open={isThresholdOpen} onOpenChange={setIsThresholdOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-solarized-blue" />
              Stock Threshold Settings
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-6 py-4">
              {/* Stock Info */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="h-12 w-12 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-blue-600">
                  <Package className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Wood Type</p>
                  <p className="text-base font-bold">{selectedItem.wood_type?.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedItem.warehouse?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Stock</p>
                  <p className="text-2xl font-bold text-solarized-blue">{Number(selectedItem.current_quantity).toFixed(2)}</p>
                  <p className="text-xs">CFT</p>
                </div>
              </div>

              {/* Threshold Inputs */}
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      Minimum Threshold
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g., 50"
                      value={thresholdData.minimum_threshold}
                      onChange={(e) => setThresholdData(p => ({ ...p, minimum_threshold: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">Alert when stock falls below this level</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                      Maximum Threshold
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g., 500"
                      value={thresholdData.maximum_threshold}
                      onChange={(e) => setThresholdData(p => ({ ...p, maximum_threshold: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">Alert for overstock (optional)</p>
                  </div>
                </div>

                {/* Visual Indicator */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Stock Level Preview</span>
                    <span className="text-sm font-bold text-blue-900">
                      Current: {Number(selectedItem.current_quantity).toFixed(2)} CFT
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (Number(selectedItem.current_quantity) / Math.max(1, Number(thresholdData.maximum_threshold) || Number(selectedItem.current_quantity) * 1.5)) * 100)}%`
                      }}
                    />
                    {Number(thresholdData.minimum_threshold) > 0 && (
                      <div
                        className="absolute h-full w-0.5 bg-red-500 top-0 transition-all duration-300"
                        style={{ left: `${Math.min(100, (Number(thresholdData.minimum_threshold) / Math.max(1, Number(thresholdData.maximum_threshold) || Number(selectedItem.current_quantity) * 1.5)) * 100)}%` }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                    <span>0</span>
                    {Number(thresholdData.minimum_threshold) > 0 && (
                      <span className="text-red-600 font-medium">Min: {Number(thresholdData.minimum_threshold).toFixed(2)}</span>
                    )}
                    {Number(thresholdData.maximum_threshold) > 0 && (
                      <span className="text-yellow-600 font-medium">Max: {Number(thresholdData.maximum_threshold).toFixed(2)}</span>
                    )}
                    <span>Capacity</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsThresholdOpen(false)} disabled={isSavingThreshold}>Cancel</Button>
            <Button onClick={handleSaveThreshold} disabled={isSavingThreshold} className="bg-solarized-blue">
              {isSavingThreshold && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Thresholds
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
