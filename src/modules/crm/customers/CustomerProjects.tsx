import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { customerApi, projectApi, crmProductService, estimationsApi } from '@/services/api';
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
    CheckCircle,
    XCircle,
    Clock,
    Search,
    X,
} from 'lucide-react';

interface Project {
    id: number;
    customer_id: number | null;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

interface Product {
    id: number;
    name: string;
    description: string | null;
}

interface Estimation {
    id: number;
    customer_id: number;
    product_id: number;
    project_id?: number;
    description: string | null;
    status: 'draft' | 'pending' | 'approved' | 'rejected' | 'partially_collected' | 'collected' | 'cancelled';
    created_at: string;
    updated_at: string;
    product?: Product;
    customer?: any;
}

export default function CustomerProjects() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const productDropdownRef = useRef<HTMLDivElement>(null);

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [estimations, setEstimations] = useState<Estimation[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [expandedProjectId, setExpandedProjectId] = useState<number | null>(null);

    const [isLoadingCustomer, setIsLoadingCustomer] = useState(true);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const [isLoadingEstimations, setIsLoadingEstimations] = useState(false);

    // Project Modal
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isEditingProject, setIsEditingProject] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [isSavingProject, setIsSavingProject] = useState(false);
    const [projectFormData, setProjectFormData] = useState({
        name: '',
        description: '',
    });

    // Estimation Modal
    const [isEstimationModalOpen, setIsEstimationModalOpen] = useState(false);
    const [isSavingEstimation, setIsSavingEstimation] = useState(false);
    const [estimationFormData, setEstimationFormData] = useState({
        product_id: '',
        description: '',
        status: 'draft',
    });

