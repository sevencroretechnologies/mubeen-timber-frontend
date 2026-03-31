import { useState, useEffect, useCallback } from 'react';
import { leaveService } from '../../services/api';
import { showAlert, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import { Skeleton } from '../../components/ui/skeleton';
import { CheckCircle, XCircle, Clock, Calendar, Eye } from 'lucide-react';
import DataTable, { TableColumn } from 'react-data-table-component';
import { StatusBadge } from '../../components/ui/status-badge';

interface LeaveRequest {
  id: number;
  staff_member?: { full_name: string };
  category?: { title: string };
  start_date: string;
  end_date: string;
  total_days: string | number;
  reason: string;
  approval_status: string;
  created_at: string;
}

interface LeaveStats {
  total: number;
  pending: number;
  approved: number;
  declined: number;
  approved_today: number;
  declined_today: number;
}

export default function LeaveApprovals() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [stats, setStats] = useState<LeaveStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [action, setAction] = useState<'approve' | 'decline' | null>(null);
  const [remarks, setRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchRequests = useCallback(async (currentPage: number = 1) => {
    setIsLoading(true);
    try {
      const params: any = {
        page: currentPage,
        per_page: perPage
      };
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const response = await leaveService.getRequests(params);
      const { data, meta } = response.data;

      setRequests(data || []);
      setTotalRows(meta?.total || 0);
    } catch (error) {
      console.error('Failed to fetch leave requests:', error);
      showAlert('error', 'Error', 'Failed to fetch leave requests');
      setRequests([]);
      setTotalRows(0);
    } finally {
      setIsLoading(false);
    }
  }, [perPage, statusFilter]);

  useEffect(() => {
    fetchRequests(page);
  }, [page, fetchRequests]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await leaveService.getStatistics();
      setStats(response.data.data || response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePerRowsChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  const handleProcess = async () => {
    if (!selectedRequest || !action) return;

    setIsProcessing(true);
    try {
      await leaveService.processRequest(selectedRequest.id, { action, remarks });
      showAlert(
        'success',
        'Success!',
        action === 'approve' ? 'Leave request approved successfully' : 'Leave request declined successfully',
        2000
      );
      setSelectedRequest(null);
      setAction(null);
      setRemarks('');
      fetchRequests(page); // Refresh list
      fetchStats();    // Refresh stats
    } catch (error: unknown) {
      console.error('Failed to process request:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to process leave request'));
    } finally {
      setIsProcessing(false);
    }
  };

  const openDialog = (request: LeaveRequest, actionType: 'approve' | 'decline') => {
    setSelectedRequest(request);
    setAction(actionType);
    setRemarks('');
  };

  const handleTabChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };



  const columns: TableColumn<LeaveRequest>[] = [
    {
      name: 'Employee',
      selector: (row) => row.staff_member?.full_name || 'Unknown',
      sortable: true,
      minWidth: '150px',
    },
    {
      name: 'Type',
      selector: (row) => row.category?.title || 'Unknown',
      sortable: true,
      minWidth: '120px',
    },
    {
      name: 'Dates',
      cell: (row) => (
        <div className="flex flex-col">
          <span className="text-sm">{formatDate(row.start_date)}</span>
          <span className="text-xs text-muted-foreground">to {formatDate(row.end_date)}</span>
        </div>
      ),
      minWidth: '150px',
    },
    {
      name: 'Days',
      selector: (row) => Math.floor(Number(row.total_days)),
      cell: (row) => Math.floor(Number(row.total_days)),
      sortable: true,
      width: '80px',
    },
    {
      name: 'Reason',
      selector: (row) => row.reason || '-',
      minWidth: '200px',
      cell: (row) => (
        <div className="truncate max-w-[200px]" title={row.reason}>
          {row.reason || '-'}
        </div>
      ),
    },
    {
      name: 'Status',
      cell: (row) => (
        <StatusBadge status={row.approval_status} />
      ),
      minWidth: '100px',
    },
    {
      name: 'Actions',
      cell: (row) => (
        row.approval_status === 'pending' ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-solarized-green hover:bg-solarized-green/90 h-8 px-2"
              onClick={() => openDialog(row, 'approve')}
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-solarized-red text-solarized-red hover:bg-solarized-red/10 h-8 px-2"
              onClick={() => openDialog(row, 'decline')}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">Processed</span>
        )
      ),
      width: '120px',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">Leave Approvals</h1>
          <p className="text-solarized-base01">Review and process pending leave requests</p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-solarized-yellow/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-solarized-yellow" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Pending Approval</p>
                <p className="text-2xl font-bold text-solarized-base02">{stats?.pending || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-solarized-green/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-solarized-green" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Approved Today</p>
                <p className="text-2xl font-bold text-solarized-base02">{stats?.approved_today || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-solarized-red/10 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-solarized-red" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Declined Today</p>
                <p className="text-2xl font-bold text-solarized-base02">{stats?.declined_today || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" value={statusFilter} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="all">All Requests</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="declined">Declined</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter}>
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle>Request List</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={requests}
                progressPending={isLoading}
                pagination
                paginationServer
                paginationTotalRows={totalRows}
                paginationPerPage={perPage}
                paginationRowsPerPageOptions={[5, 10, 15, 20]}
                paginationDefaultPage={page}
                onChangePage={handlePageChange}
                onChangeRowsPerPage={handlePerRowsChange}
                highlightOnHover
                responsive
                noHeader
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Approve' : 'Decline'} Leave Request
            </DialogTitle>
            <DialogDescription>
              {action === 'approve'
                ? 'Are you sure you want to approve this leave request?'
                : 'Are you sure you want to decline this leave request?'}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-solarized-base3 p-4 rounded-lg space-y-2">
                <p><strong>Employee:</strong> {selectedRequest.staff_member?.full_name}</p>
                <p><strong>Type:</strong> {selectedRequest.category?.title}</p>
                <p><strong>Dates:</strong> {formatDate(selectedRequest.start_date)} to {formatDate(selectedRequest.end_date)}</p>
                <p><strong>Days:</strong> {Math.floor(Number(selectedRequest.total_days))}</p>
                {selectedRequest.reason && <p><strong>Reason:</strong> {selectedRequest.reason}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Remarks (optional)</label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add any remarks..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleProcess}
              disabled={isProcessing}
              className={
                action === 'approve'
                  ? 'bg-solarized-green hover:bg-solarized-green/90'
                  : 'bg-solarized-red hover:bg-solarized-red/90'
              }
            >
              {isProcessing ? 'Processing...' : action === 'approve' ? 'Approve' : 'Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
