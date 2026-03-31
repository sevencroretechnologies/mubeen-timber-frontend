import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    crmOpportunityService,
    crmStatusService,
    crmSourceService,
    crmOpportunityTypeService,
    crmOpportunityStageService,
    crmLeadService,
    crmTerritoryService,
    crmCustomerService,
    crmContactService,
    crmProductService,
    crmProductCategoryService,
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

    // Item addition state
    const [showAddSection, setShowAddSection] = useState(false);
    const [itemSearch, setItemSearch] = useState('');
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [newItem, setNewItem] = useState<OppItem>({ ...EMPTY_ITEM });
    const productDropdownRef = useRef<HTMLDivElement>(null);

    // ── Load all dropdowns on mount ───────────────────────────────────────────────
    useEffect(() => {
        const fetchAll = async () => {
            const results = await Promise.allSettled([
                crmStatusService.getAll({ per_page: 200 }),
                crmSourceService.getAll({ per_page: 200 }),
                crmOpportunityTypeService.getAll({ per_page: 200 }),
                crmOpportunityStageService.getAll({ per_page: 200 }),
                crmLeadService.getAll({ per_page: 500 }),
                crmTerritoryService.getAll({ per_page: 200 }),
                crmCustomerService.getAll({ per_page: 500 }),
                crmContactService.getAll({ per_page: 500 }),
                crmProductService.getAll({ per_page: 1000 }),
                crmProductCategoryService.getAll({ per_page: 200 }),
            ]);

            const setters = [
                setStatuses, setSources, setOpportunityTypes, setOpportunityStages,
                setLeads, setTerritories, setCustomers, setContacts, setProducts, setCategories
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
                    items: existingItems.length > 0 ? existingItems : (item.items ?? []),
                });
            })
            .catch(() => {
                showAlert('error', 'Error', 'Failed to load opportunity');
                navigate('/crm/opportunities');
            })
            .finally(() => setLoading(false));
    }, [id, navigate]);

    // Close product dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
                setShowProductDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const setField = (key: string, value: unknown) => setForm((p: Record<string, unknown>) => ({ ...p, [key]: value }));

    // ── Product search / item helpers ─────────────────────────────────────────────
    const filteredProducts = products.filter((p) => {
        const search = itemSearch.toLowerCase();
        return (
            (p.name && String(p.name).toLowerCase().includes(search)) ||
            (p.code && String(p.code).toLowerCase().includes(search))
        );
    });

    const handleProductSelect = (product: DDItem) => {
        const productRate = Number(product.rate ?? 0);
        const productAmount = Number(product.amount ?? 0);
        // When rate is 0, use the stored amount as the effective unit price
        // so that qty × rate calculation works correctly
        const rate = productRate > 0 ? productRate : productAmount;
        const qty = Number(newItem.qty) || 1;
        const amount = rate * qty;

        setNewItem({
            ...newItem,
            product_id: product.id,
            item_code: String(product.code ?? ''),
            item_name: String(product.name ?? ''),
            category_id: product.category_id as number,
            description: String(product.description ?? ''),
            qty,
            rate,
            amount,
            is_new_product: false,
        });
        setItemSearch(String(product.name ?? ''));
        setShowProductDropdown(false);
    };

    const handleManualProductEntry = () => {
        setNewItem({ ...newItem, product_id: null, item_name: itemSearch, item_code: '', is_new_product: true });
        setShowProductDropdown(false);
    };

    const updateItemDetails = (field: string, value: any) => {
        if (field === 'amount') {
            setNewItem(prev => ({ ...prev, amount: value }));
            return;
        }

        const strValue = String(value);

        if (strValue === "") {
            setNewItem(prev => {
                const updated = { ...prev, [field]: "" };
                // If we clear qty or rate, amount should recalculate. If either is empty, amount becomes empty.
                const newQty = field === 'qty' ? "" : Number(prev.qty);
                const newRate = field === 'rate' ? "" : Number(prev.rate);

                updated.amount = (newQty === "" || newRate === "") ? "" : Number(newQty) * Number(newRate);
                return updated;
            });
            return;
        }

        const numValue = parseFloat(strValue);

        if (field === 'qty') {
            setNewItem(prev => {
                const rateVal = Number(prev.rate || 0);
                return {
                    ...prev,
                    qty: strValue,
                    amount: isNaN(numValue) ? "" : numValue * rateVal
                };
            });
        } else if (field === 'rate') {
            setNewItem(prev => {
                const qtyVal = Number(prev.qty || 0);
                return {
                    ...prev,
                    rate: strValue,
                    amount: isNaN(numValue) ? "" : qtyVal * numValue
                };
            });
        }
    };

    const handleAddItem = async () => {
        if (!newItem.item_name) { showAlert('error', 'Error', 'Please select or enter a product name'); return; }
        let productId = newItem.product_id;

        if (newItem.is_new_product && !productId) {
            try {
                const r = await crmProductService.create({
                    name: newItem.item_name,
                    category_id: newItem.category_id ?? null,
                    slug: newItem.slug ?? null,
                    stock: Number(newItem.stock) ?? 0,
                    amount: Number(newItem.amount) ?? 0,
                    description: newItem.description ?? null,
                    long_description: newItem.long_description ?? null,
                });
                const created = r.data as DDItem;
                productId = created.id;
                setProducts((prev) => [...prev, created]);
            } catch (err) {
                showAlert('error', 'Error', getErrorMessage(err, 'Failed to create new product'));
                return;
            }
        }

        const updatedItems = [...(form.items ?? []), { ...newItem, product_id: productId, amount: Number(newItem.amount) }];
        setField('items', updatedItems);
        setField('with_items', true);
        setNewItem({ ...EMPTY_ITEM });
        setItemSearch('');
        setShowAddSection(false);
    };

    const removeItem = (index: number) => {
        const arr = [...(form.items ?? [])];
        arr.splice(index, 1);
        setField('items', arr);
        if (arr.length === 0) setField('with_items', false);
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
                with_items: Array.isArray(form.items) && form.items.length > 0,
                items: form.items ?? [],
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

                        {/* With Items toggle */}
                        <div className="flex items-center gap-2 pt-2">
                            <Checkbox
                                id="withItems"
                                checked={Boolean(form.with_items)}
                                onCheckedChange={(v) => setField('with_items', Boolean(v))}
                            />
                            <label htmlFor="withItems" className="text-sm font-medium cursor-pointer">With Items</label>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Items section (shown when with_items checked) ──────────────────────── */}
                {Boolean(form.with_items) && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between border-b pb-2">
                                <CardTitle className="text-base mb-0">Items</CardTitle>
                                {!showAddSection && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => setShowAddSection(true)}>
                                        + Add Product
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">

                            {/* ── Add Item card ── */}
                            {showAddSection && (
                                <div className="border rounded p-3 mb-2 bg-muted/30">
                                    <div className="flex items-center justify-between mb-3">
                                        <h6 className="font-semibold text-sm">Add New Item</h6>
                                        <button type="button" aria-label="Close" onClick={() => setShowAddSection(false)}
                                            className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>

                                    {/* Row: search(4) qty(2) rate(2) amount(2) button(2) — matches col-md-4/2/2/2/2 */}
                                    <div className="grid grid-cols-12 gap-3 mb-3 items-end">
                                        {/* Search — col-md-4 */}
                                        <div className="col-span-12 md:col-span-4 relative" ref={productDropdownRef}>
                                            <Label className="mb-1 block">Search Item Code / Name <span className="text-red-500">*</span></Label>
                                            <Input
                                                placeholder="Type to search..."
                                                value={itemSearch}
                                                onChange={(e) => {
                                                    setItemSearch(e.target.value);
                                                    setShowProductDropdown(true);
                                                    if (e.target.value === '') setNewItem((p) => ({ ...p, is_new_product: false }));
                                                }}
                                                onFocus={() => setShowProductDropdown(true)}
                                            />
                                            {showProductDropdown && itemSearch && (
                                                <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded border bg-card shadow-lg max-h-52 overflow-y-auto">
                                                    <ul className="divide-y divide-border text-sm">
                                                        {filteredProducts.map((p) => (
                                                            <li key={p.id}
                                                                className="px-3 py-2 cursor-pointer hover:bg-accent flex gap-1"
                                                                onClick={() => handleProductSelect(p)}>
                                                                <strong>{String(p.code ?? '')}</strong> - {String(p.name ?? '')}
                                                            </li>
                                                        ))}
                                                        {filteredProducts.length === 0 && (
                                                            <li className="px-3 py-2 cursor-pointer text-primary hover:bg-accent"
                                                                onClick={handleManualProductEntry}>
                                                                + Create new: &ldquo;{itemSearch}&rdquo;
                                                            </li>
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        {/* Quantity — col-md-2 */}
                                        <div className="col-span-6 md:col-span-2">
                                            <Label className="mb-1 block">Quantity</Label>
                                            <Input type="number" min="1" value={newItem.qty} onChange={(e) => updateItemDetails('qty', e.target.value)} />
                                        </div>

                                        {/* Rate — col-md-2 */}
                                        <div className="col-span-6 md:col-span-2">
                                            <Label className="mb-1 block">Rate ({form.currency || 'INR'})</Label>
                                            <Input type="number" min="0" value={newItem.rate} onChange={(e) => updateItemDetails('rate', e.target.value)} />
                                        </div>

                                        {/* Amount — col-md-2 */}
                                        <div className="col-span-6 md:col-span-2">
                                            <Label className="mb-1 block">Amount ({form.currency || 'INR'})</Label>
                                            <Input type="number" value={newItem.amount} onChange={(e) => updateItemDetails('amount', e.target.value)} />
                                        </div>

                                        {/* Add button — col-md-2 */}
                                        <div className="col-span-6 md:col-span-2">
                                            <Button type="button" onClick={handleAddItem} className="w-full bg-green-600 hover:bg-green-700 text-white">
                                                {newItem.is_new_product ? 'Create & Add' : 'Add Item'}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* New Product Fields (conditional) */}
                                    {newItem.is_new_product && (
                                        <div className="rounded border bg-background p-3 mb-1">
                                            <h6 className="font-semibold text-sm border-b pb-2 mb-3">New Product Details</h6>
                                            <div className="grid grid-cols-12 gap-3">
                                                {/* Name — col-md-8 */}
                                                <div className="col-span-12 md:col-span-8">
                                                    <Label className="mb-1 block">Product Name <span className="text-red-500">*</span></Label>
                                                    <Input value={newItem.item_name} onChange={(e) => setNewItem((p) => ({ ...p, item_name: e.target.value }))} required />
                                                </div>
                                                {/* Category — col-md-4 */}
                                                <div className="col-span-12 md:col-span-4">
                                                    <Label className="mb-1 block">Category</Label>
                                                    <Select value={String(newItem.category_id || 'none')} onValueChange={(v) => setNewItem((p) => ({ ...p, category_id: v === 'none' ? null : Number(v) }))}>
                                                        <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">Select Category</SelectItem>
                                                            {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{lbl(c, 'name')}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                {/* Slug — col-md-6 */}
                                                <div className="col-span-12 md:col-span-6">
                                                    <Label className="mb-1 block">Slug</Label>
                                                    <Input placeholder="e.g. product-name" value={newItem.slug || ''} onChange={(e) => setNewItem((p) => ({ ...p, slug: e.target.value }))} />
                                                </div>
                                                {/* Stock — col-md-3 */}
                                                <div className="col-span-6 md:col-span-3">
                                                    <Label className="mb-1 block">Stock</Label>
                                                    <Input type="number" min="0" value={newItem.stock ?? 0} onChange={(e) => setNewItem((p) => ({ ...p, stock: Number(e.target.value) }))} />
                                                </div>
                                                {/* Unit Price — col-md-3 */}
                                                <div className="col-span-6 md:col-span-3">
                                                    <Label className="mb-1 block">Amount (Unit Price)</Label>
                                                    <Input type="number" min="0" step="0.01" value={newItem.amount || 0} onChange={(e) => setNewItem((p) => ({ ...p, amount: e.target.value }))} />
                                                </div>
                                                {/* Short desc — col-12 */}
                                                <div className="col-span-12">
                                                    <Label className="mb-1 block">Short Description</Label>
                                                    <textarea rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                        value={newItem.description || ''} onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))} />
                                                </div>
                                                {/* Long desc — col-12 */}
                                                <div className="col-span-12">
                                                    <Label className="mb-1 block">Long Description</Label>
                                                    <textarea rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                        value={newItem.long_description || ''} onChange={(e) => setNewItem((p) => ({ ...p, long_description: e.target.value }))} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Items table — striped, bordered, same columns as reference ── */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border border-border rounded">
                                    <thead>
                                        <tr className="bg-muted/60 border-b border-border">
                                            {['#', 'Item Code', 'Item Name', 'Quantity', `Rate (${form.currency || 'INR'})`, `Amount (${form.currency || 'INR'})`, 'Action'].map((h) => (
                                                <th key={h} className="text-left px-3 py-2 font-semibold text-foreground border-r border-border last:border-r-0">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                        {(form.items ?? []).map((item: any, idx: number) => (
                                            <tr key={idx} className={`border-b border-border ${idx % 2 === 1 ? 'bg-muted/30' : ''}`}>
                                                <td className="px-3 py-2 border-r border-border">{idx + 1}</td>
                                                <td className="px-3 py-2 border-r border-border">{item.item_code}</td>
                                                <td className="px-3 py-2 border-r border-border">{item.item_name}</td>
                                                <td className="px-3 py-2 border-r border-border">{item.qty}</td>
                                                <td className="px-3 py-2 border-r border-border">{item.rate}</td>
                                                <td className="px-3 py-2 border-r border-border">{item.amount}</td>
                                                <td className="px-3 py-2">
                                                    <Button type="button" size="sm" variant="destructive" onClick={() => removeItem(idx)}>
                                                        Remove
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {(!form.items || form.items.length === 0) && (
                                            <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No items added yet.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                        </CardContent>
                    </Card>
                )}




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
                            <div className="space-y-1">
                                <Label>Territory</Label>
                                <Select value={String(form.territory_id || 'none')} onValueChange={(v) => setField('territory_id', v === 'none' ? '' : v)}>
                                    <SelectTrigger><SelectValue placeholder="Select Territory" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Select Territory</SelectItem>
                                        {territories.map((t) => <SelectItem key={t.id} value={String(t.id)}>{lbl(t, 'territory_name', 'name')}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
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
        </div >
    );
}
