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
  ChevronUp,
  Paperclip,
  X,
  Layers,
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

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface EstimationItem {
  tempId: string;
  name: string;
  length: string;
  breadth: string;
  height: string;
  thickness: string;
  unit_type: string;
  quantity: number;
  rate: number;
  item_cft: number;
  total_amount: number;
}

interface EstimationProduct {
  tempId: string;
  product_id: number | null;
  items: EstimationItem[];
  total_cft: number;
  total_amount: number;
}

// ─── CFT Calculation Types ───────────────────────────────────────────────────

const CFT_CALCULATION_TYPES = [
  { value: "1", label: "L × B × H ÷ 144", description: "Dimensions in inches" },
  { value: "2", label: "L × B × H", description: "Dimensions in feet" },
  { value: "3", label: "L × B × T ÷ 12", description: "Thickness in inches" },
  { value: "4", label: "L × B × T", description: "Thickness in feet" },
  { value: "5", label: "Manual", description: "Enter CFT manually" },
];

const roundToTwo = (num: number) => Math.round(num * 100) / 100;

const calculateItemCft = (item: EstimationItem): number => {
  const l = parseFloat(item.length) || 0;
  const b = parseFloat(item.breadth) || 0;
  const h = parseFloat(item.height) || 0;
  const t = parseFloat(item.thickness) || 0;

  switch (item.unit_type) {
    case "1": return roundToTwo((l * b * h) / 144);
    case "2": return roundToTwo(l * b * h);
    case "3": return roundToTwo((l * b * t) / 12);
    case "4": return roundToTwo(l * b * t);
    case "5": return item.item_cft || 0;
    default: return roundToTwo((l * b * h) / 144);
  }
};

const calculateItemTotal = (cft: number, rate: number, quantity: number): number => {
  return roundToTwo(cft * rate * quantity);
};

const handlePositiveNumber = (value: string) => {
  let sanitized = value.replace(/[^0-9.]/g, '');
  const parts = sanitized.split('.');
  if (parts.length > 2) sanitized = parts[0] + '.' + parts.slice(1).join('');
  return sanitized;
};

// ─── Empty Defaults ──────────────────────────────────────────────────────────

