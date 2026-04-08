import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  estimationsApi,
  crmProductService,
  customerApi,
  projectApi,
} from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { showAlert, getErrorMessage } from "@/lib/sweetalert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Hammer,
  Info,
  Trash2,
  Edit2,
  IndianRupee,
  ChevronDown,
  Paperclip,
  X,
} from "lucide-react";
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

interface EstimationProduct {
  tempId?: string;
  product_id?: number | null;
  length: string;
  breadth: string;
  height: string;
  thickness: string;
  cft_calculation_type: string;
  quantity: number;
  cft: number;
  rate: number;
  total: number;
}

export default function CreateEstimation() {
  const navigate = useNavigate();
  const { project_id } = useParams<{ project_id: string }>();
  const { user } = useAuth();

  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Basic Form data
  const [formData, setFormData] = useState({
    description: "",
    additional_notes: "",
    status: "draft",
  });

  // Additional Charges
  const [charges, setCharges] = useState({
    transport_handling: "",
    discount: "",
    tax: "",
    labour_charges: "",
  });

  // Products Array
  const [estimationProducts, setEstimationProducts] = useState<
    EstimationProduct[]
  >([]);

  // Fetched data
  const [products, setProducts] = useState<any[]>([]);
  const [project, setProject] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);

  // Product Selection & Creation state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProductData, setNewProductData] = useState({
    name: "",
    description: "",
  });

  // Attachments state
  const [attachments, setAttachments] = useState<Array<{
    file: File;
    preview: string;
    base64: string;
  }>>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  // Current product being edited/added
  const [currentProduct, setCurrentProduct] = useState<EstimationProduct>({
    length: "",
    breadth: "",
    height: "",
    thickness: "",
    cft_calculation_type: "1",
    quantity: 1,
    cft: 0,
    rate: 0,
    total: 0,
  });

  // Helper function to round to 2 decimal places
  const roundToTwo = (num: number) => Math.round(num * 100) / 100;

  // CFT Calculation Types
  const CFT_CALCULATION_TYPES = [
    {
      value: "1",
      label: "L × B × H ÷ 144",
      description: "Dimensions in inches",
      formula: (l: number, b: number, h: number) => (l * b * h) / 144,
    },
    {
      value: "2",
      label: "L × B × H",
      description: "Dimensions in feet",
      formula: (l: number, b: number, h: number) => l * b * h,
    },
    {
      value: "3",
      label: "L × B × T ÷ 12",
      description: "Thickness in inches",
      formula: (l: number, b: number, t: number) => (l * b * t) / 12,
    },
    {
      value: "4",
      label: "L × B × T",
      description: "Thickness in feet",
      formula: (l: number, b: number, t: number) => l * b * t,
    },
    {
      value: "5",
      label: "Manual",
      description: "Enter CFT manually",
      formula: () => 0,
    },
  ];

  // Manual filtering for products
  const filteredProducts = useMemo(() => {
    if (!searchValue.trim()) return products;
    return products.filter((p) =>
      p.name.toLowerCase().includes(searchValue.toLowerCase()),
    );
  }, [products, searchValue]);

  // Calculate CFT for current product
  const calculatedCFT = useMemo(() => {
    const type = currentProduct.cft_calculation_type;
    const l = parseFloat(currentProduct.length) || 0;
    const b = parseFloat(currentProduct.breadth) || 0;
    const h = parseFloat(currentProduct.height) || 0;
    const t = parseFloat(currentProduct.thickness) || 0;

    let cft = 0;
    if (type === "1") {
      // Type 1: in inches -> (l*b*h)/144
      cft = roundToTwo((l * b * h) / 144);
    } else if (type === "2") {
      // Type 2: in feet -> l*b*h
      cft = roundToTwo(l * b * h);
    } else if (type === "3") {
      // Type 3: thickness in inches -> (l*b*t)/12
      cft = roundToTwo((l * b * t) / 12);
    } else if (type === "4") {
      // Type 4: thickness in feet -> l*b*t
      cft = roundToTwo(l * b * t);
    }
    // Type 5: Manual - use the cft value directly
    return cft;
  }, [currentProduct]);

  // Calculate total for current product
  const calculatedProductTotal = useMemo(() => {
    const cft = calculatedCFT;
    const rate =
      typeof currentProduct.rate === "string"
        ? parseFloat(currentProduct.rate) || 0
        : currentProduct.rate;
    const quantity =
      typeof currentProduct.quantity === "string"
        ? parseInt(currentProduct.quantity) || 1
        : currentProduct.quantity;
    return roundToTwo(cft * rate * quantity);
  }, [calculatedCFT, currentProduct.rate, currentProduct.quantity]);

  // Calculate totals for all products
  const productsSummary = useMemo(() => {
    const totalCft = estimationProducts.reduce(
      (sum, p) => sum + p.cft * p.quantity,
      0,
    );
    const totalAmount = estimationProducts.reduce((sum, p) => sum + p.total, 0);
    return {
      totalCft: roundToTwo(totalCft),
      totalAmount: roundToTwo(totalAmount),
      totalItems: estimationProducts.length,
    };
  }, [estimationProducts]);

  // Calculate charges total
  const chargesTotal = useMemo(() => {
    const transport = parseFloat(charges.transport_handling) || 0;
    const tax = parseFloat(charges.tax) || 0;
    const labour = parseFloat(charges.labour_charges) || 0;
    const discount = parseFloat(charges.discount) || 0;
    return roundToTwo(transport + tax + labour - discount);
  }, [charges]);

  // Grand Total
  const grandTotal = useMemo(() => {
    return roundToTwo(productsSummary.totalAmount + chargesTotal);
  }, [productsSummary.totalAmount, chargesTotal]);

  // Fetch Functions
  const fetchCustomer = useCallback(async () => {
    if (!project_id) return;
    setIsLoading(true);
    try {
      const res = await projectApi.get(Number(project_id));
      const projectData = (res as any).data || res;
      setProject(projectData);

      if (projectData && projectData.customer_id) {
        try {
          const custRes = await customerApi.get(
            Number(projectData.customer_id),
          );
          setCustomer((custRes as any).data || custRes);
        } catch (err) {
          console.error("Failed to fetch customer details:", err);
        }
      }
    } catch (error) {
      console.error("Failed to load project details:", error);
      showAlert("error", "Error", "Failed to load project details");
    } finally {
      setIsLoading(false);
    }
  }, [project_id]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await crmProductService.getAll({ per_page: 500 });
      const extractArray = (res: any): any[] => {
        const body = res?.data || res;
        if (Array.isArray(body)) return body;
        if (body?.data && Array.isArray(body.data)) return body.data;
        if (body?.data?.data && Array.isArray(body.data.data))
          return body.data.data;
        return [];
      };
      setProducts(extractArray(res));
    } catch (err) {
      console.error("Products fetch failed:", err);
    }
  }, []);

  useEffect(() => {
    fetchCustomer();
    fetchProducts();
  }, [fetchCustomer, fetchProducts]);

  // Handlers
  const handleAddProduct = () => {
    if (!currentProduct.product_id) {
      showAlert("error", "Validation", "Please select a product");
      return;
    }
    if (
      currentProduct.cft_calculation_type === "5" &&
      currentProduct.cft <= 0
    ) {
      showAlert(
        "error",
        "Validation",
        "Please enter CFT for manual calculation type",
      );
      return;
    }

    const productToAdd: EstimationProduct = {
      ...currentProduct,
      tempId: `temp_${Date.now()}`,
      cft:
        currentProduct.cft_calculation_type === "5"
          ? typeof currentProduct.cft === "string"
            ? parseFloat(currentProduct.cft || "0")
            : currentProduct.cft
          : calculatedCFT,
      total: calculatedProductTotal,
      quantity:
        typeof currentProduct.quantity === "string"
          ? parseInt(currentProduct.quantity) || 1
          : currentProduct.quantity,
      rate:
        typeof currentProduct.rate === "string"
          ? parseFloat(currentProduct.rate) || 0
          : currentProduct.rate,
      length: currentProduct.length || "0",
      breadth: currentProduct.breadth || "0",
      height: currentProduct.height || "0",
      thickness: currentProduct.thickness || "0",
    };

    setEstimationProducts([...estimationProducts, productToAdd]);
    resetCurrentProduct();
    setIsProductModalOpen(false);
    showAlert("success", "Added!", "Product added to estimation");
  };

  const handleRemoveProduct = (tempId: string) => {
    setEstimationProducts(
      estimationProducts.filter((p) => p.tempId !== tempId),
    );
  };

  const handleEditProduct = (tempId: string) => {
    const product = estimationProducts.find((p) => p.tempId === tempId);
    if (product) {
      setCurrentProduct({ ...product });
      setIsProductModalOpen(true);
    }
  };

  const resetCurrentProduct = () => {
    setCurrentProduct({
      length: "",
      breadth: "",
      height: "",
      thickness: "",
      cft_calculation_type: "1",
      quantity: 1,
      cft: 0,
      rate: 0,
      total: 0,
    });
    setSearchValue("");
    setIsComboboxOpen(false);
  };

  const handleSelectExistingProduct = (product: any) => {
    setCurrentProduct((prev) => ({
      ...prev,
      product_id: product.id,
    }));
    setSearchValue("");
    setIsComboboxOpen(false);
    setShowNewProductForm(false);
  };

  const handleCreateProduct = async () => {
    if (!newProductData.name.trim()) {
      showAlert("error", "Validation", "Product name is required");
      return;
    }
    setIsSavingProduct(true);
    try {
      const payload = {
        name: newProductData.name.trim(),
        description: newProductData.description.trim() || null,
      };
      const response = await crmProductService.create(payload);
      const createdProduct =
        (response as any).data?.data || (response as any).data || response;

      setProducts((prev) => [createdProduct, ...prev]);

      setCurrentProduct((prev) => ({
        ...prev,
        product_id: createdProduct.id,
      }));

      setShowNewProductForm(false);
      setNewProductData({ name: "", description: "" });
      // showAlert('success', 'Created!', 'Product created and selected');
    } catch (error) {
      showAlert(
        "error",
        "Error",
        getErrorMessage(error, "Failed to create product"),
      );
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Attachment handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploadingAttachment(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file type
        if (!file.type.startsWith('image/')) {
          showAlert('error', 'Invalid File', 'Only image files are allowed');
          continue;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
          showAlert('error', 'File Too Large', 'Maximum file size is 2MB');
          continue;
        }

        // Create preview
        const preview = URL.createObjectURL(file);

        // Convert to base64
        const base64 = await fileToBase64(file);

        setAttachments(prev => [...prev, { file, preview, base64 }]);
      }
    } catch (error) {
      showAlert('error', 'Error', 'Failed to process file');
    } finally {
      setIsUploadingAttachment(false);
      // Reset input
      e.target.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => {
      const newAttachments = [...prev];
      // Revoke object URL to free memory
      URL.revokeObjectURL(newAttachments[index].preview);
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!project) {
      showAlert("error", "Validation", "Project not found");
      return;
    }

    if (estimationProducts.length === 0) {
      showAlert("error", "Validation", "Please add at least one product");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        org_id: user?.org_id,
        company_id: user?.company_id,
        customer_id: project.customer_id,
        project_id: Number(project_id),
        description: formData.description.trim() || null,
        additional_notes: formData.additional_notes.trim() || null,
        status: formData.status,
        products: estimationProducts.map((p) => ({
          product_id: p.product_id || null,
          length: parseFloat(p.length) || 0,
          breadth: parseFloat(p.breadth) || 0,
          height: parseFloat(p.height) || 0,
          thickness: parseFloat(p.thickness) || 0,
          cft_calculation_type: p.cft_calculation_type,
          quantity: p.quantity,
          cft: p.cft,
          rate: p.rate,
          total_amount: p.total,
        })),
        transport_handling: parseFloat(charges.transport_handling) || 0,
        discount: parseFloat(charges.discount) || 0,
        tax: parseFloat(charges.tax) || 0,
        labour_charges: parseFloat(charges.labour_charges) || 0,
        total_cft: productsSummary.totalCft,
        attachments: attachments.map(a => a.base64),
      };

      console.log('Creating estimation with payload:', {
        ...payload,
        attachments: `[${payload.attachments.length} base64 images]`,
      });

      await estimationsApi.create(payload);
      showAlert("success", "Created!", "Estimation created successfully");
      navigate(`/crm/customers/${project.customer_id}/projects`);
    } catch (error) {
      console.error('Estimation creation error:', error);

      // Log detailed error for debugging
      if (error && typeof error === 'object' && 'response' in error) {
        console.error('Response data:', (error as any).response?.data);
        console.error('Response status:', (error as any).response?.status);
      }

      showAlert(
        "error",
        "Error",
        getErrorMessage(error, "Failed to create estimation"),
      );
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50/30 to-orange-50/30 py-8 px-4">
      <div className="max-w-5xl mx-auto">
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
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">
              Create Estimation
            </h1>
            <p className="text-slate-500 text-sm mt-0.5 font-medium">
              {customer?.name} {project ? `• ${project.name}` : ""}
            </p>
          </div>
        </div>

        <Card className="border-slate-200 shadow-lg">
          <form onSubmit={handleSubmit}>
            <CardHeader className="border-b bg-gradient-to-r from-amber-50 to-orange-50 py-4">
              <CardTitle className="text-base font-semibold text-amber-900 flex items-center gap-2">
                <Info className="h-4 w-4 text-amber-600" />
                Create New Estimation
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              {/* Basic Information */}
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-amber-800 font-bold text-sm uppercase tracking-tight flex items-center gap-2">
                  <div className="h-1 w-6 bg-amber-600 rounded-full"></div>
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Brief description of the estimation..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          description: e.target.value,
                        }))
                      }
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, status: e.target.value }))
                      }
                      className="w-full h-10 px-3 py-2 border rounded-md text-sm bg-white"
                    >
                      <option value="draft">Draft</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Products Section */}
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-amber-800 font-bold text-sm uppercase tracking-tight flex items-center gap-2">
                    <Hammer className="h-4 w-4 text-amber-600" />
                    Products
                    <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      {estimationProducts.length} items
                    </span>
                  </h3>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      resetCurrentProduct();
                      setIsProductModalOpen(true);
                      fetchProducts();
                    }}
                    className="h-8 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Product
                  </Button>
                </div>

                {/* Products List */}
                {estimationProducts.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm bg-white rounded-lg border border-dashed border-slate-300">
                    No products added yet. Click "Add Product" to start.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {estimationProducts.map((product, index) => (
                      <div
                        key={product.tempId}
                        className="bg-white p-3 rounded-lg border border-slate-200 hover:border-amber-300 transition-all"
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">
                                #{index + 1}
                              </span>
                              <h4 className="font-semibold text-slate-800 text-sm">
                                {
                                  products.find(
                                    (p) => p.id === product.product_id,
                                  )?.name
                                }
                              </h4>
                            </div>
                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-600">
                              <span>L: {product.length}"</span>
                              <span>B: {product.breadth}"</span>
                              {parseFloat(product.height) > 0 && (
                                <span>H: {product.height}"</span>
                              )}
                              {parseFloat(product.thickness) > 0 && (
                                <span>T: {product.thickness}"</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-xs">
                              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                                CFT: {product.cft.toFixed(2)}
                              </span>
                              <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded">
                                Qty: {product.quantity}
                              </span>
                              <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                                ₹{product.rate}/CFT
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-green-600">
                              ₹{product.total.toFixed(2)}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditProduct(product.tempId!)}
                              className="h-8 w-8 text-slate-400 hover:text-amber-600"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleRemoveProduct(product.tempId!)
                              }
                              className="h-8 w-8 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Charges */}
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-amber-800 font-bold text-sm uppercase tracking-tight flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-amber-600" />
                  Additional Charges
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Transport & Handling (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={charges.transport_handling}
                      onChange={(e) =>
                        setCharges((p) => ({
                          ...p,
                          transport_handling: e.target.value,
                        }))
                      }
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Discount (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={charges.discount}
                      onChange={(e) =>
                        setCharges((p) => ({ ...p, discount: e.target.value }))
                      }
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={charges.tax}
                      onChange={(e) =>
                        setCharges((p) => ({ ...p, tax: e.target.value }))
                      }
                      className="white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Labour Charges (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={charges.labour_charges}
                      onChange={(e) =>
                        setCharges((p) => ({
                          ...p,
                          labour_charges: e.target.value,
                        }))
                      }
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Attachments Section */}
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-amber-800 font-bold text-sm uppercase tracking-tight flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-amber-600" />
                  Attachments
                  {attachments.length > 0 && (
                    <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      {attachments.length} file(s)
                    </span>
                  )}
                </h3>

                {/* File Input */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-colors">
                    <Paperclip className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-600">
                      {isUploadingAttachment ? "Processing..." : "Click to upload images"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      disabled={isUploadingAttachment}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-slate-400">Max 2MB per file</span>
                </div>

                {/* Attachments Preview */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {attachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="relative group bg-white p-2 rounded-lg border border-slate-200 hover:border-amber-300 transition-colors"
                      >
                        <img
                          src={attachment.preview}
                          alt={`Attachment ${index + 1}`}
                          className="h-20 w-20 object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <p className="text-xs text-slate-500 mt-1 max-w-[80px] truncate">
                          {attachment.file.name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary Section */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
                <h3 className="text-amber-900 font-bold text-sm uppercase tracking-tight mb-4">
                  Estimation Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-white p-3 rounded-lg border border-amber-200">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">
                      Total CFT
                    </p>
                    <p className="text-lg font-bold text-amber-700">
                      {productsSummary.totalCft.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-amber-200">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">
                      Products Amount
                    </p>
                    <p className="text-lg font-bold text-green-600">
                      ₹{productsSummary.totalAmount.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-amber-200">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">
                      Charges
                    </p>
                    <p className="text-lg font-bold text-blue-600">
                      ₹{chargesTotal.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-3 rounded-lg border border-amber-600 shadow-sm">
                    <p className="text-[10px text-white uppercase font-semibold">
                      Grand Total
                    </p>
                    <p className="text-xl font-black text-white">
                      ₹{grandTotal.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-end gap-3 pt-4 border-t bg-slate-50">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="px-6 h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || estimationProducts.length === 0}
                className="px-8 h-9 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-sm transition-all text-xs disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Hammer className="mr-2 h-4 w-4" />
                    Create Estimation
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* Add Product Modal */}
      <Dialog
        open={isProductModalOpen}
        onOpenChange={(open) => {
          setIsProductModalOpen(open);
          if (!open) resetCurrentProduct();
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Hammer className="h-5 w-5 text-amber-600" />
              Add Product to Estimation
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Product Selection */}
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">
                Search Product
              </Label>
              <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full justify-between bg-white"
                  >
                    {currentProduct.product_id
                      ? products.find((p) => p.id === currentProduct.product_id)
                          ?.name
                      : "Search or select a product..."}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search products..."
                      value={searchValue}
                      onValueChange={setSearchValue}
                      className="h-11"
                    />
                    <CommandList>
                      {searchValue && filteredProducts.length === 0 ? (
                        <div className="p-4 text-center text-sm">
                          <p className="text-slate-500 mb-2">
                            No product found for "{searchValue}"
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setNewProductData({
                                name: searchValue.trim(),
                                description: "",
                              });
                              setShowNewProductForm(true);
                              setIsComboboxOpen(false);
                            }}
                            className="bg-amber-500 hover:bg-amber-600 text-white"
                          >
                            Add "{searchValue}" as new product
                          </Button>
                        </div>
                      ) : (
                        <CommandGroup heading="Products">
                          {filteredProducts.map((product) => (
                            <CommandItem
                              key={product.id}
                              value={product.name}
                              onSelect={() =>
                                handleSelectExistingProduct(product)
                              }
                            >
                              {product.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* New Product Form */}
            {showNewProductForm && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-1 w-1.5 rounded-full bg-amber-500" />
                  <h4 className="text-amber-800 font-bold text-xs uppercase">
                    New Product Details
                  </h4>
                </div>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs font-semibold">
                      Product Name *
                    </Label>
                    <Input
                      placeholder="e.g., Teak Door Frame"
                      value={newProductData.name}
                      onChange={(e) =>
                        setNewProductData((p) => ({
                          ...p,
                          name: e.target.value,
                        }))
                      }
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Description</Label>
                    <Textarea
                      placeholder="Product description..."
                      value={newProductData.description}
                      onChange={(e) =>
                        setNewProductData((p) => ({
                          ...p,
                          description: e.target.value,
                        }))
                      }
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCreateProduct}
                      disabled={isSavingProduct}
                      className="bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      {isSavingProduct ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Create Product"
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowNewProductForm(false);
                        setNewProductData({ name: "", description: "" });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Dimensions & Calculation */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                <h4 className="text-blue-800 font-bold text-xs uppercase">
                  Dimensions & Calculation
                </h4>
              </div>
              <div>
                <Label className="text-xs font-semibold">
                  Calculation Type
                </Label>
                <select
                  value={currentProduct.cft_calculation_type}
                  onChange={(e) =>
                    setCurrentProduct((p) => ({
                      ...p,
                      cft_calculation_type: e.target.value,
                    }))
                  }
                  className="w-full h-10 border rounded-md px-3 py-2 bg-white text-sm"
                >
                  {CFT_CALCULATION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-[10px] text-slate-500">Length</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={currentProduct.length}
                    onChange={(e) =>
                      setCurrentProduct((p) => ({
                        ...p,
                        length: e.target.value,
                      }))
                    }
                    className="h-9 text-sm bg-white"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-slate-500">Breadth</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={currentProduct.breadth}
                    onChange={(e) =>
                      setCurrentProduct((p) => ({
                        ...p,
                        breadth: e.target.value,
                      }))
                    }
                    className="h-9 text-sm bg-white"
                  />
                </div>
                {["1", "2"].includes(currentProduct.cft_calculation_type) && (
                  <div>
                    <Label className="text-[10px] text-slate-500">Height</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={currentProduct.height}
                      onChange={(e) =>
                        setCurrentProduct((p) => ({
                          ...p,
                          height: e.target.value,
                        }))
                      }
                      className="h-9 text-sm bg-white"
                    />
                  </div>
                )}
                {["3", "4"].includes(currentProduct.cft_calculation_type) && (
                  <div>
                    <Label className="text-[10px] text-slate-500">
                      Thickness
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={currentProduct.thickness}
                      onChange={(e) =>
                        setCurrentProduct((p) => ({
                          ...p,
                          thickness: e.target.value,
                        }))
                      }
                      className="h-9 text-sm bg-white"
                    />
                  </div>
                )}
              </div>
              {currentProduct.cft_calculation_type === "5" && (
                <div>
                  <Label className="text-xs font-semibold">CFT (Manual)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Enter CFT manually"
                    value={currentProduct.cft}
                    onChange={(e) =>
                      setCurrentProduct((p) => ({
                        ...p,
                        cft: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="bg-white"
                  />
                </div>
              )}
            </div>

            {/* Quantity & Rate */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={currentProduct.quantity}
                  onChange={(e) =>
                    setCurrentProduct((p) => ({
                      ...p,
                      quantity: parseInt(e.target.value) || 1,
                    }))
                  }
                  className="bg-white"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">
                  Rate per CFT (₹)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={currentProduct.rate}
                  onChange={(e) =>
                    setCurrentProduct((p) => ({
                      ...p,
                      rate: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="bg-white"
                />
              </div>
            </div>

            {/* Calculated Results */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-slate-500 uppercase">CFT</p>
                <p className="text-base font-bold text-blue-700">
                  {calculatedCFT.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">
                  Total (CFT × Rate × Qty)
                </p>
                <p className="text-base font-bold text-green-600">
                  ₹{calculatedProductTotal.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Quantity</p>
                <p className="text-base font-bold text-purple-700">
                  {currentProduct.quantity}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsProductModalOpen(false);
                  resetCurrentProduct();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAddProduct}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Product
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
