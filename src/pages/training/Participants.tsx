import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { trainingService } from '../../services/api';
import { showAlert, showConfirmDialog, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { StatusBadge } from '../../components/ui/status-badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../../components/ui/dialog';
import {
    Plus,
    User,
    GraduationCap,
    MoreHorizontal,
    Eye,
    Edit,
    Trash2,
    Trophy,
    ClipboardCheck,
    Search,
    Calendar,
    Clock,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { useAuth } from '../../context/AuthContext';
import DataTable, { TableColumn } from 'react-data-table-component';

interface Session {
    id: number;
    session_name: string;
    date: string;
    time: string | null;
    location: string | null;
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

interface Participant {
    id: number;
    training_session_id: number;
    staff_member_id: number;
    training_program_id?: number | null;
    status: string;
    attendance_status: string | null;
    score: string | null;
    feedback: string | null;
    certificate_issued: boolean;
    certificate_issued_at: string | null;
    session?: Session;
    staff_member?: Staff;
    training_program?: TrainingProgram;
}

export default function Participants() {
    const { hasPermission } = useAuth();
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRows, setTotalRows] = useState(0);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [viewingParticipant, setViewingParticipant] = useState<Participant | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const canManage = hasPermission('manage_staff_training');

    const fetchParticipants = useCallback(
        async (currentPage: number = 1) => {
            setIsLoading(true);
            try {
                const params: Record<string, unknown> = {
                    page: currentPage,
                    per_page: perPage,
                    search,
                };

                const response = await trainingService.getParticipants(params);
                const payload = response.data.data;

                if (Array.isArray(payload)) {
                    setParticipants(payload);
                    setTotalRows(response.data.meta?.total ?? payload.length);
                } else if (payload && Array.isArray(payload.data)) {
                    setParticipants(payload.data);
                    setTotalRows(payload.total);
                } else {
                    setParticipants([]);
                    setTotalRows(0);
                }
            } catch (error) {
                console.error('Failed to fetch participants:', error);
                showAlert('error', 'Error', getErrorMessage(error, 'Failed to fetch participants'));
                setParticipants([]);
                setTotalRows(0);
            } finally {
                setIsLoading(false);
            }
        },
        [perPage, search]
    );

    useEffect(() => {
        fetchParticipants(page);
    }, [page, fetchParticipants]);

    const handleView = (participant: Participant) => {
        setViewingParticipant(participant);
        setIsViewDialogOpen(true);
    };

    const handleDelete = async (participant: Participant) => {
        const result = await showConfirmDialog(
            'Remove Participant',
            `Are you sure you want to remove ${participant.staff_member?.full_name || 'this participant'} from the session?`
        );

        if (!result.isConfirmed) return;

        setIsDeleting(true);
        try {
            await trainingService.deleteParticipant(participant.id);
            fetchParticipants(page);
            showAlert('success', 'Removed!', 'Participant removed successfully', 2000);
        } catch (error: any) {
            console.error('Failed to remove participant:', error);

            if (error.response?.data?.message) {
                showAlert('error', 'Error', error.response.data.message);
            } else {
                const errorMessage = getErrorMessage(error, 'Failed to remove participant');
                showAlert('error', 'Error', errorMessage);
            }
        } finally {
            setIsDeleting(false);
        }
    };



    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';

        try {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }
        } catch (error) {
            console.error('Error formatting date:', error);
        }

        return dateString;
    };

    const formatTime = (timeString: string | null) => {
        if (!timeString) return 'N/A';

        try {
            // If time is in HH:MM format
            if (timeString.match(/^\d{2}:\d{2}$/)) {
                return timeString;
            }
            // If time is in HH:MM:SS format
            if (timeString.match(/^\d{2}:\d{2}:\d{2}$/)) {
                return timeString.substring(0, 5);
            }
        } catch (error) {
            console.error('Error formatting time:', error);
        }

        return timeString;
    };

    // ================= SEARCH =================
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
    };

    // ================= PAGINATION =================
    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handlePerRowsChange = (newPerPage: number) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    // ================= TABLE COLUMNS =================
    const columns: TableColumn<Participant>[] = [
        {
            name: 'Employee',
            selector: (row) => row.staff_member?.full_name || '',
            cell: (row) => (
                <div className="flex items-center gap-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-solarized-blue/10 flex items-center justify-center font-bold text-solarized-blue text-xs text-center shrink-0">
                        {row.staff_member?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="min-w-0">
                        <p className="font-medium truncate">{row.staff_member?.full_name || 'Unknown Employee'}</p>
                        {row.staff_member?.staff_code && (
                            <p className="text-xs text-solarized-base01 truncate">ID: {row.staff_member.staff_code}</p>
                        )}
                    </div>
                </div>
            ),
            sortable: true,
            minWidth: '200px',
        },
        {
            name: 'Training Program',
            selector: (row) => row.training_program?.title || '',
            cell: (row) => (
                <span className="text-sm font-medium">
                    {row.training_program?.title || '-'}
                </span>
            ),
            sortable: true,
            minWidth: '180px',
        },
        {
            name: 'Session',
            selector: (row) => row.session?.session_name || '',
            cell: (row) => (
                <div className="text-sm">
                    <p className="font-medium truncate">{row.session?.session_name || '-'}</p>
                    {row.session?.date && (
                        <p className="text-xs text-solarized-base01 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(row.session.date)}
                        </p>
                    )}
                </div>
            ),
            sortable: true,
            minWidth: '200px',
        },
        {
            name: 'Status',
            cell: (row) => (
                <StatusBadge status={row.status} />
            ),
            width: '120px',
        },
        {
            name: 'Attendance',
            cell: (row) => (
                <StatusBadge status={row.attendance_status || 'pending'} />
            ),
            width: '120px',
        },
        {
            name: 'Score',
            selector: (row) => row.score || '',
            cell: (row) => (
                <div className="flex items-center gap-1 font-medium">
                    {row.score ? (
                        <>
                            <Trophy className={`h-3 w-3 ${Number(row.score) >= 70 ? 'text-yellow-500' : 'text-solarized-base01'}`} />
                            {row.score}
                        </>
                    ) : '-'}
                </div>
            ),
            width: '100px',
        },
        {
            name: 'Certificate',
            cell: (row) => (
                row.certificate_issued ? (
                    <div className="flex items-center gap-1 text-solarized-green">
                        <ClipboardCheck className="h-4 w-4" />
                        <span className="text-xs font-medium">Issued</span>
                    </div>
                ) : '-'
            ),
            width: '120px',
        },
        {
            name: 'Actions',
            cell: (row) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isDeleting}>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(row)}>
                            <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                        {canManage && (
                            <>
                                <Link to={`/training/participants/${row.id}/edit`}>
                                    <DropdownMenuItem>
                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                </Link>
                                <DropdownMenuItem
                                    onClick={() => handleDelete(row)}
                                    className="text-red-600"
                                    disabled={isDeleting}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
            ignoreRowClick: true,
            width: '80px',
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
        rows: {
            style: {
                borderBottomWidth: '1px',
                borderBottomColor: '#e5e7eb',
                borderBottomStyle: 'solid' as const,
            },
        },
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-solarized-base02">Training Participants</h1>
                    <p className="text-solarized-base01">Manage participant progress and certifications</p>
                </div>
                {canManage && (
                    <Link to="/training/participants/create">
                        <Button className="bg-solarized-blue hover:bg-solarized-blue/90">
                            <Plus className="mr-2 h-4 w-4" />
                            Enroll Employee
                        </Button>
                    </Link>
                )}
            </div>

            {/* View Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Participant Details</DialogTitle>
                    </DialogHeader>
                    {viewingParticipant && (
                        <div className="space-y-6">
                            {/* Header with Employee Info */}
                            <div className="flex items-center gap-4 p-4 bg-solarized-base3/10 rounded-lg">
                                <div className="w-16 h-16 rounded-full bg-solarized-blue/20 flex items-center justify-center">
                                    <User className="h-8 w-8 text-solarized-blue" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-xl text-solarized-base02">
                                        {viewingParticipant.staff_member?.full_name || 'Unknown Employee'}
                                    </p>
                                    <div className="flex flex-wrap gap-4 mt-2">
                                        {viewingParticipant.staff_member?.staff_code && (
                                            <div>
                                                <p className="text-sm text-solarized-base01">Employee ID</p>
                                                <p className="font-medium">{viewingParticipant.staff_member.staff_code}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm text-solarized-base01">Status</p>
                                            <StatusBadge status={viewingParticipant.status} />
                                        </div>
                                        <div>
                                            <p className="text-sm text-solarized-base01">Attendance</p>
                                            <StatusBadge status={viewingParticipant.attendance_status || 'pending'} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Training Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Training Program */}
                                {viewingParticipant.training_program && (
                                    <div className="space-y-2">
                                        <Label className="text-sm text-solarized-base01">Training Program</Label>
                                        <div className="flex items-center gap-2 p-3 bg-solarized-base3/10 rounded">
                                            <GraduationCap className="h-5 w-5 text-solarized-blue" />
                                            <span className="font-medium">{viewingParticipant.training_program.title}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Session Details */}
                                {viewingParticipant.session && (
                                    <div className="space-y-2">
                                        <Label className="text-sm text-solarized-base01">Session Details</Label>
                                        <div className="space-y-2 p-3 bg-solarized-base3/10 rounded">
                                            <p className="font-medium">{viewingParticipant.session.session_name}</p>
                                            <div className="flex items-center gap-2 text-sm text-solarized-base01">
                                                <Calendar className="h-4 w-4" />
                                                {formatDate(viewingParticipant.session.date)}
                                            </div>
                                            {viewingParticipant.session.time && (
                                                <div className="flex items-center gap-2 text-sm text-solarized-base01">
                                                    <Clock className="h-4 w-4" />
                                                    {formatTime(viewingParticipant.session.time)}
                                                </div>
                                            )}
                                            {viewingParticipant.session.location && (
                                                <p className="text-sm text-solarized-base01">
                                                    Location: {viewingParticipant.session.location}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Performance Details */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Score */}
                                <div className="space-y-2">
                                    <Label className="text-sm text-solarized-base01">Score</Label>
                                    <div className="p-4 bg-solarized-base3/10 rounded-lg flex flex-col items-center justify-center min-h-[96px]">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Trophy className={`h-5 w-5 ${Number(viewingParticipant.score) >= 70 ? 'text-yellow-500' : 'text-solarized-base01'}`} />
                                            <span className="text-2xl font-bold text-solarized-base02">
                                                {viewingParticipant.score || 'N/A'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-solarized-base01">
                                            {viewingParticipant.score ? '/100 points' : 'No score recorded'}
                                        </p>
                                    </div>
                                </div>

                                {/* Certificate Status */}
                                <div className="space-y-2">
                                    <Label className="text-sm text-solarized-base01">Certificate Status</Label>
                                    <div className={`p-4 rounded-lg flex flex-col items-center justify-center min-h-[96px] ${viewingParticipant.certificate_issued
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400'
                                        }`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <ClipboardCheck className="h-5 w-5" />
                                            <span className="font-bold text-lg">
                                                {viewingParticipant.certificate_issued ? 'Issued' : 'Not Issued'}
                                            </span>
                                        </div>
                                        {viewingParticipant.certificate_issued_at && (
                                            <p className="text-xs opacity-80">
                                                {formatDate(viewingParticipant.certificate_issued_at)}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Enrollment Info */}
                                <div className="space-y-2">
                                    <Label className="text-sm text-solarized-base01">Enrollment Info</Label>
                                    <div className="p-4 bg-solarized-base3/10 rounded-lg">
                                        <p className="text-sm">
                                            <span className="text-solarized-base01">Participant ID: </span>
                                            <span className="font-medium">#{viewingParticipant.id}</span>
                                        </p>
                                        <p className="text-sm mt-2">
                                            <span className="text-solarized-base01">Session ID: </span>
                                            <span className="font-medium">#{viewingParticipant.training_session_id}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Feedback */}
                            <div className="space-y-2">
                                <Label className="text-sm text-solarized-base01">Feedback</Label>
                                <div className="p-4 bg-solarized-base3/10 rounded-lg min-h-[100px]">
                                    {viewingParticipant.feedback ? (
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                            {viewingParticipant.feedback}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-solarized-base01 italic">No feedback provided.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="mt-6">
                        {viewingParticipant && canManage && (
                            <div className="flex items-end gap-2">
                                {/* <Link to={`/training/participants/${viewingParticipant.id}/edit`} className="flex-1">
                                    <Button className="w-full bg-solarized-blue hover:bg-solarized-blue/90">
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit Participant
                                    </Button>
                                </Link> */}
                                <Button
                                    variant="outline"
                                    onClick={() => setIsViewDialogOpen(false)}
                                    className="flex-1"
                                >
                                    Close
                                </Button>
                            </div>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Card className="border-0 shadow-md">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                            <form onSubmit={handleSearchSubmit} className="flex gap-2">
                                <Input
                                    placeholder="Search by employee name, program, or session..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="flex-1"
                                />
                                <Button type="submit" variant="outline">
                                    <Search className="mr-2 h-4 w-4" /> Search
                                </Button>
                            </form>
                        </div>
                        {participants.length > 0 && (
                            <div className="text-sm text-solarized-base01">
                                Showing {participants.length} of {totalRows} participants
                            </div>
                        )}
                    </div>
                </CardHeader>

                <CardContent>
                    {!isLoading && participants.length === 0 ? (
                        <div className="text-center py-12">
                            <User className="mx-auto h-16 w-16 text-solarized-base01 mb-4" />
                            <h3 className="text-lg font-medium text-solarized-base02">No participants found</h3>
                            <p className="text-solarized-base01 mt-2">
                                {search ? 'Try a different search term' : 'Enroll employees to get started'}
                            </p>
                            {canManage && !search && (
                                <Link to="/training/participants/create" className="mt-4 inline-block">
                                    <Button className="bg-solarized-blue hover:bg-solarized-blue/90">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Enroll First Employee
                                    </Button>
                                </Link>
                            )}
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={participants}
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
                            noDataComponent={
                                <div className="py-8 text-center">
                                    <User className="mx-auto h-12 w-12 text-solarized-base01 mb-3" />
                                    <p className="text-solarized-base01">No participants found</p>
                                </div>
                            }
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// Label component for consistency
const Label = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <label className={`block text-sm font-medium text-solarized-base02 ${className}`}>
        {children}
    </label>
);