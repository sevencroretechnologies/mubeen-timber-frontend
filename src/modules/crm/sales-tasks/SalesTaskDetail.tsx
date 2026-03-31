import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Plus, Trash2, Calendar, Clock, ClipboardList } from "lucide-react";
import { salesTaskApi, salesTaskDetailApi } from "@/services/api";
import { SalesTask, SalesTaskDetail as SalesTaskDetailType } from "@/types";
import { showAlert, showConfirmDialog, getErrorMessage } from "@/lib/sweetalert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SalesTaskDetailModal from "@/modules/crm/sales-tasks/SalesTaskDetailModal";

const getStatusBadgeColor = (status: string) => {
    switch (status) {
        case "Open":
            return "bg-blue-100 text-blue-800";
        case "In Progress":
            return "bg-yellow-100 text-yellow-800";
        case "Closed":
            return "bg-green-100 text-green-800";
        default:
            return "bg-gray-100 text-gray-800";
    }
};

export default function SalesTaskDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [task, setTask] = useState<SalesTask | null>(null);
    const [details, setDetails] = useState<SalesTaskDetailType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState<SalesTaskDetailType | null>(null);

    const loadData = useCallback(async (taskId: number) => {
        setIsLoading(true);
        try {
            const [taskData, detailsData] = await Promise.all([
                salesTaskApi.get(taskId),
                salesTaskDetailApi.list({ sales_task_id: taskId, per_page: 100 })
            ]);

            setTask(taskData);
            setDetails(Array.isArray(detailsData) ? detailsData : (detailsData as any).data || []);
        } catch (error) {
            console.error("Failed to load task data:", error);
            showAlert('error', 'Error', 'Failed to load task data');
            navigate("/crm/sales-tasks");
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        if (id) {
            loadData(Number(id));
        }
    }, [id, loadData]);

    const handleDeleteDetail = async (detailId: number) => {
        const result = await showConfirmDialog('Delete Progress Entry', "Are you sure you want to delete this progress entry?");
        if (!result.isConfirmed) return;

        try {
            await salesTaskDetailApi.delete(detailId);
            showAlert('success', 'Deleted!', 'Progress entry deleted successfully', 2000);
            if (id) loadData(Number(id));
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, "Failed to delete progress entry"));
        }
    };

    const handleAdd = () => {
        setSelectedDetail(null);
        setShowModal(true);
    };

    const handleEdit = (detail: SalesTaskDetailType) => {
        setSelectedDetail(detail);
        setShowModal(true);
    };

    const handleSave = () => {
        if (id) loadData(Number(id));
        setShowModal(false);
    };

    if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
    if (!task) return <div className="p-8 text-center text-muted-foreground">Task not found</div>;

    const getSourceEntityName = () => {
        if (!task.source_detail) return "Unknown Entity";
        return task.source_detail.name ||
            task.source_detail.company_name ||
            task.source_detail.party_name ||
            (task.source_detail.first_name ? `${task.source_detail.first_name} ${task.source_detail.last_name || ''}`.trim() : null) ||
            `Entity #${task.source_detail.id}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/crm/sales-tasks")}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Task Progress</h1>
                        <p className="text-muted-foreground text-sm">
                            {task.task_type?.name} for {getSourceEntityName()}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg">Task Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Task Type</p>
                            <span className="inline-block px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-semibold mt-1">
                                {task.task_type?.name || "Unknown"}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Source</p>
                            <p className="font-medium">{task.task_source?.name || "Unknown"}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Entity</p>
                            <p className="font-medium">{getSourceEntityName()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Assigned User</p>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                                    {(task.assigned_user?.name || "U").charAt(0)}
                                </div>
                                <span className="font-medium">{task.assigned_user?.name || "Unassigned"}</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Created Date</p>
                            <p className="font-medium">{new Date(task.created_at).toLocaleDateString()}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg">Progress Entries</CardTitle>
                        <Button onClick={handleAdd} size="sm" className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="mr-2 h-4 w-4" /> Add Entry
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {details.length === 0 ? (
                            <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
                                <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                                <p className="text-muted-foreground">No progress entries yet.</p>
                                <Button variant="link" onClick={handleAdd} className="mt-2">Add your first entry</Button>
                            </div>
                        ) : (
                            <div className="relative space-y-4">
                                {/* Simple timeline view */}
                                {details.map((detail) => (
                                    <div key={detail.id} className="relative pl-6 pb-6 border-l-2 border-gray-100 last:border-0 last:pb-0">
                                        <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-white border-2 border-blue-500" />
                                        <div className="bg-white rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusBadgeColor(detail.status)}`}>
                                                        {detail.status}
                                                    </span>
                                                    <div className="flex items-center text-xs text-muted-foreground gap-2">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(detail.date).toLocaleDateString()}
                                                        <Clock className="h-3 w-3 ml-1" />
                                                        {detail.time}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(detail)}>
                                                        <Edit className="h-3.5 w-3.5 text-blue-600" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteDetail(detail.id)}>
                                                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{detail.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <SalesTaskDetailModal
                show={showModal}
                onHide={() => setShowModal(false)}
                onSave={handleSave}
                detail={selectedDetail}
                salesTaskId={task.id}
            />
        </div>
    );
}
