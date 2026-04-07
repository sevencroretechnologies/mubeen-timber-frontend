import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { customerApi, projectApi, estimationsApi } from '@/services/api';
import type { Customer } from '@/types';
import { showAlert, showConfirmDialog, getErrorMessage } from '@/lib/sweetalert';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    ArrowLeft,
    Plus,
    Mail,
    Phone,
    MapPin,
    Edit,
    Trash2,
    Loader2,
    ChevronDown,
    ChevronRight,
    FileText,
    IndianRupee,
} from 'lucide-react';

interface Project {
    id: number;
    customer_id: number | null;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

interface Estimation {
    id: number;
    project_id: number;
    customer_id: number;
    description: string | null;
    additional_notes: string | null;
    status: string;
    created_at: string;
    products?: Array<{
        id: number;
        product_id: number | null;
        length: number;
        breadth: number;
        height: number;
        thickness: number;
        cft: number;
        quantity: number;
        cost_per_cft: number;
        total_amount: number;
    }>;
    otherCharge?: {
        labour_charges: number;
        transport_and_handling: number;
        discount: number;
        approximate_tax: number;
    };
}

export default function CustomerProjects() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [expandedProjectId, setExpandedProjectId] = useState<number | null>(null);
    const [estimations, setEstimations] = useState<Record<number, Estimation[]>>({});
    const [isLoadingEstimations, setIsLoadingEstimations] = useState<Record<number, boolean>>({});

