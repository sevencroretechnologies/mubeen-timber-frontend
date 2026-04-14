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
  id?: number;
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
  id?: number;
  tempId: string;
  product_id: number | null;
  product_name?: string;
  items: EstimationItem[];
  deleted_item_ids: number[];
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

export default function EditEstimation() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Basic Form data
  const [formData, setFormData] = useState({ description: "", additional_notes: "", status: "draft" });

  // Additional Charges
  const [charges, setCharges] = useState({ transport_handling: "", discount: "", tax: "", labour_charges: "" });

  // Products with nested Items
  const [estimationProducts, setEstimationProducts] = useState<EstimationProduct[]>([]);
  const [deletedProductIds, setDeletedProductIds] = useState<number[]>([]);

  // Fetched data
  const [products, setProducts] = useState<any[]>([]);
  const [project, setProject] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);

  // Product Selection
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
  const [attachments, setAttachments] = useState<Array<{ file?: File; preview: string; base64: string }>>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  // ─── Computed Values ─────────────────────────────────────────────

  const filteredProducts = useMemo(() => {
    if (!searchValue.trim()) return products;
    return products.filter((p) => (p.name || "").toLowerCase().includes(searchValue.toLowerCase()));
  }, [products, searchValue]);

  const calculatedItemCft = useMemo(() => calculateItemCft(currentItem), [currentItem]);

  const calculatedItemTotal = useMemo(() => {
    const cft = currentItem.unit_type === "5" ? (currentItem.item_cft || 0) : calculatedItemCft;
    const rate = typeof currentItem.rate === "string" ? parseFloat(currentItem.rate as any) || 0 : currentItem.rate;
    const qty = typeof currentItem.quantity === "string" ? parseInt(currentItem.quantity as any) || 1 : currentItem.quantity;
    return calculateItemTotal(cft, rate, qty);
  }, [calculatedItemCft, currentItem]);

  const productsSummary = useMemo(() => {
    let totalCft = 0, totalAmount = 0, totalItems = 0;
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

  // ─── Fetch ───────────────────────────────────────────────────────

  const fetchEstimationData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await estimationsApi.get(id);
      const est = res?.data?.data || res?.data || res;

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

      // Products with nested items
      if (est.products && Array.isArray(est.products)) {
        const mappedProducts: EstimationProduct[] = est.products.map((p: any) => {
          const items: EstimationItem[] = (p.items || []).map((item: any) => ({
            id: item.id,
            tempId: `saved_item_${item.id}`,
            name: item.name || "",
            length: String(item.length || ""),
            breadth: String(item.breadth || ""),
            height: String(item.height || ""),
            thickness: String(item.thickness || ""),
            unit_type: String(item.unit_type || "1"),
            quantity: Number(item.quantity) || 1,
            rate: Number(item.rate) || 0,
            item_cft: Number(item.item_cft) || 0,
            total_amount: Number(item.total_amount) || 0,
          }));

          return {
            id: p.id,
            tempId: `saved_${p.id}`,
            product_id: p.product_id,
            product_name: p.product?.name,
            items,
            deleted_item_ids: [],
            total_cft: Number(p.total_cft) || items.reduce((sum: number, i: EstimationItem) => sum + (i.item_cft * i.quantity), 0),
            total_amount: Number(p.total_amount) || items.reduce((sum: number, i: EstimationItem) => sum + i.total_amount, 0),
          };
        });

        setEstimationProducts(mappedProducts);
        // Expand all products by default
        setExpandedProducts(new Set(mappedProducts.map((p: EstimationProduct) => p.tempId)));
      }

      // Project & Customer
      if (est.project) setProject(est.project);
      else if (est.project_id) {
        const projRes = await projectApi.get(est.project_id);
        setProject((projRes as any).data || projRes);
      }
      if (est.customer) setCustomer(est.customer);
      else if (est.customer_id) {
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
    } catch (err) { console.error("Products fetch failed:", err); }
  }, []);

  useEffect(() => {
    fetchEstimationData();
    fetchProducts();
  }, [fetchEstimationData, fetchProducts]);

  // ─── Product Handlers ────────────────────────────────────────────

  const handleAddProduct = () => {
    if (!selectedProductId) { showAlert("error", "Validation", "Please select a product"); return; }
    const newProduct: EstimationProduct = {
      tempId: `product_${Date.now()}`,
      product_id: selectedProductId,
      product_name: products.find((p) => p.id === selectedProductId)?.name,
      items: [],
      deleted_item_ids: [],
      total_cft: 0,
      total_amount: 0,
    };
    setEstimationProducts((prev) => [...prev, newProduct]);
    setExpandedProducts((prev) => new Set(prev).add(newProduct.tempId));
    setSelectedProductId(null);
    setSearchValue("");
    setIsProductModalOpen(false);
  };

  const handleRemoveProduct = (tempId: string) => {
    const productToRemove = estimationProducts.find((p) => p.tempId === tempId);
    if (productToRemove?.id) setDeletedProductIds((prev) => [...prev, productToRemove.id!]);
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
        const itemToRemove = product.items.find((i) => i.tempId === itemTempId);
        let newDeletedIds = [...product.deleted_item_ids];
        if (itemToRemove?.id) newDeletedIds.push(itemToRemove.id);
        const updatedItems = product.items.filter((i) => i.tempId !== itemTempId);
        const total_cft = roundToTwo(updatedItems.reduce((sum, i) => sum + (i.item_cft * i.quantity), 0));
        const total_amount = roundToTwo(updatedItems.reduce((sum, i) => sum + i.total_amount, 0));
        return { ...product, items: updatedItems, deleted_item_ids: newDeletedIds, total_cft, total_amount };
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
    if (!newProductData.name.trim()) return;
    setIsSavingProduct(true);
    try {
      const response = await crmProductService.create({ name: newProductData.name.trim(), description: newProductData.description.trim() || null });
      const created = (response as any).data?.data || (response as any).data || response;
      setProducts((prev) => [created, ...prev]);
      setSelectedProductId(created.id);
      setShowNewProductForm(false);
      setNewProductData({ name: "", description: "" });
    } catch (error) {
      showAlert("error", "Error", "Failed to create product");
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
        if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) continue;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          setAttachments((prev) => [...prev, { file, preview: URL.createObjectURL(file), base64: reader.result as string }]);
        };
      }
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = '';
    }
  };

  // ─── Submit ──────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || estimationProducts.length === 0) { showAlert("error", "Validation", "Please add at least one product"); return; }

    const emptyProduct = estimationProducts.find((p) => p.items.length === 0);
    if (emptyProduct) {
      const name = emptyProduct.product_name || products.find((pr) => pr.id === emptyProduct.product_id)?.name || "Unknown";
      showAlert("error", "Validation", `Product "${name}" has no items. Please add at least one item.`);
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
          deleted_item_ids: p.deleted_item_ids,
          items: p.items.map((item) => ({
            id: item.id || null,
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
        deleted_product_ids: deletedProductIds,
        transport_handling: parseFloat(charges.transport_handling) || 0,
        discount: parseFloat(charges.discount) || 0,
        tax: parseFloat(charges.tax) || 0,
        labour_charges: parseFloat(charges.labour_charges) || 0,
        total_cft: productsSummary.totalCft,
        attachments: attachments.filter((a) => a.base64.startsWith('data:image')).map((a) => a.base64),
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
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full bg-white shadow-sm">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Edit Estimation</h1>
            <p className="text-slate-500 text-sm mt-0.5 font-medium">{customer?.name} {project ? `• ${project.name}` : ""}</p>
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
              {/* Basic Information */}
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-amber-800 font-bold text-sm uppercase tracking-tight flex items-center gap-2">
                  <div className="h-1 w-6 bg-amber-600 rounded-full"></div>
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea placeholder="Brief description..." value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <select value={formData.status} onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))} className="w-full h-10 px-3 py-2 border rounded-md text-sm bg-white">
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
                  <Button type="button" size="sm" onClick={() => { setSelectedProductId(null); setSearchValue(""); setShowNewProductForm(false); setIsProductModalOpen(true); fetchProducts(); }} className="h-8 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Product
                  </Button>
                </div>

                {estimationProducts.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm bg-white rounded-lg border border-dashed border-slate-300">
                    No products added. Click "Add Product" to start.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {estimationProducts.map((product, index) => {
                      const productInfo = product.product_name || products.find((p) => p.id === product.product_id)?.name || "Unknown Product";
                      const isExpanded = expandedProducts.has(product.tempId);
                      return (
                        <div key={product.tempId} className={`bg-white rounded-lg border transition-all overflow-hidden ${activeProductTempId === product.tempId ? "border-amber-500 ring-2 ring-amber-500/20 shadow-md scale-[1.005]" : "border-slate-200 hover:border-amber-300"}`}>
                          <div className="p-3 flex items-center justify-between cursor-pointer" onClick={() => toggleProductExpanded(product.tempId)}>
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">#{index + 1}</span>
                              <h4 className="font-semibold text-slate-800 text-sm">{productInfo}</h4>
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
                              <Button type="button" size="sm" variant="outline" onClick={() => openAddItemModal(product.tempId)} className="w-full mt-1 h-8 text-xs border-dashed border-amber-300 text-amber-700 hover:bg-amber-50">
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
                  <IndianRupee className="h-4 w-4 text-amber-600" /> Additional Charges
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['transport_handling', 'discount', 'tax', 'labour_charges'].map((field) => (
                    <div key={field} className="space-y-2">
                      <Label className="capitalize">{field.replace('_', ' ')} (₹)</Label>
                      <Input type="number" step="0.01" value={(charges as any)[field]} onChange={(e) => setCharges((p) => ({ ...p, [field]: e.target.value }))} className="bg-white" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
                <h3 className="text-amber-900 font-bold text-sm uppercase mb-4 tracking-tight">Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 text-sm">
                  {[
                    { label: 'Total CFT', value: Number(productsSummary.totalCft).toFixed(2), color: 'text-amber-700' },
                    { label: 'Products Amount', value: `₹${Number(productsSummary.totalAmount).toFixed(2)}`, color: 'text-green-600' },
                    { label: 'Charges', value: `₹${Number(chargesTotal).toFixed(2)}`, color: 'text-blue-600' }
                  ].map((item) => (
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

      {/* ─── Add Product Modal ──── */}
      <Dialog open={isProductModalOpen} onOpenChange={(open) => { setIsProductModalOpen(open); if (!open) { setSelectedProductId(null); setSearchValue(""); } }}>
        <DialogContent className="sm:max-w-[500px] w-[calc(100%-3rem)] sm:w-full max-h-[90vh] overflow-y-auto rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Hammer className="h-5 w-5 text-amber-600" /> Add Product
            </DialogTitle>
            <DialogDescription className="sr-only">Select a product to add.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Search Product</Label>
              <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" type="button" className="w-full justify-between bg-white">
                    {selectedProductId ? products.find((p) => p.id === selectedProductId)?.name : "Select a product..."}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Search products..." value={searchValue} onValueChange={setSearchValue} className="h-11" />
                    <CommandList>
                      {searchValue && filteredProducts.length === 0 ? (
                        <div className="p-4 text-center text-sm">
                          <p className="text-slate-500 mb-2">No product found</p>
                          <Button type="button" size="sm" onClick={() => { setNewProductData({ name: searchValue.trim(), description: "" }); setShowNewProductForm(true); setIsComboboxOpen(false); }} className="text-amber-600 border-amber-200 hover:bg-amber-50" variant="outline">
                            <Plus className="h-4 w-4 mr-2" /> Create New Product
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
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                <h4 className="text-amber-800 font-bold text-xs uppercase">New Product Details</h4>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs font-semibold">Product Name *</Label>
                    <Input placeholder="e.g., Teak Door" value={newProductData.name} onChange={(e) => setNewProductData((p) => ({ ...p, name: e.target.value }))} className="h-9" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Description</Label>
                    <Textarea placeholder="Product description..." value={newProductData.description} onChange={(e) => setNewProductData((p) => ({ ...p, description: e.target.value }))} rows={2} className="text-sm bg-white" />
                  </div>
                  <Button type="button" size="sm" onClick={handleCreateProduct} disabled={isSavingProduct} className="bg-amber-500 hover:bg-amber-600 text-white w-full">
                    {isSavingProduct ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Product"}
                  </Button>
                </div>
              </div>
            )}

            {selectedProductId && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-800">Selected: {products.find((p) => p.id === selectedProductId)?.name}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsProductModalOpen(false)} className="flex-1">Cancel</Button>
              <Button type="button" onClick={handleAddProduct} disabled={!selectedProductId} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold disabled:opacity-50">
                <Plus className="h-4 w-4 mr-1" /> Add Product
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Add/Edit Item Modal ──── */}
      <Dialog open={isItemModalOpen} onOpenChange={(open) => { setIsItemModalOpen(open); if (!open) { setCurrentItem(emptyItem()); setActiveProductTempId(null); } }}>
        <DialogContent className="sm:max-w-[600px] w-[calc(100%-3rem)] sm:w-full min-h-[60vh] sm:min-h-[500px] max-h-[90vh] overflow-y-auto rounded-lg top-[5%] translate-y-0 sm:top-[50%] sm:translate-y-[-50%]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-800 flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-600" />
                {currentItem.tempId && estimationProducts.find((p) => p.tempId === activeProductTempId)?.items.find((i) => i.tempId === currentItem.tempId) ? "Edit Item" : "Add Item"}
              </div>
              {activeProductTempId && (
                <div className="text-sm font-bold text-amber-700 ml-7 flex items-center gap-2 mt-1">
                  <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap">Product:</span>
                  <span className="bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200 shadow-sm animate-in fade-in slide-in-from-left-2 duration-300">
                    {(() => {
                      const activeP = estimationProducts.find((p) => p.tempId === activeProductTempId);
                      return activeP?.product_name || products.find((p) => p.id === activeP?.product_id)?.name || "Unknown Product";
                    })()}
                  </span>
                </div>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">Add or edit item details with dimensions and calculations.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Item Name (Optional)</Label>
              <Input placeholder="e.g., Shelf Panel A" value={currentItem.name} onChange={(e) => setCurrentItem((p) => ({ ...p, name: e.target.value }))} className="bg-white" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                <h4 className="text-blue-800 font-bold text-xs uppercase">Dimensions & Calculation</h4>
              </div>
              <div>
                <Label className="text-xs font-semibold">Unit Type / Calculation</Label>
                <select value={currentItem.unit_type} onChange={(e) => setCurrentItem((p) => ({ ...p, unit_type: e.target.value }))} className="w-full h-10 border rounded-md px-3 bg-white text-sm">
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
                      <Input type="number" step="0.01" value={currentItem.length} onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()} onChange={(e) => { const val = handlePositiveNumber(e.target.value); setCurrentItem((p) => ({ ...p, length: val })); validateItemField("length", val); }} className={`h-9 text-sm ${itemErrors.length ? "border-red-500" : ""}`} />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500">Breadth</Label>
                      <Input type="number" step="0.01" value={currentItem.breadth} onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()} onChange={(e) => { const val = handlePositiveNumber(e.target.value); setCurrentItem((p) => ({ ...p, breadth: val })); validateItemField("breadth", val); }} className={`h-9 text-sm ${itemErrors.breadth ? "border-red-500" : ""}`} />
                    </div>
                  </>
                )}
                {["1", "2"].includes(currentItem.unit_type) && (
                  <div>
                    <Label className="text-[10px] text-slate-500">Height</Label>
                    <Input type="number" step="0.01" value={currentItem.height} onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()} onChange={(e) => { const val = handlePositiveNumber(e.target.value); setCurrentItem((p) => ({ ...p, height: val })); validateItemField("height", val); }} className={`h-9 text-sm ${itemErrors.height ? "border-red-500" : ""}`} />
                  </div>
                )}
                {["3", "4"].includes(currentItem.unit_type) && (
                  <div>
                    <Label className="text-[10px] text-slate-500">Thickness</Label>
                    <Input type="number" step="0.01" value={currentItem.thickness} onKeyDown={(e) => ["-", "e", "E"].includes(e.key) && e.preventDefault()} onChange={(e) => { const val = handlePositiveNumber(e.target.value); setCurrentItem((p) => ({ ...p, thickness: val })); validateItemField("thickness", val); }} className={`h-9 text-sm ${itemErrors.thickness ? "border-red-500" : ""}`} />
                  </div>
                )}
              </div>
              {currentItem.unit_type === "5" && (
                <div className="mt-2">
                  <Label className="text-xs font-semibold">CFT (Manual)</Label>
                  <Input type="number" step="0.01" placeholder="Enter CFT manually" value={currentItem.item_cft} onChange={(e) => { const val = handlePositiveNumber(e.target.value); setCurrentItem((p) => ({ ...p, item_cft: parseFloat(val) })); validateItemField("item_cft", val); }} className={`bg-white h-10 ${itemErrors.item_cft ? "border-red-500" : ""}`} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Quantity</Label>
                <Input type="number" value={currentItem.quantity} onChange={(e) => { const val = handlePositiveNumber(e.target.value); setCurrentItem((p) => ({ ...p, quantity: parseInt(val) })); validateItemField("quantity", val); }} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Rate (₹)</Label>
                <Input type="number" step="0.01" value={currentItem.rate} onChange={(e) => { const val = handlePositiveNumber(e.target.value); setCurrentItem((p) => ({ ...p, rate: parseFloat(val) })); validateItemField("rate", val); }} />
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-slate-500 uppercase">CFT</p>
                <p className="text-base font-bold text-blue-700">{currentItem.unit_type === "5" ? currentItem.item_cft || 0 : calculatedItemCft.toFixed(2)}</p>
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

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsItemModalOpen(false)} className="flex-1">Cancel</Button>
              <Button type="button" onClick={handleSaveItem} disabled={!isItemFormValid} className="flex-1 bg-amber-600 text-white disabled:opacity-50">
                {estimationProducts.find((p) => p.tempId === activeProductTempId)?.items.find((i) => i.tempId === currentItem.tempId) ? "Update" : "Add"} Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
