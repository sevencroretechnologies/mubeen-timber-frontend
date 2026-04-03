import { useState, useEffect, useCallback } from 'react';
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
    Users,
    FolderKanban,
    Edit,
    Trash2,
    Loader2,
    Package,
    Calculator,
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

interface Product {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
}

interface Estimation {
    id: number;
    product_id: number;
    customer_id: number;
    project_id: number | null;
    estimation_type: number;
    length: number | null;
    breadth: number | null;
    height: number | null;
    thickness: number | null;
    quantity: number | null;
    cft: number;
    cost_per_cft: number | null;
    labor_charges: number | null;
    total_amount: number;
}

export default function CustomerProjects() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [expandedProject, setExpandedProject] = useState<number | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
    const [estimations, setEstimations] = useState<Estimation[]>([]);

    const [isLoadingCustomer, setIsLoadingCustomer] = useState(true);
    const [isLoadingProjects, setIsLoadingProjects] = useState(true);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
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

    // Product Modal
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isEditingProduct, setIsEditingProduct] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isSavingProduct, setIsSavingProduct] = useState(false);
    const [isCreatingNewProduct, setIsCreatingNewProduct] = useState(true);
    const [selectedExistingProductId, setSelectedExistingProductId] = useState('');
    const [allCustomerProducts, setAllCustomerProducts] = useState<Product[]>([]);
    const [productFormData, setProductFormData] = useState({
        name: '',
        description: '',
    });

    // Estimation Modal
    const [isEstimationModalOpen, setIsEstimationModalOpen] = useState(false);
    const [isSavingEstimation, setIsSavingEstimation] = useState(false);
    const [estimationFormData, setEstimationFormData] = useState({
        estimation_type: '1',
        length: '',
        breadth: '',
        height: '',
        thickness: '',
        quantity: '1',
        cost_per_cft: '',
        labor_charges: '',
    });
    const [currentProductId, setCurrentProductId] = useState<number | null>(null);

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
            const response = await projectApi.list({ customer_id: id, per_page: 100 });
            const data = response?.data?.data || response?.data || response || [];
            setProjects(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch projects:', error);
            setProjects([]);
        } finally {
            setIsLoadingProjects(false);
        }
    }, [id]);

    const fetchProducts = useCallback(async (projectId: number) => {
        setIsLoadingProducts(true);
        try {
            // Fetch all products - no longer filtered by project_id
            const response = await crmProductService.getAll({ per_page: 100 });
            const data = response?.data?.data?.data || response?.data?.data || response?.data || [];
            const allProducts = Array.isArray(data) ? data : [];

            // Filter to show only products that have estimations for this project
            // This maintains the UI behavior of showing "project products"
            const projectEstimationProducts = estimations
                .filter(e => e.project_id === projectId)
                .map(e => e.product_id);
            const uniqueProductIds = [...new Set(projectEstimationProducts)];

            const projectProducts = allProducts.filter(p =>
                uniqueProductIds.includes(p.id)
            );

            setProducts(projectProducts);
        } catch (error) {
            console.error('Failed to fetch products:', error);
            setProducts([]);
        } finally {
            setIsLoadingProducts(false);
        }
    }, [estimations]);

    const fetchEstimations = useCallback(async (productId: number) => {
        setIsLoadingEstimations(true);
        try {
            const response = await estimationsApi.list({ product_id: productId, per_page: 100 });
            const data = response?.data?.data || response?.data || response || [];
            
            // Merge new estimations with existing ones, replacing only the ones for this product
            setEstimations(prev => {
                const otherEstimations = prev.filter(e => e.product_id !== productId);
                return [...otherEstimations, ...(Array.isArray(data) ? data : [])];
            });
        } catch (error) {
            console.error('Failed to fetch estimations:', error);
            // On error, we keep the previous state rather than clearing it all
        } finally {
            setIsLoadingEstimations(false);
        }
    }, []);

    const fetchAllCustomerProducts = useCallback(async () => {
        try {
            // Fetch all products - no longer filtered by customer_id
            const response = await crmProductService.getAll({ per_page: 100 });
            const data = response?.data?.data?.data || response?.data?.data || response?.data || [];
            setAllCustomerProducts(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch products:', error);
            setAllCustomerProducts([]);
        }
    }, []);

    useEffect(() => {
        fetchCustomer();
        fetchProjects();
    }, [fetchCustomer, fetchProjects]);

    // Toggle project expansion
    const handleToggleProject = async (projectId: number) => {
        if (expandedProject === projectId) {
            setExpandedProject(null);
            setExpandedProduct(null);
            // We keep products and estimations in state for persistence
        } else {
            setExpandedProject(projectId);
            setExpandedProduct(null);
            await fetchProducts(projectId);
        }
    };

    // Toggle product expansion (show estimations)
    const handleToggleProduct = async (productId: number) => {
        if (expandedProduct === productId) {
            setExpandedProduct(null);
            // We keep estimations in state for persistence
        } else {
            setExpandedProduct(productId);
            await fetchEstimations(productId);
        }
    };

    // Project Handlers
    const handleOpenAddProjectModal = () => {
        setIsEditingProject(false);
        setEditingProject(null);
        setProjectFormData({ name: '', description: '' });
        setIsProjectModalOpen(true);
    };

    const handleOpenEditProjectModal = (project: Project, e: React.MouseEvent) => {
        e.stopPropagation();
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

    const handleDeleteProject = async (projectId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const result = await showConfirmDialog('Delete Project', 'Are you sure? This will also delete all products and estimations.');
        if (!result.isConfirmed) return;
        try {
            await projectApi.delete(projectId);
            showAlert('success', 'Deleted!', 'Project deleted successfully', 2000);
            if (expandedProject === projectId) {
                setExpandedProject(null);
                setProducts([]);
                setEstimations([]);
            }
            fetchProjects();
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete project'));
        }
    };

    // Product Handlers
    const handleOpenAddProductModal = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditingProduct(false);
        setEditingProduct(null);
        setIsCreatingNewProduct(true);
        setSelectedExistingProductId('');
        setProductFormData({ name: '', description: '' });
        await fetchAllCustomerProducts();
        setIsProductModalOpen(true);
    };

    const handleOpenEditProductModal = (product: Product, e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditingProduct(true);
        setEditingProduct(product);
        setIsCreatingNewProduct(true);
        setSelectedExistingProductId('');
        setProductFormData({
            name: product.name,
            description: product.description || '',
        });
        setIsProductModalOpen(true);
    };

    const handleCloseProductModal = () => {
        setIsProductModalOpen(false);
        setEditingProduct(null);
        setIsCreatingNewProduct(true);
        setSelectedExistingProductId('');
        setProductFormData({ name: '', description: '' });
    };

    const handleSaveProduct = async () => {
        setIsSavingProduct(true);
        try {
            // If editing existing product
            if (isEditingProduct && editingProduct) {
                const payload = {
                    name: productFormData.name.trim(),
                    description: productFormData.description.trim() || null,
                };
                await crmProductService.update(editingProduct.id, payload);
                showAlert('success', 'Updated!', 'Product updated successfully', 2000);
                handleCloseProductModal();
                if (expandedProject) fetchProducts(expandedProject);
            }
            // If creating/selecting new product
            else {
                if (isCreatingNewProduct) {
                    if (!productFormData.name.trim()) {
                        showAlert('error', 'Validation', 'Product name is required');
                        setIsSavingProduct(false);
                        return;
                    }
                    const payload = {
                        name: productFormData.name.trim(),
                        description: productFormData.description.trim() || null,
                    };
                    await crmProductService.create(payload);
                    showAlert('success', 'Created!', 'Product created successfully', 2000);
                }
                // If selecting existing product, just close modal - product is already available
                handleCloseProductModal();
                if (expandedProject) fetchProducts(expandedProject);
            }
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to save product'));
        } finally {
            setIsSavingProduct(false);
        }
    };

    const handleDeleteProduct = async (productId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const result = await showConfirmDialog('Delete Product', 'Are you sure? This will also delete all estimations.');
        if (!result.isConfirmed) return;
        try {
            await crmProductService.delete(productId);
            showAlert('success', 'Deleted!', 'Product deleted successfully', 2000);
            if (expandedProduct === productId) {
                setExpandedProduct(null);
                setEstimations([]);
            }
            if (expandedProject) fetchProducts(expandedProject);
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete product'));
        }
    };

    // Estimation Handlers
    const calculateCft = () => {
        const l = Number(estimationFormData.length) || 1;
        const b = Number(estimationFormData.breadth) || 1;
        const h = Number(estimationFormData.height) || 1;
        const t = Number(estimationFormData.thickness) || 1;
        const q = Number(estimationFormData.quantity) || 1;

        const type = Number(estimationFormData.estimation_type);
        let cftPerUnit = 0;

        if (type === 1) cftPerUnit = (l * b * h) / 144;
        else if (type === 2) cftPerUnit = l * b * h;
        else if (type === 3) cftPerUnit = (l * b * t) / 12;
        else if (type === 4) cftPerUnit = l * b * t;
        else cftPerUnit = (l * b * h) / 144;

        return cftPerUnit * q;
    };

    const calculateTotal = () => {
        const cft = calculateCft();
        const cost = Number(estimationFormData.cost_per_cft) || 0;
        const labor = Number(estimationFormData.labor_charges) || 0;
        return (cft * cost) + labor;
    };

    const handleOpenAddEstimationModal = (productId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentProductId(productId);
        setEstimationFormData({
            estimation_type: '1',
            length: '',
            breadth: '',
            height: '',
            thickness: '',
            quantity: '1',
            cost_per_cft: '',
            labor_charges: '',
        });
        setIsEstimationModalOpen(true);
    };

    const handleCloseEstimationModal = () => {
        setIsEstimationModalOpen(false);
        setCurrentProductId(null);
        setEstimationFormData({
            estimation_type: '1',
            length: '',
            breadth: '',
            height: '',
            thickness: '',
            quantity: '1',
            cost_per_cft: '',
            labor_charges: '',
        });
    };

    const handleSaveEstimation = async () => {
        if (!currentProductId || !expandedProject) return;

        setIsSavingEstimation(true);
        try {
            const payload = {
                customer_id: Number(id),
                project_id: expandedProject,
                product_id: currentProductId,
                estimation_type: Number(estimationFormData.estimation_type),
                length: estimationFormData.length ? Number(estimationFormData.length) : null,
                breadth: estimationFormData.breadth ? Number(estimationFormData.breadth) : null,
                height: estimationFormData.height ? Number(estimationFormData.height) : null,
                thickness: estimationFormData.thickness ? Number(estimationFormData.thickness) : null,
                quantity: estimationFormData.quantity ? Number(estimationFormData.quantity) : null,
                cft: calculateCft(),
                cost_per_cft: estimationFormData.cost_per_cft ? Number(estimationFormData.cost_per_cft) : null,
                labor_charges: estimationFormData.labor_charges ? Number(estimationFormData.labor_charges) : null,
                total_amount: calculateTotal(),
            };

            await estimationsApi.create(payload);
            showAlert('success', 'Created!', 'Estimation added successfully', 2000);
            handleCloseEstimationModal();
            fetchEstimations(currentProductId);
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to save estimation'));
        } finally {
            setIsSavingEstimation(false);
        }
    };

    const handleDeleteEstimation = async (estimationId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const result = await showConfirmDialog('Delete Estimation', 'Are you sure?');
        if (!result.isConfirmed) return;
        try {
            await estimationsApi.delete(estimationId);
            showAlert('success', 'Deleted!', 'Estimation deleted successfully', 2000);
            if (currentProductId) fetchEstimations(currentProductId);
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to delete estimation'));
        }
    };

    // Helper functions
    const getEstimationTypeLabel = (type: number) => {
        const types = { 1: 'Inches', 2: 'Feet', 3: 'Thickness (In)', 4: 'Thickness (Ft)' };
        return types[type as keyof typeof types] || 'Unknown';
    };

    const getProductTotal = (productId: number): number => {
        if (!Array.isArray(estimations)) return 0;
        return estimations
            .filter(e => e.product_id === productId)
            .reduce((sum, e) => sum + Number(e.total_amount || 0), 0);
    };

    const getProjectTotal = (projectId: number): number => {
        if (!Array.isArray(estimations)) return 0;
        return estimations.reduce((sum, e) => (e.project_id === projectId ? sum + Number(e.total_amount || 0) : sum), 0);
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
                    <Button variant="outline" size="icon" onClick={() => navigate('/crm/customers')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-solarized-base02">Customer Projects & Estimations</h1>
                        <p className="text-muted-foreground">{customer?.name}</p>
                    </div>
                </div>
                <Button onClick={handleOpenAddProjectModal} className="bg-solarized-blue">
                    <Plus className="mr-2 h-4 w-4" /> Add Project
                </Button>
            </div>

            {/* Customer Details */}
            {customer && (
                <Card className="border-l-4 border-l-solarized-blue">
                    <CardContent className="pt-6">
                        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                            {customer.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{customer.email}</div>}
                            {customer.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{customer.phone}</div>}
                            {customer.territory_name && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{customer.territory_name}</div>}
                            {customer.industry_name && <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />{customer.industry_name}</div>}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Projects List with Expandable Products and Estimations */}
            <Card>
                <CardContent className="p-0">
                    {isLoadingProjects ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : projects.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <FolderKanban className="mx-auto h-12 w-12 mb-4 opacity-20" />
                            <p>No projects yet. Click "Add Project" to create one.</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {projects.map((project, pIndex) => {
                                // Products are now global - show products that have estimations for this project
                                const projectProducts = expandedProject === project.id ? products : [];
                                const isProjectExpanded = expandedProject === project.id;
                                const projectTotal = getProjectTotal(project.id);

                                return (
                                    <div key={project.id} className="border-b last:border-b-0">
                                        {/* Project Row */}
                                        <div
                                            className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-accent/50 ${isProjectExpanded ? 'bg-accent/30' : ''}`}
                                            onClick={() => handleToggleProject(project.id)}
                                        >
                                            <span className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold shrink-0">
                                                {pIndex + 1}
                                            </span>
                                            <span className="shrink-0">{isProjectExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}</span>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-base">{project.name}</h3>
                                                {/* {project.description && <p className="text-sm text-muted-foreground truncate">{project.description}</p>} */}
                                                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                                    {/* <span>Created: {new Date(project.created_at).toLocaleDateString()}</span> */}
                                                    <span>Products: {projectProducts.length}</span>
                                                    {projectTotal > 0 && <span className="text-green-600 font-medium">Total: ₹{projectTotal.toFixed(2)}</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                            <Button size="sm" variant="outline" onClick={handleOpenAddProductModal}><Plus className="h-4 w-4 mr-1" />Add Product</Button>
                                                <Button variant="ghost" size="icon" onClick={(e) => handleOpenEditProjectModal(project, e)}><Edit className="h-4 w-4 text-blue-600" /></Button>
                                                <Button variant="ghost" size="icon" onClick={(e) => handleDeleteProject(project.id, e)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                                            </div>
                                        </div>

                                        {/* Products Section (Expanded) */}
                                        {isProjectExpanded && (
                                            <div className="border-t bg-muted/30">
                                                <div className="flex items-center justify-between px-4 py-2 bg-muted/50">
                                                    <span className="text-sm font-medium flex items-center gap-2"><Package className="h-4 w-4 text-blue-600" /> Products</span>
                                                    {/* <Button size="sm" variant="outline" onClick={handleOpenAddProductModal}><Plus className="h-4 w-4 mr-1" />Add Product</Button> */}
                                                </div>

                                                {isLoadingProducts ? (
                                                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                                                ) : projectProducts.length === 0 ? (
                                                    <div className="text-center py-8 text-muted-foreground text-sm">No products. Add a product to get started.</div>
                                                ) : (
                                                    <div className="divide-y divide-border/50">
                                                        {projectProducts.map((product, prodIndex) => {
                                                            const isProductExpanded = expandedProduct === product.id;
                                                            const productEstimations = estimations.filter(e => e.product_id === product.id);
                                                            // const productTotal = getProductTotal(product.id);

                                                            return (
                                                                <div key={product.id}>
                                                                    {/* Product Row */}
                                                                    <div
                                                                        className={`flex items-center gap-4 p-3 pl-12 cursor-pointer hover:bg-accent/50 ${isProductExpanded ? 'bg-accent/20' : ''}`}
                                                                        onClick={() => handleToggleProduct(product.id)}
                                                                    >
                                                                        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold shrink-0">
                                                                            {prodIndex + 1}
                                                                        </span>
                                                                        <span className="shrink-0">{isProductExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
                                                                        <div className="flex-1">
                                                                            <h4 className="font-medium text-sm">{product.name}</h4>
                                                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                                                <span>{productEstimations.length} estimation{productEstimations.length !== 1 ? 's' : ''}</span>
                                                                                {/* {productTotal > 0 && <span className="text-green-600 font-medium">Total: ₹{productTotal.toFixed(2)}</span>} */}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-1 shrink-0">
                                                                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleOpenAddEstimationModal(product.id, e); }}><Calculator className="h-3 w-3 mr-1" />Add Estimation</Button>
                                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => handleOpenEditProductModal(product, e)}><Edit className="h-3 w-3 text-blue-600" /></Button>
                                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => handleDeleteProduct(product.id, e)}><Trash2 className="h-3 w-3 text-red-600" /></Button>
                                                                        </div>
                                                                    </div>

                                                                    {/* Estimations Section (Expanded) */}
                                                                    {isProductExpanded && (
                                                                        <div className="border-t bg-muted/20">
                                                                            <div className="flex items-center justify-between px-4 py-2 bg-muted/50">
                                                                                <span className="text-sm font-medium flex items-center gap-2"><Calculator className="h-4 w-4 text-orange-600" /> Estimations</span>
                                                                                {/* <Button size="sm" variant="outline" onClick={(e) => handleOpenAddEstimationModal(product.id, e)}><Plus className="h-3 w-3 mr-1" />Add More</Button> */}
                                                                            </div>

                                                                            {isLoadingEstimations ? (
                                                                                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
                                                                            ) : productEstimations.length === 0 ? (
                                                                                <div className="text-center py-6 text-muted-foreground text-xs">No estimations yet. Click "Add Estimation" to create one.</div>
                                                                            ) : (
                                                                                    <div className="overflow-x-auto bg-background border rounded-lg m-4 shadow-sm">
                                                                                        <table className="w-full text-sm border-collapse border-slate-200">
                                                                                            <thead>
                                                                                                <tr className="bg-slate-50">
                                                                                                    <th className="py-3 px-4 text-left font-bold text-slate-700 uppercase text-xs tracking-wider border border-slate-200 w-12">#</th>
                                                                                                    <th className="py-3 px-4 text-left font-bold text-slate-700 uppercase text-xs tracking-wider border border-slate-200">Product</th>
                                                                                                    <th className="py-3 px-4 text-left font-bold text-slate-700 uppercase text-xs tracking-wider border border-slate-200">Type</th>
                                                                                                    <th className="py-3 px-4 text-left font-bold text-slate-700 uppercase text-xs tracking-wider border border-slate-200">Dimensions</th>
                                                                                                    <th className="py-3 px-4 text-right font-bold text-slate-700 uppercase text-xs tracking-wider border border-slate-200">CFT</th>
                                                                                                    <th className="py-3 px-4 text-right font-bold text-slate-700 uppercase text-xs tracking-wider border border-slate-200">Qty</th>
                                                                                                    <th className="py-3 px-4 text-right font-bold text-slate-700 uppercase text-xs tracking-wider border border-slate-200">Rate (₹)</th>
                                                                                                    <th className="py-3 px-4 text-right font-bold text-slate-700 uppercase text-xs tracking-wider border border-slate-200">Labor (₹)</th>
                                                                                                    <th className="py-3 px-4 text-right font-bold text-slate-700 uppercase text-xs tracking-wider border border-slate-200">Total (₹)</th>
                                                                                                    <th className="py-3 px-4 text-center font-bold text-slate-700 uppercase text-xs tracking-wider border border-slate-200 w-16">Action</th>
                                                                                                </tr>
                                                                                            </thead>
                                                                                            <tbody className="divide-y divide-slate-100">
                                                                                                {productEstimations.map((estimation, eIndex) => (
                                                                                                    <tr key={estimation.id} className="hover:bg-slate-50 transition-colors group">
                                                                                                        <td className="py-3 px-4 text-slate-400 font-medium border border-slate-100">{eIndex + 1}</td>
                                                                                                        <td className="py-3.5 px-4 border border-slate-100 font-bold text-slate-700 text-sm">{product.name}</td>
                                                                                                        <td className="py-3.5 px-4 border border-slate-100">
                                                                                                            <div className="font-bold text-slate-800 uppercase text-xs tracking-tight">
                                                                                                                {getEstimationTypeLabel(estimation.estimation_type)}
                                                                                                            </div>
                                                                                                        </td>
                                                                                                        <td className="py-3.5 px-4 border border-slate-100">
                                                                                                            <span className="text-xs font-bold text-blue-700 bg-blue-50/50 px-2 py-0.5 rounded border border-blue-100/50">
                                                                                                                {(estimation.estimation_type === 1 || estimation.estimation_type === 2) 
                                                                                                                    ? `${estimation.length || 0}×${estimation.breadth || 0}×${estimation.height || 0}`
                                                                                                                    : `${estimation.length || 0}×${estimation.breadth || 0}×${estimation.thickness || 0}`
                                                                                                                }
                                                                                                            </span>
                                                                                                        </td>
                                                                                                        <td className="py-3.5 px-4 text-right font-semibold text-slate-700 text-sm border border-slate-100">{Number(estimation.cft || 0).toFixed(2)}</td>
                                                                                                        <td className="py-3.5 px-4 text-right font-semibold text-slate-700 text-sm border border-slate-100">{estimation.quantity || 1}</td>
                                                                                                        <td className="py-3.5 px-4 text-right font-semibold text-slate-600 text-sm border border-slate-100">
                                                                                                            {Number(estimation.cost_per_cft || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                                                                        </td>
                                                                                                        <td className="py-3.5 px-4 text-right font-semibold text-blue-600 text-sm border border-slate-100">
                                                                                                            {Number(estimation.labor_charges || 0) > 0 
                                                                                                                ? Number(estimation.labor_charges).toLocaleString('en-IN', { minimumFractionDigits: 2 })
                                                                                                                : <span className="text-slate-300">-</span>
                                                                                                            }
                                                                                                        </td>
                                                                                                        <td className="py-3.5 px-4 text-right font-black text-emerald-600 text-base border border-slate-100">
                                                                                                            ₹{Number(estimation.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                                                                        </td>
                                                                                                        <td className="py-3.5 px-4 text-center border border-slate-100">
                                                                                                            <Button 
                                                                                                                variant="ghost" 
                                                                                                                size="icon" 
                                                                                                                className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                                                                                                                onClick={(e) => handleDeleteEstimation(estimation.id, e)}
                                                                                                            >
                                                                                                                <Trash2 className="h-4 w-4" />
                                                                                                            </Button>
                                                                                                        </td>
                                                                                                    </tr>
                                                                                                ))}
                                                                                            </tbody>
                                                                                            <tfoot>
                                                                                                <tr className="bg-emerald-50/10 font-bold border-t-2 border-emerald-100">
                                                                                                    <td colSpan={8} className="py-5 px-4 text-right font-bold text-slate-600 uppercase text-xs tracking-widest border border-slate-200">
                                                                                                        Product Total Summary:
                                                                                                    </td>
                                                                                                    <td className="py-4 px-4 text-right font-black text-emerald-600 text-base border border-slate-200 bg-emerald-50/30">
                                                                                                        ₹{Number(productEstimations.reduce((sum, e) => sum + Number(e.total_amount || 0), 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                                                                    </td>
                                                                                                    <td className="border border-slate-200"></td>
                                                                                                </tr>
                                                                                                <tr>
                                                                                                    {/* <td colSpan={10} className="p-0 border border-slate-200">
                                                                                                        <Button 
                                                                                                            variant="ghost" 
                                                                                                            className="w-full h-10 text-blue-600 hover:bg-blue-50/50 hover:text-blue-700 font-bold text-xs uppercase tracking-widest rounded-none"
                                                                                                            onClick={(e) => { e.stopPropagation(); handleOpenAddEstimationModal(product.id, e); }}
                                                                                                        >
                                                                                                            <Plus className="h-4 w-4 mr-2" /> Add New Line
                                                                                                        </Button>
                                                                                                    </td> */}
                                                                                                </tr>
                                                                                            </tfoot>
                                                                                        </table>
                                                                                    </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Project Modal */}
            <Dialog open={isProjectModalOpen} onOpenChange={setIsProjectModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{isEditingProject ? 'Edit Project' : 'Add New Project'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Project Name <span className="text-red-500">*</span></Label>
                            <Input placeholder="Enter project name" value={projectFormData.name} onChange={(e) => setProjectFormData(p => ({ ...p, name: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea placeholder="Enter description (optional)" value={projectFormData.description} onChange={(e) => setProjectFormData(p => ({ ...p, description: e.target.value }))} rows={3} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseProjectModal} disabled={isSavingProject}>Cancel</Button>
                        <Button onClick={handleSaveProject} disabled={isSavingProject} className="bg-solarized-blue">{isSavingProject && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isEditingProject ? 'Update' : 'Create'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Product Modal */}
            <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{isEditingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {!isEditingProduct ? (
                            <div className="space-y-2">
                                <Label>Product <span className="text-red-500">*</span></Label>
                                {isCreatingNewProduct ? (
                                    <div className="space-y-3">
                                        <Input placeholder="e.g., Door, Window, Table" value={productFormData.name} onChange={(e) => setProductFormData(p => ({ ...p, name: e.target.value }))} autoFocus />
                                        <Button type="button" variant="link" className="p-0 h-auto text-sm" onClick={() => setIsCreatingNewProduct(false)}>← Select existing product</Button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <select
                                            value={selectedExistingProductId}
                                            onChange={(e) => {
                                                if (e.target.value === 'new') {
                                                    setIsCreatingNewProduct(true);
                                                    setSelectedExistingProductId('');
                                                    setProductFormData({ name: '', description: '' });
                                                } else {
                                                    setSelectedExistingProductId(e.target.value);
                                                }
                                            }}
                                            className="w-full border rounded-md px-3 py-2 text-sm"
                                        >
                                            <option value="">Select a product</option>
                                            {allCustomerProducts.map((p) => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                            <option value="new">+ Create new product</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <Label>Product Name <span className="text-red-500">*</span></Label>
                                    <Input placeholder="e.g., Door, Window, Table" value={productFormData.name} onChange={(e) => setProductFormData(p => ({ ...p, name: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea placeholder="Enter description (optional)" value={productFormData.description} onChange={(e) => setProductFormData(p => ({ ...p, description: e.target.value }))} rows={3} />
                                </div>
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseProductModal} disabled={isSavingProduct}>Cancel</Button>
                        <Button onClick={handleSaveProduct} disabled={isSavingProduct || (!isEditingProduct && !isCreatingNewProduct && !selectedExistingProductId)} className="bg-solarized-blue">
                            {isSavingProduct && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditingProduct ? 'Update' : (isCreatingNewProduct ? 'Create & Add' : 'Add to Project')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Estimation Modal */}
            <Dialog open={isEstimationModalOpen} onOpenChange={setIsEstimationModalOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Add New Estimation</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-6 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
                        <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl transition-all duration-300">
                            <div className="h-12 w-12 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-blue-600 shrink-0">
                                <Package className="h-6 w-6" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Target Product</div>
                                <div className="text-base font-black text-slate-800 uppercase tracking-tight truncate">
                                    {products.find(p => p.id === currentProductId)?.name || 'Select Product'}
                                </div>
                            </div>
                            {/* <div className="ml-auto">
                                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full uppercase tracking-wider">Locked</span>
                            </div> */}
                        </div>
                        <div className="space-y-2">
                            <Label>Estimation Formula</Label>
                            <select value={estimationFormData.estimation_type} onChange={(e) => setEstimationFormData(p => ({ ...p, estimation_type: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm">
                                <option value="1">CFT - Inches (L×B×H/144)</option>
                                <option value="2">CFT - Feet (L×B×H)</option>
                                <option value="3">CFT - Thickness in Inches (L×B×T/12)</option>
                                <option value="4">CFT - Thickness in Feet (L×B×T)</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                            <div className="space-y-1"><Label className="text-xs">Length</Label><Input type="number" step="0.01" placeholder="0" value={estimationFormData.length} onChange={(e) => setEstimationFormData(p => ({ ...p, length: e.target.value }))} /></div>
                            <div className="space-y-1"><Label className="text-xs">Breadth</Label><Input type="number" step="0.01" placeholder="0" value={estimationFormData.breadth} onChange={(e) => setEstimationFormData(p => ({ ...p, breadth: e.target.value }))} /></div>
                            {(estimationFormData.estimation_type === '1' || estimationFormData.estimation_type === '2') && (
                                <div className="space-y-1"><Label className="text-xs">Height</Label><Input type="number" step="0.01" placeholder="0" value={estimationFormData.height} onChange={(e) => setEstimationFormData(p => ({ ...p, height: e.target.value }))} /></div>
                            )}
                            {(estimationFormData.estimation_type === '3' || estimationFormData.estimation_type === '4') && (
                                <div className="space-y-1"><Label className="text-xs">Thickness</Label><Input type="number" step="0.01" placeholder="0" value={estimationFormData.thickness} onChange={(e) => setEstimationFormData(p => ({ ...p, thickness: e.target.value }))} /></div>
                            )}
                            <div className="space-y-1"><Label className="text-xs">Quantity</Label><Input type="number" placeholder="1" value={estimationFormData.quantity} onChange={(e) => setEstimationFormData(p => ({ ...p, quantity: e.target.value }))} /></div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg flex justify-between"><span className="text-sm font-medium">Volume (CFT):</span><span className="text-lg font-bold text-blue-600">{calculateCft().toFixed(2)}</span></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2"><Label>Material Cost per CFT (₹)</Label><Input type="number" step="0.01" placeholder="0" value={estimationFormData.cost_per_cft} onChange={(e) => setEstimationFormData(p => ({ ...p, cost_per_cft: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>Labor Charges (₹)</Label><Input type="number" step="0.01" placeholder="0" value={estimationFormData.labor_charges} onChange={(e) => setEstimationFormData(p => ({ ...p, labor_charges: e.target.value }))} /></div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg flex justify-between"><span className="text-sm font-medium">Total Amount:</span><span className="text-2xl font-bold text-green-600">₹{calculateTotal().toFixed(2)}</span></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseEstimationModal} disabled={isSavingEstimation}>Cancel</Button>
                        <Button onClick={handleSaveEstimation} disabled={isSavingEstimation} className="bg-solarized-blue">{isSavingEstimation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
