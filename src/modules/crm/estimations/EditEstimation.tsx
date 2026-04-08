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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface EstimationProduct {
  id?: number; // Database ID
  tempId?: string; // Frontend tracking ID
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
  product_name?: string; // Cache name from backend
  description?: string;
}

export default function EditEstimation() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
  const [deletedProductIds, setDeletedProductIds] = useState<number[]>([]);

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

  // Attachments state (Optional: If backend returns existing attachments)
  const [attachments, setAttachments] = useState<Array<{
    file?: File;
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
    cft_calculation_type: "",
    quantity: 1,
    cft: 0,
    rate: 0,
    total: 0,
  });

  const [productErrors, setProductErrors] = useState<{ [key: string]: string }>({});

  const validateProductField = (name: string, value: any) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      setProductErrors((prev) => ({
        ...prev,
        [name]: "Value must be greater than 0",
      }));
      return false;
    } else {
      setProductErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      return true;
    }
  };

  const isProductFormValid = useMemo(() => {
    if (!currentProduct.product_id) return false;

    const type = currentProduct.cft_calculation_type;
    let requiredFields: string[] = ["quantity", "rate"];

    if (type === "5") {
      requiredFields.push("cft");
    } else {
      requiredFields.push("length", "breadth");
      if (["1", "2"].includes(type)) requiredFields.push("height");
      if (["3", "4"].includes(type)) requiredFields.push("thickness");
    }

    for (const field of requiredFields) {
      if (productErrors[field]) return false;
      const val = (currentProduct as any)[field];
      const numVal = parseFloat(val);
      if (isNaN(numVal) || numVal <= 0) return false;
    }

    return true;
  }, [currentProduct, productErrors]);

  const roundToTwo = (num: number) => Math.round(num * 100) / 100;

  const CFT_CALCULATION_TYPES = [
    { value: "1", label: "L × B × H ÷ 144", description: "Dimensions in inches" },
    { value: "2", label: "L × B × H", description: "Dimensions in feet" },
    { value: "3", label: "L × B × T ÷ 12", description: "Thickness in inches" },
    { value: "4", label: "L × B × T", description: "Thickness in feet" },
    { value: "5", label: "Manual", description: "Enter CFT manually" },
  ];

  const filteredProducts = useMemo(() => {
    if (!searchValue.trim()) return products;
    return products.filter((p) =>
      (p.name || "").toLowerCase().includes(searchValue.toLowerCase()),
    );
  }, [products, searchValue]);

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
    
    return cft;
  }, [currentProduct]);

  const calculatedProductTotal = useMemo(() => {
    const cft = currentProduct.cft_calculation_type === "5" ? currentProduct.cft : calculatedCFT;
    const rate = currentProduct.rate || 0;
    const quantity = currentProduct.quantity || 1;
    return roundToTwo(cft * rate * quantity);
  }, [calculatedCFT, currentProduct]);

  const productsSummary = useMemo(() => {
    const totalCft = estimationProducts.reduce((sum, p) => sum + p.cft * p.quantity, 0);
    const totalAmount = estimationProducts.reduce((sum, p) => sum + p.total, 0);
    return {
      totalCft: roundToTwo(totalCft),
      totalAmount: roundToTwo(totalAmount),
      totalItems: estimationProducts.length,
    };
  }, [estimationProducts]);

  const chargesTotal = useMemo(() => {
    const transport = parseFloat(charges.transport_handling) || 0;
    const tax = parseFloat(charges.tax) || 0;
    const labour = parseFloat(charges.labour_charges) || 0;
    const discount = parseFloat(charges.discount) || 0;
    return roundToTwo(transport + tax + labour - discount);
  }, [charges]);

  const grandTotal = useMemo(() => {
    return roundToTwo(productsSummary.totalAmount + chargesTotal);
  }, [productsSummary.totalAmount, chargesTotal]);

  const fetchEstimationData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await estimationsApi.get(id);
      console.log("Raw estimation API response:", res);
      const est = res?.data?.data || res?.data || res;
      console.log("Normalized estimation data:", est);
      
      // Basic Info
      setFormData({
        description: est.description || "",
        additional_notes: est.additional_notes || "",
        status: est.status || "draft",
      });

      // Charges
      const oc = est.other_charges || est.other_charge;
      if (oc) {
        setCharges({
          transport_handling: String(oc.transport_and_handling || ""),
          discount: String(oc.discount || ""),
          tax: String(oc.approximate_tax || ""),
          labour_charges: String(oc.labour_charges || ""),
        });
      } else {
        setCharges({
          transport_handling: String(est.transport_handling || ""),
          discount: String(est.discount || ""),
          tax: String(est.tax || ""),
          labour_charges: String(est.labour_charges || ""),
        });
      }

      // Products
      if (est.products && Array.isArray(est.products)) {
        setEstimationProducts(est.products.map((p: any) => ({
          id: p.id,
          tempId: `saved_${p.id}`,
          product_id: p.product_id,
          product_name: p.product?.name,
          length: String(p.length || ""),
          breadth: String(p.breadth || ""),
          height: String(p.height || ""),
          thickness: String(p.thickness || ""),
          cft_calculation_type: String(p.cft_calculation_type || ""),
          quantity: Number(p.quantity) || 1,
          cft: Number(p.cft) || 0,
          rate: Number(p.cost_per_cft) || Number(p.rate) || 0,
          total: Number(p.total_amount) || (Number(p.cft) * (Number(p.cost_per_cft) || Number(p.rate)) * Number(p.quantity)) || 0,
          description: p.description || "",
        })));
        console.log("Mapped products:", est.products.length, "items");
      }

      // Project & Customer
      if (est.project) {
        setProject(est.project);
      } else if (est.project_id) {
        const projRes = await projectApi.get(est.project_id);
        setProject((projRes as any).data || projRes);
      }

      if (est.customer) {
        setCustomer(est.customer);
      } else if (est.customer_id) {
        const custRes = await customerApi.get(est.customer_id);
        setCustomer((custRes as any).data || custRes);
      } else if (est.project?.customer_id) {
        const custRes = await customerApi.get(est.project.customer_id);
        setCustomer((custRes as any).data || custRes);
      }
    } catch (error) {
      console.error("Failed to load estimation:", error);
      showAlert("error", "Error", "Failed to load estimation details");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

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
      setProducts(extractArray(res));
    } catch (err) {
      console.error("Products fetch failed:", err);
    }
  }, []);

  useEffect(() => {
    fetchEstimationData();
    fetchProducts();
  }, [fetchEstimationData, fetchProducts]);

  const handleAddProduct = () => {
    if (!currentProduct.product_id) {
      showAlert("error", "Validation", "Please select a product");
      return;
    }

    const isEditing = !!currentProduct.tempId;
    const finalCft = currentProduct.cft_calculation_type === "5" ? currentProduct.cft : calculatedCFT;

    const productData = products.find(p => p.id === currentProduct.product_id);

    const productToAdd: EstimationProduct = {
      ...currentProduct,
      tempId: isEditing ? currentProduct.tempId : `temp_${Date.now()}`,
      cft: finalCft,
      total: calculatedProductTotal,
      product_name: productData?.name,
    };

    if (isEditing) {
      setEstimationProducts((prev) =>
        prev.map((p) => (p.tempId === currentProduct.tempId ? productToAdd : p)),
      );
    } else {
      setEstimationProducts([...estimationProducts, productToAdd]);
    }

    resetCurrentProduct();
    setIsProductModalOpen(false);
  };

  const handleRemoveProduct = (tempId: string) => {
    const productToRemove = estimationProducts.find((p) => p.tempId === tempId);
    if (productToRemove && productToRemove.id) {
      setDeletedProductIds((prev) => [...prev, productToRemove.id!]);
    }
    setEstimationProducts(estimationProducts.filter((p) => p.tempId !== tempId));
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
      tempId: undefined,
      product_id: null,
      product_name: undefined,
      description: "",
    });
    setSearchValue("");
    setIsComboboxOpen(false);
    setProductErrors({});
  };

  const handleSelectExistingProduct = (product: any) => {
    setCurrentProduct((prev) => ({ 
      ...prev, 
      product_id: product.id,
      product_name: product.name 
    }));
    setSearchValue("");
    setIsComboboxOpen(false);
  };

  const handleCreateProduct = async () => {
    if (!newProductData.name.trim()) return;
    setIsSavingProduct(true);
    try {
      const response = await crmProductService.create({
        name: newProductData.name.trim(),
        description: newProductData.description.trim() || null,
      });
      console.log("Create product raw response:", response);
      const created = (response as any).data?.data || (response as any).data || response;
      console.log("Normalized created product:", created);
      
      setProducts((prev) => [created, ...prev]);
      setCurrentProduct((prev) => ({
        ...prev,
        product_id: created.id,
        product_name: created.name,
      }));
      setShowNewProductForm(false);
      setNewProductData({ name: "", description: "" });
    } catch (error) {
      showAlert("error", "Error", "Failed to create product");
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setIsUploadingAttachment(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) continue;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          setAttachments(prev => [...prev, { file, preview: URL.createObjectURL(file), base64: reader.result as string }]);
        };
      }
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const handlePositiveNumber = (value: string) => {
    let sanitized = value.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) sanitized = parts[0] + '.' + parts.slice(1).join('');
    return sanitized;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || estimationProducts.length === 0) {
      showAlert("error", "Validation", "Please add at least one product");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        org_id: user?.org_id,
        company_id: user?.company_id,
        customer_id: customer?.id,
        project_id: project?.id,
        description: formData.description.trim() || null,
        additional_notes: formData.additional_notes.trim() || null,
        status: formData.status,
        products: estimationProducts.map((p) => ({
          id: p.id || null,
          product_id: p.product_id,
          length: parseFloat(p.length) || 0,
          breadth: parseFloat(p.breadth) || 0,
          height: parseFloat(p.height) || 0,
          thickness: parseFloat(p.thickness) || 0,
          cft_calculation_type: p.cft_calculation_type,
          quantity: p.quantity,
          cft: p.cft,
          rate: p.rate,
          total_amount: p.total,
          description: p.description || null,
        })),
        deleted_product_ids: deletedProductIds,
        transport_handling: parseFloat(charges.transport_handling) || 0,
        discount: parseFloat(charges.discount) || 0,
        tax: parseFloat(charges.tax) || 0,
        labour_charges: parseFloat(charges.labour_charges) || 0,
        total_cft: productsSummary.totalCft,
        attachments: attachments.map(a => a.base64).filter(b => b.startsWith('data:image')),
      };

      await estimationsApi.update(id, payload);
      showAlert("success", "Updated!", "Estimation updated successfully");
      navigate(-1);
    } catch (error) {
      console.error('Update error:', error);
      showAlert("error", "Error", getErrorMessage(error, "Failed to update estimation"));
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50/30 to-orange-50/30 py-4 sm:py-8 px-0">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full bg-white shadow-sm">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Edit Estimation</h1>
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
                Update Estimation Details
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 sm:space-y-6 pt-4 sm:pt-6 p-3 sm:p-6">
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-amber-800 font-bold text-sm uppercase tracking-tight flex items-center gap-2">
                  <div className="h-1 w-6 bg-amber-600 rounded-full"></div>
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Brief description..."
                      value={formData.description}
                      onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(p => ({ ...p, status: e.target.value }))}
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

              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-amber-800 font-bold text-sm uppercase tracking-tight flex items-center gap-2">
                    <Hammer className="h-4 w-4 text-amber-600" />
                    Products ({estimationProducts.length})
                  </h3>
                  <Button type="button" size="sm" onClick={() => { resetCurrentProduct(); setIsProductModalOpen(true); fetchProducts(); }} className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all text-xs font-bold">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Product
                  </Button>
                </div>

                <div className="space-y-2">
                  {estimationProducts.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm bg-white rounded-lg border border-dashed border-slate-300">
                      No products added. Click "Add Product" to start.
                    </div>
                  ) : (
                    estimationProducts.map((product, index) => (
                      <div key={product.tempId} className="bg-white p-3 rounded-lg border border-slate-200 hover:border-amber-300">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 w-full">
                          <div className="flex-1 w-full">
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">#{index + 1}</span>
                              <h4 className="font-semibold text-slate-800 text-sm">
                                {product.product_name || products.find(p => p.id === product.product_id)?.name || "Unknown Product"}
                              </h4>
                            </div>
                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-600">
                              <span>L: {product.length}</span>
                              <span>B: {product.breadth}</span>
                              {parseFloat(product.height) > 0 && <span>H: {product.height}</span>}
                              {parseFloat(product.thickness) > 0 && <span>T: {product.thickness}</span>}
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-xs">
                              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">CFT: {Number(product.cft).toFixed(2)}</span>
                              <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded">Qty: {product.quantity}</span>
                              <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded">₹{Number(product.rate).toFixed(2)}/CFT</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-3 sm:pt-0 mt-2 sm:mt-0 border-t sm:border-0 border-slate-100">
                            <span className="text-sm font-bold text-green-600">₹{Number(product.total).toFixed(2)}</span>
                            <div className="flex items-center gap-1">
                            <Button type="button" variant="ghost" size="icon" onClick={() => handleEditProduct(product.tempId!)} className="h-8 w-8 text-slate-400 hover:text-amber-600">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveProduct(product.tempId!)} className="h-8 w-8 text-slate-400 hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-amber-800 font-bold text-sm uppercase tracking-tight flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-amber-600" /> Additional Charges
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['transport_handling', 'discount', 'tax', 'labour_charges'].map(field => (
                    <div key={field} className="space-y-2">
                      <Label className="capitalize">{field.replace('_', ' ')} (₹)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={(charges as any)[field]}
                        onChange={(e) => setCharges(p => ({ ...p, [field]: e.target.value }))}
                        className="bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
                <h3 className="text-amber-900 font-bold text-sm uppercase mb-4 tracking-tight">Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 text-sm">
                  {[
                    { label: 'Total CFT', value: Number(productsSummary.totalCft).toFixed(2), color: 'text-amber-700' },
                    { label: 'Products Amount', value: `₹${Number(productsSummary.totalAmount).toFixed(2)}`, color: 'text-green-600' },
                    { label: 'Charges', value: `₹${Number(chargesTotal).toFixed(2)}`, color: 'text-blue-600' }
                  ].map(item => (
                    <div key={item.label} className="bg-white p-3 rounded-lg border border-amber-200">
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">{item.label}</p>
                      <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                  <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-3 rounded-lg border border-amber-600">
                    <p className="text-[10px] text-white uppercase font-semibold">Grand Total</p>
                    <p className="text-xl font-black text-white">₹{Number(grandTotal).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t bg-slate-50 p-4 sm:p-6">
              <Button type="button" variant="outline" onClick={() => navigate(-1)} className="w-full sm:w-auto px-6 h-9">Cancel</Button>
              <Button type="submit" disabled={isSaving || estimationProducts.length === 0} className="w-full sm:w-auto px-8 h-9 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-sm transition-all text-xs disabled:opacity-50">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit2 className="mr-2 h-4 w-4" />}
                Update Estimation
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      <Dialog open={isProductModalOpen} onOpenChange={(open) => { setIsProductModalOpen(open); if (!open) resetCurrentProduct(); }}>
        <DialogContent className="sm:max-w-[600px] w-[calc(100%-3rem)] sm:w-full min-h-[85vh] sm:min-h-[650px] max-h-[90vh] overflow-y-auto rounded-lg top-[5%] translate-y-0 sm:top-[50%] sm:translate-y-[-50%]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Hammer className="h-5 w-5 text-amber-600" /> {currentProduct.tempId ? "Edit Product" : "Add Product"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Add or edit product details for the estimation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
             <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Search Product</Label>
              <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" type="button" className="w-full justify-between bg-white">
                    {currentProduct.product_id ? (products.find((p) => p.id === currentProduct.product_id)?.name || currentProduct.product_name) : "Select a product..."}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Search products..." value={searchValue} onValueChange={setSearchValue} className="h-11" />
                    <CommandList>
                      {searchValue && filteredProducts.length === 0 ? (
                        <div className="p-4 text-center text-sm">
                          <p className="text-slate-500 mb-2 font-medium">No product found matching</p>
                          <Button 
                            type="button" 
                            size="sm" 
                            variant="outline"
                            onClick={() => { 
                              setNewProductData({ name: searchValue.trim(), description: "" }); 
                              setShowNewProductForm(true); 
                              setIsComboboxOpen(false); 
                            }} 
                            className="text-amber-600 border-amber-200 hover:bg-amber-50"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create New Product
                          </Button>
                        </div>
                      ) : (
                        <>
                          {!searchValue && products.length > 0 && (
                            <CommandGroup heading="All Products">
                              {products.map((product, idx) => (
                                <CommandItem key={product.id || `prod-${idx}`} onSelect={() => handleSelectExistingProduct(product)}>
                                  {product.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                          {searchValue && filteredProducts.length > 0 && (
                            <CommandGroup heading="Search Results">
                              {filteredProducts.map((product, idx) => (
                                <CommandItem key={product.id || `search-${idx}`} onSelect={() => handleSelectExistingProduct(product)}>
                                  {product.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {showNewProductForm && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3 shadow-inner">
                <div className="flex items-center gap-2 mb-1">
                  <Plus className="h-4 w-4 text-amber-600" />
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-tighter">New Product Details</h4>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold">Product Name *</Label>
                    <Input placeholder="e.g., Teak Door" value={newProductData.name} onChange={(e) => setNewProductData(p => ({ ...p, name: e.target.value }))} className="h-9" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Description</Label>
                    <Textarea 
                      placeholder="Product description..." 
                      value={newProductData.description} 
                      onChange={(e) => setNewProductData(p => ({ ...p, description: e.target.value }))} 
                      rows={2}
                      className="text-sm bg-white"
                    />
                  </div>
                  <Button size="sm" onClick={handleCreateProduct} disabled={isSavingProduct} className="bg-amber-500 hover:bg-amber-600 text-white w-full border-b-2 border-amber-700">
                    {isSavingProduct ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Product"}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-xs font-semibold">Calculation Type</Label>
              <select value={currentProduct.cft_calculation_type} onChange={(e) => setCurrentProduct(p => ({ ...p, cft_calculation_type: e.target.value }))} className="w-full h-10 border rounded-md px-3 bg-white text-sm">
                {CFT_CALCULATION_TYPES.map(type => {
                  const shortDesc = type.description
                    .replace("Dimensions in ", "")
                    .replace("Thickness in ", "")
                    .replace("Enter CFT manually", "Manual Entry");
                  return <option key={type.value} value={type.value}>{type.label} ({shortDesc})</option>
                })}
              </select>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4">
                {currentProduct.cft_calculation_type !== "5" && (
                  <>
                    <div>
                      <Label className="text-[10px] text-slate-500 capitalize">Length</Label>
                      <Input type="number" step="0.01" value={currentProduct.length} onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()} onChange={(e) => {
                        const val = handlePositiveNumber(e.target.value);
                        setCurrentProduct(p => ({ ...p, length: val }));
                        validateProductField("length", val);
                      }} className={`h-9 text-sm ${productErrors.length ? "border-red-500" : ""}`} />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500 capitalize">Breadth</Label>
                      <Input type="number" step="0.01" value={currentProduct.breadth} onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()} onChange={(e) => {
                        const val = handlePositiveNumber(e.target.value);
                        setCurrentProduct(p => ({ ...p, breadth: val }));
                        validateProductField("breadth", val);
                      }} className={`h-9 text-sm ${productErrors.breadth ? "border-red-500" : ""}`} />
                    </div>
                  </>
                )}
                {["1", "2"].includes(currentProduct.cft_calculation_type) && (
                  <div>
                    <Label className="text-[10px] text-slate-500 capitalize">Height</Label>
                    <Input type="number" step="0.01" value={currentProduct.height} onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()} onChange={(e) => {
                      const val = handlePositiveNumber(e.target.value);
                      setCurrentProduct(p => ({ ...p, height: val }));
                      validateProductField("height", val);
                    }} className={`h-9 text-sm ${productErrors.height ? "border-red-500" : ""}`} />
                  </div>
                )}
                {["3", "4"].includes(currentProduct.cft_calculation_type) && (
                  <div>
                    <Label className="text-[10px] text-slate-500 capitalize">Thickness</Label>
                    <Input type="number" step="0.01" value={currentProduct.thickness} onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()} onChange={(e) => {
                      const val = handlePositiveNumber(e.target.value);
                      setCurrentProduct(p => ({ ...p, thickness: val }));
                      validateProductField("thickness", val);
                    }} className={`h-9 text-sm ${productErrors.thickness ? "border-red-500" : ""}`} />
                  </div>
                )}
              </div>
              
              {currentProduct.cft_calculation_type === "5" && (
                <div className="mt-2">
                  <Label className="text-xs font-semibold">CFT (Manual)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Enter CFT manually"
                    value={currentProduct.cft}
                    onChange={(e) => {
                      const val = handlePositiveNumber(e.target.value);
                      setCurrentProduct(p => ({ ...p, cft: parseFloat(val) }));
                      validateProductField("cft", val);
                    }}
                    className={`bg-white h-10 ${productErrors.cft ? "border-red-500" : ""}`}
                  />
                </div>
              )}
            </div>

            {/* <div className="space-y-2">
              <Label className="text-xs font-semibold">Description / Notes</Label>
              <Textarea
                placeholder="Additional details for this product entry..."
                value={currentProduct.description || ""}
                onChange={(e) =>
                  setCurrentProduct((p) => ({ ...p, description: e.target.value }))
                }
                rows={2}
                className="text-sm bg-white"
              />
            </div> */}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Quantity</Label>
                <Input 
                  type="number" 
                  value={currentProduct.quantity} 
                  onChange={(e) => { 
                    const val = handlePositiveNumber(e.target.value); 
                    setCurrentProduct(p => ({ ...p, quantity: parseInt(val)})); 
                    validateProductField("quantity", val); 
                  }} 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Rate (₹)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={currentProduct.rate} 
                  onChange={(e) => { 
                    const val = handlePositiveNumber(e.target.value); 
                    setCurrentProduct(p => ({ ...p, rate: parseFloat(val) })); 
                    validateProductField("rate", val); 
                  }} 
                />
              </div>
            </div>

            {/* Calculated Results */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-slate-500 uppercase">CFT</p>
                <p className="text-base font-bold text-blue-700">
                  {currentProduct.cft_calculation_type === "5" ? currentProduct.cft || 0 : calculatedCFT.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Total (CFT × Rate × Qty)</p>
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

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsProductModalOpen(false)} className="flex-1">Cancel</Button>
              <Button type="button" onClick={handleAddProduct} disabled={!isProductFormValid} className="flex-1 bg-amber-600 text-white">{currentProduct.tempId ? "Update" : "Add"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      
    </div>
  );
}
