import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    crmOpportunityService,
    crmStatusService,
    crmSourceService,
    crmOpportunityTypeService,
    crmOpportunityStageService,
    crmLeadService,
    // crmTerritoryService,
    // crmCustomerService,
    // crmContactService,
    crmProductService,
    // crmProductCategoryService,
} from '../../../services/api';
import { showAlert, getErrorMessage } from '../../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Checkbox } from '../../../components/ui/checkbox';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select';
import { ArrowLeft, Save, X } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface DDItem { id: number;[k: string]: unknown; }

function extractList(res: { data: unknown }): DDItem[] {
    const raw = res.data as Record<string, unknown> | DDItem[];
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') {
        const inner = (raw as Record<string, unknown>).data;
        // Flat paginated: { data: [...] }
        if (Array.isArray(inner)) return inner as DDItem[];
        // Nested paginated: { data: { data: [...], total } } — backend wraps in extra level
        if (inner && typeof inner === 'object') {
            const deepInner = (inner as Record<string, unknown>).data;
            if (Array.isArray(deepInner)) return deepInner as DDItem[];
        }
    }
    return [];
}

interface OppItem {
    product_id?: number | null;
    item_code: string;
    item_name: string;
    qty: number | string;
    rate: number | string;
    amount: number | string;
    category_id?: number | null;
    description?: string;
    long_description?: string;
    slug?: string;
    stock?: number;
    is_new_product?: boolean;
}

const EMPTY_ITEM: OppItem = {
    item_code: '', item_name: '', qty: '', rate: 0, amount: '',
    description: '', long_description: '', slug: '', stock: 0, is_new_product: false,
};

