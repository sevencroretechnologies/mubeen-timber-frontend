import { useState, useEffect, useCallback } from 'react';
import { reportService } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Calendar, Users, Clock, FileText, Download, Search } from 'lucide-react';
import DataTable, { TableColumn } from 'react-data-table-component';

interface AttendanceRecord {
  staff_member: {
    id: number;
    staff_code: string;
    full_name: string;
  };
  present_days: number;
  absent_days: number;
  half_days: number;
  on_leave: number;
  holidays: number;
  total_late_minutes: number;
  total_overtime_minutes: number;
  total_early_leave_minutes: number;
}

export default function AttendanceReport() {
  const [month, setMonth] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);

  const fetchReport = useCallback(async (currentPage: number = 1, searchTerm?: string) => {
    if (!month) return;

    setIsLoading(true);
    try {
      const response = await reportService.getAttendanceReport({
        month: month,
        search: searchTerm ?? search,
        page: currentPage,
        per_page: perPage,
      });

      const data = response.data.data;
      setReportData(data);
      setAttendanceData(data.report || []);
      setTotalRows(data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsLoading(false);
    }
  }, [month, search, perPage]);

  useEffect(() => {
    if (reportData && month) {
      fetchReport(page);
    }
  }, [page, perPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReport(1, search);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePerRowsChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
  };

  const handleExport = async (format: string) => {
    setIsExporting(true);
    try {
      const response = await reportService.exportAttendanceReport({
        month: month,
        format,
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_report_${month}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export report:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const columns: TableColumn<AttendanceRecord>[] = [
    {
      name: 'Staff Code',
      selector: (row) => row.staff_member.staff_code,
      sortable: true,
      minWidth: '120px',
    },
    {
      name: 'Name',
      selector: (row) => row.staff_member.full_name,
      sortable: true,
      minWidth: '200px',
    },
    {
      name: 'Present',
      selector: (row) => row.present_days,
      sortable: true,
      cell: (row) => <span className="text-green-600 font-medium">{row.present_days}</span>,
      minWidth: '100px',
    },
    {
      name: 'Absent',
      selector: (row) => row.absent_days,
      sortable: true,
      cell: (row) => <span className="text-red-600 font-medium">{row.absent_days}</span>,
      minWidth: '100px',
    },
    {
      name: 'Half Days',
      selector: (row) => row.half_days,
      sortable: true,
      cell: (row) => <span className="text-yellow-600 font-medium">{row.half_days}</span>,
      minWidth: '120px',
    },
    // {
    //   name: 'On Leave',
    //   selector: (row) => row.on_leave,
    //   sortable: true,
    //   cell: (row) => <span className="text-blue-600 font-medium">{row.on_leave}</span>,
    //   minWidth: '100px',
    // },
    {
      name: 'Late (mins)',
      selector: (row) => row.total_late_minutes,
      sortable: true,
      minWidth: '120px',
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-solarized-base02">Attendance Report</h1>
        <p className="text-solarized-base01">Generate and analyze attendance reports</p>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Report Parameters</CardTitle>
          <CardDescription>Select the month for the attendance report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Input
                id="month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => fetchReport(1)}
                disabled={!month || isLoading}
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
                  <div className="w-10 h-10 rounded-full bg-solarized-green/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-solarized-green" />
                  </div>
                  <div>
                    <p className="text-sm text-solarized-base01">Total Present Days</p>
                    <p className="text-xl font-bold text-solarized-base02">
                      {reportData.summary?.total_present_days || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-solarized-red/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-solarized-red" />
                  </div>
                  <div>
                    <p className="text-sm text-solarized-base01">Total Absent Days</p>
                    <p className="text-xl font-bold text-solarized-base02">
                      {reportData.summary?.total_absent_days || 0}
                    </p>
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
                    <p className="text-sm text-solarized-base01">Total Late Minutes</p>
                    <p className="text-xl font-bold text-solarized-base02">
                      {reportData.summary?.total_late_minutes || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-solarized-blue/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-solarized-blue" />
                  </div>
                  <div>
                    <p className="text-sm text-solarized-base01">Working Days</p>
                    <p className="text-xl font-bold text-solarized-base02">
                      {reportData.total_working_days || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Staff Attendance Details</CardTitle>
                <div className="flex gap-2">
                  <form onSubmit={handleSearchSubmit} className="flex gap-2">
                    <Input
                      placeholder="Search staff code or name..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      disabled={!month || isLoading}
                      className="w-64"
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={!month || !search || isLoading}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </form>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('csv')}
                    disabled={!month || isExporting || !reportData}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {isExporting ? 'Exporting...' : 'Export CSV'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!isLoading && attendanceData.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
                  <p className="text-solarized-base01">No attendance data found for the selected criteria</p>
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={attendanceData}
                  progressPending={isLoading}
                  pagination
                  paginationServer
                  paginationTotalRows={totalRows}
                  paginationPerPage={perPage}
                  onChangePage={handlePageChange}
                  onChangeRowsPerPage={handlePerRowsChange}
                  customStyles={customStyles}
                  highlightOnHover
                  responsive
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!reportData && (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-solarized-base02">No Report Generated</h3>
            <p className="text-solarized-base01 mt-1">
              Select a month and click "Generate Report" to view attendance data.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
