import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { customerApi, projectApi } from '@/services/api';
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
} from 'lucide-react';

interface Project {
    id: number;
    customer_id: number | null;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export default function CustomerProjects() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [expandedProjectId, setExpandedProjectId] = useState<number | null>(null);

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

    const handleToggleProject = (projectId: number) => {
        if (expandedProjectId === projectId) {
            setExpandedProjectId(null);
        } else {
            setExpandedProjectId(projectId);
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

                                    {/* Expanded Project Details - Move to Estimates Navigation */}
                                    {expandedProjectId === project.id && (
                                        <div className="border-t border-amber-100 bg-amber-50/30 p-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-semibold text-amber-800">Estimates</h4>
                                                 <Button
                                                    onClick={() => navigate(`/crm/estimations/create?project_id=${project.id}`)}
                                                    className="bg-amber-500 hover:bg-amber-600 text-white text-sm"
                                                >
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Add Estimate
                                                </Button>
                                            </div>
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