    // Product Modal (Quick Create)
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isSavingProduct, setIsSavingProduct] = useState(false);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
    const [productFormData, setProductFormData] = useState({
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

    const fetchEstimations = useCallback(async (customerId: number) => {
        setIsLoadingEstimations(true);
        try {
            const response = await estimationsApi.list({ customer_id: customerId });
            const data = (response as any).data || response;
            setEstimations(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch estimations:', error);
            setEstimations([]);
        } finally {
            setIsLoadingEstimations(false);
        }
    }, []);

    const fetchProducts = useCallback(async () => {
        try {
            const response = await crmProductService.getAll();
            // axios response -> data -> data -> data (products array)
            // Structure: { data: { data: { data: [...], current_page: 1, ... }, pagination: {...} } }
            let productsData = response;
            if (response && typeof response === 'object') {
                // axios wraps response in .data
                const apiData = (response as any).data;
                if (apiData && typeof apiData === 'object') {
                    // API response has .data containing pagination
                    const paginatedData = apiData.data;
                    if (Array.isArray(paginatedData)) {
                        productsData = paginatedData;
                    } else if (paginatedData && typeof paginatedData === 'object' && Array.isArray(paginatedData.data)) {
                        productsData = paginatedData.data;
                    }
                }
            }
            setProducts(Array.isArray(productsData) ? productsData : []);
            console.log('Products loaded:', productsData);
        } catch (error) {
            console.error('Failed to fetch products:', error);
            setProducts([]);
        }
    }, []);

    useEffect(() => {
        fetchCustomer();
        fetchProjects();
    }, [fetchCustomer, fetchProjects]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
                setIsProductDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
            fetchEstimations(Number(id));
        }
    };

    // Estimation Handlers
    const handleOpenAddEstimationModal = async () => {
        await fetchProducts();
        setEstimationFormData({
            product_id: '',
            description: '',
            status: 'draft',
        });
        setIsEstimationModalOpen(true);
    };

    const handleCloseEstimationModal = () => {
        setIsEstimationModalOpen(false);
        setIsProductDropdownOpen(false);
        setProductSearchTerm('');
        setEstimationFormData({
            product_id: '',
            description: '',
            status: 'draft',
        });
    };

    const handleSaveEstimation = async () => {
        if (!estimationFormData.product_id) {
            showAlert('error', 'Validation', 'Product is required');
            return;
        }

        setIsSavingEstimation(true);
        try {
            const payload = {
                customer_id: Number(id),
                product_id: Number(estimationFormData.product_id),
                description: estimationFormData.description.trim() || null,
                status: estimationFormData.status,
            };

            await estimationsApi.create(payload);
            showAlert('success', 'Created!', 'Estimation created successfully', 2000);
            handleCloseEstimationModal();
            fetchEstimations(Number(id));
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to save estimation'));
        } finally {
            setIsSavingEstimation(false);
        }
    };

    const handleDeleteEstimation = async (estimationId: number) => {
        const result = await showConfirmDialog('Delete Estimation', 'Are you sure you want to delete this estimation?');
        if (!result.isConfirmed) return;
        try {
            await estimationsApi.delete(estimationId);
            showAlert('success', 'Deleted!', 'Estimation deleted successfully', 2000);
            fetchEstimations(Number(id));
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete estimation'));
        }
    };

    const handleApproveEstimation = async (estimationId: number) => {
        try {
            await estimationsApi.approve(estimationId);
            showAlert('success', 'Approved!', 'Estimation approved successfully', 2000);
            fetchEstimations(Number(id));
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to approve estimation'));
        }
    };

    const handleCancelEstimation = async (estimationId: number) => {
        try {
            await estimationsApi.cancel(estimationId);
            showAlert('success', 'Cancelled!', 'Estimation cancelled successfully', 2000);
            fetchEstimations(Number(id));
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to cancel estimation'));
        }
    };

    // Product Handlers (Quick Create)
    const handleOpenAddProductModal = () => {
        setProductFormData({ name: '', description: '' });
        setIsProductModalOpen(true);
    };

    const handleCloseProductModal = () => {
        setIsProductModalOpen(false);
        setProductFormData({ name: '', description: '' });
    };

    const handleSaveProduct = async () => {
        if (!productFormData.name.trim()) {
            showAlert('error', 'Validation', 'Product name is required');
            return;
        }

        setIsSavingProduct(true);
        try {
            const payload = {
                name: productFormData.name.trim(),
                description: productFormData.description.trim() || null,
            };

            await crmProductService.create(payload);
            showAlert('success', 'Created!', 'Product created successfully', 2000);
            handleCloseProductModal();
            fetchProducts();
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to create product'));
        } finally {
            setIsSavingProduct(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
            draft: { color: 'bg-gray-100 text-gray-700', icon: Clock, label: 'Draft' },
            pending: { color: 'bg-blue-100 text-blue-700', icon: Clock, label: 'Pending' },
            approved: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Approved' },
            rejected: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Rejected' },
            partially_collected: { color: 'bg-amber-100 text-amber-700', icon: Clock, label: 'Partially Collected' },
            collected: { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, label: 'Collected' },
            cancelled: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Cancelled' },
        };

        const config = statusConfig[status] || statusConfig.draft;
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                <Icon className="h-3 w-3" />
                {config.label}
            </span>
        );
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
                                                <span>{estimations.filter((e: any) => e.project_id === project.id).length} Estimates</span>
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

                                    {/* Expanded Project Details - Estimations */}
                                    {expandedProjectId === project.id && (
                                        <div className="border-t border-amber-100 bg-amber-50/30 p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-semibold text-amber-800">Estimates</h4>
                                                <Button
                                                    onClick={handleOpenAddEstimationModal}
                                                    className="bg-amber-500 hover:bg-amber-600 text-white text-sm"
                                                >
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Add Estimate
                                                </Button>
                                            </div>
                                            {isLoadingEstimations ? (
                                                <div className="text-center py-4">
                                                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-amber-500" />
                                                </div>
                                            ) : estimations.length === 0 ? (
                                                <div className="text-center py-4 text-gray-500 text-sm">
                                                    No estimates yet
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {estimations.map((estimation) => (
                                                        <div
                                                            key={estimation.id}
                                                            className="flex items-center justify-between bg-white p-3 rounded-lg border border-amber-100"
                                                        >
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium text-amber-900">
                                                                        {estimation.product?.name || 'Unknown Product'}
                                                                    </span>
                                                                    {getStatusBadge(estimation.status)}
                                                                </div>
                                                                {estimation.description && (
                                                                    <p className="text-xs text-gray-500 mt-1">{estimation.description}</p>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {estimation.status === 'draft' || estimation.status === 'pending' ? (
                                                                    <>
                                                                        <button
                                                                            onClick={() => handleApproveEstimation(estimation.id)}
                                                                            className="p-2 hover:bg-green-50 rounded-full transition-colors"
                                                                            title="Approve"
                                                                        >
                                                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleCancelEstimation(estimation.id)}
                                                                            className="p-2 hover:bg-red-50 rounded-full transition-colors"
                                                                            title="Cancel"
                                                                        >
                                                                            <XCircle className="h-4 w-4 text-red-500" />
                                                                        </button>
                                                                    </>
                                                                ) : null}
                                                                <button
                                                                    onClick={() => handleDeleteEstimation(estimation.id)}
                                                                    className="p-2 hover:bg-red-50 rounded-full transition-colors"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
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

            {/* Estimation Modal */}
            <Dialog open={isEstimationModalOpen} onOpenChange={setIsEstimationModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Add Estimate</DialogTitle>
                        <p className="text-sm text-gray-500">Create an estimate for a product</p>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Product <span className="text-red-500">*</span></Label>
                            <div className="flex gap-2">
                                <div className="flex-1 relative" ref={productDropdownRef}>
                                    {/* Searchable Product Dropdown */}
                                    <div className="relative">
                                        <div
                                            className="w-full border rounded-md px-3 py-2 text-sm bg-white cursor-pointer flex items-center justify-between"
                                            onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                                        >
                                            <span className={estimationFormData.product_id ? 'text-gray-900' : 'text-gray-400'}>
                                                {estimationFormData.product_id
                                                    ? products.find(p => p.id === Number(estimationFormData.product_id))?.name || 'Selected Product'
                                                    : 'Select a product'
                                                }
                                            </span>
                                            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isProductDropdownOpen ? 'rotate-180' : ''}`} />
                                        </div>

                                        {/* Dropdown */}
                                        {isProductDropdownOpen && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                                                {/* Search Input */}
                                                <div className="p-2 border-b sticky top-0 bg-white">
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            placeholder="Search products..."
                                                            value={productSearchTerm}
                                                            onChange={(e) => setProductSearchTerm(e.target.value)}
                                                            className="w-full pl-9 pr-8 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                        {productSearchTerm && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setProductSearchTerm('');
                                                                }}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2"
                                                            >
                                                                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Product List */}
                                                <div className="max-h-48 overflow-y-auto">
                                                    {products.filter(p =>
                                                        p.name.toLowerCase().includes(productSearchTerm.toLowerCase())
                                                    ).length === 0 ? (
                                                        <div className="p-3 text-sm text-gray-500 text-center">
                                                            No products found
                                                        </div>
                                                    ) : (
                                                        products
                                                            .filter(p =>
                                                                p.name.toLowerCase().includes(productSearchTerm.toLowerCase())
                                                            )
                                                            .map((product) => (
                                                                <div
                                                                    key={product.id}
                                                                    className="px-3 py-2 text-sm hover:bg-amber-50 cursor-pointer flex items-center justify-between group"
                                                                    onClick={() => {
                                                                        setEstimationFormData(p => ({ ...p, product_id: String(product.id) }));
                                                                        setIsProductDropdownOpen(false);
                                                                        setProductSearchTerm('');
                                                                    }}
                                                                >
                                                                    <span>{product.name}</span>
                                                                    {estimationFormData.product_id === String(product.id) && (
                                                                        <CheckCircle className="h-4 w-4 text-amber-600" />
                                                                    )}
                                                                </div>
                                                            ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleOpenAddProductModal}
                                    className="whitespace-nowrap"
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    New
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                placeholder="Brief description of the estimate..."
                                value={estimationFormData.description}
                                onChange={(e) => setEstimationFormData(p => ({ ...p, description: e.target.value }))}
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Status</Label>
                            <select
                                value={estimationFormData.status}
                                onChange={(e) => setEstimationFormData(p => ({ ...p, status: e.target.value }))}
                                className="w-full border rounded-md px-3 py-2 text-sm"
                            >
                                <option value="draft">Draft</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseEstimationModal} disabled={isSavingEstimation}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveEstimation}
                            disabled={isSavingEstimation}
                            className="bg-amber-500 hover:bg-amber-600 text-white"
                        >
                            {isSavingEstimation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Estimate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Product Modal (Quick Create) */}
            <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Add Product</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Product Name <span className="text-red-500">*</span></Label>
                            <Input
                                placeholder="e.g., Door, Window, Table"
                                value={productFormData.name}
                                onChange={(e) => setProductFormData(p => ({ ...p, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                placeholder="Enter description (optional)"
                                value={productFormData.description}
                                onChange={(e) => setProductFormData(p => ({ ...p, description: e.target.value }))}
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseProductModal} disabled={isSavingProduct}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveProduct}
                            disabled={isSavingProduct}
                            className="bg-amber-500 hover:bg-amber-600 text-white"
                        >
                            {isSavingProduct && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
