import React, { useState, useEffect } from "react";
import { Save, CheckSquare } from "lucide-react";
import {
    salesTaskApi,
    taskSourceApi,
    taskTypeApi,
    userApi,
    leadApi,
    opportunityApi,
    prospectApi,
    User
} from "@/services/api";
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
// import SearchableSelect from "@/components/SearchableSelect";
import { showAlert } from "@/lib/sweetalert";

interface SalesTaskModalProps {
    show: boolean;
    onHide: () => void;
    onSave: () => void;
    taskId?: number;
    readOnly?: boolean;
}

const TASK_SOURCE_LEAD = 1;
const TASK_SOURCE_PROSPECT = 2;
const TASK_SOURCE_OPPORTUNITY = 3;

export default function SalesTaskModal({ show, onHide, onSave, taskId, readOnly = false }: SalesTaskModalProps) {
    const [formData, setFormData] = useState({
        task_source_id: "",
        source_id: "",
        task_type_id: "",
        sales_assign_id: "",
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        description: "",
        status: "Open",
    });

    const [sources, setSources] = useState<any[]>([]);
    const [types, setTypes] = useState<any[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [sourceEntities, setSourceEntities] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string[]>>({});

    useEffect(() => {
        if (show) {
            loadOptions();
            if (taskId) {
                loadSalesTask(taskId);
            } else {
                setFormData({
                    task_source_id: "",
                    source_id: "",
                    task_type_id: "",
                    sales_assign_id: "",
                    date: new Date().toISOString().split('T')[0],
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                    description: "",
                    status: "Open",
                });
                setSourceEntities([]);
                setErrors({});
            }
        }
    }, [show, taskId]);

    useEffect(() => {
        if (formData.task_source_id) {
            loadSourceEntities(Number(formData.task_source_id));
        } else {
            setSourceEntities([]);
        }
    }, [formData.task_source_id]);

    const loadOptions = async () => {
        try {
            const [sourcesData, typesData, usersData] = await Promise.all([
                taskSourceApi.list(),
                taskTypeApi.list(),
                userApi.list({ per_page: 500 }),
            ]);
            setSources(sourcesData);
            setTypes(typesData);
            setUsers(usersData);
        } catch (error) {
            console.error("Failed to load options:", error);
        }
    };

    const loadSourceEntities = async (taskSourceId: number) => {
        try {
            let entities: any[] = [];
            switch (taskSourceId) {
                case TASK_SOURCE_LEAD: {
                    const result = await leadApi.list({ per_page: 500 });
                    const resData = (result as any).data || result;
                    const leadsData = resData.data || resData;
                    entities = (Array.isArray(leadsData) ? leadsData : []).map((l: any) => ({
                        id: l.id,
                        label: `${l.first_name || ''} ${l.last_name || ''}`.trim() || `Lead #${l.id}`,
                    }));
                    break;
                }
                case TASK_SOURCE_PROSPECT: {
                    const result = await prospectApi.list({ per_page: 500 });
                    const resData = (result as any).data || result;
                    const prospectsData = resData.data || resData;
                    entities = (Array.isArray(prospectsData) ? prospectsData : []).map((p: any) => ({
                        id: p.id,
                        label: p.company_name || p.name || `Prospect #${p.id}`,
                    }));
                    break;
                }
                case TASK_SOURCE_OPPORTUNITY: {
                    const result = await opportunityApi.list({ per_page: 500 });
                    const resData = (result as any).data || result;
                    const oppsData = resData.data || resData;
                    entities = (Array.isArray(oppsData) ? oppsData : []).map((o: any) => {
                        let name = o.party_name || o.company_name || o.naming_series || `Opp #${o.id}`;
                        return { id: o.id, label: name };
                    });
                    break;
                }
            }

            setSourceEntities(entities);
        } catch (error) {
            console.error("Failed to load source entities:", error);
            setSourceEntities([]);
        }
    };

    const loadSalesTask = async (id: number) => {
        try {
            const data = await salesTaskApi.get(id);
            const detail = data.details && data.details.length > 0 ? data.details[0] : null;

            setFormData({
                task_source_id: data.task_source_id.toString(),
                source_id: data.source_id ? data.source_id.toString() : "",
                task_type_id: data.task_type_id.toString(),
                sales_assign_id: data.sales_assign_id ? data.sales_assign_id.toString() : "",
                date: detail?.date || new Date().toISOString().split('T')[0],
                time: detail?.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                description: detail?.description || "",
                status: detail?.status || "Open",
            });
        } catch (error) {
            console.error("Failed to load sales task:", error);
            onHide();
        }
    };

    const handleTaskSourceChange = (value: string) => {
        setFormData({ ...formData, task_source_id: value, source_id: "" });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        try {
            const dataToSave = {
                task_source_id: Number(formData.task_source_id),
                source_id: formData.source_id ? Number(formData.source_id) : null,
                task_type_id: Number(formData.task_type_id),
                sales_assign_id: formData.sales_assign_id ? Number(formData.sales_assign_id) : null,
                date: formData.date,
                time: formData.time,
                description: formData.description,
                status: formData.status,
            };

            if (taskId) {
                await salesTaskApi.update(taskId, dataToSave);
                showAlert('success', 'Updated!', 'Sales task updated successfully', 2000);
            } else {
                await salesTaskApi.create(dataToSave);
                showAlert('success', 'Created!', 'Sales task created successfully', 2000);
            }
            onSave();
            onHide();
        } catch (error: any) {
            if (error.response?.data?.errors) {
                // ...
                setErrors(error.response.data.errors);
            }
            console.error("Failed to save sales task:", error);
        } finally {
            setLoading(false);
        }
    };

    const getSourceLabel = (): string => {
        const taskSourceId = Number(formData.task_source_id);
        switch (taskSourceId) {
            case TASK_SOURCE_LEAD: return "Lead";
            case TASK_SOURCE_PROSPECT: return "Prospect";
            case TASK_SOURCE_OPPORTUNITY: return "Opportunity";
            default: return "Entity";
        }
    };

    return (
        <Dialog open={show} onOpenChange={onHide}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckSquare className="h-5 w-5 text-solarized-blue" />
                        {readOnly ? "Sales Task Details" : taskId ? "Edit Sales Task" : "New Sales Task"}
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    {readOnly ? (
                        <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                            <div className="space-y-1">
                                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Task Source</Label>
                                <p className="font-medium text-sm">
                                    {sources.find(s => s.id === Number(formData.task_source_id))?.name || "-"}
                                </p>
                            </div>

                            {formData.task_source_id && (
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">{getSourceLabel()}</Label>
                                    <p className="font-medium text-sm">
                                        {sourceEntities.find(e => e.id === Number(formData.source_id))?.label || "-"}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-1">
                                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Task Type</Label>
                                <p className="font-medium text-sm">
                                    {types.find(t => t.id === Number(formData.task_type_id))?.name || "-"}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Assigned User</Label>
                                <p className="font-medium text-sm">
                                    {users.find(u => u.id === Number(formData.sales_assign_id))?.name || "Not Assigned"}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Date</Label>
                                <p className="font-medium text-sm">{formData.date || "-"}</p>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Time</Label>
                                <p className="font-medium text-sm">{formData.time || "-"}</p>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Status</Label>
                                <div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${formData.status === 'Closed' ? 'bg-green-100 text-green-700' :
                                        formData.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                            'bg-orange-100 text-orange-700'
                                        }`}>
                                        {formData.status}
                                    </span>
                                </div>
                            </div>

                            <div className="col-span-2 space-y-1">
                                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Description</Label>
                                <p className="text-sm border rounded-md p-3 bg-muted/30 whitespace-pre-wrap">
                                    {formData.description || "No description provided."}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="task_source_id">Task Source</Label>
                                    <select
                                        id="task_source_id"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={formData.task_source_id}
                                        onChange={(e) => handleTaskSourceChange(e.target.value)}
                                        required
                                    >
                                        <option value="">Select Source</option>
                                        {sources.map((source) => (
                                            <option key={source.id} value={source.id}>
                                                {source.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.task_source_id && <p className="text-xs text-red-500">{errors.task_source_id[0]}</p>}
                                </div>

                                {formData.task_source_id && (
                                    <div className="space-y-2">
                                        <Label htmlFor="source_id">{getSourceLabel()}</Label>
                                        <select
                                            id="source_id"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={formData.source_id}
                                            onChange={(e) => setFormData({ ...formData, source_id: e.target.value })}
                                            required
                                        >
                                            <option value="">Select {getSourceLabel()}</option>
                                            {sourceEntities.map((entity) => (
                                                <option key={entity.id} value={entity.id}>
                                                    {entity.label}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.source_id && <p className="text-xs text-red-500">{errors.source_id[0]}</p>}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="task_type_id">Task Type</Label>
                                    <select
                                        id="task_type_id"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={formData.task_type_id}
                                        onChange={(e) => setFormData({ ...formData, task_type_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Type</option>
                                        {types.map((type) => (
                                            <option key={type.id} value={type.id}>
                                                {type.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.task_type_id && <p className="text-xs text-red-500">{errors.task_type_id[0]}</p>}
                                </div>


                                <div className="space-y-2">
                                    <Label htmlFor="sales_assign_id">Assigned User</Label>
                                    <select
                                        id="sales_assign_id"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={formData.sales_assign_id}
                                        onChange={(e) => setFormData({ ...formData, sales_assign_id: e.target.value })}
                                    >
                                        <option value="">Select User (Optional)</option>
                                        {users.map((user) => (
                                            <option key={user.id} value={user.id}>
                                                {user.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.sales_assign_id && <p className="text-xs text-red-500">{errors.sales_assign_id[0]}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="date">Date</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        required
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
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    required
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
                                />
                                {errors.description && <p className="text-xs text-red-500">{errors.description[0]}</p>}
                            </div>

                            <DialogFooter className="pt-6">
                                <Button type="button" variant="outline" onClick={onHide}>
                                    Close
                                </Button>
                                <Button type="submit" disabled={loading} className="bg-solarized-blue hover:bg-solarized-blue/90">
                                    <Save className="mr-2 h-4 w-4" />
                                    {loading ? "Saving..." : taskId ? "Update" : "Save"}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </div>

                {readOnly && (
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onHide}>
                            Close
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