// ══════════════════════════════════════════════════════════════════════════════
export default function OpportunityForm() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEdit = Boolean(id);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [form, setForm] = useState<Record<string, any>>({
        opportunity_from: 'lead',
        currency: 'INR',
        probability: 0,
        with_items: false,
        items: [],
    });

    // Dropdown state
    const [statuses, setStatuses] = useState<DDItem[]>([]);
    const [sources, setSources] = useState<DDItem[]>([]);
    const [opportunityTypes, setOpportunityTypes] = useState<DDItem[]>([]);
    const [opportunityStages, setOpportunityStages] = useState<DDItem[]>([]);
    const [leads, setLeads] = useState<DDItem[]>([]);
    const [territories, setTerritories] = useState<DDItem[]>([]);
    const [customers, setCustomers] = useState<DDItem[]>([]);
    const [contacts, setContacts] = useState<DDItem[]>([]);
    const [products, setProducts] = useState<DDItem[]>([]);
    const [categories, setCategories] = useState<DDItem[]>([]);

    const [selectedProducts, setSelectedProducts] = useState<any[]>([]);

    // ── Load all dropdowns on mount ───────────────────────────────────────────────
    useEffect(() => {
        const fetchAll = async () => {
            const results = await Promise.allSettled([
                crmStatusService.getAll({ per_page: 200 }),
                crmSourceService.getAll({ per_page: 200 }),
                crmOpportunityTypeService.getAll({ per_page: 200 }),
                crmOpportunityStageService.getAll({ per_page: 200 }),
                crmLeadService.getAll({ per_page: 500 }),
                // crmTerritoryService.getAll({ per_page: 200 }),
                // crmCustomerService.getAll({ per_page: 500 }),
                // crmContactService.getAll({ per_page: 500 }),
                crmProductService.getAll({ per_page: 1000 }),
                // crmProductCategoryService.getAll({ per_page: 200 }),
            ]);

            const setters = [
                setStatuses, setSources, setOpportunityTypes, setOpportunityStages,
                setLeads, setCustomers, setContacts, setProducts, setCategories
            ];

            results.forEach((res, idx) => {
                const setter = setters[idx];
                if (res.status === 'fulfilled') {
                    setter(extractList(res.value));
                } else {
                    console.error(`Dropdown load failed at index ${idx}:`, res.reason);
                }
            });
        };

        fetchAll();
    }, []);

    // ── Load existing opportunity when editing ────────────────────────────────────
    useEffect(() => {
        if (!id) return;
        setLoading(true);
        crmOpportunityService.getById(Number(id))
            .then(async (r) => {
                const item = r.data as Record<string, unknown>;
                let existingItems: OppItem[] = [];
                try {
                    const pr = await crmOpportunityService.getProducts(Number(id));
                    const raw = pr.data;
                    const arr = Array.isArray(raw) ? raw : [];
                    existingItems = arr.map((p: Record<string, unknown>) => ({
                        product_id: p.product_id as number,
                        item_code: String(p.item_code ?? ''),
                        item_name: String(p.item_name ?? ''),
                        qty: p.qty as number,
                        rate: p.rate as number ?? 0,
                        amount: p.amount as number ?? 0,
                        description: String(p.description ?? ''),
                    }));
                } catch { /* no items */ }

                setForm({
                    ...item,
                    expected_closing: item.expected_closing ? String(item.expected_closing).split('T')[0] : '',
                    next_contact_date: item.next_contact_date ? String(item.next_contact_date).split('T')[0] : '',
                    with_items: Boolean(item.with_items) || existingItems.length > 0,
                });
                setSelectedProducts(existingItems.map(p => ({
                    id: p.product_id,
                    name: p.item_name,
                    price: p.rate || 0,
                    qty: p.qty || 1
                })));
            })
            .catch(() => {
                showAlert('error', 'Error', 'Failed to load opportunity');
                navigate('/crm/opportunities');
            })
            .finally(() => setLoading(false));
    }, [id, navigate]);


    const setField = (key: string, value: unknown) => setForm((p: Record<string, unknown>) => ({ ...p, [key]: value }));

    // ── Product search / item helpers ─────────────────────────────────────────────
    const handleProductSelect = (product: DDItem) => {
        if (selectedProducts.find(p => p.id === product.id)) {
            showAlert('warning', 'Duplicate', 'Product already added');
            return;
        }
        setSelectedProducts([...selectedProducts, {
            id: product.id,
            name: product.name,
            price: product.price || 0,
            qty: 1
        }]);
    };

    const removeSelectedProduct = (productId: number) => {
        const updated = selectedProducts.filter(p => p.id !== productId);
        setSelectedProducts(updated);
    };

    const updateProductQty = (productId: number, qty: string) => {
        const numQty = parseInt(qty) || 1;
        setSelectedProducts(selectedProducts.map(p => 
            p.id === productId ? { ...p, qty: numQty } : p
        ));
    };

    // ── Submit ─────────────────────────────────────────────────────────────────────
    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setSubmitting(true);
        try {
            // Strip relation objects, keep primitive IDs — mirrors crm-frontend destructure
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { status, source, industry, owner, lead, customer, contact, prospect, opportunityType, opportunityStage, ...cleanForm } = form;
            const payload: Record<string, unknown> = {
                ...cleanForm,
                with_items: selectedProducts.length > 0,
                products: selectedProducts.map(p => ({
                    product_id: p.id,
                    quantity: p.qty
                })),
                opportunity_lost_reasons: form.opportunity_lost_reasons ?? null,
            };

            if (isEdit) {
                await crmOpportunityService.update(Number(id), payload);
                showAlert('success', 'Updated!', 'Opportunity saved successfully!', 2000);
            } else {
                await crmOpportunityService.create(payload);
                showAlert('success', 'Created!', 'Opportunity saved successfully!', 2000);
            }
            navigate('/crm/opportunities');
        } catch (err) {
            showAlert('error', 'Error', getErrorMessage(err, 'Failed to save opportunity.'));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-solarized-blue" />
            </div>
        );
    }

    // ── Helper to get label for any dropdown item ─────────────────────────────────
    const lbl = (item: DDItem, ...keys: string[]) => {
        for (const k of keys) if (item[k]) return String(item[k]);
        return String(item.id);
    };

    return (
        <div className="space-y-6">
            {/* Breadcrumb / header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => navigate('/crm/opportunities')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Opportunities &rsaquo; {isEdit ? (form.naming_series || 'Edit') : 'New'}
                        </p>
                        <h2 className="text-2xl font-bold">{isEdit ? 'Edit Opportunity' : 'New Opportunity'}</h2>
                    </div>
                </div>
                <Button onClick={() => handleSubmit()} disabled={submitting} className="bg-solarized-blue hover:bg-solarized-blue/90">
                    <Save className="mr-2 h-4 w-4" />
                    {submitting ? 'Saving...' : 'Save'}
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* ── Sales section ─────────────────────────────────────────────────────── */}
                <Card>
                    <CardHeader><CardTitle className="text-base border-b pb-2">Sales</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Opportunity Type */}
                            <div className="space-y-1">
                                <Label>Opportunity Type</Label>
                                <Select value={String(form.opportunity_type_id || 'none')} onValueChange={(v) => setField('opportunity_type_id', v === 'none' ? '' : v)}>
                                    <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Select Type</SelectItem>
                                        {opportunityTypes.map((t) => <SelectItem key={t.id} value={String(t.id)}>{lbl(t, 'name', 'type_name')}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Opportunity Stage */}
                            <div className="space-y-1">
                                <Label>Opportunity Stage</Label>
                                <Select value={String(form.opportunity_stage_id || 'none')} onValueChange={(v) => setField('opportunity_stage_id', v === 'none' ? '' : v)}>
                                    <SelectTrigger><SelectValue placeholder="Select Stage" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Select Stage</SelectItem>
                                        {opportunityStages.map((s) => <SelectItem key={s.id} value={String(s.id)}>{lbl(s, 'name', 'stage_name')}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Opportunity From */}
                            <div className="space-y-1">
                                <Label>Opportunity From</Label>
                                <Select
                                    value={form.opportunity_from || 'lead'}
                                    onValueChange={(v) => {
                                        setField('opportunity_from', v);
                                        setField('lead_id', '');
                                        setField('customer_id', '');
                                        setField('prospect_id', '');
                                        setField('customer_contact_id', '');
                                        setField('party_name', '');
                                    }}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="lead">Lead</SelectItem>
                                        <SelectItem value="customer">Customer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Status */}
                            <div className="space-y-1">
                                <Label>Status <span className="text-red-500">*</span></Label>
                                <Select value={String(form.status_id || 'none')} onValueChange={(v) => setField('status_id', v === 'none' ? '' : v)}>
                                    <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Select Status</SelectItem>
                                        {statuses.map((s) => <SelectItem key={s.id} value={String(s.id)}>{lbl(s, 'status_name', 'name')}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Dynamic: Lead or Customer Contact */}
                            {form.opportunity_from === 'lead' && (
                                <div className="space-y-1">
                                    <Label>Lead</Label>
                                    <Select value={String(form.lead_id || 'none')} onValueChange={(v) => setField('lead_id', v === 'none' ? '' : v)}>
                                        <SelectTrigger><SelectValue placeholder="Select Lead" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Select Lead</SelectItem>
                                            {leads.map((l) => <SelectItem key={l.id} value={String(l.id)}>{`${l.first_name ?? ''} ${l.last_name ?? ''}`.trim() || String(l.id)}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            {form.opportunity_from === 'customer' && (
                                <div className="space-y-1">
                                    <Label>Customer</Label>
                                    <Select
                                        value={String(form.customer_id || 'none')}
                                        onValueChange={(v) => {
                                            setField('customer_id', v === 'none' ? '' : v);
                                            setField('customer_contact_id', '');
                                            const selected = customers.find((c) => String(c.id) === v);
                                            setField('party_name', selected ? String(selected.name ?? '') : '');
                                        }}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select Customer" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Select Customer</SelectItem>
                                            {customers.map((c) => (
                                                <SelectItem key={c.id} value={String(c.id)}>
                                                    {lbl(c, 'name')}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            {form.opportunity_from === 'customer' && (
                                <div className="space-y-1">
                                    <Label>Customer Contact</Label>
                                    <Select value={String(form.customer_contact_id || 'none')} onValueChange={(v) => setField('customer_contact_id', v === 'none' ? '' : v)}>
                                        <SelectTrigger><SelectValue placeholder="Select Contact" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Select Contact</SelectItem>
                                            {contacts.map((c) => <SelectItem key={c.id} value={String(c.id)}>{`${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || String(c.id)}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Source */}
                            {/* <div className="space-y-1">
                                <Label>Source</Label>
                                <Select value={String(form.source_id || 'none')} onValueChange={(v) => setField('source_id', v === 'none' ? '' : v)}>
                                    <SelectTrigger><SelectValue placeholder="Select Source" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Select Source</SelectItem>
                                        {sources.map((s) => <SelectItem key={s.id} value={String(s.id)}>{lbl(s, 'source_name', 'name')}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div> */}

                            {/* Party Name (free text) */}
                            {/* <div className="space-y-1">
                                <Label>Party Name</Label>
                                <Input value={form.party_name || ''} onChange={(e) => setField('party_name', e.target.value)} placeholder="Customer / company name" />
                            </div> */}

                            {/* Expected Closing */}
                            <div className="space-y-1">
                                <Label>Expected Closing Date</Label>
                                <Input type="date" value={form.expected_closing || ''} onChange={(e) => setField('expected_closing', e.target.value)} />
                            </div>

                            {/* Probability */}
                            <div className="space-y-1">
                                <Label>Probability (%)</Label>
                                <Input type="number" min="0" max="100" value={form.probability || ''} onChange={(e) => setField('probability', e.target.value)} />
                            </div>
                             <div className="space-y-1">
                                <Label>Add Product</Label>
                                <Select onValueChange={(v) => {
                                    const prod = products.find(p => String(p.id) === v);
                                    if (prod) handleProductSelect(prod);
                                }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products.map(p => (
                                            <SelectItem key={p.id} value={String(p.id)}>
                                                {String(p.name || '')} - ₹{String(p.price || 0)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Currency */}
                            {/* <div className="space-y-1">
                                <Label>Currency</Label>
                                <Input value={form.currency || 'INR'} onChange={(e) => setField('currency', e.target.value)} placeholder="INR" />
                            </div> */}

                            {/* Opportunity Amount */}
                            {/* <div className="space-y-1">
                                <Label>Opportunity Amount</Label>
                                <Input type="number" min="0" value={form.opportunity_amount || ''} onChange={(e) => setField('opportunity_amount', e.target.value)} />
                            </div> */}
                        </div>


                    </CardContent>
                </Card>

                {/* ── Items section (shown when with_items checked) ──────────────────────── */}
{/* 
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between border-b pb-2">
                                <CardTitle className="text-base mb-0">Products</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <Label>Add Product</Label>
                                <Select onValueChange={(v) => {
                                    const prod = products.find(p => String(p.id) === v);
                                    if (prod) handleProductSelect(prod);
                                }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products.map(p => (
                                            <SelectItem key={p.id} value={String(p.id)}>
                                                {String(p.name || '')} - ₹{String(p.price || 0)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-sm border border-border rounded">
                                    <thead>
                                        <tr className="bg-muted/60 border-b border-border">
                                            <th className="text-left px-3 py-2 font-semibold border-r border-border">Product Name</th>
                                            <th className="text-left px-3 py-2 font-semibold border-r border-border">Price</th>
                                            <th className="text-left px-3 py-2 font-semibold border-r border-border w-24">Quantity</th>
                                            <th className="text-left px-3 py-2 font-semibold border-r border-border">Total</th>
                                            <th className="text-left px-3 py-2 font-semibold">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedProducts.map((p) => (
                                            <tr key={p.id} className="border-b border-border last:border-0">
                                                <td className="px-3 py-2 border-r border-border">{p.name}</td>
                                                <td className="px-3 py-2 border-r border-border">₹{p.price}</td>
                                                <td className="px-3 py-2 border-r border-border">
                                                    <Input 
                                                        type="number" 
                                                        min="1" 
                                                        className="h-8 py-0" 
                                                        value={p.qty} 
                                                        onChange={(e) => updateProductQty(p.id, e.target.value)} 
                                                    />
                                                </td>
                                                <td className="px-3 py-2 border-r border-border">₹{p.price * p.qty}</td>
                                                <td className="px-3 py-2">
                                                    <Button variant="destructive" size="sm" onClick={() => removeSelectedProduct(p.id)}>
                                                        Remove
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {selectedProducts.length === 0 && (
                                            <tr><td colSpan={5} className="text-center py-4 text-muted-foreground">No products selected</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="md:hidden space-y-3">
                                {selectedProducts.map((p) => (
                                    <div key={p.id} className="border rounded-lg p-3 space-y-3 bg-card">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-semibold">{p.name}</h4>
                                                <p className="text-xs text-muted-foreground">Price: ₹{p.price}</p>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeSelectedProduct(p.id)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <Label className="text-xs">Qty:</Label>
                                                <Input 
                                                    type="number" 
                                                    min="1" 
                                                    className="w-16 h-8 py-0" 
                                                    value={p.qty} 
                                                    onChange={(e) => updateProductQty(p.id, e.target.value)} 
                                                />
                                            </div>
                                            <div className="font-bold">Total: ₹{p.price * p.qty}</div>
                                        </div>
                                    </div>
                                ))}
                                {selectedProducts.length === 0 && (
                                    <p className="text-center py-4 text-muted-foreground text-sm">No products selected</p>
                                )}
                            </div>

                            {selectedProducts.length > 0 && (
                                <div className="text-right font-bold text-lg border-t pt-3">
                                    Total Amount: ₹{selectedProducts.reduce((sum, p) => sum + (p.price * p.qty), 0)}
                                </div>
                            )}
                        </CardContent>
                    </Card> */}

                {/* ── Contact Info section ───────────────────────────────────────────────── */}
                <Card>
                    <CardHeader><CardTitle className="text-base border-b pb-2">Contact Info</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Contact Person</Label>
                                <Input value={form.contact_person || ''} onChange={(e) => setField('contact_person', e.target.value)} />
                            </div>
                            {/* <div className="space-y-1">
                                <Label>Contact Email</Label>
                                <Input type="email" value={form.contact_email || ''} onChange={(e) => setField('contact_email', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label>Contact Mobile</Label>
                                <Input value={form.contact_mobile || ''} onChange={(e) => setField('contact_mobile', e.target.value)} />
                            </div> */}
                            {/* <div className="space-y-1">
                                <Label>Territory</Label>
                                <Select value={String(form.territory_id || 'none')} onValueChange={(v) => setField('territory_id', v === 'none' ? '' : v)}>
                                    <SelectTrigger><SelectValue placeholder="Select Territory" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Select Territory</SelectItem>
                                        {territories.map((t) => <SelectItem key={t.id} value={String(t.id)}>{lbl(t, 'territory_name', 'name')}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div> */}
                            {/* <div className="space-y-1">
                                <Label>Company Name</Label>
                                <Input value={form.company_name || ''} onChange={(e) => setField('company_name', e.target.value)} />
                            </div> */}
                        </div>
                    </CardContent>
                </Card>

                {/* ── More Details section ───────────────────────────────────────────────── */}
                {/* <Card>
                    <CardHeader><CardTitle className="text-base border-b pb-2">More Details</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Next Contact Date</Label>
                                <Input type="date" value={form.next_contact_date || ''} onChange={(e) => setField('next_contact_date', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label>Next Contact By</Label>
                                <Input value={form.next_contact_by || ''} onChange={(e) => setField('next_contact_by', e.target.value)} />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <Label>To Discuss</Label>
                                <textarea
                                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={form.to_discuss || ''}
                                    onChange={(e) => setField('to_discuss', e.target.value)}
                                    placeholder="Notes or discussion points..."
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card> */}

                {/* Footer actions */}
                <div className="flex items-center gap-3">
                    <Button type="submit" disabled={submitting} className="bg-solarized-blue hover:bg-solarized-blue/90">
                        <Save className="mr-2 h-4 w-4" />
                        {submitting ? 'Saving...' : isEdit ? 'Update' : 'Save'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => navigate('/crm/opportunities')}>
                        Cancel
                    </Button>
                </div>
            </form>
        </div>
    );
}
