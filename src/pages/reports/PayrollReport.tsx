import { useState } from 'react';
import { reportService } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, FileText, DollarSign, TrendingUp, TrendingDown, Users } from 'lucide-react';

export default function PayrollReport() {
  const [salaryPeriod, setSalaryPeriod] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const generateReport = async () => {
    setIsLoading(true);
    try {
      const response = await reportService.getPayrollReport({
        salary_period: salaryPeriod,
      });
      setReportData(response.data.data);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    setIsExporting(true);
    try {
      const response = await reportService.exportPayrollReport({
        salary_period: salaryPeriod,
        format,
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payroll_report_${salaryPeriod}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export report:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-solarized-base02">Payroll Report</h1>
        <p className="text-solarized-base01">Analyze payroll expenses and distributions</p>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Report Parameters</CardTitle>
          <CardDescription>Select the salary period for the report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="salary_period">Salary Period</Label>
              <Input
                id="salary_period"
                type="month"
                value={salaryPeriod}
                onChange={(e) => setSalaryPeriod(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={generateReport}
                disabled={!salaryPeriod || isLoading}
                className="w-full bg-solarized-blue hover:bg-solarized-blue/90"
              >
                {isLoading ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportData && reportData.summary && reportData.summary.total_employees > 0 ? (
        <>
          <div className="grid gap-6 sm:grid-cols-4">
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-solarized-green/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-solarized-green" />
                  </div>
                  <div>
                    <p className="text-sm text-solarized-base01">Total Gross</p>
                    <p className="text-xl font-bold text-solarized-base02">
                      {formatCurrency(reportData.summary.total_earnings || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-solarized-red/10 flex items-center justify-center">
                    <TrendingDown className="h-5 w-5 text-solarized-red" />
                  </div>
                  <div>
                    <p className="text-sm text-solarized-base01">Total Deductions</p>
                    <p className="text-xl font-bold text-solarized-base02">
                      {formatCurrency(reportData.summary.total_deductions || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-solarized-blue/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-solarized-blue" />
                  </div>
                  <div>
                    <p className="text-sm text-solarized-base01">Net Payable</p>
                    <p className="text-xl font-bold text-solarized-base02">
                      {formatCurrency(reportData.summary.total_net_payable || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-solarized-violet/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-solarized-violet" />
                  </div>
                  <div>
                    <p className="text-sm text-solarized-base01">Employees</p>
                    <p className="text-xl font-bold text-solarized-base02">{reportData.summary.total_employees || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Payroll by Division</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleExport('csv')} disabled={isExporting || !reportData}>
                    <Download className="mr-2 h-4 w-4" />
                    {isExporting ? 'Exporting...' : 'CSV'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.by_division || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee8d5" />
                    <XAxis type="number" stroke="#657b83" tickFormatter={(value) => `$${value / 1000}k`} />
                    <YAxis type="category" dataKey="division_title" stroke="#657b83" width={150} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fdf6e3',
                        border: '1px solid #eee8d5',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                    <Bar dataKey="total_net_payable" name="Net Payable" fill="#268bd2" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      ) : reportData && reportData.summary && reportData.summary.total_employees === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-solarized-base02">No Payroll Data</h3>
            <p className="text-solarized-base01 mt-1">
              No salary slips found for the period "{reportData.salary_period}". Please generate payroll slips first.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {!reportData && (
        <Card className="border-0 shadow-md">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-solarized-base02">No Report Generated</h3>
            <p className="text-solarized-base01 mt-1">
              Select a salary period and click "Generate Report" to view payroll data.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
