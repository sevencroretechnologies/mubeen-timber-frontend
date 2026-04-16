import { useState, useEffect, useCallback, useMemo } from 'react';
import { stockApi } from '../services/inventoryApi';
import type { TimberStockMovement, StockMovementType } from '../types/inventory';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Search, ArrowUpDown, ArrowDown, ArrowUp, RotateCcw, RefreshCw, Eye, Package, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';

const movementTypeConfig: Record<StockMovementType, { label: string; color: string; icon: React.ElementType }> = {
  IN: { label: 'Stock In', color: 'bg-green-100 text-green-800', icon: ArrowDown },
  OUT: { label: 'Stock Out', color: 'bg-red-100 text-red-800', icon: ArrowUp },
  ADJUSTMENT: { label: 'Adjustment', color: 'bg-blue-100 text-blue-800', icon: ArrowUpDown },
  RETURN: { label: 'Return', color: 'bg-yellow-100 text-yellow-800', icon: RotateCcw },
};

const getMovementBadge = (type: StockMovementType) => {
  const config = movementTypeConfig[type];
  if (!config) return <span className="text-xs">{type}</span>;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
};

const getQuantityDisplay = (item: TimberStockMovement, isModal = false) => {
  const type = item.movement_type?.toLowerCase() || '';
  const isPositive = type === 'in' || type === 'return';
  const val = Number(item.quantity);
  const sign = isPositive ? '+' : '-';
  const colorClass = isModal ? 'text-green-600' : (isPositive ? 'text-green-700' : 'text-red-700');
  
  return (
    <span className={`${isModal ? 'text-2xl font-black mt-1' : 'font-semibold'} ${colorClass}`}>
      {sign}{Math.abs(val).toFixed(2)}
    </span>
  );
};

