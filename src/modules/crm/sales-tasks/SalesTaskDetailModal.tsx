import React, { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { salesTaskDetailApi, salesTaskApi } from "@/services/api";
import { SalesTaskDetail, SalesTask } from "@/types";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { showAlert } from "@/lib/sweetalert";

interface SalesTaskDetailModalProps {
    show: boolean;
    onHide: () => void;
    onSave: () => void;
    detail?: SalesTaskDetail | null;
    salesTaskId?: number;
    readOnly?: boolean;
}

export default function SalesTaskDetailModal({
    show,
    onHide,
    onSave,
    detail,
    salesTaskId,
    readOnly = false
}: SalesTaskDetailModalProps) {
    const [formData, setFormData] = useState<{
        sales_task_id: string;
        date: string;
        time: string;
        description: string;
        status: 'Open' | 'In Progress' | 'Closed';
    }>({
        sales_task_id: "",
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        description: "",
        status: "Open",
    });

    const [salesTasks, setSalesTasks] = useState<SalesTask[]>([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string[]>>({});

    useEffect(() => {
        if (show) {
            if (!salesTaskId && !detail) {
                loadSalesTasks();
            }
            if (detail) {
                setFormData({
                    sales_task_id: detail.sales_task_id?.toString() || "",
                    date: detail.date,
                    time: detail.time,
                    description: detail.description,
                    status: detail.status as 'Open' | 'In Progress' | 'Closed',
                });
            } else {
                setFormData({
                    sales_task_id: salesTaskId?.toString() || "",
                    date: new Date().toISOString().split('T')[0],
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                    description: "",
                    status: "Open",
                });
            }
            setErrors({});
        }
    }, [show, detail, salesTaskId]);

    const loadSalesTasks = async () => {
        try {
            const res = await salesTaskApi.list({ per_page: 1000 });
            const tasks = (res as any).data || res;
            setSalesTasks(Array.isArray(tasks) ? tasks : tasks.data || []);
        } catch (error) {
            console.error("Failed to load sales tasks:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        try {
            const dataToSave = {
                ...formData,
                sales_task_id: Number(formData.sales_task_id),
            };

            if (detail) {
                await salesTaskDetailApi.update(detail.id, dataToSave);
                showAlert('success', 'Updated!', 'Task detail updated successfully', 2000);
            } else {
                await salesTaskDetailApi.create(dataToSave);
                showAlert('success', 'Created!', 'Task detail created successfully', 2000);
            }
            onSave();
            onHide();
        } catch (error: any) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
            console.error("Failed to save task detail:", error);
        } finally {
            setLoading(false);
        }
    };

    const getTaskLabel = (t: SalesTask) => {
        const sourceName = t.task_source?.name || "Unknown Source";
        const typeName = t.task_type?.name || "Unknown Type";
        let detailName = "";

        if (t.source_detail) {
            if (t.task_source_id === 3) {
                // Opportunity
                detailName = t.source_detail.party_name || t.source_detail.naming_series || `Opp #${t.source_id}`;
            } else if (t.task_source_id === 1) {
                // Lead
                // the API returns first_name, last_name, company_name in source_detail for Lead
                detailName = `${t.source_detail.first_name || ''} ${t.source_detail.last_name || ''}`.trim() || t.source_detail.company_name || `Lead #${t.source_id}`;
            } else if (t.task_source_id === 2) {
                // Prospect
                detailName = t.source_detail.company_name || `Prospect #${t.source_id}`;
            }
        }

        if (detailName) {
            return `${sourceName} - ${detailName} (${typeName})`;
        }

        return `${sourceName}: ${typeName}`;
    };

    return (
        <Dialog open={show} onOpenChange={(open) => !open && onHide()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {readOnly ? "View Progress Entry" : detail ? "Edit Progress Entry" : "Add Progress Entry"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {!salesTaskId && !detail && (
                        <div className="space-y-2">
                            <Label htmlFor="sales_task_id">Sales Task</Label>
                            <select
                                id="sales_task_id"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.sales_task_id}
                                onChange={(e) => setFormData({ ...formData, sales_task_id: e.target.value })}
                                required
                                disabled={readOnly}
                            >
                                <option value="">Select Task</option>
                                {salesTasks.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {getTaskLabel(t)}
                                    </option>
                                ))}
                            </select>
                            {errors.sales_task_id && <p className="text-xs text-red-500">{errors.sales_task_id[0]}</p>}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input
                                id="date"
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                                disabled={readOnly}
                            />
                            {errors.date && <p className="text-xs text-red-500">{errors.date[0]}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="time">Time</Label>
                            <Input
                                id="time"
                                type="time"
                                value={formData.time}
                                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                required
                                disabled={readOnly}
                            />
                            {errors.time && <p className="text-xs text-red-500">{errors.time[0]}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <select
                            id="status"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Open' | 'In Progress' | 'Closed' })}
                            required
                            disabled={readOnly}
                        >
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Closed">Closed</option>
                        </select>
                        {errors.status && <p className="text-xs text-red-500">{errors.status[0]}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            rows={4}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Enter task progress details..."
                            required
                            disabled={readOnly}
                        />
                        {errors.description && <p className="text-xs text-red-500">{errors.description[0]}</p>}
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={onHide}>
                            Close
                        </Button>
                        {!readOnly && (
                            <Button type="submit" disabled={loading} className="bg-solarized-blue hover:bg-solarized-blue/90">
                                <Save className="mr-2 h-4 w-4" />
                                {loading ? "Saving..." : detail ? "Update" : "Save"}
                            </Button>
                        )}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