    const [isLoadingCustomer, setIsLoadingCustomer] = useState(true);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);

    // Project Modal
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isEditingProject, setIsEditingProject] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [isSavingProject, setIsSavingProject] = useState(false);
    const [projectFormData, setProjectFormData] = useState({
        name: '',
        description: '',
    });

    const fetchCustomer = useCallback(async () => {
        if (!id) return;
        setIsLoadingCustomer(true);
        try {
            const response = await customerApi.get(Number(id));
            const data = (response as any).data || response;
            setCustomer(data);
        } catch (error) {
            console.error('Failed to fetch customer:', error);
            showAlert('error', 'Error', 'Failed to load customer details');
        } finally {
            setIsLoadingCustomer(false);
        }
    }, [id]);

    const fetchProjects = useCallback(async () => {
        if (!id) return;
        setIsLoadingProjects(true);
        try {
            const response = await projectApi.list({ customer_id: id });
            // Handle paginated response: { data: { data: [...] } }
            let projectsData = response;
            if (response && typeof response === 'object' && (response as any).data) {
                if (Array.isArray((response as any).data)) {
                    projectsData = (response as any).data;
                } else if ((response as any).data.data && Array.isArray((response as any).data.data)) {
                    projectsData = (response as any).data.data;
                }
            }
            setProjects(Array.isArray(projectsData) ? projectsData : []);
        } catch (error) {
            console.error('Failed to fetch projects:', error);
            showAlert('error', 'Error', 'Failed to load projects');
        } finally {
            setIsLoadingProjects(false);
        }
    }, [id]);



    useEffect(() => {
        fetchCustomer();
        fetchProjects();
    }, [fetchCustomer, fetchProjects]);


    const handleBack = () => {
        navigate('/crm/customers');
    };

    // Project Handlers
    const handleOpenAddProjectModal = () => {
        setIsEditingProject(false);
        setEditingProject(null);
        setProjectFormData({ name: '', description: '' });
        setIsProjectModalOpen(true);
    };

    const handleOpenEditProjectModal = (project: Project) => {
        setIsEditingProject(true);
        setEditingProject(project);
        setProjectFormData({
            name: project.name,
            description: project.description || '',
        });
        setIsProjectModalOpen(true);
    };

    const handleCloseProjectModal = () => {
        setIsProjectModalOpen(false);
        setEditingProject(null);
        setProjectFormData({ name: '', description: '' });
    };

    const handleSaveProject = async () => {
        if (!projectFormData.name.trim()) {
            showAlert('error', 'Validation', 'Project name is required');
            return;
        }
        setIsSavingProject(true);
        try {
            const payload = {
                customer_id: Number(id),
                name: projectFormData.name.trim(),
                description: projectFormData.description.trim() || null,
            };

            if (isEditingProject && editingProject) {
                await projectApi.update(editingProject.id, payload);
                showAlert('success', 'Updated!', 'Project updated successfully', 2000);
            } else {
                await projectApi.create(payload);
                showAlert('success', 'Created!', 'Project created successfully', 2000);
            }
            handleCloseProjectModal();
            fetchProjects();
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to save project'));
        } finally {
            setIsSavingProject(false);
        }
    };

    const handleDeleteProject = async (projectId: number) => {
        const result = await showConfirmDialog('Delete Project', 'Are you sure? This will also delete all estimates.');
        if (!result.isConfirmed) return;
        try {
            await projectApi.delete(projectId);
            showAlert('success', 'Deleted!', 'Project deleted successfully', 2000);
            if (expandedProjectId === projectId) {
                setExpandedProjectId(null);
            }
            fetchProjects();
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete project'));
        }
    };

    const handleToggleProject = async (projectId: number) => {
        if (expandedProjectId === projectId) {
            setExpandedProjectId(null);
        } else {
            setExpandedProjectId(projectId);
            // Fetch estimations for this project if not already loaded
            if (!estimations[projectId]) {
                await fetchEstimations(projectId);
            }
        }
    };

    const fetchEstimations = async (projectId: number) => {
        setIsLoadingEstimations(prev => ({ ...prev, [projectId]: true }));
        try {
            const response = await estimationsApi.list({ project_id: projectId });
            // Handle different response formats
            let estimationsData = response;
            if (response && typeof response === 'object' && (response as any).data) {
                if (Array.isArray((response as any).data)) {
                    estimationsData = (response as any).data;
                } else if ((response as any).data.data && Array.isArray((response as any).data.data)) {
                    estimationsData = (response as any).data.data;
                }
            }
            setEstimations(prev => ({
                ...prev,
                [projectId]: Array.isArray(estimationsData) ? estimationsData : []
            }));
        } catch (error) {
            console.error('Failed to fetch estimations:', error);
            showAlert('error', 'Error', 'Failed to load estimations');
        } finally {
            setIsLoadingEstimations(prev => ({ ...prev, [projectId]: false }));
        }
    };

    const getEstimationTotal = (estimation: Estimation): number => {
        let total = 0;
        // Add products total
        if (estimation.products && Array.isArray(estimation.products)) {
            total += estimation.products.reduce((sum, p) => sum + (p.total_amount || 0), 0);
        }
        // Add charges
        if (estimation.otherCharge) {
            total += estimation.otherCharge.labour_charges || 0;
            total += estimation.otherCharge.transport_and_handling || 0;
            total += estimation.otherCharge.approximate_tax || 0;
            total -= estimation.otherCharge.discount || 0;
        }
        return total;
    };

    const getStatusColor = (status: string): string => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-700';
            case 'pending': return 'bg-yellow-100 text-yellow-700';
            case 'rejected': return 'bg-red-100 text-red-700';
            case 'cancelled': return 'bg-gray-100 text-gray-700';
            case 'collected': return 'bg-blue-100 text-blue-700';
            case 'partially_collected': return 'bg-purple-100 text-purple-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const handleDeleteEstimation = async (estimationId: number, projectId: number) => {
        const result = await showConfirmDialog('Delete Estimation', 'Are you sure you want to delete this estimation?');
        if (!result.isConfirmed) return;
        try {
            await estimationsApi.delete(estimationId);
            showAlert('success', 'Deleted!', 'Estimation deleted successfully');
            await fetchEstimations(projectId);
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete estimation'));
        }
    };



    if (isLoadingCustomer) {
        return (
            <div className="min-h-screen bg-amber-50/30 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-amber-50/30 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={handleBack}
                        className="p-2 hover:bg-amber-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-amber-700" />
                    </button>
                    <h1 className="text-2xl font-bold text-amber-900">Customer Projects</h1>
                </div>

                {/* Customer Information Card */}
                {customer && (
                    <Card className="bg-white border-amber-200 shadow-sm mb-6">
                        <CardContent className="p-6">
                            <h2 className="text-xl font-bold text-amber-900 mb-4">{customer.name}</h2>
                            <div className="flex flex-wrap gap-6 text-sm">
                                {customer.email && (
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Mail className="h-4 w-4" />
                                        <span>{customer.email}</span>
                                    </div>
                                )}
                                {customer.phone && (
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Phone className="h-4 w-4" />
                                        <span>{customer.phone}</span>
                                    </div>
                                )}
                                {(customer as any).city && (
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <MapPin className="h-4 w-4" />
                                        <span>{(customer as any).city}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Projects Section */}
                <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-amber-100">
                        <h2 className="text-lg font-bold text-amber-900">Projects</h2>
                        <Button
                            onClick={handleOpenAddProjectModal}
                            className="bg-amber-500 hover:bg-amber-600 text-white"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Project
                        </Button>
                    </div>

                    <div className="divide-y divide-amber-100">
                        {isLoadingProjects ? (
                            <div className="p-8 text-center">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-amber-500" />
                            </div>
                        ) : projects.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                No projects yet. Click "Add Project" to create one.
                            </div>
                        ) : (
                            projects.map((project) => (
                                <div key={project.id} className="border-b border-amber-100 last:border-b-0">
                                    {/* Project Header */}
                                    <div className="flex items-center justify-between p-4 hover:bg-amber-50/50 transition-colors">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-amber-900">{project.name}</h3>
                                            <p className="text-sm text-gray-500 italic">{project.description || 'Details'}</p>
                                            <div className="flex gap-4 mt-1 text-sm text-gray-500">
                                                <span>Projects Section</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleOpenEditProjectModal(project)}
                                                className="p-2 hover:bg-amber-100 rounded-full transition-colors"
                                            >
                                                <Edit className="h-4 w-4 text-gray-500" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteProject(project.id)}
                                                className="p-2 hover:bg-red-50 rounded-full transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </button>
                                            <button
                                                onClick={() => handleToggleProject(project.id)}
                                                className="p-2 hover:bg-amber-100 rounded-full transition-colors"
                                            >
                                                {expandedProjectId === project.id ? (
                                                    <ChevronDown className="h-5 w-5 text-amber-700" />
                                                ) : (
                                                    <ChevronRight className="h-5 w-5 text-amber-700" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Project Details - Estimates List */}
                                    {expandedProjectId === project.id && (
                                        <div className="border-t border-amber-100 bg-amber-50/30 p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="font-semibold text-amber-800">Estimates</h4>
                                                <Button
                                                    onClick={() => navigate(`/crm/estimations/create/${project.id}`)}
                                                    className="bg-amber-500 hover:bg-amber-600 text-white text-sm"
                                                >
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Add Estimate
                                                </Button>
                                            </div>

                                            {/* Estimations List */}
                                            {isLoadingEstimations[project.id] ? (
                                                <div className="flex items-center justify-center py-8">
                                                    <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                                                </div>
                                            ) : estimations[project.id]?.length === 0 ? (
                                                <div className="text-center py-6 text-sm text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                                                    <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                                    <p>No estimates yet. Create your first estimate!</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {estimations[project.id]?.map((estimation) => {
                                                        const total = getEstimationTotal(estimation);
                                                        return (
                                                            <div
                                                                key={estimation.id}
                                                                className="bg-white p-3 rounded-lg border border-amber-200 hover:border-amber-300 transition-colors"
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${getStatusColor(estimation.status)}`}>
                                                                        {estimation.status?.replace('_', ' ').toUpperCase()}
                                                                    </span>
                                                                    <span className="text-xs text-gray-400">
                                                                        #{estimation.id}
                                                                    </span>
                                                                    <span className="text-xs text-gray-400">
                                                                        {new Date(estimation.created_at).toLocaleDateString()}
                                                                    </span>
                                                                </div>
                                                                {estimation.description && (
                                                                    <p className="text-sm text-gray-700 truncate mb-1">
                                                                        {estimation.description}
                                                                    </p>
                                                                )}
                                                                {estimation.products && estimation.products.length > 0 && (
                                                                    <p className="text-xs text-gray-500">
                                                                        {estimation.products.length} product(s) • {estimation.products.reduce((sum, p) => sum + (p.cft || 0) * (p.quantity || 1), 0).toFixed(2)} CFT
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <div className="text-right">
                                                                    <p className="text-sm font-bold text-green-600 flex items-center gap-1">
                                                                        <IndianRupee className="h-3 w-3" />
                                                                        {total.toFixed(2)}
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={() => navigate(`/crm/estimations/${estimation.id}`)}
                                                                    className="p-1.5 hover:bg-amber-100 rounded text-amber-600"
                                                                    title="View Details"
                                                                >
                                                                    <FileText className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteEstimation(estimation.id, project.id)}
                                                                    className="p-1.5 hover:bg-red-50 rounded text-red-500"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Project Modal */}
            <Dialog open={isProjectModalOpen} onOpenChange={setIsProjectModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{isEditingProject ? 'Edit Project' : 'Add Project'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Project Name <span className="text-red-500">*</span></Label>
                            <Input
                                placeholder="Enter project name"
                                value={projectFormData.name}
                                onChange={(e) => setProjectFormData(p => ({ ...p, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                placeholder="Enter description (optional)"
                                value={projectFormData.description}
                                onChange={(e) => setProjectFormData(p => ({ ...p, description: e.target.value }))}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseProjectModal} disabled={isSavingProject}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveProject}
                            disabled={isSavingProject}
                            className="bg-amber-500 hover:bg-amber-600 text-white"
                        >
                            {isSavingProject && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditingProject ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