export default function StockMovements() {
  const navigate = useNavigate();
  const [movements, setMovements] = useState<TimberStockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<TimberStockMovement | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const fetchMovements = useCallback(async (currentPage: number = 1) => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page: currentPage, per_page: perPage };
      if (search) params.search = search;
      if (typeFilter) params.movement_type = typeFilter;

      const response = await stockApi.movements(params) as Record<string, unknown>;
      const data = (response.data || response) as TimberStockMovement[] | Record<string, unknown>;
      const pagination = response.pagination as Record<string, number> | undefined;
      const total = (response.total ?? pagination?.total_items ?? 0) as number;

      setMovements(Array.isArray(data) ? data : []);
      setTotalRows(total);
    } catch (error) {
      console.error('Failed to fetch movements:', error);
      setMovements([]);
      setTotalRows(0);
    } finally {
      setIsLoading(false);
    }
  }, [perPage, search, typeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMovements(page);
    }, 300);
    return () => clearTimeout(timer);
  }, [page, fetchMovements]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMovements(1);
  };

  const handleView = useCallback((item: TimberStockMovement) => {
    setSelectedItem(item);
    setIsViewOpen(true);
  }, []);

  const columns: TableColumn<TimberStockMovement>[] = useMemo(() => [
    {
      name: '#',
      selector: (_row, index) => (page - 1) * perPage + (index !== undefined ? index + 1 : 0),
      width: '50px',
    },
    {
      name: 'Date',
      selector: (row) => row.created_at,
      sortable: true,
      cell: (row) => new Date(row.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      width: '100px',
    },
    {
      name: 'Type',
      cell: (row) => getMovementBadge(row.movement_type),
      width: '110px',
    },
    {
      name: 'Wood Type',
      selector: (row) => row.wood_type?.name || '-',
      sortable: true,
      minWidth: '120px',
    },
    {
      name: 'Warehouse',
      selector: (row) => row.warehouse?.name || '-',
      sortable: true,
    },
    {
      name: 'Qty',
      selector: (row) => row.quantity,
      sortable: true,
      right: true,
      width: '80px',
      cell: (row) => getQuantityDisplay(row),
    },
    {
      name: 'Before',
      selector: (row) => row.before_quantity,
      right: true,
      width: '70px',
      cell: (row) => Number(row.before_quantity).toFixed(2),
    },
    {
      name: 'After',
      selector: (row) => row.after_quantity,
      right: true,
      width: '70px',
      cell: (row) => <span className="font-semibold">{Number(row.after_quantity).toFixed(2)}</span>,
    },
    {
      name: 'Actions',
      cell: (row) => (
        <div className="flex justify-center w-full">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-solarized-blue hover:bg-solarized-blue/5" title="View" onClick={() => handleView(row)}>
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
      width: '70px',
      center: true,
    },
  ], [page, perPage, handleView]);

  const customStyles = {
    headRow: {
      style: { backgroundColor: '#f9fafb', borderBottomWidth: '1px', borderBottomColor: '#e5e7eb', borderBottomStyle: 'solid' as const, minHeight: '48px' },
    },
    headCells: {
      style: { fontSize: '13px', fontWeight: '600', color: '#374151', paddingLeft: '10px', paddingRight: '10px' },
    },
    cells: {
      style: { paddingLeft: '10px', paddingRight: '10px' },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02 tracking-tight">Stock Movements</h1>
          <p className="text-sm text-muted-foreground">Track all stock in/out movements and adjustments</p>
        </div>
        <div className="flex flex-row gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={() => navigate('/inventory')} className="flex-1 md:w-auto text-xs sm:text-sm px-2 sm:px-4">
            Stock Overview
          </Button>
          <Button onClick={() => navigate('/inventory/adjust')} className="bg-solarized-blue hover:bg-solarized-blue/90 flex-1 md:w-auto shadow-sm text-xs sm:text-sm px-2 sm:px-4">
            Stock Adjustment
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search movements..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="pl-10 h-10 border-gray-200 focus:ring-solarized-blue/20" 
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="h-10 border border-gray-200 rounded-md px-3 text-sm focus:ring-2 focus:ring-solarized-blue/20 outline-none bg-white"
            >
              <option value="">All Types</option>
              <option value="IN">Stock In</option>
              <option value="OUT">Stock Out</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="RETURN">Return</option>
            </select>
            <Button type="submit" variant="secondary" className="w-full sm:w-auto h-10 px-6 font-semibold">
              Search
            </Button>
          </form>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {/* Desktop View */}
          <div className="hidden md:block">
            <DataTable
              columns={columns}
              data={movements}
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
                  <ArrowUpDown className="mx-auto h-12 w-12 mb-4 opacity-20" />
                  <p>No stock movements found</p>
                </div>
              }
            />
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 p-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-gray-200">
                <Loader2 className="h-8 w-8 animate-spin text-solarized-blue/20 mb-2" />
                <p className="text-sm text-muted-foreground animate-pulse">Loading movements...</p>
              </div>
            ) : movements.length === 0 ? (
              <div className="text-center py-20 rounded-xl border border-dashed border-gray-200">
                <Package className="mx-auto h-12 w-12 mb-4 opacity-10" />
                <p className="text-muted-foreground">No movements found</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4">
                  {movements.map((item) => {
                    return (
                      <div key={item.id} className="responsive-card p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 leading-tight mb-1">
                              {item.wood_type?.name || 'Unknown Wood'}
                            </h3>
                            <p className="text-xs text-muted-foreground font-normal">
                              {item.warehouse?.name || 'No Warehouse'}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-solarized-blue"
                              onClick={() => handleView(item)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-[10px] text-gray-400 font-medium mb-1">Quantity</p>
                            <p className="text-lg">{getQuantityDisplay(item)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-gray-400 font-medium mb-1">Type</p>
                            <div className="inline-block">{getMovementBadge(item.movement_type)}</div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[10px] text-gray-400 font-medium uppercase font-bold">Before</p>
                            <p className="text-sm font-normal text-gray-900">{Number(item.before_quantity).toFixed(2)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-gray-400 font-medium uppercase font-bold">After</p>
                            <p className="text-sm font-bold text-gray-900">{Number(item.after_quantity).toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="mt-2 text-[10px] text-muted-foreground flex justify-between">
                            <span>{new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mobile Pagination */}
                {totalRows > perPage && (
                  <div className="flex justify-between items-center py-4 px-2 border-t border-gray-100 mt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                      className="h-9 px-3 text-gray-600"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                    </Button>
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest text-center">
                      Page {page} / {Math.ceil(totalRows / perPage)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={page >= Math.ceil(totalRows / perPage)}
                      onClick={() => setPage(page + 1)}
                      className="h-9 px-3 text-gray-600"
                    >
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-solarized-blue" />
              Movement Details
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-3 gap-x-8 gap-y-6">
                <div className="col-span-2">
                  <Label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Warehouse</Label>
                  <p className="text-sm font-bold text-gray-900 mt-1">{selectedItem.warehouse?.name}</p>
                </div>
                <div>
                  <Label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Wood Type</Label>
                  <p className="text-sm font-bold text-gray-900 mt-1">{selectedItem.wood_type?.name}</p>
                </div>

                <div>
                  <Label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Quantity</Label>
                  <p className="flex flex-col">{getQuantityDisplay(selectedItem, true)}</p>
                </div>
                <div>
                  <Label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Movement Type</Label>
                  <div className="mt-2 text-left">{getMovementBadge(selectedItem.movement_type)}</div>
                </div>
                <div>
                  <Label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Date</Label>
                  <p className="text-sm font-bold text-gray-900 mt-2">{new Date(selectedItem.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>

                <div>
                  <Label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Before Qty</Label>
                  <p className="text-sm font-bold text-gray-900 mt-1">{Number(selectedItem.before_quantity).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">After Qty</Label>
                  <p className="text-sm font-bold text-gray-900 mt-1">{Number(selectedItem.after_quantity).toFixed(2)}</p>
                </div>
              </div>

             
            </div>
          )}
          <DialogFooter className="sm:justify-start">
            <Button variant="outline" className="w-full h-11 text-sm font-bold border-gray-200" onClick={() => setIsViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
