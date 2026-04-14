import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { estimationsApi } from '@/services/api';
import { showAlert, getErrorMessage } from '@/lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileSignature, Package, User, Building2, DollarSign, Image as ImageIcon, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface EstimationProductItem {
    id: number;
    name?: string;
    length?: number;
    breadth?: number;
    height?: number;
    thickness?: number;
    unit_type: string | number;
    quantity: number;
    rate: number;
    item_cft: number;
    total_amount: number;
}

interface EstimationProduct {
    id: number;
    estimation_id: number;
    product_id: number;
    total_cft: number;
    total_amount: number;
    product?: { id: number; name: string; description?: string } | null;
    items?: EstimationProductItem[];
}

interface EstimationSummary {
    total_products: number;
    total_items: number;
    total_cft: number;
    products_total: number;
    charges_total: number;
    grand_total: number;
    status: number | string;
    status_label: string;
}

interface EstimationOtherCharges {
    labour_charges: number;
    transport_and_handling: number;
    discount: number;
    approximate_tax: number;
    overall_total_cft: number;
    other_description?: string;
    other_description_amount: number;
}

interface EstimationAttachment {
    id: number;
    image_url?: string;
    url?: string;
    name?: string;
    description?: string;
    created_at: string;
}

interface Estimation {
    id: number;
    customer_id: number;
    project_id: number;
    description?: string;
    additional_notes?: string;
    grand_total: number;
    status: number | string;
    customer?: { id: number; name: string } | null;
    project?: { id: number; name: string; description?: string } | null;
    products?: EstimationProduct[];
}

