import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { trainingService, staffService } from '../../services/api';
import { showAlert, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

interface Session {
    id: number;
    session_name: string;
}

interface Staff {
    id: number;
    full_name: string;
    staff_code?: string;
}

interface TrainingProgram {
    id: number;
    title: string;
}

export default function ParticipantForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [staffMembers, setStaffMembers] = useState<Staff[]>([]);
    const [trainingPrograms, setTrainingPrograms] = useState<TrainingProgram[]>([]);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState({
        training_session_id: '',
        staff_member_id: '',
        training_program_id: '',
        status: 'enrolled',
        attendance_status: 'pending',
        score: '',
        feedback: '',
        certificate_issued: false,
    });

    // ================= VALIDATION =================
    const validateForm = (isEdit: boolean = false) => {
        const errors: Record<string, string> = {};
        let isValid = true;

        // For create mode: session and employee are required
        if (!isEdit) {
            // Training session ID validation (required, must exist)
            if (!formData.training_session_id) {
                errors.training_session_id = 'Session is required';
                isValid = false;
            } else {
                const sessionExists = sessions.some(session => session.id.toString() === formData.training_session_id);
                if (!sessionExists) {
                    errors.training_session_id = 'Selected session does not exist';
                    isValid = false;
                }
            }

            // Staff member ID validation (required, must exist)
            if (!formData.staff_member_id) {
                errors.staff_member_id = 'Employee is required';
                isValid = false;
            } else {
                const staffExists = staffMembers.some(staff => staff.id.toString() === formData.staff_member_id);
                if (!staffExists) {
                    errors.staff_member_id = 'Selected employee does not exist';
                    isValid = false;
                }
            }
        }

        // Training program ID validation (nullable, must exist if provided)
        if (formData.training_program_id && formData.training_program_id.trim() !== '') {
            const programExists = trainingPrograms.some(program => program.id.toString() === formData.training_program_id);
            if (!programExists) {
                errors.training_program_id = 'Selected training program does not exist';
                isValid = false;
            }
        }

        // Status validation (nullable, must be in allowed values)
        if (formData.status && !['enrolled', 'withdrawn', 'completed'].includes(formData.status)) {
            errors.status = "Status must be 'enrolled', 'withdrawn', or 'completed'";
            isValid = false;
        }

        // Attendance status validation (nullable, must be in allowed values)
        if (formData.attendance_status && !['pending', 'present', 'absent'].includes(formData.attendance_status)) {
            errors.attendance_status = "Attendance status must be 'pending', 'present', or 'absent'";
            isValid = false;
        }

        // Score validation (nullable, numeric, min:0, max:100 if provided)
        if (formData.score && formData.score.trim() !== '') {
            const score = Number(formData.score);
            if (isNaN(score)) {
                errors.score = 'Score must be a number';
                isValid = false;
            } else if (score < 0 || score > 100) {
                errors.score = 'Score must be between 0 and 100';
                isValid = false;
            }
        }

        // Feedback validation (nullable, string)
        // No validation needed as it's optional string

        // Certificate issued validation (nullable, boolean)
        // No validation needed as it's boolean

        setFieldErrors(errors);
        return isValid;
    };

    // Helper to render error messages
    const renderError = (field: string) => {
        return fieldErrors[field] ? (
            <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
        ) : null;
    };

    // Clear error for specific field when user starts typing
    const clearFieldError = (field: string) => {
        setFieldErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
        });
    };

    // Update form field and clear error
    const updateFormField = (field: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        clearFieldError(field);
    };

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                await Promise.all([fetchSessions(), fetchStaff(), fetchTrainingPrograms()]);
                if (isEditMode) {
                    await fetchParticipant();
                }
            } catch (error) {
                console.error("Error loading data", error);
                showAlert('error', 'Error', 'Failed to load form data');
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [id]);

    const fetchSessions = async () => {
        try {
            const response = await trainingService.getSessions({ paginate: 'false' } as any);
            const data = response.data.data || response.data;
            setSessions(Array.isArray(data) ? data : (data.data || []));
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        }
    };

    const fetchStaff = async () => {
        try {
            const response = await staffService.getAll({ paginate: 'false' } as any);
            const data = response.data.data || response.data;
            setStaffMembers(Array.isArray(data) ? data : (data.data || []));
        } catch (error) {
            console.error('Failed to fetch staff:', error);
        }
    };

    const fetchTrainingPrograms = async () => {
        try {
            const response = await trainingService.getPrograms({ paginate: 'false' } as any);
            const data = response.data.data || response.data;
            setTrainingPrograms(Array.isArray(data) ? data : (data.data || []));
        } catch (error) {
            console.error('Failed to fetch training programs:', error);
        }
    };

    const fetchParticipant = async () => {
        try {
            const response = await trainingService.getParticipants({ paginate: 'false' });
            const all = response.data.data || response.data;
            const participant = Array.isArray(all) ? all.find((p: any) => p.id === Number(id)) : null;

            if (participant) {
                setFormData({
                    training_session_id: String(participant.training_session_id),
                    staff_member_id: String(participant.staff_member_id),
                    training_program_id: participant.training_program_id ? String(participant.training_program_id) : '',
                    status: participant.status,
                    attendance_status: participant.attendance_status || 'pending',
                    score: participant.score ? String(participant.score) : '',
                    feedback: participant.feedback || '',
                    certificate_issued: participant.certificate_issued || false,
                });
                setFieldErrors({});
            } else {
                showAlert('error', 'Error', 'Participant not found');
                navigate('/training/participants');
            }
        } catch (error) {
            console.error('Failed to fetch participant:', error);
            showAlert('error', 'Error', 'Failed to fetch details');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setFieldErrors({});

        // Validate form before submission
        if (!validateForm(isEditMode)) {
            setIsSaving(false);
            // showAlert('error', 'Validation Error', 'Please check the form for errors.');
            return;
        }

        try {
            const payload: any = {
                training_program_id: formData.training_program_id ? Number(formData.training_program_id) : null,
                status: formData.status,
                attendance_status: formData.attendance_status,
                feedback: formData.feedback || null,
                certificate_issued: formData.certificate_issued,
            };

            // Add score only if provided
            if (formData.score && formData.score.trim() !== '') {
                payload.score = Number(formData.score);
            }

            if (isEditMode) {
                await trainingService.updateParticipant(id!, payload);
                showAlert('success', 'Updated', 'Participant updated successfully', 2000);
            } else {
                // For new enrollment, include staff_member_id
                payload.staff_member_id = Number(formData.staff_member_id);
                
                await trainingService.enrollInSession(Number(formData.training_session_id), payload);
                showAlert('success', 'Success', 'Participant enrolled successfully', 2000);
            }
            navigate('/training/participants');
        } catch (error: any) {
            console.error('Failed to save:', error);
            
            if (error.response?.data?.errors) {
                // Handle API validation errors
                const apiErrors: Record<string, string> = {};
                Object.keys(error.response.data.errors).forEach((key) => {
                    apiErrors[key] = error.response.data.errors[key][0];
                });
                setFieldErrors(apiErrors);
                showAlert('error', 'Validation Error', 'Please fix the errors highlighted below.');
            } else {
                const msg = getErrorMessage(error, 'Failed to save participant');
                showAlert('error', 'Error', msg);
            }
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/training/participants')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-solarized-base02">
                        {isEditMode ? 'Edit Participant' : 'Enroll Participant'}
                    </h1>
                    <p className="text-solarized-base01">
                        {isEditMode ? 'Update participant progress and results' : 'Register a new employee for a training session'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Enrollment Details Section */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold text-solarized-base02">Enrollment Details</CardTitle>
                        <CardDescription>Select the session and the employee to enroll.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-3">
                        {/* Training Program (Optional) */}
                        <div className="space-y-2">
                            <Label htmlFor="training_program" className={fieldErrors.training_program_id ? 'text-red-500' : ''}>
                                Training Program (Optional)
                            </Label>
                            <Select
                                value={formData.training_program_id}
                                onValueChange={(val) => updateFormField('training_program_id', val)}
                            >
                                <SelectTrigger className={`bg-white ${fieldErrors.training_program_id ? 'border-red-500' : ''}`}>
                                    <SelectValue placeholder="Select program (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {trainingPrograms.map((program) => (
                                        <SelectItem key={program.id} value={String(program.id)}>
                                            {program.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {renderError('training_program_id')}
                        </div>

                        {/* Session (Required for new enrollment) */}
                        {!isEditMode && (
                            <div className="space-y-2">
                                <Label htmlFor="session" className={fieldErrors.training_session_id ? 'text-red-500' : ''}>
                                    Session *
                                </Label>
                                <Select
                                    value={formData.training_session_id}
                                    onValueChange={(val) => updateFormField('training_session_id', val)}
                                    disabled={isEditMode}
                                >
                                    <SelectTrigger className={`bg-white ${fieldErrors.training_session_id ? 'border-red-500' : ''}`}>
                                        <SelectValue placeholder="Select session" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sessions.map((session) => (
                                            <SelectItem key={session.id} value={String(session.id)}>
                                                {session.session_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {renderError('training_session_id')}
                            </div>
                        )}

                        {/* Employee (Required for new enrollment) */}
                        {!isEditMode && (
                            <div className="space-y-2">
                                <Label htmlFor="employee" className={fieldErrors.staff_member_id ? 'text-red-500' : ''}>
                                    Employee *
                                </Label>
                                <Select
                                    value={formData.staff_member_id}
                                    onValueChange={(val) => updateFormField('staff_member_id', val)}
                                    disabled={isEditMode}
                                >
                                    <SelectTrigger className={`bg-white ${fieldErrors.staff_member_id ? 'border-red-500' : ''}`}>
                                        <SelectValue placeholder="Select employee" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]" position="popper">
                                        {staffMembers.map((staff) => (
                                            <SelectItem key={staff.id} value={String(staff.id)}>
                                                {staff.full_name} {staff.staff_code ? `(${staff.staff_code})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {renderError('staff_member_id')}
                            </div>
                        )}

                        {/* In edit mode, show read-only session and employee info */}
                        {isEditMode && (
                            <>
                                <div className="space-y-2">
                                    <Label className="text-solarized-base01">Session</Label>
                                    <div className="p-2 bg-solarized-base03/10 rounded text-sm">
                                        {sessions.find(s => s.id.toString() === formData.training_session_id)?.session_name || 'Unknown'}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-solarized-base01">Employee</Label>
                                    <div className="p-2 bg-solarized-base03/10 rounded text-sm">
                                        {staffMembers.find(s => s.id.toString() === formData.staff_member_id)?.full_name || 'Unknown'}
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Progress & Results Section */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold text-solarized-base02">Progress & Results</CardTitle>
                        <CardDescription>Track the participant's status and performance.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label className={fieldErrors.status ? 'text-red-500' : ''}>Status</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(val) => updateFormField('status', val)}
                            >
                                <SelectTrigger className={`bg-white ${fieldErrors.status ? 'border-red-500' : ''}`}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="enrolled">Enrolled</SelectItem>
                                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                            {renderError('status')}
                        </div>

                        <div className="space-y-2">
                            <Label className={fieldErrors.attendance_status ? 'text-red-500' : ''}>Attendance Status</Label>
                            <Select
                                value={formData.attendance_status}
                                onValueChange={(val) => updateFormField('attendance_status', val)}
                            >
                                <SelectTrigger className={`bg-white ${fieldErrors.attendance_status ? 'border-red-500' : ''}`}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="present">Present</SelectItem>
                                    <SelectItem value="absent">Absent</SelectItem>
                                </SelectContent>
                            </Select>
                            {renderError('attendance_status')}
                        </div>

                        <div className="space-y-2">
                            <Label className={fieldErrors.score ? 'text-red-500' : ''}>Score (0-100)</Label>
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={formData.score}
                                onChange={(e) => updateFormField('score', e.target.value)}
                                className={`bg-white ${fieldErrors.score ? 'border-red-500' : ''}`}
                                placeholder="0.00"
                            />
                            {renderError('score')}
                        </div>
                    </CardContent>
                </Card>

                {/* Feedback & Certification Section */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold text-solarized-base02">Feedback & Certification</CardTitle>
                        <CardDescription>Provide feedback and manage certification status.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Feedback</Label>
                            <Textarea
                                value={formData.feedback}
                                onChange={(e) => updateFormField('feedback', e.target.value)}
                                placeholder="Enter instructor feedback regarding the participant's performance..."
                                rows={4}
                                className="bg-white"
                            />
                        </div>

                        <div className="flex items-center space-x-2 p-4 border rounded-lg bg-white">
                            <Checkbox
                                id="cert"
                                checked={formData.certificate_issued}
                                onCheckedChange={(checked) => updateFormField('certificate_issued', !!checked)}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="cert" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Issue Certificate
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Check this box if the participant has successfully completed the training and earned a certificate.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex items-center justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => navigate('/training/participants')}>
                        Cancel
                    </Button>
                    <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90 min-w-[120px]" disabled={isSaving}>
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                {isEditMode ? 'Update Participant' : 'Enroll Participant'}
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}