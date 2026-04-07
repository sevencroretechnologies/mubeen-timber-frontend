import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    estimationsApi,
    crmProductService,
    customerApi,
    projectApi
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { showAlert, getErrorMessage } from '@/lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    ArrowLeft,
    Plus,
    Loader2,
    Check,
    Hammer,
    X,
    Info
} from 'lucide-react';
import {
    Command,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function CreateEstimation() {
    const navigate = useNavigate();
    const { project_id } = useParams<{ project_id: string }>();
    const { user } = useAuth();


    // UI State
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Form data
    const [formData, setFormData] = useState({
        project_id: project_id || '',
        customer_id: '',
        product_id: '',
        total_cft: '',
        transport_cost: '',
        discount: '',
        tax: '',
        notes: '',
        status: 'draft',
        description: ''
    });

    // Fetched data
    const [products, setProducts] = useState<any[]>([]);
    const [project, setProject] = useState<any>(null);
    const [customer, setCustomer] = useState<any>(null);
    const [derivedCustomerId, setDerivedCustomerId] = useState<string | null>(null);

    // Product Selection & Creation state
    const [isProductSelectionModalOpen, setIsProductSelectionModalOpen] = useState(false);
    const [isComboboxOpen, setIsComboboxOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const [isSavingProduct, setIsSavingProduct] = useState(false);
    const [newProductData, setNewProductData] = useState({
        name: '',
        description: '',
    });

    // Manual filtering for products
    const filteredProducts = useMemo(() => {
        if (!searchValue.trim()) return products;
        return products.filter(p => 
            p.name.toLowerCase().includes(searchValue.toLowerCase())
        );
    }, [products, searchValue]);

    // Synchronize search value with new product name
    useEffect(() => {
        if (!isProductSelectionModalOpen) return;
        setNewProductData(prev => ({ ...prev, name: searchValue }));
    }, [searchValue, isProductSelectionModalOpen]);

    const fetchProducts = useCallback(async () => {
        try {
            const res = await crmProductService.getAll({ per_page: 500 });
            
            const extractArray = (res: any): any[] => {
                const body = res?.data || res;
                if (Array.isArray(body)) return body;
                if (body?.data && Array.isArray(body.data)) return body.data;
                if (body?.data?.data && Array.isArray(body.data.data)) return body.data.data;
                return [];
            };

            const fetchedProducts = extractArray(res);
            setProducts(fetchedProducts);
        } catch (err) {
            console.error('Products fetch failed:', err);
        }
    }, []);

    const fetchProject = useCallback(async () => {
        if (!project_id) return;
        setIsLoading(true);
        try {
            const res = await projectApi.get(Number(project_id));
            const projectData = (res as any).data || res;
            setProject(projectData);
            
            // Auto-derive customer_id from project
            if (projectData && projectData.customer_id) {
                setDerivedCustomerId(String(projectData.customer_id));
                
                // Fetch customer details for display
                try {
                    const custRes = await customerApi.get(Number(projectData.customer_id));
                    setCustomer((custRes as any).data || custRes);
                } catch (err) {
                    console.error('Failed to fetch customer details:', err);
                }
            }
        } catch (error) {
            console.error('Failed to load project details:', error);
            showAlert('error', 'Error', 'Failed to load project details. Please go back and select a project.');
        } finally {
            setIsLoading(false);
        }
    }, [project_id]);

    useEffect(() => {
        fetchProducts();
        fetchProject();
    }, [fetchProducts, fetchProject]);

    const handleCreateProduct = async () => {
        const productName = newProductData.name || searchValue;
        if (!productName.trim()) {
            showAlert('error', 'Validation', 'Please search for or enter a product name');
            return;
        }
        setIsSavingProduct(true);
        try {
            const payload = {
                name: productName.trim(),
                description: newProductData.description.trim() || null,
            };
            const response = await crmProductService.create(payload);
            const createdProduct = (response as any).data?.data || (response as any).data || response;

            // Update local products list
            setProducts(prev => [createdProduct, ...prev]);

            // Select the newly created product
            setFormData(prev => ({ ...prev, product_id: String(createdProduct.id) }));

            setIsProductSelectionModalOpen(false);
            setNewProductData({ name: '', description: '' });
            setSearchValue('');
            showAlert('success', 'Created!', 'Product created and selected.', 2000);
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to create product'));
        } finally {
            setIsSavingProduct(false);
        }
    };

    const calculatedTotal = useMemo(() => {
        const transport = parseFloat(formData.transport_cost) || 0;
        const tax = parseFloat(formData.tax) || 0;
        const discount = parseFloat(formData.discount) || 0;
        
        // Total = Transport + Tax - Discount
        return (transport + tax) - discount;
    }, [formData.transport_cost, formData.tax, formData.discount]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.project_id) {
            showAlert('error', 'Validation', 'Project not selected. Please go back and select a project.');
            return;
        }

        if (!formData.product_id) {
            showAlert('error', 'Validation', 'Please select a product');
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                org_id: user?.org_id,
                company_id: user?.company_id,
                customer_id: Number(derivedCustomerId),
                project_id: Number(formData.project_id),
                product_id: Number(formData.product_id),
                description: formData.description.trim() || null,
                status: formData.status,
                transport_cost: parseFloat(formData.transport_cost),
                discount: parseFloat(formData.discount),
                tax: parseFloat(formData.tax),
                total_cft: parseFloat(formData.total_cft),
                notes: formData.notes.trim() || null,
            };

            await estimationsApi.create(payload);
            showAlert('success', 'Created!', 'Estimation created successfully');
            navigate(`/crm/customers/${derivedCustomerId}/projects`);
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to create estimation'));
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen  py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header with Back Button */}
                <div className="flex items-center gap-4 mb-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(-1)}
                        className="rounded-full bg-white shadow-sm hover:bg-slate-100"
                    >
                        <ArrowLeft className="h-5 w-5 text-slate-600" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 leading-tight">Create Estimation</h1>
                        <p className="text-slate-500 text-sm mt-0.5 font-medium">
                            {customer?.name} {project ? `• ${project.name}` : ''}
                        </p>
                    </div>
                </div>

                <Card className="border-slate-200 shadow-sm overflow-visible">
                    <form onSubmit={handleSubmit}>
                        <CardHeader className="border-b bg-slate-50/30 py-4">
                            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                                <Info className="h-4 w-4 text-amber-500" />
                                Add Estimate
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-8 pt-6">
                            {/* Basic Information */}
                            <div className="space-y-4">
                                <h3 className="text-[#842A1B] font-bold text-sm uppercase tracking-tight">Basic Information</h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-700 font-medium">Description <span className="text-red-500">*</span></Label>
                                        <Textarea
                                            placeholder="Brief description of the estimate..."
                                            value={formData.description}
                                            onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                                            rows={2}
                                            className="resize-none focus-visible:ring-amber-500 border-slate-200"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-700 font-medium">Status <span className="text-red-500">*</span></Label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData(p => ({ ...p, status: e.target.value }))}
                                            className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer"
                                        >
                                            <option value="draft">Draft</option>
                                            <option value="pending">Pending</option>
                                            <option value="approved">Approved</option>
                                            <option value="rejected">Rejected</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Products */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[#842A1B] font-bold text-sm uppercase tracking-tight">Products</h3>
                                    
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => setIsProductSelectionModalOpen(true)}
                                        className="h-8 bg-[#111827] hover:bg-[#1f2937] text-white text-xs font-bold transition-all"
                                    >
                                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                                        Add Product
                                    </Button>
                                </div>
                                
                                {/* Product Selection & Creation Modal */}
                                <Dialog open={isProductSelectionModalOpen} onOpenChange={setIsProductSelectionModalOpen}>
                                    <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-none shadow-2xl">
                                        <div className="bg-slate-50 border-b p-4">
                                            <DialogHeader>
                                                <DialogTitle className="text-slate-800 text-lg flex items-center gap-2">
                                                    <Hammer className="h-5 w-5 text-amber-500" />
                                                    Product Selection & Creation
                                                </DialogTitle>
                                                <div className="sr-only">
                                                    Search through existing products or provide dimensions to create a new one.
                                                </div>
                                            </DialogHeader>
                                        </div>

                                        <div className="max-h-[80vh] overflow-y-auto custom-scrollbar p-6 space-y-8">
                                            {/* Selection Section with Search */}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                                    <Label className="text-[#842A1B] font-bold text-xs uppercase tracking-wider">Search or Select Product</Label>
                                                </div>
                                                
                                                <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            aria-expanded={isComboboxOpen}
                                                            className="w-full h-11 justify-between border-slate-200 bg-white hover:border-amber-500 transition-colors shadow-sm font-normal text-slate-700"
                                                        >
                                                            {formData.product_id
                                                                ? products.find((p) => String(p.id) === formData.product_id)?.name
                                                                : "Select a product..."}
                                                            <div className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[450px] p-0 shadow-lg border-slate-200 rounded-xl overflow-hidden" align="start">
                                                        <Command shouldFilter={false} className="bg-white rounded-xl">
                                                            <CommandInput 
                                                                placeholder="Search or create product..." 
                                                                value={searchValue}
                                                                onValueChange={setSearchValue}
                                                                className="h-11 border-b px-4 focus:ring-0"
                                                            />
                                                            <CommandList className="max-h-64 overflow-y-auto custom-scrollbar">
                                                                {!products.length && !searchValue && (
                                                                    <div className="p-4 text-center text-sm text-slate-400 italic">
                                                                        No products available.
                                                                    </div>
                                                                )}
                                                                
                                                                {searchValue && filteredProducts.length === 0 ? (
                                                                    <div className="p-6 text-center">
                                                                        <p className="text-sm text-slate-500 font-medium">No product found for</p>
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            onClick={handleCreateProduct}
                                                                            className="mt-3 bg-amber-500 hover:bg-amber-600 text-white font-bold h-8 text-xs"
                                                                        >
                                                                            <Plus className="h-3.5 w-3.5 mr-1" />
                                                                            Create
                                                                        </Button>
                                                                    </div>
                                                                ) : !searchValue && filteredProducts.length === 0 ? (
                                                                    <div className="p-4 text-center text-sm text-slate-400">
                                                                        Start typing to search products
                                                                    </div>
                                                                ) : null}

                                                                {filteredProducts.length > 0 && (
                                                                    <CommandGroup heading="Existing Products" className="px-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest py-2">
                                                                        {filteredProducts.map((product) => (
                                                                            <CommandItem
                                                                                key={product.id}
                                                                                value={product.name}
                                                                                onSelect={() => {
                                                                                    setFormData(prev => ({ ...prev, product_id: String(product.id) }));
                                                                                    setSearchValue('');
                                                                                    setIsComboboxOpen(false);
                                                                                    setIsProductSelectionModalOpen(false);
                                                                                }}
                                                                                className="cursor-pointer hover:bg-slate-50 rounded-md py-3 px-4 mb-0.5 transition-colors flex items-center justify-between"
                                                                            >
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className={cn(
                                                                                        "h-4 w-4 rounded-full border-2 flex items-center justify-center",
                                                                                        formData.product_id === String(product.id) ? "bg-emerald-500 border-emerald-500" : "border-slate-200"
                                                                                    )}>
                                                                                        {formData.product_id === String(product.id) && <Check className="h-2.5 w-2.5 text-white" />}
                                                                                    </div>
                                                                                    <span className="font-medium text-slate-700">{product.name}</span>
                                                                                </div>
                                                                            </CommandItem>
                                                                        ))}
                                                                    </CommandGroup>
                                                                )}
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>

                                            {/* Visual Divider */}
                                            <div className="relative">
                                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                                    <div className="w-full border-t border-slate-200"></div>
                                                </div>
                                                <div className="relative flex justify-center text-xs uppercase">
                                                    <span className="bg-white px-4 font-bold text-slate-400 tracking-widest text-[10px]">Add Description to Create New</span>
                                                </div>
                                            </div>

                                            {/* Simplified Creation Section */}
                                            <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-5 space-y-5">
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-slate-700 font-bold text-xs flex items-center gap-2">
                                                            Product Description (Optional)
                                                        </Label>
                                                        <Textarea
                                                            placeholder="Add dimensions, material details, or special instructions..."
                                                            value={newProductData.description}
                                                            onChange={(e) => setNewProductData(p => ({ ...p, description: e.target.value }))}
                                                            rows={3}
                                                            className="resize-none border-slate-200 bg-white focus-visible:ring-amber-500 shadow-sm"
                                                        />
                                                    </div>
                                                </div>

                                                <Button
                                                    type="button"
                                                    onClick={handleCreateProduct}
                                                    disabled={isSavingProduct || !searchValue.trim()}
                                                    className="w-full h-11 bg-[#111827] hover:bg-[#1f2937] text-white font-bold shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                                                >
                                                    {isSavingProduct ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Processing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Plus className="h-4 w-4 mr-2" />
                                                            Create
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="bg-slate-100 border-t p-3 flex justify-end">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="text-slate-500 font-bold text-xs hover:bg-slate-200"
                                                onClick={() => setIsProductSelectionModalOpen(false)}
                                            >
                                                Close
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                                
                                {/* Selected Product display area */}
                                <div className="space-y-2">
                                    {formData.product_id ? (
                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-300">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-white p-2.5 rounded-md border border-slate-100 shadow-sm">
                                                    <Hammer className="h-4.5 w-4.5 text-amber-600" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm leading-tight">
                                                        {products.find(p => String(p.id) === formData.product_id)?.name}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors" 
                                                onClick={() => setFormData(p => ({ ...p, product_id: '' }))}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {/* Additional Charges */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h3 className="text-[#842A1B] font-bold text-sm uppercase tracking-tight">Additional Charges</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-slate-700 text-xs font-semibold">Transport & Handling (₹)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            className="h-9 focus-visible:ring-amber-500 border-slate-200"
                                            value={formData.transport_cost}
                                            onChange={(e) => setFormData(p => ({ ...p, transport_cost: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-slate-700 text-xs font-semibold">Discount (₹)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            className="h-9 focus-visible:ring-amber-500 border-slate-200"
                                            value={formData.discount}
                                            onChange={(e) => setFormData(p => ({ ...p, discount: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-slate-700 text-xs font-semibold">Approximate Tax (₹)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            className="h-9 focus-visible:ring-amber-500 border-slate-200"
                                            value={formData.tax}
                                            onChange={(e) => setFormData(p => ({ ...p, tax: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-slate-700 text-xs font-semibold">Overall Total CFT</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0"
                                            className="h-9 focus-visible:ring-amber-500 border-slate-200"
                                            value={formData.total_cft}
                                            onChange={(e) => setFormData(p => ({ ...p, total_cft: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                {/* Estimated Total Horizontal Bar */}
                                <div className="bg-[#FFFCE4] border border-[#FBEF8E] rounded-lg p-4 flex justify-between items-center mt-6 transition-all animate-in fade-in zoom-in-95 duration-300">
                                    <span className="text-[#8B5E34] font-bold text-sm">Estimated Total</span>
                                    <span className="text-[#8B5E34] font-black text-xl">₹{calculatedTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Image Attachments */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h3 className="text-[#842A1B] font-bold text-sm uppercase tracking-tight">Image Attachments</h3>
                                <div className="space-y-3">
                                    <Label className="text-slate-700 font-medium flex items-center gap-2">
                                        <span className="bg-amber-100 p-1 rounded">📸</span>
                                        Upload Images
                                    </Label>
                                    <div className="flex items-center justify-center w-full border-2 border-dashed border-slate-200 rounded-lg p-6 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-not-allowed">
                                        <div className="text-center">
                                            <p className="text-slate-500 text-sm">No image files selected</p>
                                            <p className="text-slate-400 text-xs mt-1">Image uploads coming soon...</p>
                                        </div>
                                    </div>
                                    <p className="text-[#8B5E34] text-xs font-medium">Only image files are accepted</p>
                                </div>
                            </div>

                            {/* Additional Notes */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h3 className="text-[#842A1B] font-bold text-sm uppercase tracking-tight">Additional Notes</h3>
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-medium">Notes / Description</Label>
                                    <Textarea
                                        placeholder="Add any additional notes or special conditions..."
                                        value={formData.notes}
                                        onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                                        rows={3}
                                        className="resize-none focus-visible:ring-amber-500 border-slate-200"
                                    />
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="flex justify-end gap-3 pt-6 pb-6 px-6 border-t bg-slate-50/50">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(-1)}
                                className="px-6 h-9 border-slate-300 hover:bg-slate-100 transition-all font-medium text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSaving}
                                className="px-8 h-9 bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-sm transition-all text-xs"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : 'Create Estimate'}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}
