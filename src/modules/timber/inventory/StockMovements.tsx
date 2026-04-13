import { useState, useEffect, useCallback } from 'react';
import { stockApi } from '../services/inventoryApi';
import type { TimberStockMovement, StockMovementType } from '../types/inventory';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Search, ArrowUpDown, ArrowDown, ArrowUp, RotateCcw, RefreshCw, Eye } from 'lucide-react';

const movementTypeConfig: Record<StockMovementType, { label: string; color: string; icon: React.ElementType }> = {
  IN: { label: 'Stock In', color: 'bg-green-100 text-green-800', icon: ArrowDown },
  OUT: { label: 'Stock Out', color: 'bg-red-100 text-red-800', icon: ArrowUp },
  ADJUSTMENT: { label: 'Adjustment', color: 'bg-blue-100 text-blue-800', icon: ArrowUpDown },
  RETURN: { label: 'Return', color: 'bg-yellow-100 text-yellow-800', icon: RotateCcw },
};

export default function StockMovements() {
  const [movements, setMovements] = useState<TimberStockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>('');

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

  const getMovementBadge = (type: StockMovementType) => {
    const config = movementTypeConfig[type];
    if (!config) return <span className="text-xs">{type}</span>;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  const columns: TableColumn<TimberStockMovement>[] = [
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
      cell: (row) => {
        const type = row.movement_type?.toLowerCase() || '';
        const isPositive = type === 'in' || type === 'return';
        return <span className={isPositive ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>{isPositive ? '+' : '-'}{Number(row.quantity).toFixed(2)}</span>;
      },
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
      cell: () => (
        <Button variant="ghost" size="icon" className="h-7 w-7" title="View">
          <Eye className="h-4 w-4" />
        </Button>
      ),
      width: '60px',
    },
  ];

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">Stock Movements</h1>
          <p className="text-muted-foreground">Track all stock in/out movements and adjustments</p>
        </div>
        {/* <Button variant="outline" onClick={() => fetchMovements(page)}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button> */}
      </div>

      <Card>
        <CardHeader>
          <form onSubmit={handleSearchSubmit} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search movements..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="border rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Types</option>
              <option value="IN">Stock In</option>
              <option value="OUT">Stock Out</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="RETURN">Return</option>
            </select>
            <Button type="submit" variant="outline">Search</Button>
          </form>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