const emptyItem = (): EstimationItem => ({
  tempId: `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  name: "",
  length: "",
  breadth: "",
  height: "",
  thickness: "",
  unit_type: "1",
  quantity: 1,
  rate: 0,
  item_cft: 0,
  total_amount: 0,
});

// ─── Component ───────────────────────────────────────────────────────────────

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

  // Products with nested Items
  const [estimationProducts, setEstimationProducts] = useState<EstimationProduct[]>([]);

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
  const [newProductData, setNewProductData] = useState({ name: "", description: "" });
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  // Item Modal state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [activeProductTempId, setActiveProductTempId] = useState<string | null>(null);
  const [currentItem, setCurrentItem] = useState<EstimationItem>(emptyItem());
  const [itemErrors, setItemErrors] = useState<{ [key: string]: string }>({});

  // Expanded product cards
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  // Attachments
  const [attachments, setAttachments] = useState<Array<{ file: File; preview: string; base64: string }>>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  // ─── Computed Values ─────────────────────────────────────────────

  const filteredProducts = useMemo(() => {
    if (!searchValue.trim()) return products;
    return products.filter((p) =>
      p.name.toLowerCase().includes(searchValue.toLowerCase()),
    );
  }, [products, searchValue]);

  const calculatedItemCft = useMemo(() => calculateItemCft(currentItem), [currentItem]);

  const calculatedItemTotal = useMemo(() => {
    const cft = currentItem.unit_type === "5" ? (currentItem.item_cft || 0) : calculatedItemCft;
    const rate = typeof currentItem.rate === "string" ? parseFloat(currentItem.rate as any) || 0 : currentItem.rate;
    const qty = typeof currentItem.quantity === "string" ? parseInt(currentItem.quantity as any) || 1 : currentItem.quantity;
    return calculateItemTotal(cft, rate, qty);
  }, [calculatedItemCft, currentItem]);

  const productsSummary = useMemo(() => {
    let totalCft = 0;
    let totalAmount = 0;
    let totalItems = 0;
    estimationProducts.forEach((p) => {
      p.items.forEach((item) => {
        totalCft += item.item_cft * item.quantity;
        totalAmount += item.total_amount;
        totalItems++;
      });
    });
    return { totalCft: roundToTwo(totalCft), totalAmount: roundToTwo(totalAmount), totalProducts: estimationProducts.length, totalItems };
  }, [estimationProducts]);

  const chargesTotal = useMemo(() => {
    const transport = parseFloat(charges.transport_handling) || 0;
    const tax = parseFloat(charges.tax) || 0;
    const labour = parseFloat(charges.labour_charges) || 0;
    const discount = parseFloat(charges.discount) || 0;
    return roundToTwo(transport + tax + labour - discount);
  }, [charges]);

  const grandTotal = useMemo(() => roundToTwo(productsSummary.totalAmount + chargesTotal), [productsSummary.totalAmount, chargesTotal]);

  const isItemFormValid = useMemo(() => {
    const type = currentItem.unit_type;
    let requiredFields: string[] = ["quantity", "rate"];

    if (type === "5") {
      requiredFields.push("item_cft");
    } else {
      requiredFields.push("length", "breadth");
      if (["1", "2"].includes(type)) requiredFields.push("height");
      if (["3", "4"].includes(type)) requiredFields.push("thickness");
    }

    for (const field of requiredFields) {
      if (itemErrors[field]) return false;
      const val = (currentItem as any)[field];
      const numVal = parseFloat(val);
      if (isNaN(numVal) || numVal <= 0) return false;
    }
    return true;
  }, [currentItem, itemErrors]);

  // ─── Fetch Functions ─────────────────────────────────────────────

  const fetchCustomer = useCallback(async () => {
    if (!project_id) return;
    setIsLoading(true);
    try {
      const res = await projectApi.get(Number(project_id));
      const projectData = (res as any).data || res;
      setProject(projectData);
      if (projectData?.customer_id) {
        try {
          const custRes = await customerApi.get(Number(projectData.customer_id));
          setCustomer((custRes as any).data || custRes);
        } catch (err) { console.error("Failed to fetch customer:", err); }
      }
    } catch (error) {
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
        if (body?.data?.data && Array.isArray(body.data.data)) return body.data.data;
        return [];
      };
      setProducts(extractArray(res));
    } catch (err) { console.error("Products fetch failed:", err); }
  }, []);

  useEffect(() => {
    fetchCustomer();
    fetchProducts();
  }, [fetchCustomer, fetchProducts]);

  // ─── Product Handlers ────────────────────────────────────────────

  const handleAddProduct = () => {
    if (!selectedProductId) {
      showAlert("error", "Validation", "Please select a product");
      return;
    }

    const newProduct: EstimationProduct = {
      tempId: `product_${Date.now()}`,
      product_id: selectedProductId,
      items: [],
      total_cft: 0,
      total_amount: 0,
    };

    setEstimationProducts((prev) => [...prev, newProduct]);
    setExpandedProducts((prev) => new Set(prev).add(newProduct.tempId));
    setSelectedProductId(null);
    setSearchValue("");
    setIsProductModalOpen(false);
    showAlert("success", "Added!", "Product added. Now add items for this product.");
  };

  const handleRemoveProduct = (tempId: string) => {
    setEstimationProducts((prev) => prev.filter((p) => p.tempId !== tempId));
  };

  const toggleProductExpanded = (tempId: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(tempId)) next.delete(tempId); else next.add(tempId);
      return next;
    });
  };

  // ─── Item Handlers ───────────────────────────────────────────────

  const openAddItemModal = (productTempId: string) => {
    setActiveProductTempId(productTempId);
    setCurrentItem(emptyItem());
    setItemErrors({});
    setIsItemModalOpen(true);
  };

  const openEditItemModal = (productTempId: string, item: EstimationItem) => {
    setActiveProductTempId(productTempId);
    setCurrentItem({ ...item });
    setItemErrors({});
    setIsItemModalOpen(true);
  };

  const validateItemField = (name: string, value: any) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      setItemErrors((prev) => ({ ...prev, [name]: "Value must be greater than 0" }));
    } else {
      setItemErrors((prev) => { const next = { ...prev }; delete next[name]; return next; });
    }
  };

  const handleSaveItem = () => {
    if (!activeProductTempId) return;

    const cft = currentItem.unit_type === "5"
      ? (typeof currentItem.item_cft === "string" ? parseFloat(currentItem.item_cft as any) || 0 : currentItem.item_cft)
      : calculatedItemCft;

    const rate = typeof currentItem.rate === "string" ? parseFloat(currentItem.rate as any) || 0 : currentItem.rate;
    const qty = typeof currentItem.quantity === "string" ? parseInt(currentItem.quantity as any) || 1 : currentItem.quantity;

    const savedItem: EstimationItem = {
      ...currentItem,
      item_cft: cft,
      total_amount: calculateItemTotal(cft, rate, qty),
      quantity: qty,
      rate: rate,
      length: currentItem.length || "0",
      breadth: currentItem.breadth || "0",
      height: currentItem.height || "0",
      thickness: currentItem.thickness || "0",
    };

    setEstimationProducts((prev) =>
      prev.map((product) => {
        if (product.tempId !== activeProductTempId) return product;

        const existingIdx = product.items.findIndex((i) => i.tempId === savedItem.tempId);
        let updatedItems: EstimationItem[];

        if (existingIdx >= 0) {
          updatedItems = [...product.items];
          updatedItems[existingIdx] = savedItem;
        } else {
          updatedItems = [...product.items, savedItem];
        }

        const total_cft = roundToTwo(updatedItems.reduce((sum, i) => sum + (i.item_cft * i.quantity), 0));
        const total_amount = roundToTwo(updatedItems.reduce((sum, i) => sum + i.total_amount, 0));
        return { ...product, items: updatedItems, total_cft, total_amount };
      })
    );

    setIsItemModalOpen(false);
    setCurrentItem(emptyItem());
    setActiveProductTempId(null);
  };

  const handleRemoveItem = (productTempId: string, itemTempId: string) => {
    setEstimationProducts((prev) =>
      prev.map((product) => {
        if (product.tempId !== productTempId) return product;
        const updatedItems = product.items.filter((i) => i.tempId !== itemTempId);
        const total_cft = roundToTwo(updatedItems.reduce((sum, i) => sum + (i.item_cft * i.quantity), 0));
        const total_amount = roundToTwo(updatedItems.reduce((sum, i) => sum + i.total_amount, 0));
        return { ...product, items: updatedItems, total_cft, total_amount };
      })
    );
  };

  // ─── Product Creation ────────────────────────────────────────────

  const handleSelectExistingProduct = (product: any) => {
    setSelectedProductId(product.id);
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
      const payload = { name: newProductData.name.trim(), description: newProductData.description.trim() || null };
      const response = await crmProductService.create(payload);
      const createdProduct = (response as any).data?.data || (response as any).data || response;
      setProducts((prev) => [createdProduct, ...prev]);
      setSelectedProductId(createdProduct.id);
      setShowNewProductForm(false);
      setNewProductData({ name: "", description: "" });
    } catch (error) {
      showAlert("error", "Error", getErrorMessage(error, "Failed to create product"));
    } finally {
      setIsSavingProduct(false);
    }
  };

  // ─── Attachments ─────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setIsUploadingAttachment(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) { showAlert('error', 'Invalid File', 'Only image files are allowed'); continue; }
        if (file.size > 2 * 1024 * 1024) { showAlert('error', 'File Too Large', 'Maximum file size is 2MB'); continue; }
        const preview = URL.createObjectURL(file);
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
        });
        setAttachments((prev) => [...prev, { file, preview, base64 }]);
      }
    } catch { showAlert('error', 'Error', 'Failed to process file'); } finally {
      setIsUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => { const n = [...prev]; URL.revokeObjectURL(n[index].preview); n.splice(index, 1); return n; });
  };

  // ─── Submit ──────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) { showAlert("error", "Validation", "Project not found"); return; }
    if (estimationProducts.length === 0) { showAlert("error", "Validation", "Please add at least one product"); return; }

    // Check that each product has at least one item
    const emptyProduct = estimationProducts.find((p) => p.items.length === 0);
    if (emptyProduct) {
      const name = products.find((pr) => pr.id === emptyProduct.product_id)?.name || "Unknown";
      showAlert("error", "Validation", `Product "${name}" has no items. Please add at least one item.`);
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
          product_id: p.product_id,
          items: p.items.map((item) => ({
            name: item.name || null,
            length: parseFloat(item.length) || 0,
            breadth: parseFloat(item.breadth) || 0,
            height: parseFloat(item.height) || 0,
            thickness: parseFloat(item.thickness) || 0,
            unit_type: item.unit_type,
            quantity: item.quantity,
            rate: item.rate,
            item_cft: item.item_cft,
            total_amount: item.total_amount,
          })),
        })),
        transport_handling: parseFloat(charges.transport_handling) || 0,
        discount: parseFloat(charges.discount) || 0,
        tax: parseFloat(charges.tax) || 0,
        labour_charges: parseFloat(charges.labour_charges) || 0,
        total_cft: productsSummary.totalCft,
        attachments: attachments.map((a) => a.base64),
      };

      await estimationsApi.create(payload);
      showAlert("success", "Created!", "Estimation created successfully");
      navigate(`/crm/customers/${project.customer_id}/projects`);
    } catch (error) {
      console.error("Estimation creation error:", error);
      showAlert("error", "Error", getErrorMessage(error, "Failed to create estimation"));
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────

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
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full bg-white shadow-sm hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">Create Estimation</h1>
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

            <CardContent className="space-y-4 sm:space-y-6 pt-4 sm:pt-6 p-3 sm:p-6">
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
                      onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-amber-800 font-bold text-sm uppercase tracking-tight flex items-center gap-2">
                    <Hammer className="h-4 w-4 text-amber-600" />
                    Products
                    <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      {estimationProducts.length} products • {productsSummary.totalItems} items
                    </span>
                  </h3>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => { setSelectedProductId(null); setSearchValue(""); setShowNewProductForm(false); setIsProductModalOpen(true); fetchProducts(); }}
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
                  <div className="space-y-3">
                    {estimationProducts.map((product, index) => {
                      const productInfo = products.find((p) => p.id === product.product_id);
                      const isExpanded = expandedProducts.has(product.tempId);

                      return (
                        <div key={product.tempId} className="bg-white rounded-lg border border-slate-200 hover:border-amber-300 transition-all overflow-hidden">
                          {/* Product Header */}
                          <div className="p-3 flex items-center justify-between cursor-pointer" onClick={() => toggleProductExpanded(product.tempId)}>
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">#{index + 1}</span>
                              <h4 className="font-semibold text-slate-800 text-sm">{productInfo?.name || "Unknown Product"}</h4>
                              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{product.items.length} items</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-blue-600">{Number(product.total_cft).toFixed(2)} CFT</span>
                              <span className="text-sm font-bold text-green-600">₹{Number(product.total_amount).toFixed(2)}</span>
                              <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleRemoveProduct(product.tempId); }} className="h-7 w-7 text-slate-400 hover:text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                              {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                            </div>
                          </div>

                          {/* Expanded Items */}
                          {isExpanded && (
                            <div className="border-t border-slate-100 bg-slate-50/50 p-3 space-y-2">
                              {product.items.length === 0 ? (
                                <div className="text-center py-4 text-slate-400 text-xs border border-dashed border-slate-300 rounded-lg bg-white">
                                  No items yet. Add items with dimensions and calculations.
                                </div>
                              ) : (
                                product.items.map((item, itemIdx) => (
                                  <div key={item.tempId} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1.5">
                                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{itemIdx + 1}</span>
                                          {item.name && <span className="font-medium text-slate-700">{item.name}</span>}
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-slate-500">
                                          <span>L:{item.length}</span>
                                          <span>B:{item.breadth}</span>
                                          {parseFloat(item.height) > 0 && <span>H:{item.height}</span>}
                                          {parseFloat(item.thickness) > 0 && <span>T:{item.thickness}</span>}
                                          <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">CFT:{Number(item.item_cft).toFixed(2)}</span>
                                          <span className="bg-green-50 text-green-600 px-1.5 py-0.5 rounded">Qty:{item.quantity}</span>
                                          <span className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">₹{Number(item.rate).toFixed(2)}/CFT</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 ml-2">
                                        <span className="text-xs font-bold text-green-600 mr-1">₹{Number(item.total_amount).toFixed(2)}</span>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => openEditItemModal(product.tempId, item)} className="h-6 w-6 text-slate-400 hover:text-amber-600">
                                          <Edit2 className="h-3 w-3" />
                                        </Button>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(product.tempId, item.tempId)} className="h-6 w-6 text-slate-400 hover:text-red-600">
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => openAddItemModal(product.tempId)}
                                className="w-full mt-1 h-8 text-xs border-dashed border-amber-300 text-amber-700 hover:bg-amber-50"
                              >
                                <Plus className="h-3 w-3 mr-1" /> Add Item
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                    <Input type="number" step="0.01" placeholder="0.00" value={charges.transport_handling} onChange={(e) => setCharges((p) => ({ ...p, transport_handling: e.target.value }))} className="bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label>Discount (₹)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={charges.discount} onChange={(e) => setCharges((p) => ({ ...p, discount: e.target.value }))} className="bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax (₹)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={charges.tax} onChange={(e) => setCharges((p) => ({ ...p, tax: e.target.value }))} className="bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label>Labour Charges (₹)</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={charges.labour_charges} onChange={(e) => setCharges((p) => ({ ...p, labour_charges: e.target.value }))} className="bg-white" />
                  </div>
                </div>
              </div>

              {/* Attachments */}
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-amber-800 font-bold text-sm uppercase tracking-tight flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-amber-600" />
                  Attachments
                  {attachments.length > 0 && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{attachments.length} file(s)</span>}
                </h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-colors">
                    <Paperclip className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-600">{isUploadingAttachment ? "Processing..." : "Click to upload images"}</span>
                    <input type="file" accept="image/*" multiple onChange={handleFileChange} disabled={isUploadingAttachment} className="hidden" />
                  </label>
                  <span className="text-xs text-slate-400">Max 2MB per file</span>
                </div>
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {attachments.map((attachment, index) => (
                      <div key={index} className="relative group bg-white p-2 rounded-lg border border-slate-200 hover:border-amber-300 transition-colors">
                        <img src={attachment.preview} alt={`Attachment ${index + 1}`} className="h-20 w-20 object-cover rounded" />
                        <button type="button" onClick={() => handleRemoveAttachment(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                          <X className="h-3 w-3" />
                        </button>
                        <p className="text-xs text-slate-500 mt-1 max-w-[80px] truncate">{attachment.file.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
                <h3 className="text-amber-900 font-bold text-sm uppercase tracking-tight mb-4">Estimation Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 text-sm">
                  <div className="bg-white p-3 rounded-lg border border-amber-200">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Total CFT</p>
                    <p className="text-lg font-bold text-amber-700">{Number(productsSummary.totalCft).toFixed(2)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-amber-200">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Products Amount</p>
                    <p className="text-lg font-bold text-green-600">₹{Number(productsSummary.totalAmount).toFixed(2)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-amber-200">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Charges</p>
                    <p className="text-lg font-bold text-blue-600">₹{Number(chargesTotal).toFixed(2)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-3 rounded-lg border border-amber-600 shadow-sm">
                    <p className="text-[10px] text-white uppercase font-semibold">Grand Total</p>
                    <p className="text-xl font-black text-white">₹{Number(grandTotal).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t bg-slate-50 p-4 sm:p-6">
              <Button type="button" variant="outline" onClick={() => navigate(-1)} className="w-full sm:w-auto px-6 h-9">Cancel</Button>
              <Button
                type="submit"
                disabled={isSaving || estimationProducts.length === 0}
                className="w-full sm:w-auto px-8 h-9 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-sm transition-all text-xs disabled:opacity-50"
              >
                {isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>) : (<><Hammer className="mr-2 h-4 w-4" /> Create Estimation</>)}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* ─── Add Product Modal (Simple: just select product_id) ──── */}
      <Dialog open={isProductModalOpen} onOpenChange={(open) => { setIsProductModalOpen(open); if (!open) { setSelectedProductId(null); setSearchValue(""); } }}>
        <DialogContent className="sm:max-w-[500px] w-[calc(100%-3rem)] sm:w-full max-h-[90vh] overflow-y-auto rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Hammer className="h-5 w-5 text-amber-600" />
              Add Product to Estimation
            </DialogTitle>
            <DialogDescription className="sr-only">Select a product to add to the estimation.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Search Product</Label>
              <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" type="button" className="w-full justify-between bg-white">
                    {selectedProductId ? products.find((p) => p.id === selectedProductId)?.name : "Search or select a product..."}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Search products..." value={searchValue} onValueChange={setSearchValue} className="h-11" />
                    <CommandList>
                      {searchValue && filteredProducts.length === 0 ? (
                        <div className="p-4 text-center text-sm">
                          <p className="text-slate-500 mb-2">No product found for "{searchValue}"</p>
                          <Button type="button" size="sm" onClick={() => { setNewProductData({ name: searchValue.trim(), description: "" }); setShowNewProductForm(true); setIsComboboxOpen(false); }} className="bg-amber-500 hover:bg-amber-600 text-white">
                            Add "{searchValue}" as new product
                          </Button>
                        </div>
                      ) : (
                        <CommandGroup heading="Products">
                          {filteredProducts.map((product) => (
                            <CommandItem key={product.id} value={product.name} onSelect={() => handleSelectExistingProduct(product)}>
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
                <h4 className="text-amber-800 font-bold text-xs uppercase">New Product Details</h4>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs font-semibold">Product Name *</Label>
                    <Input placeholder="e.g., Teak Door Frame" value={newProductData.name} onChange={(e) => setNewProductData((p) => ({ ...p, name: e.target.value }))} autoFocus />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Description</Label>
                    <Textarea placeholder="Product description..." value={newProductData.description} onChange={(e) => setNewProductData((p) => ({ ...p, description: e.target.value }))} rows={2} />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={handleCreateProduct} disabled={isSavingProduct} className="bg-amber-500 hover:bg-amber-600 text-white">
                      {isSavingProduct ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Product"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => { setShowNewProductForm(false); setNewProductData({ name: "", description: "" }); }}>Cancel</Button>
                  </div>
                </div>
              </div>
            )}

            {/* Selected indicator */}
            {selectedProductId && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-800">
                  Selected: {products.find((p) => p.id === selectedProductId)?.name}
                </span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsProductModalOpen(false)} className="flex-1">Cancel</Button>
              <Button type="button" onClick={handleAddProduct} disabled={!selectedProductId} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold disabled:opacity-50">
                <Plus className="h-4 w-4 mr-1" /> Add Product
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Add/Edit Item Modal (Detailed: dimensions, CFT, rate) ──── */}
      <Dialog open={isItemModalOpen} onOpenChange={(open) => { setIsItemModalOpen(open); if (!open) { setCurrentItem(emptyItem()); setActiveProductTempId(null); } }}>
        <DialogContent className="sm:max-w-[600px] w-[calc(100%-3rem)] sm:w-full min-h-[60vh] sm:min-h-[500px] max-h-[90vh] overflow-y-auto rounded-lg top-[5%] translate-y-0 sm:top-[50%] sm:translate-y-[-50%]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              {currentItem.tempId && estimationProducts.find((p) => p.tempId === activeProductTempId)?.items.find((i) => i.tempId === currentItem.tempId)
                ? "Edit Item"
                : "Add Item"}
            </DialogTitle>
            <DialogDescription className="sr-only">Add or edit item details with dimensions and calculations.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Item Name */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Item Name (Optional)</Label>
              <Input placeholder="e.g., Shelf Panel A" value={currentItem.name} onChange={(e) => setCurrentItem((p) => ({ ...p, name: e.target.value }))} className="bg-white" />
            </div>

            {/* Dimensions & Calculation */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                <h4 className="text-blue-800 font-bold text-xs uppercase">Dimensions & Calculation</h4>
              </div>
              <div>
                <Label className="text-xs font-semibold">Unit Type / Calculation</Label>
                <select
                  value={currentItem.unit_type}
                  onChange={(e) => setCurrentItem((p) => ({ ...p, unit_type: e.target.value }))}
                  className="w-full h-10 border rounded-md px-3 py-2 bg-white text-sm"
                >
                  {CFT_CALCULATION_TYPES.map((type) => {
                    const shortDesc = type.description.replace("Dimensions in ", "").replace("Thickness in ", "").replace("Enter CFT manually", "Manual Entry");
                    return <option key={type.value} value={type.value}>{type.label} ({shortDesc})</option>;
                  })}
                </select>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4">
                {currentItem.unit_type !== "5" && (
                  <>
                    <div>
                      <Label className="text-[10px] text-slate-500">Length</Label>
                      <Input type="number" step="0.01" min="0.01" placeholder="0" value={currentItem.length}
                        onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                        onChange={(e) => { const val = handlePositiveNumber(e.target.value); setCurrentItem((p) => ({ ...p, length: val })); validateItemField("length", val); }}
                        onBlur={(e) => validateItemField("length", e.target.value)}
                        className={`h-9 text-sm bg-white ${itemErrors.length ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                      />
                      {itemErrors.length && <p className="text-red-500 text-[10px] mt-1">{itemErrors.length}</p>}
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500">Breadth</Label>
                      <Input type="number" step="0.01" min="0.01" placeholder="0" value={currentItem.breadth}
                        onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                        onChange={(e) => { const val = handlePositiveNumber(e.target.value); setCurrentItem((p) => ({ ...p, breadth: val })); validateItemField("breadth", val); }}
                        onBlur={(e) => validateItemField("breadth", e.target.value)}
                        className={`h-9 text-sm bg-white ${itemErrors.breadth ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                      />
                      {itemErrors.breadth && <p className="text-red-500 text-[10px] mt-1">{itemErrors.breadth}</p>}
                    </div>
                  </>
                )}
                {["1", "2"].includes(currentItem.unit_type) && (
                  <div>
                    <Label className="text-[10px] text-slate-500">Height</Label>
                    <Input type="number" step="0.01" min="0.01" placeholder="0" value={currentItem.height}
                      onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                      onChange={(e) => { const val = handlePositiveNumber(e.target.value); setCurrentItem((p) => ({ ...p, height: val })); validateItemField("height", val); }}
                      onBlur={(e) => validateItemField("height", e.target.value)}
                      className={`h-9 text-sm bg-white ${itemErrors.height ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    />
                    {itemErrors.height && <p className="text-red-500 text-[10px] mt-1">{itemErrors.height}</p>}
                  </div>
                )}
                {["3", "4"].includes(currentItem.unit_type) && (
                  <div>
                    <Label className="text-[10px] text-slate-500">Thickness</Label>
                    <Input type="number" step="0.01" min="0.01" placeholder="0" value={currentItem.thickness}
                      onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                      onChange={(e) => { const val = handlePositiveNumber(e.target.value); setCurrentItem((p) => ({ ...p, thickness: val })); validateItemField("thickness", val); }}
                      onBlur={(e) => validateItemField("thickness", e.target.value)}
                      className={`h-9 text-sm bg-white ${itemErrors.thickness ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    />
                    {itemErrors.thickness && <p className="text-red-500 text-[10px] mt-1">{itemErrors.thickness}</p>}
                  </div>
                )}
              </div>
              {currentItem.unit_type === "5" && (
                <div>
                  <Label className="text-xs font-semibold">CFT (Manual)</Label>
                  <Input type="number" step="0.01" min="0.01" placeholder="Enter CFT manually" value={currentItem.item_cft}
                    onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                    onChange={(e) => { const val = handlePositiveNumber(e.target.value); setCurrentItem((p) => ({ ...p, item_cft: parseFloat(val) })); validateItemField("item_cft", val); }}
                    onBlur={(e) => validateItemField("item_cft", e.target.value)}
                    className={`bg-white ${itemErrors.item_cft ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  />
                  {itemErrors.item_cft && <p className="text-red-500 text-[10px] mt-1">{itemErrors.item_cft}</p>}
                </div>
              )}
            </div>

            {/* Quantity & Rate */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Quantity</Label>
                <Input type="number" min="1" step="1" placeholder="1" value={currentItem.quantity}
                  onKeyDown={(e) => ["-", "e", "E", "."].includes(e.key) && e.preventDefault()}
                  onChange={(e) => { const val = handlePositiveNumber(e.target.value); setCurrentItem((p) => ({ ...p, quantity: parseInt(val) })); validateItemField("quantity", val); }}
                  onBlur={(e) => validateItemField("quantity", e.target.value)}
                  className={`bg-white ${itemErrors.quantity ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                {itemErrors.quantity && <p className="text-red-500 text-[10px] mt-1">{itemErrors.quantity}</p>}
              </div>
              <div>
                <Label className="text-xs font-semibold">Rate per CFT (₹)</Label>
                <Input type="number" step="0.01" min="0.01" placeholder="0.00" value={currentItem.rate}
                  onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()}
                  onChange={(e) => { const val = handlePositiveNumber(e.target.value); setCurrentItem((p) => ({ ...p, rate: parseFloat(val) })); validateItemField("rate", val); }}
                  onBlur={(e) => validateItemField("rate", e.target.value)}
                  className={`bg-white ${itemErrors.rate ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                {itemErrors.rate && <p className="text-red-500 text-[10px] mt-1">{itemErrors.rate}</p>}
              </div>
            </div>

            {/* Calculated Results */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-slate-500 uppercase">CFT</p>
                <p className="text-base font-bold text-blue-700">
                  {currentItem.unit_type === "5" ? (currentItem.item_cft || 0) : calculatedItemCft.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Total (CFT × Rate × Qty)</p>
                <p className="text-base font-bold text-green-600">₹{calculatedItemTotal.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Quantity</p>
                <p className="text-base font-bold text-purple-700">{currentItem.quantity}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setIsItemModalOpen(false); setCurrentItem(emptyItem()); }} className="flex-1">Cancel</Button>
              <Button type="button" onClick={handleSaveItem} disabled={!isItemFormValid} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold disabled:opacity-50">
                {estimationProducts.find((p) => p.tempId === activeProductTempId)?.items.find((i) => i.tempId === currentItem.tempId)
                  ? <><Edit2 className="h-4 w-4 mr-1" /> Update Item</>
                  : <><Plus className="h-4 w-4 mr-1" /> Add Item</>
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
