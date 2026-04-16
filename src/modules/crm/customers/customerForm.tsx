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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, ChevronLeft } from "lucide-react";
import { set } from "date-fns";

const CUSTOMER_TYPES = ['Company', 'Individual', 'Partnership'];

export default function CustomerForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [creationMode, setCreationMode] = useState<"new" | "lead">("new");
    const [form, setForm] = useState<Record<string, any>>({
        name: "",
        customer_type: "",
        customer_group_id: "",
        lead_id: "",
       
        email: "",
        phone: "",
        website: "",
        whatsapp_no: "",
        bank_name: "",
        ifc_code: "",
    });

    // Dropdown options
    const [customerGroups, setCustomerGroups] = useState<CustomerGroup[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);

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
                    leadsRes,
                    indRes,
                    pricesRes,
                    termsRes,
                    contactsRes
                ] = await Promise.all([
                    fetchResilient(() => customerGroupApi.list()),
                    fetchResilient(() => leadApi.getLead()),
                    fetchResilient(() => industryTypeApi.list()),
                    fetchResilient(() => priceListApi.list()),
                    fetchResilient(() => paymentTermApi.list()),
                    fetchResilient(() => contactApi.list()),
                ]);

                setCustomerGroups(groupsRes || []);
                setLeads(Array.isArray(leadsRes) ? leadsRes : (leadsRes as any).data || []);
                
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
                        lead_id: customer.lead_id?.toString() || "",
                        email: customer.email || "",
                        phone: customer.phone || "",
                        website: customer.website || "",
                        whatsapp_no: customer.whatsapp_no || "",
                        bank_name: customer.bank_name || "",
                        ifc_code: customer.ifc_code || "",
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

    const handleModeChange = (mode: "new" | "lead") => {
        setCreationMode(mode);
        if (mode === "new") {
            setField("lead_id", "");
        }
    };

    const handleLeadSelection = (leadId: string) => {
        setField("lead_id", leadId);
        if (leadId) {
            const selectedLead = leads.find(l => l.id.toString() === leadId);
            if (selectedLead) {
                setForm(prev => ({
                    ...prev,
                    name: `${selectedLead.first_name || ''} ${selectedLead.last_name || ''}`.trim(),
                    email: selectedLead.email || prev.email,
                    phone: selectedLead.phone || selectedLead.mobile_no || prev.phone,
                    whatsapp_no: selectedLead.whatsapp_no || prev.whatsapp_no,
                    website: selectedLead.website || prev.website,
                }));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = { ...form };
            // Convert empty strings to null for foreign keys
            const nullableFields = [
                'customer_group_id', 'lead_id',
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
            <div className="flex justify-between items-start gap-4 mb-4">
                <div className="space-y-1 min-w-0">
                    <Breadcrumb className="mb-1">
                        <BreadcrumbList className="flex-wrap text-[10px] sm:text-xs">
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
                                <BreadcrumbPage className="font-medium text-solarized-base01">{isEdit ? "Edit" : "New"}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-solarized-blue truncate">
                        {isEdit ? "Edit Customer" : "New Customer"}
                    </h1>
                </div>
                <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate("/crm/customers")}
                    className="h-8 sm:h-9 w-fit shadow-sm border-gray-200 shrink-0 px-3"
                >
                    <ChevronLeft className="mr-1 h-3.5 w-3.5" /> <span className="hidden sm:inline">Back to Customers</span><span className="sm:hidden text-xs">Back</span>
                </Button>
            </div>



            <form onSubmit={handleSubmit} className="space-y-8 pb-10">
                {!isEdit && (
                    <Card>
                        <CardContent className="pt-6">
                            <RadioGroup
                                defaultValue="new"
                                value={creationMode}
                                onValueChange={(value) => handleModeChange(value as "new" | "lead")}
                                className="flex flex-col sm:flex-row sm:gap-6 gap-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="new" id="mode-new" />
                                    <Label htmlFor="mode-new" className="cursor-pointer font-medium">New Customer</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="lead" id="mode-lead" />
                                    <Label htmlFor="mode-lead" className="cursor-pointer font-medium">Convert from Lead</Label>
                                </div>
                            </RadioGroup>

                            {creationMode === "lead" && (
                                <div className="mt-6 max-w-md">
                                    <Label className="mb-2 block">Select Lead to Convert <span className="text-destructive">*</span></Label>
                                    <Select
                                        value={form.lead_id}
                                        onValueChange={handleLeadSelection}
                                        required={creationMode === "lead"}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Search or select a lead" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {leads.map(l => (
                                                <SelectItem key={l.id} value={l.id.toString()}>
                                                    {l.first_name} {l.last_name} {l.email ? `(${l.email})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

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
                {isEdit && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Classification & Relations</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Select Lead (if any)</Label>
                                <Select
                                    value={form.lead_id}
                                    onValueChange={handleLeadSelection}
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
                        </CardContent>
                    </Card>
                )}

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
                                <Label>WhatsApp No.</Label>
                                <Input
                                    value={form.whatsapp_no}
                                    onChange={(e) => setField("whatsapp_no", e.target.value)}
                                    placeholder="WhatsApp number"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Website</Label>
                                <Input
                                    value={form.website}
                                    onChange={(e) => setField("website", e.target.value)}
                                    placeholder="https://example.com"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Bank Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Bank Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Bank Name</Label>
                            <Input
                                value={form.bank_name}
                                onChange={(e) => setField("bank_name", e.target.value)}
                                placeholder="Bank name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>IFSC Code</Label>
                            <Input
                                value={form.ifc_code}
                                onChange={(e) => setField("ifc_code", e.target.value)}
                                placeholder="IFSC Code"
                            />
                        </div>
                    </CardContent>
                </Card>

            

                {/* Other Details */}
                {/* <Card>
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
                </Card> */}

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
