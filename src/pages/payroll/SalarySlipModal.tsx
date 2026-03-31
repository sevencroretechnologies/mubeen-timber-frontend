import { X, Printer, IndianRupee } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Separator } from '../../components/ui/separator';
import {
  DollarSign,
  User,
  Calendar,
  FileText,
  CreditCard,
  Banknote,
  Percent,
  Calculator,
} from 'lucide-react';

interface SalarySlip {
  id: number;
  slip_reference: string;
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
}

interface SalarySlipModalProps {
  slip: SalarySlip | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SalarySlipModal({ slip, isOpen, onClose }: SalarySlipModalProps) {
  if (!isOpen || !slip) return null;

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(num || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'generated':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden z-10 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-full">
              <IndianRupee className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Salary Slip Details</h2>
              <p className="text-gray-600">{slip.slip_reference}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={`${getStatusColor(slip.status)} capitalize`}>
              {slip.status}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content - Scrollable Area */}
        <ScrollArea className="flex-grow overflow-y-auto">
          <div className="p-6">
            {/* Employee & Period Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Employee</h3>
                    <p className="text-lg font-semibold text-gray-900">{slip.staff_member.full_name}</p>
                    <p className="text-sm text-gray-600">
                      {slip.staff_member.job_title?.title || 'No job title'} • {slip.staff_member.staff_code}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Salary Period</h3>
                    <p className="text-lg font-semibold text-gray-900">{slip.salary_period}</p>
                    <p className="text-sm text-gray-600">
                      Generated: {formatDate(slip.generated_at)}
                    </p>
                    {slip.paid_at && (
                      <p className="text-sm text-green-600">
                        Paid: {formatDate(slip.paid_at)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              {slip.staff_member.bank_account_number && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <CreditCard className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Bank Details</h3>
                      <p className="text-sm font-semibold text-gray-900">{slip.staff_member.bank_account_name}</p>
                      <p className="text-sm text-gray-600">Account: {slip.staff_member.bank_account_number}</p>
                      <p className="text-sm text-gray-600">Bank: {slip.staff_member.bank_name}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Earnings & Deductions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Earnings Section */}
              <div className="bg-green-50 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-green-800 flex items-center gap-2">
                    <Banknote className="h-5 w-5" />
                    Earnings
                  </h3>
                  <span className="text-2xl font-bold text-green-800">
                    {formatCurrency(slip.total_earnings)}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-green-100">
                    <span className="text-green-700">Basic Salary</span>
                    <span className="font-semibold text-green-800">
                      {formatCurrency(slip.basic_salary)}
                    </span>
                  </div>

                  {slip.benefits_breakdown && slip.benefits_breakdown.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-green-700 mb-2">Benefits</h4>
                      {slip.benefits_breakdown.map((benefit, index) => (
                        <div key={index} className="flex justify-between items-center py-1">
                          <span className="text-sm text-green-600">{benefit.name}</span>
                          <span className="text-sm font-medium text-green-700">
                            {formatCurrency(benefit.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Deductions Section */}
              <div className="bg-red-50 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-red-800 flex items-center gap-2">
                    <Percent className="h-5 w-5" />
                    Deductions
                  </h3>
                  <span className="text-2xl font-bold text-red-800">
                    {formatCurrency(slip.total_deductions)}
                  </span>
                </div>

                <div className="space-y-3">
                  {slip.deductions_breakdown && slip.deductions_breakdown.length > 0 ? (
                    slip.deductions_breakdown.map((deduction, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-red-100">
                        <span className="text-red-700">{deduction.name}</span>
                        <span className="font-semibold text-red-800">
                          {formatCurrency(deduction.amount)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-red-600">No deductions</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Net Payable Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Net Payable
                  </h3>
                  <p className="text-sm text-gray-600">Amount to be paid to employee</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-gray-900 mb-1">
                    {formatCurrency(slip.net_payable)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {slip.status === 'paid' ? 'Payment completed' : 'Pending payment'}
                  </div>
                </div>
              </div>
            </div>

            {/* Breakdown Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Breakdown Summary</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Total Earnings:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(slip.total_earnings)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Deductions:</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(slip.total_deductions)}
                    </span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-bold">
                    <span>Net Payable:</span>
                    <span className="text-gray-900">
                      {formatCurrency(slip.net_payable)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2">Employee Info</h4>
                <div className="space-y-1">
                  <p>Name: {slip.staff_member.full_name}</p>
                  <p>Staff Code: {slip.staff_member.staff_code}</p>
                  {slip.staff_member.personal_email && (
                    <p>Email: {slip.staff_member.personal_email}</p>
                  )}
                  {slip.staff_member.mobile_number && (
                    <p>Phone: {slip.staff_member.mobile_number}</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2">Slip Details</h4>
                <div className="space-y-1">
                  <p>Reference: {slip.slip_reference}</p>
                  <p>Period: {slip.salary_period}</p>
                  <p>Status: <span className="capitalize">{slip.status}</span></p>
                  <p>Generated: {new Date(slip.generated_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer - Fixed at bottom */}
        <div className="border-t p-4 flex justify-between items-center bg-white flex-shrink-0">
          <div className="text-sm text-gray-500">
            This is an official salary slip. Please verify all details.
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {/* <Button className="bg-blue-600 hover:bg-blue-700">
              <DollarSign className="h-4 w-4 mr-2" />
              {slip.status === 'paid' ? 'Mark as Paid' : 'View Payment'}
            </Button> */}
          </div>
        </div>
      </div>
    </div>
  );
}