interface EstimationResponse {
    data: Estimation;
    summary: EstimationSummary;
    other_charges: EstimationOtherCharges | null;
    attachments: EstimationAttachment[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getCftTypeLabel = (type: string | number) => {
    const types: Record<string, string> = {
        '1': '(L×B×H)/144 [Inches]',
        '2': '(L×B×H) [Feet]',
        '3': '(L×B×Thk)/12 [Thk Inches]',
        '4': '(L×B×Thk) [Thk Feet]',
        '5': 'Manual',
    };
    return types[String(type)] || 'Unknown';
};

const getDimensionsDisplay = (item: EstimationProductItem) => {
    const l = item.length || 0;
    const b = item.breadth || 0;
    const type = String(item.unit_type);

    if (type === '1' || type === '2') {
        return `${l} × ${b} × ${item.height || 0}`;
    } else if (type === '3' || type === '4') {
        return `${l} × ${b} × ${item.thickness || 0}`;
    }
    return '-';
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function EstimationView() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [response, setResponse] = useState<EstimationResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());

    useEffect(() => {
        const fetchEstimation = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const res = await estimationsApi.get(id);
                const data = res.data;
                setResponse(data);

                // Expand all products by default
                if (data?.data?.products) {
                    setExpandedProducts(new Set(data.data.products.map((p: EstimationProduct) => p.id)));
                }
            } catch (error) {
                showAlert('error', 'Error', getErrorMessage(error, 'Failed to load estimation'));
            } finally {
                setIsLoading(false);
            }
        };
        fetchEstimation();
    }, [id]);

    const toggleProduct = (productId: number) => {
        setExpandedProducts((prev) => {
            const next = new Set(prev);
            if (next.has(productId)) next.delete(productId); else next.add(productId);
            return next;
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-solarized-blue"></div>
            </div>
        );
    }

    if (!response || !response.data) {
        return (
            <div className="text-center py-12">
                <FileSignature className="mx-auto h-16 w-16 mb-4 opacity-20" />
                <h2 className="text-xl font-semibold mb-2">Estimation Not Found</h2>
                <p className="text-muted-foreground mb-4">The estimation you're looking for doesn't exist.</p>
                <Button onClick={() => navigate('/crm/estimations')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Estimations
                </Button>
            </div>
        );
    }

    const { data: estimation, summary, other_charges, attachments } = response;

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => navigate('/crm/estimations')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-800">Estimation Details</h1>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 uppercase">
                                {summary?.status_label || estimation.status || 'N/A'}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">Reference #{estimation.id}</p>
                    </div>
                </div>
            </div>

            {/* 1. General Information */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="pb-3 border-b bg-slate-50/50">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileSignature className="h-5 w-5 text-solarized-blue" />
                        General Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                        <div className="col-span-2 md:col-span-2">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-1">
                                <User className="h-4 w-4" /> Customer
                            </p>
                            <p className="font-semibold text-base">{estimation.customer?.name || `ID #${estimation.customer_id}`}</p>
                        </div>
                        <div className="col-span-2 md:col-span-2">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-1">
                                <Building2 className="h-4 w-4" /> Project
                            </p>
                            <p className="font-semibold text-base">{estimation.project?.name || (estimation.project_id ? `ID #${estimation.project_id}` : 'N/A')}</p>
                        </div>
                        <div className="col-span-2 md:col-span-4">
                            <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                            <p className="text-sm bg-slate-50 p-3 rounded-md border border-slate-100">{estimation.description || 'No description provided.'}</p>
                        </div>
                        {estimation.additional_notes && (
                            <div className="col-span-2 md:col-span-4">
                                <p className="text-sm font-medium text-muted-foreground mb-1">Additional Notes</p>
                                <p className="text-sm bg-slate-50 p-3 rounded-md border border-slate-100">{estimation.additional_notes}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 2. Products & Items (Collapsible) */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="pb-3 border-b bg-slate-50/50">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Package className="h-5 w-5 text-orange-600" />
                            Products ({estimation.products?.length || 0})
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-normal ml-2">
                                {summary?.total_items || 0} items
                            </span>
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                    {estimation.products && estimation.products.length > 0 ? (
                        estimation.products.map((product, index) => {
                            const isExpanded = expandedProducts.has(product.id);
                            const items = product.items || [];

                            return (
                                <div key={product.id} className="border border-slate-200 rounded-lg overflow-hidden hover:border-amber-300 transition-colors">
                                    {/* Product Header */}
                                    <div
                                        className="p-3 bg-white cursor-pointer hover:bg-slate-50/50 transition-colors"
                                        onClick={() => toggleProduct(product.id)}
                                    >
                                        {/* === MOBILE header (< sm) === */}
                                        <div className="sm:hidden">
                                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <span className="shrink-0 text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded font-bold">#{index + 1}</span>
                                                    <h4 className="font-semibold text-slate-800 text-sm truncate">
                                                        {product.product?.name || `Product #${product.product_id}`}
                                                    </h4>
                                                </div>
                                                {isExpanded ? <ChevronUp className="shrink-0 h-4 w-4 text-slate-400" /> : <ChevronDown className="shrink-0 h-4 w-4 text-slate-400" />}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                                <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{items.length} items</span>
                                                <span className="font-bold text-blue-600">{Number(product.total_cft || 0).toFixed(2)} CFT</span>
                                                <span className="font-bold text-green-600">&#8377;{Number(product.total_amount || 0).toFixed(2)}</span>
                                            </div>
                                        </div>

                                        {/* === DESKTOP header (sm+) — original layout unchanged === */}
                                        <div className="hidden sm:flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded font-bold">#{index + 1}</span>
                                                <h4 className="font-semibold text-slate-800 text-sm">
                                                    {product.product?.name || `Product #${product.product_id}`}
                                                </h4>
                                                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{items.length} items</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-bold text-blue-600">{Number(product.total_cft || 0).toFixed(2)} CFT</span>
                                                <span className="text-sm font-bold text-green-600">&#8377;{Number(product.total_amount || 0).toFixed(2)}</span>
                                                {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items Table (expanded) */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-100 bg-slate-50/30">
                                            {/* Desktop Table */}
                                            <div className="hidden md:block overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-slate-50">
                                                        <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-200">
                                                            <th className="px-3 py-2 font-semibold">#</th>
                                                            <th className="px-3 py-2 font-semibold">Name</th>
                                                            <th className="px-3 py-2 font-semibold">Formula</th>
                                                            <th className="px-3 py-2 font-semibold">Dimensions</th>
                                                            <th className="px-3 py-2 text-right font-semibold">Qty</th>
                                                            <th className="px-3 py-2 text-right font-semibold">CFT</th>
                                                            <th className="px-3 py-2 text-right font-semibold">Rate</th>
                                                            <th className="px-3 py-2 text-right font-semibold">Total (₹)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {items.map((item, itemIdx) => (
                                                            <tr key={item.id} className="border-b border-slate-100 hover:bg-white transition-colors">
                                                                <td className="px-3 py-2 text-xs text-slate-400">{itemIdx + 1}</td>
                                                                <td className="px-3 py-2 font-medium text-slate-700">{item.name || '-'}</td>
                                                                <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{getCftTypeLabel(item.unit_type)}</td>
                                                                <td className="px-3 py-2">
                                                                    <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{getDimensionsDisplay(item)}</span>
                                                                </td>
                                                                <td className="px-3 py-2 text-right font-medium">{item.quantity}</td>
                                                                <td className="px-3 py-2 text-right font-semibold text-blue-600">{Number(item.item_cft || 0).toFixed(2)}</td>
                                                                <td className="px-3 py-2 text-right text-slate-600">₹{Number(item.rate || 0).toFixed(2)}</td>
                                                                <td className="px-3 py-2 text-right font-semibold text-slate-900">₹{Number(item.total_amount || 0).toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                        {/* Product subtotal row */}
                                                        <tr className="bg-amber-50/50 font-semibold">
                                                            <td colSpan={7} className="px-3 py-2 text-right text-xs text-amber-800 uppercase">Product Subtotal</td>
                                                            <td className="px-3 py-2 text-right text-amber-800">₹{Number(product.total_amount || 0).toFixed(2)}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Mobile Cards */}
                                            <div className="md:hidden divide-y divide-slate-100">
                                                {items.map((item, itemIdx) => (
                                                    <div key={item.id} className="p-2.5 space-y-1.5 text-xs">
                                                        {/* Row 1: index + name + total */}
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                                <span className="shrink-0 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{itemIdx + 1}</span>
                                                                <span className="font-semibold text-slate-700 truncate">{item.name || 'Item'}</span>
                                                            </div>
                                                            <span className="shrink-0 font-bold text-green-600">&#8377;{Number(item.total_amount || 0).toFixed(2)}</span>
                                                        </div>
                                                        {/* Row 2: formula + dimensions */}
                                                        <div className="flex flex-wrap gap-1">
                                                            <span className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-slate-500 text-[10px]">{getCftTypeLabel(item.unit_type)}</span>
                                                            {String(item.unit_type) !== '5' && (
                                                                <span className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-600 text-[10px]">{getDimensionsDisplay(item)}</span>
                                                            )}
                                                        </div>
                                                        {/* Row 3: Qty + Rate + CFT */}
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span className="bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-medium">Qty: {item.quantity}</span>
                                                            <span className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-medium">&#8377;{Number(item.rate || 0).toFixed(2)}/CFT</span>
                                                            <span className="ml-auto bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">CFT: {Number(item.item_cft || 0).toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="h-32 flex flex-col items-center justify-center text-muted-foreground bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                            <Package className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm">No products found in this estimation.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 3. Breakdown & Summary */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Other Charges */}
                <Card className="shadow-sm border-slate-200 h-fit">
                    <CardHeader className="pb-3 border-b bg-slate-50/50">
                        <CardTitle className="text-lg">Other Charges Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-5 space-y-3">
                        {other_charges ? (
                            <>
                                <div className="flex justify-between items-center text-sm p-2 rounded hover:bg-slate-50">
                                    <span className="text-muted-foreground">Labour Charges</span>
                                    <span className="font-medium">₹{Number(other_charges.labour_charges || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm p-2 rounded hover:bg-slate-50">
                                    <span className="text-muted-foreground">Transport & Handling</span>
                                    <span className="font-medium">₹{Number(other_charges.transport_and_handling || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm p-2 rounded hover:bg-slate-50">
                                    <span className="text-muted-foreground">Approximate Tax</span>
                                    <span className="font-medium">₹{Number(other_charges.approximate_tax || 0).toFixed(2)}</span>
                                </div>
                                {(other_charges.other_description_amount || 0) > 0 && (
                                    <div className="flex justify-between items-center text-sm p-2 rounded hover:bg-slate-50">
                                        <span className="text-muted-foreground">{other_charges.other_description || 'Other Custom Charge'}</span>
                                        <span className="font-medium">₹{Number(other_charges.other_description_amount || 0).toFixed(2)}</span>
                                    </div>
                                )}
                                {(other_charges.discount || 0) > 0 && (
                                    <div className="flex justify-between items-center text-sm p-2 rounded bg-rose-50/50 text-rose-700">
                                        <span>Discount (-)</span>
                                        <span className="font-semibold">₹{Number(other_charges.discount || 0).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-4 mt-2 border-t border-slate-200 font-semibold px-2">
                                    <span>Net Charges</span>
                                    <span className="text-lg">₹{Number(summary?.charges_total || 0).toFixed(2)}</span>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-6 text-muted-foreground">
                                <p className="text-sm">No other charges applied.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Financial Summary */}
                <Card className="bg-gradient-to-b from-slate-50 to-white border-slate-200 shadow-sm h-fit">
                    <CardHeader className="pb-3 border-b border-slate-200 bg-white">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-emerald-600" />
                            Financial Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-5 space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Total Products</span>
                            <span className="font-semibold text-base">{summary?.total_products || 0}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Total Items</span>
                            <span className="font-semibold text-base">{summary?.total_items || 0}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Total CFT</span>
                            <span className="font-semibold text-base">{Number(summary?.total_cft || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-3 border-t border-slate-200">
                            <span className="text-muted-foreground">Products Total</span>
                            <span className="font-semibold text-base text-slate-800">₹{Number(summary?.products_total || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Other Charges Total</span>
                            <span className="font-semibold text-base text-slate-800">₹{Number(summary?.charges_total || 0).toFixed(2)}</span>
                        </div>
                        <div className="mt-5 pt-4 border-t border-emerald-200 bg-emerald-50/80 -mx-6 -mb-6 px-6 py-5 rounded-b-lg flex flex-col gap-1">
                            <span className="font-semibold text-emerald-800 uppercase text-xs tracking-wider">Grand Total</span>
                            <span className="font-bold text-3xl text-emerald-700">₹{Number(summary?.grand_total || 0).toFixed(2)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 4. Attachments */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="pb-3 border-b bg-slate-50/50">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <ImageIcon className="h-5 w-5 text-indigo-500" />
                        Attachments ({attachments?.length || 0})
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                    {attachments && attachments.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {attachments.map((attachment) => {
                                const imageUrl = attachment.url || attachment.image_url || '';
                                return (
                                    <div key={attachment.id} className="group relative rounded-md overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all">
                                        <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="block focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                                            <div className="aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
                                                <img
                                                    src={imageUrl}
                                                    alt={attachment.name || attachment.description || "Attachment"}
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.src = 'https://placehold.co/400x400/f8fafc/94a3b8?text=Image+Error';
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                                            </div>
                                        </a>
                                        {(attachment.name || attachment.description) && (
                                            <div className="p-2.5 text-xs text-slate-700 bg-white border-t border-slate-100 line-clamp-2" title={attachment.name || attachment.description}>
                                                {attachment.name || attachment.description}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                            <ImageIcon className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                            <p className="text-sm font-medium text-slate-500">No attachments provided</p>
                            <p className="text-xs text-slate-400 mt-1">Files attached to this estimation will appear here.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
