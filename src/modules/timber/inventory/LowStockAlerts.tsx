import { useState, useEffect, useCallback } from 'react';
import { stockAlertApi } from '../services/inventoryApi';
import type { TimberStockAlert } from '../types/inventory';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DataTable, { TableColumn } from 'react-data-table-component';
import { AlertTriangle, CheckCircle, RefreshCw, Package, Loader2, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { showAlert, showConfirmDialog, getErrorMessage } from '@/lib/sweetalert';
import { useNavigate } from 'react-router-dom';

export default function LowStockAlerts() {
  const navigate = useNavigate();
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

      <Card className="border-none shadow-sm md:border md:shadow-none">
        <CardContent className="p-0 sm:p-6">
          {/* Desktop View */}
          <div className="hidden md:block">
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
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 p-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-gray-200">
                <Loader2 className="h-8 w-8 animate-spin text-solarized-blue/20 mb-2" />
                <p className="text-sm text-muted-foreground animate-pulse">Loading alerts...</p>
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-20 rounded-xl border border-dashed border-gray-200">
                <Package className="mx-auto h-12 w-12 mb-4 opacity-10" />
                <p className="text-muted-foreground">No active alerts found</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4">
                  {alerts.map((item) => (
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
                        <div className="shrink-0">{getAlertTypeBadge(item.alert_type)}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-[10px] text-gray-400 font-medium uppercase font-bold tracking-tight mb-1">Current</p>
                          <p className="font-bold text-lg text-red-700">
                            {Number(item.current_quantity).toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-gray-400 font-medium uppercase font-bold tracking-tight mb-1 text-right">Threshold</p>
                          <p className="font-bold text-lg text-gray-900">
                            {Number(item.threshold_quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleResolve(item.id)} 
                          className="h-8 px-3 text-green-700 font-bold bg-green-50 hover:bg-green-100"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> RESOLVE
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mobile Pagination */}
                {totalRows > perPage && (
                  <div className="flex justify-between items-center py-4 px-2 border-t border-gray-100 mt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                      className="h-9 px-3 text-gray-600 font-bold"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> PREV
                    </Button>
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest text-center">
                      Page {page} / {Math.ceil(totalRows / perPage)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={page >= Math.ceil(totalRows / perPage)}
                      onClick={() => setPage(page + 1)}
                      className="h-9 px-3 text-gray-600 font-bold"
                    >
                      NEXT <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
