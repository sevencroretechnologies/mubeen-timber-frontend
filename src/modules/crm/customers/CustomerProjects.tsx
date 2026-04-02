import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { customerApi, projectApi } from '@/services/api';
import type { Customer } from '@/types';
import { showAlert, showConfirmDialog, getErrorMessage } from '@/lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
    Building2,
    Mail,
    Phone,
    MapPin,
    Users,
    FolderKanban,
    Edit,
    Trash2,
    Loader2,
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
    const [isLoadingCustomer, setIsLoadingCustomer] = useState(true);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
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
            const data = response?.data || response;
            setProjects(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch projects:', error);
            setProjects([]);
        } finally {
            setIsLoadingProjects(false);
        }
    }, [id]);

    useEffect(() => {
        fetchCustomer();
        fetchProjects();
    }, [fetchCustomer, fetchProjects]);

    const handleOpenAddModal = () => {
        setIsEditing(false);
        setEditingProject(null);
        setFormData({ name: '', description: '' });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (project: Project) => {
        setIsEditing(true);
        setEditingProject(project);
        setFormData({
            name: project.name,
            description: project.description || '',
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProject(null);
        setFormData({ name: '', description: '' });
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            showAlert('error', 'Validation', 'Project name is required');
            return;
        }
        setIsSaving(true);
        try {
            const payload = {
                customer_id: Number(id),
                name: formData.name.trim(),
                description: formData.description.trim() || null,
            };

            if (isEditing && editingProject) {
                await projectApi.update(editingProject.id, payload);
                showAlert('success', 'Updated!', 'Project updated successfully', 2000);
            } else {
                await projectApi.create(payload);
                showAlert('success', 'Created!', 'Project created successfully', 2000);
            }
            handleCloseModal();
            fetchProjects();
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to save project'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (projectId: number) => {
        const result = await showConfirmDialog('Delete Project', 'Are you sure you want to delete this project?');
        if (!result.isConfirmed) return;
        try {
            await projectApi.delete(projectId);
            showAlert('success', 'Deleted!', 'Project deleted successfully', 2000);
            fetchProjects();
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete project'));
        }
    };

    if (isLoadingCustomer) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-solarized-blue" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate('/crm/customers')}
                        className="shrink-0"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-solarized-base02">
                            Customer Projects
                        </h1>
                        <p className="text-muted-foreground">
                            Manage projects for {customer?.name || 'this customer'}
                        </p>
                    </div>
                </div>
                <Button onClick={handleOpenAddModal} className="bg-solarized-blue hover:bg-solarized-blue/90">
                    <Plus className="mr-2 h-4 w-4" /> Add Project
                </Button>
            </div>

            {/* Customer Details Card */}
            {customer && (
                <Card className="border-l-4 border-l-solarized-blue">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Building2 className="h-5 w-5 text-solarized-blue" />
                            {customer.name}
                        </CardTitle>
                        <CardDescription>
                            {customer.customer_type || 'Customer'}
                            {customer.customer_group_name ? ` • ${customer.customer_group_name}` : ''}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            {customer.email && (
                                <div className="flex items-center gap-2 text-sm">
                                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span className="truncate">{customer.email}</span>
                                </div>
                            )}
                            {customer.phone && (
                                <div className="flex items-center gap-2 text-sm">
                                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span>{customer.phone}</span>
                                </div>
                            )}
                            {customer.territory_name && (
                                <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span>{customer.territory_name}</span>
                                </div>
                            )}
                            {customer.industry_name && (
                                <div className="flex items-center gap-2 text-sm">
                                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span>{customer.industry_name}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Projects List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <FolderKanban className="h-5 w-5 text-emerald-600" />
                        Projects
                        <span className="ml-1 text-sm font-normal text-muted-foreground">
                            ({projects.length})
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoadingProjects ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <FolderKanban className="mx-auto h-12 w-12 mb-4 opacity-20" />
                            <p className="text-base font-medium">No projects yet</p>
                            <p className="text-sm mt-1">Click "Add Project" to create the first project for this customer.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {projects.map((project, index) => (
                                <div
                                    key={project.id}
                                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                >
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold shrink-0">
                                            {index + 1}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-semibold text-sm truncate">
                                                {project.name}
                                            </h3>
                                            {project.description && (
                                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                    {project.description}
                                                </p>
                                            )}
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Created: {new Date(project.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 ml-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleOpenEditModal(project)}
                                            title="Edit"
                                        >
                                            <Edit className="h-4 w-4 text-blue-600" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(project.id)}
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4 text-red-600" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Project Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FolderKanban className="h-5 w-5 text-emerald-600" />
                            {isEditing ? 'Edit Project' : 'Add New Project'}
                        </DialogTitle>
                        <DialogDescription>
                            {isEditing
                                ? 'Update the project details below.'
                                : `Create a new project for ${customer?.name || 'this customer'}.`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="project-name">
                                Project Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="project-name"
                                placeholder="Enter project name"
                                value={formData.name}
                                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="project-description">Description</Label>
                            <Textarea
                                id="project-description"
                                placeholder="Enter project description (optional)"
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                                }
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseModal} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-solarized-blue hover:bg-solarized-blue/90"
                        >
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditing ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
