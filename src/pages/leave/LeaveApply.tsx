import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaveService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { showAlert, getErrorMessage } from '../../lib/sweetalert';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { ArrowLeft, Loader2, AlertCircle, Calendar } from 'lucide-react';

/* =========================
   TYPES (MATCH API)
========================= */
interface LeaveCategory {
  id: number;
  title: string;
  annual_quota: number;
  is_paid: boolean;
}

/* =========================
   COMPONENT
========================= */
export default function LeaveApply() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [categories, setCategories] = useState<LeaveCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    time_off_category_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });

  /* =========================
     FETCH CATEGORIES
  ========================= */
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await leaveService.getCategoriesList(); // Use permission-free endpoint for dropdown

        // paginated response → data.data
        debugger;
        const paginated = response.data.data;
        const categoriesArray = Array.isArray(paginated)
          ? paginated
          : [];

        const mapped: LeaveCategory[] = categoriesArray.map((cat: any) => ({
          id: cat.id,
          title: cat.title,
          annual_quota: cat.annual_quota ?? 0,
          is_paid: Boolean(cat.is_paid),
        }));

        setCategories(mapped);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        showAlert('error', 'Error', 'Failed to fetch leave categories');
        setCategories([]);
      }
    };

    fetchCategories();
  }, []);

  /* =========================
     HELPERS
  ========================= */
  const calculateDays = () => {
    if (!formData.start_date || !formData.end_date) return 0;
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    const diff =
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.time_off_category_id)
      errors.time_off_category_id = 'Leave type is required';

    if (!formData.start_date)
      errors.start_date = 'Start date is required';

    if (!formData.end_date)
      errors.end_date = 'End date is required';
    else if (new Date(formData.end_date) < new Date(formData.start_date))
      errors.end_date = 'End date must be after start date';

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return false;
    }

    return true;
  };

  /* =========================
     SUBMIT
  ========================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!validateForm()) return;

    if (!user?.staff_member_id) {
      setError('Your account is not linked to a staff profile.');
      return;
    }

    setIsLoading(true);

    try {
      await leaveService.createRequest({
        ...formData,
        staff_member_id: user.staff_member_id,
        total_days: calculateDays(),
      });

      showAlert('success', 'Success!', 'Leave request submitted successfully', 2000);

      navigate('/leave/requests');
    } catch (err: any) {
      const message = getErrorMessage(err, 'Failed to submit leave request');

      // Handle backend validation errors
      if (err.response?.data?.errors) {
        const apiErrors: Record<string, string> = {};
        Object.keys(err.response.data.errors).forEach((key) => {
          apiErrors[key] = err.response.data.errors[key][0];
        });
        setFieldErrors(apiErrors);
      } else {
        setError(message);
        showAlert('error', 'Submission Failed', message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderError = (field: string) => {
    return fieldErrors[field] ? (
      <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
    ) : null;
  };

  /* =========================
     UI
  ========================= */
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Apply for Leave</h1>
          <p className="text-muted-foreground">Submit a new leave request</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* FORM */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Leave Details</CardTitle>
              <CardDescription>
                Fill in the details for your leave request
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* CATEGORY */}
                <div className="space-y-2">
                  <Label className={fieldErrors.time_off_category_id ? 'text-red-500' : ''}>Leave Type *</Label>
                  <Select
                    value={formData.time_off_category_id}
                    onValueChange={(value) => {
                      setFormData({ ...formData, time_off_category_id: value });
                      if (fieldErrors.time_off_category_id) setFieldErrors(prev => ({ ...prev, time_off_category_id: '' }));
                    }}
                  >
                    <SelectTrigger className={fieldErrors.time_off_category_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.title} ({cat.is_paid ? 'Paid' : 'Unpaid'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {renderError('time_off_category_id')}
                </div>

                {/* DATES */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className={fieldErrors.start_date ? 'text-red-500' : ''}>Start Date *</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          start_date: e.target.value,
                        });
                        if (fieldErrors.start_date) setFieldErrors(prev => ({ ...prev, start_date: '' }));
                      }}
                      className={fieldErrors.start_date ? 'border-red-500' : ''}
                    />
                    {renderError('start_date')}
                  </div>

                  <div>
                    <Label className={fieldErrors.end_date ? 'text-red-500' : ''}>End Date *</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      min={formData.start_date}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          end_date: e.target.value,
                        });
                        if (fieldErrors.end_date) setFieldErrors(prev => ({ ...prev, end_date: '' }));
                      }}
                      className={fieldErrors.end_date ? 'border-red-500' : ''}
                    />
                    {renderError('end_date')}
                  </div>
                </div>

                {/* REASON */}
                <div>
                  <Label className={fieldErrors.reason ? 'text-red-500' : ''}>Reason</Label>
                  <Textarea
                    rows={4}
                    value={formData.reason}
                    onChange={(e) => {
                      setFormData({ ...formData, reason: e.target.value });
                      if (fieldErrors.reason) setFieldErrors(prev => ({ ...prev, reason: '' }));
                    }}
                    className={fieldErrors.reason ? 'border-red-500' : ''}
                  />
                  {renderError('reason')}
                </div>

                {/* ACTIONS */}
                <div className="flex justify-end gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Request'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between">
                <span>Total Days</span>
                <span className="text-xl font-bold">{calculateDays()}</span>
              </div>
              {formData.start_date && formData.end_date && (
                <p className="text-sm text-muted-foreground mt-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  {formData.start_date} to {formData.end_date}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Leave Balance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex justify-between text-sm">
                  <span>{cat.title}</span>
                  <span>{cat.annual_quota} days</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
