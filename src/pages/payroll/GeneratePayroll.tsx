import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { payrollService, staffService } from '../../services/api';
import { showAlert, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Skeleton } from '../../components/ui/skeleton';
import { IndianRupee, Loader2, AlertCircle, CheckCircle, Eye, Calculator } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";

interface StaffMember {
  id: number;
  full_name: string;
  base_salary: number;
  job_title?: { title: string };
  staff_id?: string;
  department?: { name: string };
}

export default function GeneratePayroll() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<number[]>([]);
  const [salaryPeriod, setSalaryPeriod] = useState('');
  const [month, setMonth] = useState<number>(0);
  const [year, setYear] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /* New State for Preview */
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewEmployeeId, setPreviewEmployeeId] = useState<number | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  /* Bulk Calculation State */
  const [allCalculations, setAllCalculations] = useState<Record<number, any>>({});
  const [calculatingIds, setCalculatingIds] = useState<number[]>([]);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await staffService.getAll({ per_page: 100 });
        setStaff(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch staff:', error);
        showAlert('error', 'Error', 'Failed to fetch staff');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStaff();

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    setMonth(currentMonth);
    setYear(currentYear);
    setSalaryPeriod(`${currentYear}-${String(currentMonth).padStart(2, '0')}`);
  }, []);

  // Trigger bulk calculation when staff or period changes
  useEffect(() => {
    if (staff.length > 0 && month && year) {
      calculateAllSalaries(staff, month, year);
    }
  }, [staff, month, year]);

  const calculateAllSalaries = async (currentStaff: StaffMember[], m: number, y: number) => {
    setCalculatingIds(currentStaff.map(s => s.id));
    setAllCalculations({}); // Clear old calculations

    // We'll perform calculations in parallel but we won't wait for all to finish before updating UI if possible,
    // actually React state updates should be batched. 
    // To avoid UI freezing with 100 requests, we could chunk them, but let's try direct parallel first as per request.

    currentStaff.forEach(member => {
      payrollService.calculate({
        staff_member_id: member.id,
        month: m,
        year: y
      }).then(response => {
        if (response.data && response.data.data) {
          setAllCalculations(prev => ({
            ...prev,
            [member.id]: response.data.data
          }));
        }
      }).catch(err => {
        console.error(err);
      }).finally(() => {
        setCalculatingIds(prev => prev.filter(id => id !== member.id));
      });
    });
  };

  const handleSalaryPeriodChange = (period: string) => {
    setSalaryPeriod(period);
    if (period) {
      const [yearStr, monthStr] = period.split('-');
      setYear(parseInt(yearStr, 10));
      setMonth(parseInt(monthStr, 10));
      // Triggered by useEffect
      setPreviewData(null);
      setPreviewEmployeeId(null);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStaff(staff.map((s) => s.id));
    } else {
      setSelectedStaff([]);
    }
  };

  const handleSelectStaff = (id: number) => {
    if (selectedStaff.includes(id)) {
      setSelectedStaff(selectedStaff.filter((s) => s !== id));
    } else {
      setSelectedStaff([...selectedStaff, id]);
    }
  };

  const handleViewDeductions = async (employeeId: number) => {
    if (!month || !year) {
      setError('Please select a valid salary period first');
      return;
    }

    setPreviewEmployeeId(employeeId);

    // Check if we already have the calculation
    if (allCalculations[employeeId]) {
      setPreviewData(allCalculations[employeeId]);
      return;
    }

    // Fallback if not calculated yet (should cover rare cases)
    setError('');
    setPreviewData(null);
    setIsPreviewLoading(true);

    try {
      const response = await payrollService.calculate({
        staff_member_id: employeeId,
        month,
        year
      });
      setPreviewData(response.data.data);
      // Also update the bulk state
      setAllCalculations(prev => ({ ...prev, [employeeId]: response.data.data }));

    } catch (err: unknown) {
      console.error('Preview error:', err);
      const errorMessage = getErrorMessage(err, 'Failed to calculate salary preview.');
      setError(errorMessage);
      setPreviewEmployeeId(null);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleBoxGenerate = async (employeeIds: number[]) => {
    if (employeeIds.length === 0) {
      setError('Please select at least one employee');
      return;
    }

    if (!month || !year) {
      setError('Please select a valid salary period');
      return;
    }

    setError('');
    setSuccess('');
    setIsGenerating(true);

    try {
      const payload = {
        employee_ids: employeeIds,
        month: month,
        year: year,
      };

      await payrollService.bulkGenerate(payload);

      setSuccess(`Successfully generated payroll for ${employeeIds.length} employees`);

      // Wait a bit then show alert or navigate
      setTimeout(() => navigate('/payroll/slips'), 1500);
    } catch (err: unknown) {
      console.error('Generation error:', err);
      let errorMessage = getErrorMessage(err, 'Failed to generate payroll. Please try again.');

      if (typeof err === 'object' && err !== null && 'response' in err) {
        const response = (err as any).response;
        if (response?.data?.message?.includes('Duplicate entry') ||
          response?.data?.message?.includes('already exists') ||
          JSON.stringify(response?.data).includes('Integrity constraint violation')) {
          errorMessage = 'Salary slips for this period have already been generated.';
        }
      }
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  const isCurrentMonth = month === new Date().getMonth() + 1 && year === new Date().getFullYear();
  const currentDay = new Date().getDate();
  const canGenerate = !isCurrentMonth || (isCurrentMonth && currentDay >= 25);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">Generate Payroll</h1>
          <p className="text-solarized-base01">Manage and generate monthly salaries</p>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2">
            <Label htmlFor="salary_period" className="whitespace-nowrap">Salary Period:</Label>
            <Input
              id="salary_period"
              type="month"
              value={salaryPeriod}
              max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`}
              onChange={(e) => handleSalaryPeriodChange(e.target.value)}
              className="w-48"
              required
            />
          </div>
          {selectedStaff.length > 0 && (
            <Button
              onClick={() => handleBoxGenerate(selectedStaff)}
              disabled={isGenerating || !salaryPeriod || !canGenerate}
              className="bg-solarized-green hover:bg-solarized-green/90"
              title={!canGenerate ? "Payroll can only be generated after the 25th of the current month" : ""}
            >
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <IndianRupee className="mr-2 h-4 w-4" />}
              Generate Selected ({selectedStaff.length})
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!canGenerate && isCurrentMonth && (
        <Alert className="bg-yellow-50 text-yellow-800 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            Payroll generation for the current month is only enabled from the 25th onwards to ensure accurate attendance data.
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Card className="border-0 shadow-md">
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={staff.length > 0 && selectedStaff.length === staff.length}
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                    />
                  </TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Base Salary</TableHead>
                  <TableHead>Working Days</TableHead>
                  <TableHead>Net Payable</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-20" />
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : staff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No employees found.
                    </TableCell>
                  </TableRow>
                ) : (
                  staff.map((member) => (
                    <TableRow key={member.id} className={previewEmployeeId === member.id ? 'bg-blue-50/50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedStaff.includes(member.id)}
                          onCheckedChange={() => handleSelectStaff(member.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{member.full_name}</div>
                        <div className="text-sm text-muted-foreground">{member.job_title?.title}</div>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(member.base_salary)}
                      </TableCell>
                      <TableCell>
                        {calculatingIds.includes(member.id) ? (
                          <div className="flex items-center text-muted-foreground text-sm">
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            Calculating...
                          </div>
                        ) : allCalculations[member.id] ? (
                          <div className="text-sm">
                            <div className="font-medium text-blue-600">
                              {allCalculations[member.id].attendance.total_working_days} days
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {allCalculations[member.id].attendance.present_days || 0} present
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {calculatingIds.includes(member.id) ? (
                          <div className="flex items-center text-muted-foreground text-sm">
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            Calculating...
                          </div>
                        ) : allCalculations[member.id] ? (
                          <span className="font-semibold text-green-600">
                            {formatCurrency(allCalculations[member.id].salary.net_salary)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDeductions(member.id)}
                            disabled={(isPreviewLoading && previewEmployeeId === member.id) || calculatingIds.includes(member.id)}
                          >
                            {(isPreviewLoading && previewEmployeeId === member.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Eye className="h-4 w-4 mr-2" />
                            )}
                            View Deductions
                          </Button>
                          <Button
                            size="sm"
                            className="bg-solarized-blue hover:bg-solarized-blue/90"
                            onClick={() => handleBoxGenerate([member.id])}
                            disabled={isGenerating || !canGenerate}
                          >
                            <Calculator className="h-4 w-4 mr-2" />
                            Generate Salary
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Prediction / Deduction Details Modal */}
      <Dialog open={!!previewData && !!previewEmployeeId} onOpenChange={(open) => { if (!open) { setPreviewData(null); setPreviewEmployeeId(null); } }}>
        <DialogContent className="max-w-4xl bg-slate-50">
          <DialogHeader>
            <DialogTitle>Deduction & Salary Details</DialogTitle>
            <DialogDescription>
              Breakdown for {staff.find(s => s.id === previewEmployeeId)?.full_name} for {month}/{year}
            </DialogDescription>
          </DialogHeader>
          {previewData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Attendance Summary */}
              <div>
                <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Attendance Summary</h4>
                <div className="bg-white rounded border divide-y overflow-hidden">
                  {/* Working Days Configuration */}
                  <div className="p-3 bg-blue-50">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700 font-medium">Working Days Configuration</span>
                      <span className="text-sm text-blue-900">
                        {previewData.attendance.working_days_config?.map((day: string) =>
                          day.charAt(0).toUpperCase() + day.slice(1, 3)
                        ).join(', ') || 'Mon-Fri'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3">
                    <div className="bg-slate-50 p-3 rounded border">
                      <span className="text-xs text-muted-foreground block">Calendar Days</span>
                      <span className="text-lg font-semibold">{previewData.attendance.total_calendar_days}</span>
                    </div>
                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                      <span className="text-xs text-blue-600 block">Working Days</span>
                      <span className="text-lg font-semibold text-blue-700">{previewData.attendance.total_working_days}</span>
                    </div>
                    <div className="bg-green-50 p-3 rounded border border-green-200">
                      <span className="text-xs text-green-600 block">Present Days</span>
                      <span className="text-lg font-semibold text-green-700">{previewData.attendance.present_days || 0}</span>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                      <span className="text-xs text-yellow-600 block">Late Days</span>
                      <span className="text-lg font-semibold text-yellow-700">{previewData.attendance.late_days || 0}</span>
                    </div>
                    <div className="bg-red-50 p-3 rounded border border-red-200">
                      <span className="text-xs text-red-600 block">Absent Days</span>
                      <span className="text-lg font-semibold text-red-700">{previewData.attendance.absent_days || 0}</span>
                    </div>
                    <div className="bg-orange-50 p-3 rounded border border-orange-200">
                      <span className="text-xs text-orange-600 block">Half Days</span>
                      <span className="text-lg font-semibold text-orange-700">{previewData.attendance.half_days || 0}</span>
                    </div>
                    <div className="bg-purple-50 p-3 rounded border border-purple-200">
                      <span className="text-xs text-purple-600 block">No-Show Days</span>
                      <span className="text-lg font-semibold text-purple-700">{previewData.attendance.no_show_days || 0}</span>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                      <span className="text-xs text-yellow-600 block">Unpaid Leave</span>
                      <span className="text-lg font-semibold text-yellow-700">{previewData.attendance.unpaid_leave_days || 0}</span>
                    </div>
                    <div className="bg-red-100 p-3 rounded border border-red-300 col-span-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-red-700 font-semibold">Loss of Pay (LOP) Days</span>
                        <span className="text-lg font-bold text-red-800">{previewData.attendance.lop_days || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div>
                <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Financial Breakdown</h4>
                <div className="bg-white rounded border divide-y overflow-hidden">
                  <div className="flex justify-between p-3 bg-slate-50">
                    <span className="text-muted-foreground font-medium">Base Salary</span>
                    <span className="font-medium">{formatCurrency(previewData.salary.base_salary)}</span>
                  </div>

                  {/* Earnings Section */}
                  <div className="p-3 bg-green-50/30">
                    <p className="text-xs font-semibold text-green-700 uppercase mb-2">Earnings</p>

                    {(() => {
                      const benefits = previewData.benefits?.breakdown || [];
                      const earningsDiff = Math.max(0, previewData.salary.total_earnings - previewData.salary.base_salary);
                      const hasBenefits = benefits.length > 0;
                      // Calculate sum of listed benefits to check if there's still a gap
                      const listedBenefitsSum = benefits.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
                      const dataGap = Math.max(0, earningsDiff - listedBenefitsSum);

                      if (!hasBenefits && earningsDiff === 0) {
                        return <p className="text-xs text-muted-foreground italic mb-2">No additional benefits</p>;
                      }

                      return (
                        <div className="space-y-1 mb-2">
                          {benefits.map((benefit: any, index: number) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-slate-600">{benefit.name || benefit.description}</span>
                              <span className="text-slate-900">+{formatCurrency(benefit.amount)}</span>
                            </div>
                          ))}

                          {/* Show gap if implicit earnings exist but aren't listed */}
                          {(!hasBenefits && earningsDiff > 0) && (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">Other Allowances</span>
                              <span className="text-slate-900">+{formatCurrency(earningsDiff)}</span>
                            </div>
                          )}

                          {/* Show any remaining gap even if some benefits were listed (e.g. slight calculation differences) */}
                          {(hasBenefits && dataGap > 1) && ( // tolerance of 1 for rounding
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">Other Adjustments</span>
                              <span className="text-slate-900">+{formatCurrency(dataGap)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div className="flex justify-between pt-2 border-t border-green-100 font-medium text-green-700">
                      <span>Total Earnings</span>
                      <span>{formatCurrency(previewData.salary.total_earnings)}</span>
                    </div>
                  </div>

                  {/* Deductions Section */}
                  <div className="p-3 bg-red-50/30">
                    <p className="text-xs font-semibold text-red-700 uppercase mb-2">Deductions</p>

                    <div className="space-y-1 mb-2">
                      {/* List individual deductions if available */}
                      {previewData.deductions?.breakdown && previewData.deductions.breakdown.length > 0 ? (
                        previewData.deductions.breakdown.map((deduction: any, index: number) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-slate-600">{deduction.name || deduction.description}</span>
                            <span className="text-red-700">-{formatCurrency(deduction.amount)}</span>
                          </div>
                        ))
                      ) : null}

                      {/* LOP is already included in deductions breakdown, so no need to show it separately */}
                    </div>

                    <div className="flex justify-between pt-2 border-t border-red-100 font-medium text-red-700">
                      <span>Total Deductions</span>
                      <span>-{formatCurrency(previewData.salary.total_deductions)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between p-4 bg-slate-100 font-bold text-lg border-t text-solarized-base02">
                    <span>Net Payable</span>
                    <span className="text-solarized-blue">{formatCurrency(previewData.salary.net_salary)}</span>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    className="w-full md:w-auto bg-green-600 hover:bg-green-700"
                    onClick={() => handleBoxGenerate([previewEmployeeId!])}
                    disabled={isGenerating || !canGenerate}
                  >
                    Generate Salary for this Employee
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
