import { useState, useEffect, useCallback } from 'react';
import { payrollService } from '../../services/api';
import { showAlert } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { StatusBadge } from '../../components/ui/status-badge';
import SalarySlipModal from './SalarySlipModal'; // Import the modal
import { Skeleton } from '../../components/ui/skeleton';
import {
  IndianRupee,
  Download,
  Eye,
  Filter,
} from 'lucide-react';
import DataTable, { TableColumn } from 'react-data-table-component';

interface SalarySlip {
  id: number;
  slip_reference: string;
  staff_member: {
    full_name: string;
    staff_code: string;
    personal_email: string | null;
    mobile_number: string | null;
    bank_account_name: string | null;
    bank_account_number: string | null;
    bank_name: string | null;
    job_title?: {
      title: string;
    };
  };
  salary_period: string;
  basic_salary: string;
  benefits_breakdown: Array<{ name: string; amount: string }>;
  deductions_breakdown: Array<{ name: string; amount: string }>;
  total_earnings: string;
  total_deductions: string;
  net_payable: string;
  status: string;
  generated_at: string;
  paid_at: string | null;
  created_at: string;
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export default function SalarySlips() {
  const [slips, setSlips] = useState<SalarySlip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [salaryPeriod, setSalaryPeriod] = useState('');
  const [month, setMonth] = useState<number>(0);
  const [year, setYear] = useState<number>(0);

  // Pagination state
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);

  // Modal state
  const [selectedSlip, setSelectedSlip] = useState<SalarySlip | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // When salaryPeriod changes, parse month and year
    if (salaryPeriod) {
      const [yearStr, monthStr] = salaryPeriod.split('-');
      setYear(parseInt(yearStr, 10));
      setMonth(parseInt(monthStr, 10));
    } else {
      setMonth(0);
      setYear(0);
    }
  }, [salaryPeriod]);

  const fetchSlips = useCallback(async (currentPage: number = 1) => {
    setIsLoading(true);
    try {
      const params: Record<string, unknown> = {
        page: currentPage,
        per_page: perPage
      };

      // Send month and year separately as the backend expects
      if (month && year) {
        params.month = month;
        params.year = year;
      }

      console.log('Fetching with params:', params); // Debug log

      const response = await payrollService.getSalarySlips(params);
      const { data, meta } = response.data;

      setSlips(data || []);
      setTotalRows(meta?.total || 0);
    } catch (error) {
      console.error('Failed to fetch salary slips:', error);
      showAlert('error', 'Error', 'Failed to fetch salary slips');
      setSlips([]);
      setTotalRows(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage, month, year]);

  useEffect(() => {
    fetchSlips(page);
  }, [page, fetchSlips]);

  const handleDownload = async (id: number) => {
    try {
      // Uncomment when backend implements download endpoint
      const response = await payrollService.downloadSlip(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `salary-slip-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download slip:', error);
      showAlert('error', 'Error', 'PDF download not available yet');
    }
  };

  const handleViewDetails = (slip: SalarySlip) => {
    setSelectedSlip(slip);
    setIsModalOpen(true);
  };



  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(num || 0);
  };

  const handleFilter = () => {
    setPage(1); // Reset to first page when filtering
    fetchSlips(1);
  };

  const handleClearFilter = () => {
    setSalaryPeriod('');
    setPage(1);
    // fetchSlips will be triggered by useEffect when page changes to 1, or needs manual trigger if already 1
    if (page === 1) fetchSlips(1);
  };

  // Pagination Handlers
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePerRowsChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  const columns: TableColumn<SalarySlip>[] = [
    {
      name: 'Reference',
      selector: (row) => row.slip_reference,
      sortable: true,
      cell: (row) => (
        <span className="font-medium">{row.slip_reference}</span>
      ),
      minWidth: '180px',
    },
    {
      name: 'Employee',
      selector: (row) => row.staff_member?.full_name || 'Unknown',
      sortable: true,
      minWidth: '150px',
    },
    {
      name: 'Period',
      selector: (row) => row.salary_period,
      sortable: true,
      cell: (row) => (
        <Badge variant="outline">
          {row.salary_period}
        </Badge>
      ),
    },
    {
      name: 'Earnings',
      selector: (row) => row.total_earnings,
      cell: (row) => (
        <span className="text-green-600 font-medium">
          {formatCurrency(row.total_earnings)}
        </span>
      ),
    },
    {
      name: 'Deductions',
      selector: (row) => row.total_deductions,
      cell: (row) => (
        <span className="text-red-600">
          {formatCurrency(row.total_deductions)}
        </span>
      ),
    },
    {
      name: 'Net Pay',
      selector: (row) => row.net_payable,
      cell: (row) => (
        <span className="font-bold text-gray-900">
          {formatCurrency(row.net_payable)}
        </span>
      ),
    },
    {
      name: 'Status',
      cell: (row) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      name: 'Actions',
      cell: (row) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleViewDetails(row)}
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDownload(row.id)}
            className="relative group"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ),
      ignoreRowClick: true,
      button: true,
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Salary Slips</h1>
          <p className="text-gray-600">View and download generated salary slips</p>
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Salary Slips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="salary_period">Salary Period (YYYY-MM)</Label>
                <div className="flex gap-2">
                  <Input
                    id="salary_period"
                    type="month"
                    value={salaryPeriod}
                    onChange={(e) => setSalaryPeriod(e.target.value)}
                    placeholder="Select month and year"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleFilter}
                    className="bg-solarized-blue hover:bg-solarized-blue/90"
                  >
                    Apply Filter
                  </Button>
                  {salaryPeriod && (
                    <Button
                      onClick={handleClearFilter}
                      variant="outline"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {salaryPeriod && (
                  <p className="text-sm text-gray-500">
                    Filtering for: {month}/{year}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            {isLoading && !slips.length ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : slips.length === 0 ? (
              <div className="text-center py-12">
                <IndianRupee className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No salary slips found</h3>
                <p className="text-gray-600 mt-1">
                  {salaryPeriod
                    ? `No salary slips found for ${salaryPeriod}. Try a different period.`
                    : 'Generate payroll to create salary slips.'}
                </p>
                {salaryPeriod && (
                  <Button
                    onClick={handleClearFilter}
                    variant="outline"
                    className="mt-4"
                  >
                    Clear Filter
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="mb-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {salaryPeriod ? `Salary Slips for ${salaryPeriod}` : 'All Salary Slips'}
                    </h3>
                  </div>
                  {salaryPeriod && (
                    <Button
                      onClick={handleClearFilter}
                      variant="outline"
                      size="sm"
                    >
                      Clear Filter
                    </Button>
                  )}
                </div>

                <DataTable
                  columns={columns}
                  data={slips}
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
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <SalarySlipModal
        slip={selectedSlip}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSlip(null);
        }}
      />
    </>
  );
}
