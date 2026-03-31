import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
    customerApi,
    customerGroupApi,
    territoryApi,
    leadApi,
    opportunityApi,
    industryTypeApi,
    priceListApi,
    paymentTermApi,
    contactApi
} from "@/services/api";
import type {
    CustomerGroup,
    Territory,
    Lead,
    Opportunity,
    IndustryType,
    PriceList,
    PaymentTerm,
    Contact,
} from "@/types";
import { showAlert, getErrorMessage } from "@/lib/sweetalert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Loader2, ChevronLeft } from "lucide-react";
import { set } from "date-fns";

const CUSTOMER_TYPES = ['Company', 'Individual', 'Partnership'];

export default function CustomerForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState<Record<string, any>>({
        name: "",
        customer_type: "",
        customer_group_id: "",
        territory_id: "",
        lead_id: "",
        opportunity_id: "",
        industry_id: "",
        default_price_list_id: "",
        payment_term_id: "",
        customer_contact_id: "",
        email: "",
        phone: "",
        website: "",
        tax_id: "",
        billing_currency: "",
        bank_account_details: "",
        print_language: "",
        customer_details: "",
    });

    // Dropdown options
    const [customerGroups, setCustomerGroups] = useState<CustomerGroup[]>([]);
    const [territories, setTerritories] = useState<Territory[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [industries, setIndustries] = useState<IndustryType[]>([]);
    const [priceLists, setPriceLists] = useState<PriceList[]>([]);
    const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);

    useEffect(() => {
        const loadOptions = async () => {
            try {
                setLoading(true);
                const fetchResilient = async (apiCall: () => Promise<any>) => {
                    try {
                        return await apiCall();
                    } catch (err) {
                        return [];
                    }
                };

                const [
                    groupsRes,
                    territoriesRes,
                    leadsRes,
                    oppsRes,
                    indRes,
                    pricesRes,
                    termsRes,
                    contactsRes
                ] = await Promise.all([
                    fetchResilient(() => customerGroupApi.list()),
                    fetchResilient(() => territoryApi.list()),
                    fetchResilient(() => leadApi.getLead()),
                    fetchResilient(() => opportunityApi.getOpportunity()),
                    fetchResilient(() => industryTypeApi.list()),
                    fetchResilient(() => priceListApi.list()),
                    fetchResilient(() => paymentTermApi.list()),
                    fetchResilient(() => contactApi.list()),
                ]);

                setCustomerGroups(groupsRes || []);
                setTerritories(territoriesRes || []);
                setLeads(Array.isArray(leadsRes) ? leadsRes : (leadsRes as any).data || []);
                setOpportunities(Array.isArray(oppsRes) ? oppsRes : (oppsRes as any).data || []);
                setIndustries(indRes || []);
                setPriceLists(pricesRes || []);
                setPaymentTerms(termsRes || []);
                setContacts(Array.isArray(contactsRes) ? contactsRes : (contactsRes as any).data || []);
            } catch (error) {
                console.error("Critical error in loadOptions:", error);
            }
            finally {
                setLoading(false);
            }
        };

        loadOptions();
    }, []);

    useEffect(() => {
        if (id) {
            const fetchCustomer = async () => {
                setLoading(true);
                try {
                    const customer = await customerApi.get(Number(id));
                    setForm({
                        name: customer.name || "",
                        customer_type: customer.customer_type || "",
                        customer_group_id: customer.customer_group_id?.toString() || "",
                        territory_id: customer.territory_id?.toString() || "",
                        lead_id: customer.lead_id?.toString() || "",
                        opportunity_id: customer.opportunity_id?.toString() || "",
                        industry_id: customer.industry_id?.toString() || "",
                        default_price_list_id: customer.default_price_list_id?.toString() || "",
                        payment_term_id: customer.payment_term_id?.toString() || "",
                        customer_contact_id: customer.customer_contact_id?.toString() || "",
                        email: customer.email || "",
                        phone: customer.phone || "",
                        website: customer.website || "",
                        tax_id: customer.tax_id || "",
                        billing_currency: customer.billing_currency || "",
                        bank_account_details: customer.bank_account_details || "",
                        print_language: customer.print_language || "",
                        customer_details: customer.customer_details || "",
                    });
                } catch (error) {
                    showAlert("error", "Error", getErrorMessage(error, "Failed to fetch customer details"));
                    navigate("/crm/customers");
                } finally {
                    setLoading(false);
                }
            };
            fetchCustomer();
        }
    }, [id, navigate]);

    const setField = (key: string, value: any) => setForm((p) => ({ ...p, [key]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = { ...form };
            // Convert empty strings to null for foreign keys
            const nullableFields = [
                'customer_group_id', 'territory_id', 'lead_id', 'opportunity_id',
                'industry_id', 'default_price_list_id', 'payment_term_id', 'customer_contact_id'
            ];
            nullableFields.forEach(key => {
                if (payload[key] === '' || payload[key] === null) {
                    payload[key] = null;
                }
            });

            if (isEdit) {
                await customerApi.update(Number(id), payload);
                showAlert("success", "Updated!", "Customer has been updated.");
            } else {
                await customerApi.create(payload);
                showAlert("success", "Created!", "Customer has been created.");
            }
            navigate("/crm/customers");
        } catch (error) {
            showAlert("error", "Error", getErrorMessage(error, "Failed to save customer"));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link to="/crm/dashboard">CRM</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link to="/crm/customers">Customers</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>{isEdit ? "Edit" : "New"}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {isEdit ? "Edit Customer" : "New Customer"}
                    </h1>
                </div>
                <Button variant="outline" onClick={() => navigate("/crm/customers")}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back to Customers
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 pb-10">
                {/* Basic Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-1">
                            <Label>Customer Name <span className="text-destructive">*</span></Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setField("name", e.target.value)}
                                required
                                placeholder="Enter customer name"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Customer Type</Label>
                                <Select
                                    value={form.customer_type}
                                    onValueChange={(v) => setField("customer_type", v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CUSTOMER_TYPES.map(t => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Customer Group</Label>
                                <Select
                                    value={form.customer_group_id}
                                    onValueChange={(v) => setField("customer_group_id", v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Group" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customerGroups.map(g => (
                                            <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Classification & Relations */}
                <Card>
                    <CardHeader>
                        <CardTitle>Classification & Relations</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-4">
                        <div className="space-y-2">
                            <Label>Territory</Label>
                            <Select
                                value={form.territory_id}
                                onValueChange={(v) => setField("territory_id", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Territory" />
                                </SelectTrigger>
                                <SelectContent>
                                    {territories.map(t => (
                                        <SelectItem key={t.id} value={t.id.toString()}>{t.territory_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Leads</Label>
                            <Select
                                value={form.lead_id}
                                onValueChange={(v) => setField("lead_id", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Lead" />
                                </SelectTrigger>
                                <SelectContent>
                                    {leads.map(l => (
                                        <SelectItem key={l.id} value={l.id.toString()}>{l.first_name} {l.last_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Opportunity</Label>
                            <Select
                                value={form.opportunity_id}
                                onValueChange={(v) => setField("opportunity_id", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Opportunity" />
                                </SelectTrigger>
                                <SelectContent>
                                    {opportunities.map(o => (
                                        <SelectItem key={o.id} value={o.id.toString()}>{o.party_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Industry</Label>
                            <Select
                                value={form.industry_id}
                                onValueChange={(v) => setField("industry_id", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Industry" />
                                </SelectTrigger>
                                <SelectContent>
                                    {industries.map(i => (
                                        <SelectItem key={i.id} value={i.id.toString()}>{i.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Contact Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Contact Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setField("email", e.target.value)}
                                    placeholder="email@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Phone</Label>
                                <Input
                                    value={form.phone}
                                    onChange={(e) => setField("phone", e.target.value)}
                                    placeholder="Phone number"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Website</Label>
                                <Input
                                    value={form.website}
                                    onChange={(e) => setField("website", e.target.value)}
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Print Language</Label>
                                <Input
                                    value={form.print_language}
                                    onChange={(e) => setField("print_language", e.target.value)}
                                    placeholder="English"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Sales & Accounting */}
                <Card>
                    <CardHeader>
                        <CardTitle>Sales & Accounting</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Default Price List</Label>
                                <Select
                                    value={form.default_price_list_id}
                                    onValueChange={(v) => setField("default_price_list_id", v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Price List" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {priceLists.map(p => (
                                            <SelectItem key={p.id} value={p.id.toString()}>{p.name} ({p.currency})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Payment Terms</Label>
                                <Select
                                    value={form.payment_term_id}
                                    onValueChange={(v) => setField("payment_term_id", v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Terms" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {paymentTerms.map(t => (
                                            <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Billing Currency</Label>
                                <Input
                                    value={form.billing_currency}
                                    onChange={(e) => setField("billing_currency", e.target.value)}
                                    placeholder="INR"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tax ID</Label>
                                <Input
                                    value={form.tax_id}
                                    onChange={(e) => setField("tax_id", e.target.value)}
                                    placeholder="GSTIN/VAT"
                                />
                            </div>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Bank Account Details</Label>
                            <Textarea
                                value={form.bank_account_details}
                                onChange={(e) => setField("bank_account_details", e.target.value)}
                                placeholder="Bank name, Account number, IFSC, etc."
                                className="min-h-[100px]"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Other Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Other Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Label>Customer Details</Label>
                            <Textarea
                                value={form.customer_details}
                                onChange={(e) => setField("customer_details", e.target.value)}
                                placeholder="Additional notes about the customer"
                                className="min-h-[100px]"
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/crm/customers")}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        className="bg-solarized-blue hover:bg-solarized-blue/90"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            isEdit ? "Update Customer" : "Save Customer"
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
