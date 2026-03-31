import { useState, useEffect, useCallback } from 'react';
import { stockAlertApi } from '../services/inventoryApi';
import type { TimberStockAlert } from '../types/inventory';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DataTable, { TableColumn } from 'react-data-table-component';
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { showAlert, showConfirmDialog, getErrorMessage } from '@/lib/sweetalert';

export default function LowStockAlerts() {
  const [alerts, setAlerts] = useState<TimberStockAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);

  const fetchAlerts = useCallback(async (currentPage: number = 1) => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = { page: currentPage, per_page: perPage };
      const response = await stockAlertApi.list(params) as Record<string, unknown>;
      const data = (response.data || response) as TimberStockAlert[] | Record<string, unknown>;
      const pagination = response.pagination as Record<string, number> | undefined;
      const total = (response.total ?? pagination?.total_items ?? 0) as number;

      setAlerts(Array.isArray(data) ? data : []);
      setTotalRows(total);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      setAlerts([]);
      setTotalRows(0);
    } finally {
      setIsLoading(false);
    }
  }, [perPage]);

  useEffect(() => {
    fetchAlerts(page);
  }, [page, fetchAlerts]);

  const handleResolve = async (id: number) => {
    const result = await showConfirmDialog('Resolve Alert', 'Mark this alert as resolved?');
    if (!result.isConfirmed) return;
    try {
      await stockAlertApi.resolve(id);
      showAlert('success', 'Resolved', 'Alert marked as resolved', 2000);
      fetchAlerts(page);
    } catch (error) {
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to resolve alert'));
    }
  };

  const getAlertTypeBadge = (type: string) => {
    switch (type) {
      case 'low_stock': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Low Stock</span>;
      case 'overstock': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Overstock</span>;
      case 'reorder_point': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Reorder</span>;
      default: return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{type}</span>;
    }
  };

  const columns: TableColumn<TimberStockAlert>[] = [
    {
      name: '#',
      selector: (_row, index) => (page - 1) * perPage + (index !== undefined ? index + 1 : 0),
      width: '60px',
    },
    {
      name: 'Alert Type',
      cell: (row) => getAlertTypeBadge(row.alert_type),
      width: '120px',
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
      right: true,
      cell: (row) => <span className="font-semibold text-red-700">{Number(row.current_quantity).toFixed(2)}</span>,
    },
    {
      name: 'Threshold',
      selector: (row) => row.threshold_quantity,
      right: true,
      cell: (row) => Number(row.threshold_quantity).toFixed(2),
    },
    {
      name: 'Date',
      selector: (row) => row.created_at,
      cell: (row) => new Date(row.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      width: '120px',
    },
    {
      name: 'Actions',
      cell: (row) => (
        <Button variant="ghost" size="sm" onClick={() => handleResolve(row.id)} title="Resolve">
          <CheckCircle className="h-4 w-4 text-green-600 mr-1" /> Resolve
        </Button>
      ),
      width: '120px',
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
          <h1 className="text-2xl font-bold text-solarized-base02">Low Stock Alerts</h1>
          <p className="text-muted-foreground">Items that need attention or restocking</p>
        </div>
        <Button variant="outline" onClick={() => fetchAlerts(page)}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={alerts}
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
                <AlertTriangle className="mx-auto h-12 w-12 mb-4 opacity-20" />
                <p>No active alerts - all stock levels are normal</p>
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
