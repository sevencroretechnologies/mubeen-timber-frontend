import { useState, useEffect, useCallback } from 'react';
import { recruitmentService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select';
import DataTable, { TableColumn } from 'react-data-table-component';
import { Plus, Edit, Trash2, MoreHorizontal, Search, Eye, HelpCircle, Briefcase } from 'lucide-react';

// ==================== LOCAL TYPE DEFINITIONS ====================
interface CustomQuestion {
    id: number;
    job_posting_id: number;
    question: string;
    is_required: boolean;
    order: number;
    created_at: string;
    updated_at: string;
    job?: {
        id: number;
        title: string;
    };
}

interface Job {
    id: number;
    title: string;
    status: string;
}

interface FormData {
    job_id: string;
    question: string;
    is_required: boolean;
}
// ==================== END LOCAL TYPE DEFINITIONS ====================

export default function CustomQuestions() {
    const [questions, setQuestions] = useState<CustomQuestion[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Filter State
    const [selectedJobFilter, setSelectedJobFilter] = useState<string>('all');
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Dialog states
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState<CustomQuestion | null>(null);
    const [formData, setFormData] = useState<FormData>({
        job_id: '',
        question: '',
        is_required: false,
    });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // ================= FETCH JOBS =================
    const fetchJobs = useCallback(async () => {
        try {
            const response = await recruitmentService.getJobs({ paginate: false });
            const data = response.data?.data || response.data || [];
            if (Array.isArray(data)) {
                setJobs(data);
            }
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
        }
    }, []);

    // ================= FETCH QUESTIONS =================
    const fetchQuestions = useCallback(async () => {
        setIsLoading(true);
        try {
            const allQuestions: CustomQuestion[] = [];

            // Get jobs to fetch questions for
            const jobsToFetch = selectedJobFilter === 'all'
                ? jobs
                : jobs.filter(j => j.id.toString() === selectedJobFilter);

            // Fetch questions for each job
            for (const job of jobsToFetch) {
                try {
                    const response = await recruitmentService.getJobQuestions(job.id);
                    const jobQuestions = response.data?.data || response.data || [];
                    if (Array.isArray(jobQuestions)) {
                        const questionsWithJob = jobQuestions.map((q: CustomQuestion) => ({
                            ...q,
                            job: { id: job.id, title: job.title }
                        }));
                        allQuestions.push(...questionsWithJob);
                    }
                } catch (err) {
                    console.error(`Failed to fetch questions for job ${job.id}:`, err);
                }
            }

            // Filter by search query
            let filteredQuestions = allQuestions;
            if (searchQuery) {
                filteredQuestions = allQuestions.filter(q =>
                    q.question.toLowerCase().includes(searchQuery.toLowerCase())
                );
            }

            setQuestions(filteredQuestions);
        } catch (error) {
            console.error('Failed to fetch questions:', error);
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to fetch custom questions'));
            setQuestions([]);
        } finally {
            setIsLoading(false);
        }
    }, [jobs, selectedJobFilter, searchQuery]);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    useEffect(() => {
        if (jobs.length > 0) {
            fetchQuestions();
        }
    }, [jobs, fetchQuestions]);

    // ================= SEARCH =================
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchQuery(searchInput);
    };

    // ================= CRUD OPERATIONS =================
    const resetForm = () => {
        setIsEditMode(false);
        setSelectedQuestion(null);
        setFieldErrors({});
        setFormData({
            job_id: '',
            question: '',
            is_required: false,
        });
    };

    const handleAddClick = () => {
        resetForm();
        setIsDialogOpen(true);
    };

    const handleViewClick = (question: CustomQuestion) => {
        setSelectedQuestion(question);
        setIsViewOpen(true);
    };

    const handleEditClick = (question: CustomQuestion) => {
        setIsEditMode(true);
        setSelectedQuestion(question);
        setFieldErrors({});
        setFormData({
            job_id: question.job_posting_id.toString(),
            question: question.question,
            is_required: question.is_required,
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (question: CustomQuestion) => {
        const result = await showConfirmDialog(
            'Delete Question',
            'Are you sure you want to delete this custom question?'
        );

        if (!result.isConfirmed) return;

        try {
            await recruitmentService.deleteCustomQuestion(question.id);
            showAlert('success', 'Deleted!', 'Custom question deleted successfully', 2000);
            fetchQuestions();
        } catch (error) {
            console.error('Failed to delete custom question:', error);
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete custom question'));
        }
    };

    const validateForm = (isEdit: boolean = false) => {
        const errors: Record<string, string> = {};
        let isValid = true;

        if (!isEdit && !formData.job_id) {
            errors.job_id = 'Please select a job';
            isValid = false;
        }

        if (!formData.question.trim()) {
            errors.question = 'Question is required';
            isValid = false;
        } else if (formData.question.length > 500) {
            errors.question = 'Question must be less than 500 characters';
            isValid = false;
        }

        setFieldErrors(errors);
        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFieldErrors({});

        if (!validateForm(isEditMode)) {
            return;
        }

        try {
            if (isEditMode && selectedQuestion) {
                await recruitmentService.updateCustomQuestion(selectedQuestion.id, {
                    question: formData.question,
                    is_required: formData.is_required,
                });
                showAlert('success', 'Success', 'Custom question updated successfully', 2000);
            } else {
                await recruitmentService.addJobQuestion(parseInt(formData.job_id), {
                    question: formData.question,
                    is_required: formData.is_required,
                });
                showAlert('success', 'Success', 'Custom question added successfully', 2000);
            }

            setIsDialogOpen(false);
            resetForm();
            fetchQuestions();
        } catch (err: any) {
            console.error('Failed to save custom question:', err);
            const message = getErrorMessage(err, 'Failed to save custom question');

            // Handle backend validation errors
            if (err.response?.data?.errors) {
                const apiErrors: Record<string, string> = {};
                Object.keys(err.response.data.errors).forEach((key) => {
                    apiErrors[key] = err.response.data.errors[key][0];
                });
                setFieldErrors(apiErrors);
            } else {
                showAlert('error', 'Error', message);
            }
        }
    };

    const renderError = (field: string) => {
        return fieldErrors[field] ? (
            <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
        ) : null;
    };

    // ================= HELPERS =================
    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return 'Invalid Date';
        }
    };

    // ================= TABLE COLUMNS =================
    const columns: TableColumn<CustomQuestion>[] = [
        {
            id: 'job',
            name: 'Job',
            selector: (row) => row.job?.title || 'Unknown',
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-solarized-blue" />
                    <span className="font-medium">{row.job?.title || 'Unknown'}</span>
                </div>
            ),
            sortable: true,
            width: '200px',
        },
        {
            id: 'question',
            name: 'Question',
            selector: (row) => row.question,
            cell: (row) => (
                <div className="py-2">
                    <span className="text-sm">{row.question}</span>
                </div>
            ),
            sortable: true,
            grow: 2,
        },
        {
            id: 'is_required',
            name: 'Required',
            cell: (row) => (
                <Badge className={`capitalize ${row.is_required
                    ? 'bg-solarized-red/10 text-solarized-red hover:bg-solarized-red/10'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-100'
                    }`}>
                    {row.is_required ? 'Required' : 'Optional'}
                </Badge>
            ),
            width: '110px',
        },
        {
            id: 'order',
            name: 'Order',
            selector: (row) => row.order,
            cell: (row) => <span className="text-sm text-solarized-base01">{row.order}</span>,
            width: '80px',
        },
        {
            name: 'Actions',
            cell: (row) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewClick(row)}>
                            <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditClick(row)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => handleDelete(row)}
                            className="text-solarized-red"
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
            ignoreRowClick: true,
            width: '80px',
        },
    ];

    // Custom Styles for DataTable
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
        rows: {
            style: {
                minHeight: '56px',
            },
        },
    };

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-solarized-base02">Custom Questions</h1>
                    <p className="text-solarized-base01">Manage custom application questions for job postings</p>
                </div>
                <Button className="bg-solarized-blue hover:bg-solarized-blue/90" onClick={handleAddClick}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Question
                </Button>
            </div>

            {/* TABLE */}
            <Card className="border-0 shadow-md">
                <CardHeader>
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Job Filter */}
                        <div className="w-full md:w-64">
                            <Select value={selectedJobFilter} onValueChange={setSelectedJobFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by Job" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Jobs</SelectItem>
                                    {jobs.map((job) => (
                                        <SelectItem key={job.id} value={job.id.toString()}>
                                            {job.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Search */}
                        <form onSubmit={handleSearchSubmit} className="flex gap-4 flex-1">
                            <Input
                                placeholder="Search questions..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                            />
                            <Button type="submit" variant="outline">
                                <Search className="mr-2 h-4 w-4" /> Search
                            </Button>
                        </form>
                    </div>
                </CardHeader>
                <CardContent>
                    {!isLoading && questions.length === 0 ? (
                        <div className="text-center py-12">
                            <HelpCircle className="mx-auto h-12 w-12 text-solarized-base01 mb-4" />
                            <h3 className="text-lg font-medium text-solarized-base02">No custom questions found</h3>
                            <p className="text-solarized-base01 mt-1">
                                {selectedJobFilter === 'all'
                                    ? 'Create custom questions to gather additional information from applicants.'
                                    : 'This job has no custom questions yet.'}
                            </p>
                            <Button
                                className="mt-4 bg-solarized-blue hover:bg-solarized-blue/90"
                                onClick={handleAddClick}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Question
                            </Button>
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={questions}
                            progressPending={isLoading}
                            pagination
                            paginationPerPage={10}
                            paginationRowsPerPageOptions={[10, 25, 50]}
                            customStyles={customStyles}
                            highlightOnHover
                            responsive
                        />
                    )}
                </CardContent>
            </Card>

            {/* VIEW DIALOG */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Question Details</DialogTitle>
                        <DialogDescription>View the details of this custom question</DialogDescription>
                    </DialogHeader>

                    {selectedQuestion && (
                        <div className="space-y-4 py-4">
                            <div>
                                <Label className="text-solarized-base01">Job</Label>
                                <p className="font-medium text-lg">{selectedQuestion.job?.title || 'Unknown'}</p>
                            </div>

                            <div>
                                <Label className="text-solarized-base01">Question</Label>
                                <p className="text-sm text-solarized-base02 whitespace-pre-wrap">
                                    {selectedQuestion.question}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-solarized-base01">Required</Label>
                                    <div className="mt-1">
                                        <Badge className={`capitalize ${selectedQuestion.is_required
                                            ? 'bg-solarized-red/10 text-solarized-red'
                                            : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {selectedQuestion.is_required ? 'Required' : 'Optional'}
                                        </Badge>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-solarized-base01">Order</Label>
                                    <p className="font-medium">{selectedQuestion.order}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                <div>
                                    <Label className="text-xs text-solarized-base01">Created At</Label>
                                    <p className="text-sm">{formatDate(selectedQuestion.created_at)}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-solarized-base01">Updated At</Label>
                                    <p className="text-sm">{formatDate(selectedQuestion.updated_at)}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                            Close
                        </Button>
                        <Button
                            className="bg-solarized-blue hover:bg-solarized-blue/90"
                            onClick={() => {
                                if (selectedQuestion) {
                                    handleEditClick(selectedQuestion);
                                    setIsViewOpen(false);
                                }
                            }}
                        >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ADD/EDIT DIALOG */}
            <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    if (!open) resetForm();
                    setIsDialogOpen(open);
                }}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? 'Edit Custom Question' : 'Add Custom Question'}</DialogTitle>
                        <DialogDescription>
                            {isEditMode
                                ? 'Update the custom question details'
                                : 'Create a custom question for job applications'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 py-4">
                            {!isEditMode && (
                                <div className="space-y-2">
                                    <Label htmlFor="job_id" className={fieldErrors.job_id ? 'text-red-500' : ''}>
                                        Select Job *
                                    </Label>
                                    <Select
                                        value={formData.job_id}
                                        onValueChange={(value) => {
                                            setFormData({ ...formData, job_id: value });
                                            if (fieldErrors.job_id) setFieldErrors(prev => ({ ...prev, job_id: '' }));
                                        }}
                                    >
                                        <SelectTrigger className={fieldErrors.job_id ? 'border-red-500' : ''}>
                                            <SelectValue placeholder="Select a job" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {jobs.map((job) => (
                                                <SelectItem key={job.id} value={job.id.toString()}>
                                                    {job.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {renderError('job_id')}
                                </div>
                            )}

                            {isEditMode && selectedQuestion && (
                                <div className="space-y-2">
                                    <Label className="text-solarized-base01">Job</Label>
                                    <p className="font-medium">{selectedQuestion.job?.title || 'Unknown'}</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="question" className={fieldErrors.question ? 'text-red-500' : ''}>
                                    Question *
                                </Label>
                                <textarea
                                    id="question"
                                    value={formData.question}
                                    onChange={(e) => {
                                        setFormData({ ...formData, question: e.target.value });
                                        if (fieldErrors.question) setFieldErrors(prev => ({ ...prev, question: '' }));
                                    }}
                                    placeholder="Enter your question..."
                                    className={`flex min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${fieldErrors.question ? 'border-red-500' : 'border-input'}`}
                                />
                                {renderError('question')}
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_required}
                                        onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                                        className="w-4 h-4 text-solarized-blue border-gray-300 rounded focus:ring-solarized-blue"
                                    />
                                    <span className="text-sm font-medium text-gray-900">Make this question required</span>
                                </label>
                                <p className="text-sm text-solarized-base01">
                                    Required questions must be answered before submitting an application
                                </p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    resetForm();
                                    setIsDialogOpen(false);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90">
                                {isEditMode ? 'Update Question' : 'Add Question'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
