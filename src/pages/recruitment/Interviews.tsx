import { useState, useEffect } from 'react';
import { recruitmentService } from '../../services/api';
import { showAlert, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { StatusBadge } from '../../components/ui/status-badge';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Plus,
  Calendar,
  Clock,
  Video,
  MapPin,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  MessageSquare,
  RefreshCw,
  CheckCircle,
  XCircle,
  User,
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { format, parseISO, isToday } from 'date-fns';
import { cn } from '../../lib/utils';

interface InterviewSchedule {
  id: number;
  job_application_id: number;
  interviewer_id: number | null;
  round_number: number;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number | null;
  location: string | null;
  meeting_link: string | null;
  notes: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  feedback: string | null;
  rating: number | null;
  recommendation: 'proceed' | 'hold' | 'reject' | null;
  created_at: string;
  updated_at: string;
  application?: {
    id: number;
    candidate?: {
      id: number;
      name: string;
      email: string;
      phone: string;
    };
    job?: {
      id: number;
      title: string;
    };
  };
  interviewer?: {
    id: number;
    full_name: string; // Changed from name to full_name
    user?: {
      email: string;
    };
  };
}

interface JobApplication {
  id: number;
  candidate?: {
    id: number;
    name: string;
    email: string;
  };
  job?: {
    id: number;
    title: string;
  };
}

interface StaffMember {
  id: number;
  full_name: string; // Changed from name to full_name
  user?: {
    email: string;
  };
  email?: string; // For mapping
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export default function Interviews() {
  const [interviews, setInterviews] = useState<InterviewSchedule[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [interviewers, setInterviewers] = useState<StaffMember[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [selectedInterview, setSelectedInterview] = useState<InterviewSchedule | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    job_application_id: '',
    interviewer_id: '',
    round_number: '',
    scheduled_date: format(new Date(), 'yyyy-MM-dd'),
    scheduled_time: '09:00',
    duration_minutes: '60',
    location: '',
    meeting_link: '',
    notes: '',
  });

  const [feedbackFormData, setFeedbackFormData] = useState({
    feedback: '',
    rating: '3',
    recommendation: 'proceed' as 'proceed' | 'hold' | 'reject',
  });

  const [rescheduleFormData, setRescheduleFormData] = useState({
    scheduled_date: format(new Date(), 'yyyy-MM-dd'),
    scheduled_time: '09:00',
    notes: '',
  });

  // Filter states
  const [filters, setFilters] = useState({
    job_application_id: '',
    interviewer_id: '',
    status: '',
    date_from: '',
    date_to: '',
  });

  // Calendar view state
  const [calendarView, setCalendarView] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [calendarInterviews, setCalendarInterviews] = useState<InterviewSchedule[]>([]);
  const [todayInterviews, setTodayInterviews] = useState<InterviewSchedule[]>([]);

  useEffect(() => {
    fetchInterviews();
    fetchApplications();
    fetchInterviewers();
    fetchTodayInterviews();
  }, [page, filters]);

  useEffect(() => {
    if (calendarView) {
      fetchCalendarInterviews();
    }
  }, [calendarView, calendarDate]);

  const fetchInterviews = async () => {
    setIsLoading(true);
    try {
      const params: any = { page, paginate: true };
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters]) {
          params[key] = filters[key as keyof typeof filters];
        }
      });

      const response = await recruitmentService.getInterviews(params);
      setInterviews(response.data.data || []);
      setMeta(response.data.meta || null);
    } catch (error) {
      console.error('Failed to fetch interviews:', error);
      showAlert('error', 'Error', 'Failed to fetch interviews');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await recruitmentService.getJobApplications({ paginate: false });
      if (response.data && response.data.data) {
        setApplications(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    }
  };

  const fetchInterviewers = async () => {
    try {
      const response = await recruitmentService.getStaffMembers({ paginate: false });
      if (response.data && response.data.data) {
        // Map the backend response to our interface
        const mappedInterviewers = response.data.data.map((staff: any) => ({
          id: staff.id,
          full_name: staff.full_name,
          email: staff.user?.email || staff.personal_email || '',
          user: staff.user
        }));
        setInterviewers(mappedInterviewers);
      }
    } catch (error) {
      console.error('Failed to fetch interviewers:', error);
    }
  };

  const fetchCalendarInterviews = async () => {
    try {
      const month = calendarDate.getMonth() + 1;
      const year = calendarDate.getFullYear();
      const response = await recruitmentService.getCalendarInterviews({ month, year });
      setCalendarInterviews(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch calendar interviews:', error);
    }
  };

  const fetchTodayInterviews = async () => {
    try {
      const response = await recruitmentService.getTodayInterviews();
      setTodayInterviews(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch today interviews:', error);
      showAlert('error', 'Error', 'Failed to fetch today interviews');
    }
  };

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateCreateForm = () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!formData.job_application_id) {
      errors.job_application_id = 'Job application is required';
      isValid = false;
    }

    if (formData.round_number) {
      const round = parseInt(formData.round_number);
      if (isNaN(round) || round < 1) {
        errors.round_number = 'Round number must be at least 1';
        isValid = false;
      }
    }

    if (!formData.scheduled_date) {
      errors.scheduled_date = 'Date is required';
      isValid = false;
    }

    if (!formData.scheduled_time) {
      errors.scheduled_time = 'Time is required';
      isValid = false;
    }

    // Check if scheduled date is invalid
    if (formData.scheduled_date && isNaN(Date.parse(formData.scheduled_date))) {
      errors.scheduled_date = 'Invalid date format';
      isValid = false;
    }

    if (formData.duration_minutes) {
      const duration = parseInt(formData.duration_minutes);
      if (isNaN(duration) || duration < 15) {
        errors.duration_minutes = 'Duration must be at least 15 minutes';
        isValid = false;
      }
    }

    if (formData.location && formData.location.length > 255) {
      errors.location = 'Location must not exceed 255 characters';
      isValid = false;
    }

    if (formData.meeting_link) {
      try {
        new URL(formData.meeting_link);
      } catch (_) {
        errors.meeting_link = 'Invalid URL format';
        isValid = false;
      }
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (!validateCreateForm()) {
      return;
    }

    try {
      const data = {
        ...formData,
        round_number: formData.round_number ? parseInt(formData.round_number) : undefined,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : undefined,
        interviewer_id: formData.interviewer_id ? parseInt(formData.interviewer_id) : null,
      };

      await recruitmentService.scheduleInterview(data);
      showAlert('success', 'Interview Scheduled!', 'Interview scheduled successfully', 2000);
      setIsCreateDialogOpen(false);
      resetCreateForm();
      fetchInterviews();
      fetchTodayInterviews();
      if (calendarView) fetchCalendarInterviews();
    } catch (error: any) {
      console.error('Failed to schedule interview:', error);
      const message = getErrorMessage(error, 'Failed to schedule interview');

      if (error.response?.data?.errors) {
        const apiErrors: Record<string, string> = {};
        Object.keys(error.response.data.errors).forEach((key) => {
          apiErrors[key] = error.response.data.errors[key][0];
        });
        setFieldErrors(apiErrors);
      } else {
        showAlert('error', 'Error', message);
      }
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInterview || !feedbackFormData.feedback) {
      alert('Please provide feedback');
      return;
    }

    try {
      await recruitmentService.submitFeedback(selectedInterview.id, feedbackFormData);
      showAlert('success', 'Feedback Submitted!', 'Interview feedback submitted successfully', 2000);
      setIsFeedbackDialogOpen(false);
      resetFeedbackForm();
      fetchInterviews();
      fetchTodayInterviews();
      if (calendarView) fetchCalendarInterviews();
    } catch (error: any) {
      console.error('Failed to submit feedback:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to submit feedback'));
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInterview || !rescheduleFormData.scheduled_date || !rescheduleFormData.scheduled_time) {
      alert('Please select date and time');
      return;
    }

    try {
      await recruitmentService.rescheduleInterview(selectedInterview.id, rescheduleFormData);
      showAlert('success', 'Rescheduled!', 'Interview rescheduled successfully', 2000);
      setIsRescheduleDialogOpen(false);
      resetRescheduleForm();
      fetchInterviews();
      fetchTodayInterviews();
      if (calendarView) fetchCalendarInterviews();
    } catch (error: any) {
      console.error('Failed to reschedule interview:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to reschedule interview'));
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInterview) return;

    try {
      const data = {
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time,
        interviewer_id: formData.interviewer_id ? parseInt(formData.interviewer_id) : null,
        status: selectedInterview.status,
        notes: formData.notes,
      };

      await recruitmentService.updateInterview(selectedInterview.id, data);
      showAlert('success', 'Updated!', 'Interview updated successfully', 2000);
      setIsEditDialogOpen(false);
      resetCreateForm();
      fetchInterviews();
      fetchTodayInterviews();
      if (calendarView) fetchCalendarInterviews();
    } catch (error) {
      console.error('Failed to update interview:', error);
      showAlert('error', 'Error', getErrorMessage(error, 'Failed to update interview'));
    }
  };

  const handleDelete = async () => {
    if (!selectedInterview) return;

    try {
      await recruitmentService.deleteInterview(selectedInterview.id);
      setIsDeleteDialogOpen(false);
      setSelectedInterview(null);
      fetchInterviews();
      fetchTodayInterviews();
      if (calendarView) fetchCalendarInterviews();
    } catch (error: any) {
      console.error('Failed to delete interview:', error);
      alert(error.response?.data?.message || 'Failed to delete interview');
    }
  };

  const resetCreateForm = () => {
    setFieldErrors({});
    setFormData({
      job_application_id: '',
      interviewer_id: '',
      round_number: '',
      scheduled_date: format(new Date(), 'yyyy-MM-dd'),
      scheduled_time: '09:00',
      duration_minutes: '60',
      location: '',
      meeting_link: '',
      notes: '',
    });
  };

  const resetFeedbackForm = () => {
    setFeedbackFormData({
      feedback: '',
      rating: '3',
      recommendation: 'proceed',
    });
  };

  const resetRescheduleForm = () => {
    setRescheduleFormData({
      scheduled_date: format(new Date(), 'yyyy-MM-dd'),
      scheduled_time: '09:00',
      notes: '',
    });
  };

  const handleView = (interview: InterviewSchedule) => {
    setSelectedInterview(interview);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (interview: InterviewSchedule) => {
    setSelectedInterview(interview);

    const scheduledDate = interview.scheduled_date.split('T')[0];
    setFormData({
      job_application_id: interview.job_application_id.toString(),
      interviewer_id: interview.interviewer_id?.toString() || '',
      round_number: interview.round_number.toString(),
      scheduled_date: scheduledDate,
      scheduled_time: interview.scheduled_time,
      duration_minutes: interview.duration_minutes?.toString() || '60',
      location: interview.location || '',
      meeting_link: interview.meeting_link || '',
      notes: interview.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleFeedback = (interview: InterviewSchedule) => {
    setSelectedInterview(interview);
    setFeedbackFormData({
      feedback: interview.feedback || '',
      rating: interview.rating?.toString() || '3',
      recommendation: interview.recommendation || 'proceed',
    });
    setIsFeedbackDialogOpen(true);
  };

  const handleReschedule = (interview: InterviewSchedule) => {
    setSelectedInterview(interview);
    setRescheduleFormData({
      scheduled_date: interview.scheduled_date,
      scheduled_time: interview.scheduled_time,
      notes: interview.notes || '',
    });
    setIsRescheduleDialogOpen(true);
  };

  const handleDeleteClick = (interview: InterviewSchedule) => {
    setSelectedInterview(interview);
    setIsDeleteDialogOpen(true);
  };



  const getRecommendationBadge = (recommendation: string | null) => {
    const variants: Record<string, string> = {
      proceed: 'bg-green-100 text-green-800',
      hold: 'bg-yellow-100 text-yellow-800',
      reject: 'bg-red-100 text-red-800',
    };
    return recommendation ? variants[recommendation] : 'bg-gray-100 text-gray-800';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDateTime = (date: string, time: string) => {
    try {
      const dateObj = parseISO(date);
      const formattedDate = format(dateObj, 'MMM dd, yyyy');
      return `${formattedDate} at ${time}`;
    } catch {
      return `${date} at ${time}`;
    }
  };

  const stats = {
    total: interviews.length,
    scheduled: interviews.filter(i => i.status === 'scheduled').length,
    completed: interviews.filter(i => i.status === 'completed').length,
    cancelled: interviews.filter(i => i.status === 'cancelled').length,
    today: todayInterviews.length,
  };

  const getDayInterviews = (date: Date) => {
    return calendarInterviews.filter(interview => {
      const interviewDate = parseISO(interview.scheduled_date);
      return interviewDate.getDate() === date.getDate() &&
        interviewDate.getMonth() === date.getMonth() &&
        interviewDate.getFullYear() === date.getFullYear();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-solarized-base02">Interviews</h1>
          <p className="text-solarized-base01">Schedule and manage candidate interviews</p>
        </div>
        <div className="flex gap-2">
          {/* <Button
            variant={calendarView ? "outline" : "default"}
            onClick={() => setCalendarView(!calendarView)}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {calendarView ? 'List View' : 'Calendar View'}
          </Button> */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-solarized-blue hover:bg-solarized-blue/90">
                <Plus className="mr-2 h-4 w-4" />
                Schedule Interview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Schedule Interview</DialogTitle>
                <DialogDescription>
                  Schedule a new interview for a candidate
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="job_application_id">Job Application *</Label>
                      <Select
                        value={formData.job_application_id}
                        onValueChange={(value) => setFormData({ ...formData, job_application_id: value })}
                        required
                      >
                        <SelectTrigger className={fieldErrors.job_application_id ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select application" />
                        </SelectTrigger>
                        <SelectContent>
                          {applications.map((app) => (
                            <SelectItem key={app.id} value={app.id.toString()}>
                              {app.candidate?.name} - {app.job?.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldErrors.job_application_id && (
                        <p className="text-sm text-red-500 mt-1">{fieldErrors.job_application_id}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="interviewer_id">Interviewer</Label>
                      <Select
                        value={formData.interviewer_id}
                        onValueChange={(value) => setFormData({ ...formData, interviewer_id: value })}
                      >
                        <SelectTrigger className={fieldErrors.interviewer_id ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select interviewer" />
                        </SelectTrigger>
                        <SelectContent>
                          {interviewers.map((interviewer) => (
                            <SelectItem key={interviewer.id} value={interviewer.id.toString()}>
                              {interviewer.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldErrors.interviewer_id && (
                        <p className="text-sm text-red-500 mt-1">{fieldErrors.interviewer_id}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="round_number">Round Number</Label>
                      <Input
                        id="round_number"
                        type="number"
                        min="1"
                        value={formData.round_number}
                        onChange={(e) => setFormData({ ...formData, round_number: e.target.value })}
                        placeholder="Auto-calculated if empty"
                        className={fieldErrors.round_number ? "border-red-500" : ""}
                      />
                      {fieldErrors.round_number && (
                        <p className="text-sm text-red-500 mt-1">{fieldErrors.round_number}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                      <Input
                        id="duration_minutes"
                        type="number"
                        min="15"
                        value={formData.duration_minutes}
                        onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                        placeholder="60"
                        className={fieldErrors.duration_minutes ? "border-red-500" : ""}
                      />
                      {fieldErrors.duration_minutes && (
                        <p className="text-sm text-red-500 mt-1">{fieldErrors.duration_minutes}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="scheduled_date">Date *</Label>
                      <Input
                        id="scheduled_date"
                        type="date"
                        value={formData.scheduled_date}
                        onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                        required
                        className={fieldErrors.scheduled_date ? "border-red-500" : ""}
                      />
                      {fieldErrors.scheduled_date && (
                        <p className="text-sm text-red-500 mt-1">{fieldErrors.scheduled_date}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="scheduled_time">Time *</Label>
                      <Input
                        id="scheduled_time"
                        type="time"
                        value={formData.scheduled_time}
                        onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                        required
                        className={fieldErrors.scheduled_time ? "border-red-500" : ""}
                      />
                      {fieldErrors.scheduled_time && (
                        <p className="text-sm text-red-500 mt-1">{fieldErrors.scheduled_time}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Interview location"
                      className={fieldErrors.location ? "border-red-500" : ""}
                    />
                    {fieldErrors.location && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.location}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="meeting_link">Meeting Link (for online interviews)</Label>
                    <Input
                      id="meeting_link"
                      type="url"
                      value={formData.meeting_link}
                      onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                      placeholder="https://meet.google.com/..."
                      className={fieldErrors.meeting_link ? "border-red-500" : ""}
                    />
                    {fieldErrors.meeting_link && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.meeting_link}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes..."
                      rows={3}
                      className={fieldErrors.notes ? "border-red-500" : ""}
                    />
                    {fieldErrors.notes && (
                      <p className="text-sm text-red-500 mt-1">{fieldErrors.notes}</p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90">
                    Schedule Interview
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-5">
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Total</p>
                <p className="text-xl font-bold text-solarized-base02">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Scheduled</p>
                <p className="text-xl font-bold text-solarized-base02">{stats.scheduled}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Completed</p>
                <p className="text-xl font-bold text-solarized-base02">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Cancelled</p>
                <p className="text-xl font-bold text-solarized-base02">{stats.cancelled}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-solarized-base01">Today</p>
                <p className="text-xl font-bold text-solarized-base02">{stats.today}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filters</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({
                job_application_id: '',
                interviewer_id: '',
                status: '',
                date_from: '',
                date_to: '',
              })}
            >
              Clear Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Job Application</Label>
              <Select
                value={filters.job_application_id}
                onValueChange={(value) => setFilters({ ...filters, job_application_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Applications" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Applications</SelectItem>
                  {applications.map((app) => (
                    <SelectItem key={app.id} value={app.id.toString()}>
                      {app.candidate?.name} - {app.job?.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Interviewer</Label>
              <Select
                value={filters.interviewer_id}
                onValueChange={(value) => setFilters({ ...filters, interviewer_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Interviewers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Interviewers</SelectItem>
                  {interviewers.map((interviewer) => (
                    <SelectItem key={interviewer.id} value={interviewer.id.toString()}>
                      {interviewer.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {calendarView ? (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Interview Calendar</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium">
                  {format(calendarDate, 'MMMM yyyy')}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center font-medium py-2">
                  {day}
                </div>
              ))}

              {Array.from({ length: new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate() }).map((_, index) => {
                const day = index + 1;
                const date = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
                const dayInterviews = getDayInterviews(date);

                return (
                  <div
                    key={day}
                    className={cn(
                      "min-h-24 p-2 border rounded-lg",
                      isToday(date) ? "bg-blue-50 border-blue-200" : "border-gray-200"
                    )}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={cn(
                        "font-medium",
                        isToday(date) ? "text-blue-600" : ""
                      )}>
                        {day}
                      </span>
                      {dayInterviews.length > 0 && (
                        <Badge variant="outline" className="h-5 text-xs">
                          {dayInterviews.length}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                      {dayInterviews.map((interview) => (
                        <div
                          key={interview.id}
                          className="text-xs p-1 rounded bg-blue-100 truncate cursor-pointer hover:bg-blue-200"
                          onClick={() => handleView(interview)}
                          title={`${interview.application?.candidate?.name} - ${interview.application?.job?.title}`}
                        >
                          <div className="font-medium truncate">
                            {interview.application?.candidate?.name}
                          </div>
                          <div className="truncate">
                            {interview.scheduled_time}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Interview Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : interviews.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-solarized-base02">No interviews scheduled</h3>
                <p className="text-solarized-base01 mt-1">Schedule your first interview with a candidate.</p>
                <Button
                  className="mt-4 bg-solarized-blue hover:bg-solarized-blue/90"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Interview
                </Button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Job Position</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Interviewer</TableHead>
                        <TableHead>Round</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[50px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {interviews.map((interview) => (
                        <TableRow key={interview.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-solarized-blue/10 text-solarized-blue text-xs">
                                  {getInitials(interview.application?.candidate?.name || 'UN')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{interview.application?.candidate?.name || 'Unknown'}</div>
                                <div className="text-sm text-solarized-base01">
                                  {interview.application?.candidate?.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{interview.application?.job?.title || '-'}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-solarized-base01" />
                                {interview.scheduled_date}
                              </div>
                              <div className="flex items-center gap-1 text-sm text-solarized-base01">
                                <Clock className="h-3 w-3" />
                                {interview.scheduled_time}
                                {interview.duration_minutes && ` (${interview.duration_minutes} mins)`}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-solarized-base01" />
                              {interview.interviewer?.full_name || 'Not assigned'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">Round {interview.round_number}</Badge>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={interview.status} />
                            {interview.recommendation && (
                              <Badge className={cn("ml-2", getRecommendationBadge(interview.recommendation))}>
                                {interview.recommendation}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleView(interview)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(interview)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                {/* <DropdownMenuSeparator /> */}
                                {(interview.status === 'scheduled' || interview.status === 'rescheduled') && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleFeedback(interview)}>
                                      <MessageSquare className="mr-2 h-4 w-4" />
                                      {interview.status === 'rescheduled' ? 'Submit Feedback (Rescheduled)' : 'Submit Feedback'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleReschedule(interview)}>
                                      <RefreshCw className="mr-2 h-4 w-4" />
                                      Reschedule Again
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleDeleteClick(interview)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {meta && meta.last_page > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-solarized-base01">
                      Showing page {meta.current_page} of {meta.last_page} ({meta.total} total)
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page === meta.last_page}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Interview Details</DialogTitle>
            <DialogDescription>
              Complete information about this interview
            </DialogDescription>
          </DialogHeader>
          {selectedInterview && (
            <div className="space-y-6 py-4">
              <Tabs defaultValue="details">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="candidate">Candidate</TabsTrigger>
                  <TabsTrigger value="feedback">Feedback</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-solarized-base01">Candidate</Label>
                      <p className="font-medium">{selectedInterview.application?.candidate?.name}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-solarized-base01">Job Position</Label>
                      <p className="font-medium">{selectedInterview.application?.job?.title}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-solarized-base01">Interviewer</Label>
                      <p className="font-medium">{selectedInterview.interviewer?.full_name || 'Not assigned'}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-solarized-base01">Round Number</Label>
                      <p className="font-medium">{selectedInterview.round_number}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-solarized-base01">Date & Time</Label>
                      <p className="font-medium">{formatDateTime(selectedInterview.scheduled_date, selectedInterview.scheduled_time)}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-solarized-base01">Duration</Label>
                      <p className="font-medium">{selectedInterview.duration_minutes || 60} minutes</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-solarized-base01">Location</Label>
                      <p className="font-medium">{selectedInterview.location || 'Not specified'}</p>
                    </div>
                    <div className="space-y-2 ">
                      <Label className="text-solarized-base01  mr-2">Meeting Link</Label>
                      {selectedInterview.meeting_link ? (
                        <a
                          href={selectedInterview.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-solarized-blue hover:underline"
                        >
                          Join Meeting
                        </a>
                      ) : (
                        <p className="font-medium">Not provided</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-solarized-base01">Notes</Label>
                    <div className="bg-solarized-base03/10 p-4 rounded">
                      {selectedInterview.notes || 'No notes'}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="candidate" className="space-y-4">
                  {selectedInterview.application?.candidate && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-solarized-base01">Name</Label>
                        <p className="font-medium">{selectedInterview.application.candidate.name}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-solarized-base01">Email</Label>
                        <p className="font-medium">{selectedInterview.application.candidate.email}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-solarized-base01">Phone</Label>
                        <p className="font-medium">{selectedInterview.application.candidate.phone || 'Not provided'}</p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="feedback" className="space-y-4">
                  {selectedInterview.status === 'completed' ? (
                    <>
                      <div className="space-y-2">
                        <Label className="text-solarized-base01">Status</Label>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={selectedInterview.status} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-solarized-base01">Rating</Label>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-6 h-6 rounded-full ${i < (selectedInterview.rating || 0) ? 'bg-yellow-400' : 'bg-gray-200'}`}
                            />
                          ))}
                          <span className="ml-2">({selectedInterview.rating}/5)</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-solarized-base01">Feedback</Label>
                        <div className="bg-solarized-base03/10 p-4 rounded">
                          {selectedInterview.feedback || 'No feedback provided'}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-solarized-base01 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-solarized-base02">No feedback yet</h3>
                      <p className="text-solarized-base01 mt-1">
                        Feedback will be available after the interview is completed.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Interview</DialogTitle>
            <DialogDescription>
              Update interview details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_scheduled_date">Date *</Label>
                  <Input
                    id="edit_scheduled_date"
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_scheduled_time">Time *</Label>
                  <Input
                    id="edit_scheduled_time"
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_interviewer_id">Interviewer</Label>
                  <Select
                    value={formData.interviewer_id}
                    onValueChange={(value) => setFormData({ ...formData, interviewer_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select interviewer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {interviewers.map((interviewer) => (
                        <SelectItem key={interviewer.id} value={interviewer.id.toString()}>
                          {interviewer.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_status">Status</Label>
                  <Select
                    value={selectedInterview?.status || 'scheduled'}
                    onValueChange={(value) => {
                      if (selectedInterview) {
                        setSelectedInterview({
                          ...selectedInterview,
                          status: value as 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="rescheduled">Rescheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_notes">Notes</Label>
                <Textarea
                  id="edit_notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90">
                Update Interview
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Interview Feedback</DialogTitle>
            <DialogDescription>
              Provide feedback for the completed interview
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFeedbackSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="feedback">Feedback *</Label>
                <Textarea
                  id="feedback"
                  value={feedbackFormData.feedback}
                  onChange={(e) => setFeedbackFormData({ ...feedbackFormData, feedback: e.target.value })}
                  placeholder="Enter detailed feedback about the interview..."
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rating">Rating (1-5)</Label>
                <Select
                  value={feedbackFormData.rating}
                  onValueChange={(value) => setFeedbackFormData({ ...feedbackFormData, rating: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select rating" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} Star{num !== 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recommendation">Recommendation</Label>
                <Select
                  value={feedbackFormData.recommendation}
                  onValueChange={(value: 'proceed' | 'hold' | 'reject') =>
                    setFeedbackFormData({ ...feedbackFormData, recommendation: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recommendation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proceed">Proceed to next round</SelectItem>
                    <SelectItem value="hold">On Hold</SelectItem>
                    <SelectItem value="reject">Reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFeedbackDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90">
                Submit Feedback
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Interview</DialogTitle>
            <DialogDescription>
              Select new date and time for the interview
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRescheduleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reschedule_date">New Date *</Label>
                <Input
                  id="reschedule_date"
                  type="date"
                  value={rescheduleFormData.scheduled_date}
                  onChange={(e) => setRescheduleFormData({ ...rescheduleFormData, scheduled_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reschedule_time">New Time *</Label>
                <Input
                  id="reschedule_time"
                  type="time"
                  value={rescheduleFormData.scheduled_time}
                  onChange={(e) => setRescheduleFormData({ ...rescheduleFormData, scheduled_time: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reschedule_notes">Notes</Label>
                <Textarea
                  id="reschedule_notes"
                  value={rescheduleFormData.notes}
                  onChange={(e) => setRescheduleFormData({ ...rescheduleFormData, notes: e.target.value })}
                  placeholder="Reason for rescheduling..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRescheduleDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90">
                Reschedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Interview</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this interview? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedInterview && (
              <div className="space-y-2">
                <p className="font-medium">{selectedInterview.application?.candidate?.name}</p>
                <p className="text-sm text-solarized-base01">
                  {selectedInterview.application?.job?.title} - {formatDateTime(selectedInterview.scheduled_date, selectedInterview.scheduled_time)}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>
              Delete Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}