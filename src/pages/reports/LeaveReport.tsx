import { useState, useEffect, useCallback } from 'react';
import { reportService, leaveService } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Calendar, CheckCircle, XCircle, Clock, FileText, Download, Users, Search } from 'lucide-react';
import DataTable, { TableColumn } from 'react-data-table-component';

interface LeaveCategory {
  id: number;
  title: string;
}

interface EmployeeLeaveData {
  staff_member_id: number;
  employee_name: string;
  staff_code: string;
  approved_count: number;
  approved_days: number;
  pending_count: number;
  pending_days: number;
  annual_quota: number;
}

export default function LeaveReport() {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<LeaveCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [search, setSearch] = useState('');

  // Fetch leave categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await leaveService.getCategoriesList();
        setCategories(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch leave categories:', error);
      }
    };
    fetchCategories();
  }, []);

  const generateReport = useCallback(async (currentPage: number = 1) => {
    setIsLoading(true);
    try {
      const params: any = {
        year: parseInt(year),
        page: currentPage,
        per_page: perPage,
      };
      if (month) params.month = parseInt(month);
      if (categoryId) params.time_off_category_id = parseInt(categoryId);
      if (search) params.search = search;

      const response = await reportService.getLeaveReport(params);
      const data = response.data.data;
      setReportData(data);

      // Set total rows for pagination
      if (data.by_employee) {
        setTotalRows(data.by_employee.length);
      } else if (data.pagination) {
        setTotalRows(data.pagination.total || 0);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsLoading(false);
    }
  }, [year, month, categoryId, perPage, search]);

  // Fetch data when page changes
  useEffect(() => {
    if (reportData) {
      generateReport(page);
    }
  }, [page]);

  const handleGenerateClick = () => {
    setPage(1);
    generateReport(1);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params: any = { year: parseInt(year), format: 'csv' };
      if (month) params.month = parseInt(month);
      if (categoryId) params.time_off_category_id = parseInt(categoryId);

      const response = await reportService.exportLeaveReport(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leave_report_${year}${month ? '_' + month : ''}${categoryId ? '_category' + categoryId : ''}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export report:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePerRowsChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  // Search handler
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    generateReport(1);
  };

  const selectedCategoryName = categories.find(c => c.id === parseInt(categoryId))?.title || '';

  // DataTable columns for employee breakdown
  const employeeColumns: TableColumn<EmployeeLeaveData>[] = [
    {
      name: 'Employee',
      selector: (row) => row.employee_name,
      cell: (row) => (
        <div className="py-2">
          <p className="font-medium">{row.employee_name}</p>
        </div>
      ),
      sortable: true,
      minWidth: '200px',
    },
    {
      name: 'Staff Code',
      selector: (row) => row.staff_code,
      cell: (row) => (
        <span className="text-muted-foreground">{row.staff_code}</span>
      ),
      sortable: true,
    },
    {
      name: 'Annual Quota',
      selector: (row) => row.annual_quota,
      cell: (row) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-solarized-blue/10 text-solarized-blue">
          {row.annual_quota} days
        </span>
      ),
      center: true,
      sortable: true,
    },
    {
      name: 'Approved Days',
      selector: (row) => row.approved_days,
      cell: (row) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-solarized-green/10 text-solarized-green">
          {row.approved_days} days
        </span>
      ),
      center: true,
      sortable: true,
    },
    {
      name: 'Remaining Days',
      selector: (row) => row.annual_quota - row.approved_days,
      cell: (row) => {
        const remaining = row.annual_quota - row.approved_days;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${remaining > 0
            ? 'bg-solarized-cyan/10 text-solarized-cyan'
            : 'bg-solarized-red/10 text-solarized-red'
            }`}>
            {remaining} days
          </span>
        );
      },
      center: true,
      sortable: true,
    },
  ];

  // Custom styles for DataTable
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-solarized-base02">Leave Report</h1>
        <p className="text-solarized-base01">Analyze leave patterns and utilization</p>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Report Parameters</CardTitle>
          <CardDescription>Select the year, month, and leave category for the leave report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                min="2020"
                max="2100"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <select
                id="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Months</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Leave Category</Label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleGenerateClick}
                disabled={!year || isLoading}
                className="w-full bg-solarized-blue hover:bg-solarized-blue/90"
              >
                {isLoading ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <>
          <div className="grid gap-6 sm:grid-cols-4">
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-solarized-blue/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-solarized-blue" />
                  </div>
                  <div>
                    <p className="text-sm text-solarized-base01">Total Requests</p>
                    <p className="text-xl font-bold text-solarized-base02">{reportData.summary?.total_requests || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-solarized-green/10 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-solarized-green" />
                  </div>
                  <div>
                    <p className="text-sm text-solarized-base01">Approved</p>
                    <p className="text-xl font-bold text-solarized-base02">{reportData.summary?.approved || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-solarized-yellow/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-solarized-yellow" />
                  </div>
                  <div>
                    <p className="text-sm text-solarized-base01">Pending</p>
                    <p className="text-xl font-bold text-solarized-base02">{reportData.summary?.pending || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-solarized-red/10 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-solarized-red" />
                  </div>
                  <div>
                    <p className="text-sm text-solarized-base01">Declined</p>
                    <p className="text-xl font-bold text-solarized-base02">{reportData.summary?.declined || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Employee Breakdown Table with DataTable - shown when category is selected */}
          {categoryId && reportData.by_employee && reportData.by_employee.length > 0 && (
            <Card className="border-0 shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-solarized-blue" />
                    <CardTitle>Employee Leave Breakdown - {selectedCategoryName}</CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    disabled={isExporting}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {isExporting ? 'Exporting...' : 'Export CSV'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search Input */}
                <form onSubmit={handleSearchSubmit} className="flex gap-4 mb-4">
                  <Input
                    placeholder="Search by employee name or staff code..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-sm"
                  />
                  <Button type="submit" variant="outline">
                    <Search className="mr-2 h-4 w-4" /> Search
                  </Button>
                </form>
                <DataTable
                  columns={employeeColumns}
                  data={reportData.by_employee}
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
              </CardContent>
            </Card>
          )}

          {/* Show message if category selected but no employees */}
          {categoryId && (!reportData.by_employee || reportData.by_employee.length === 0) && (
            <Card className="border-0 shadow-md">
              <CardContent className="py-8 text-center">
                <Users className="h-10 w-10 text-solarized-base01 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-solarized-base02">No Leave Records Found</h3>
                <p className="text-solarized-base01 mt-1">
                  No employees have taken {selectedCategoryName} leave for the selected period.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Category Summary Table - shown when no specific category is selected */}
          {!categoryId && (
            <Card className="border-0 shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Leave Requests by Category</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    disabled={isExporting}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {isExporting ? 'Exporting...' : 'Export CSV'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Category</th>
                        <th className="text-center p-3">Count</th>
                        <th className="text-center p-3">Total Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.by_category?.map((item: any, index: number) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-medium">{item.category_title}</td>
                          <td className="text-center p-3">{item.count}</td>
                          <td className="text-center p-3">{item.total_days}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!reportData && (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-solarized-base02">No Report Generated</h3>
            <p className="text-solarized-base01 mt-1">
              Select a year and click "Generate Report" to view leave data.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
