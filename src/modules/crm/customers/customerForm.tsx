import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
    customerApi,
    customerGroupApi,
    leadApi,
} from "@/services/api";
import type {
    CustomerGroup,
    Lead,
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
import { Loader2, ChevronLeft, Plus, Trash2 } from "lucide-react";

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
        website: "",
        contact_details: [{ phone_no: "", whatsapp_no: "", personal_email: "", company_email: "" }],
        bank_details: [{ bank_name: "", branch_name: "", account_no: "", ifsc_code: "", bank_address: "" }],
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
                ] = await Promise.all([
                    fetchResilient(() => customerGroupApi.list()),
                    fetchResilient(() => leadApi.getLead()),
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
                        website: customer.website || "",
                        contact_details: (customer.contact_details?.length ?? 0) > 0 
                            ? customer.contact_details 
                            : [{ phone_no: "", whatsapp_no: "", personal_email: "", company_email: "" }],
                        bank_details: (customer.bank_details?.length ?? 0) > 0
                            ? customer.bank_details
                            : [{ bank_name: "", branch_name: "", account_no: "", ifsc_code: "", bank_address: "" }],
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
                    website: selectedLead.website || prev.website,
                    contact_details: [
                        {
                            phone_no: selectedLead.phone || selectedLead.mobile_no || "",
                            whatsapp_no: selectedLead.whatsapp_no || "",
                            personal_email: selectedLead.email || "",
                            company_email: ""
                        }
                    ]
                }));
            }
        }
    };

    const handleAddContact = () => {
        setForm(prev => ({
            ...prev,
            contact_details: [...prev.contact_details, { phone_no: "", whatsapp_no: "", personal_email: "", company_email: "" }]
        }));
    };

    const handleRemoveContact = (index: number) => {
        setForm(prev => ({
            ...prev,
            contact_details: prev.contact_details.filter((_: any, i: number) => i !== index)
        }));
    };

    const handleContactChange = (index: number, field: string, value: string) => {
        const updatedContacts = [...form.contact_details];
        updatedContacts[index][field] = value;
        setField("contact_details", updatedContacts);
    };

    const handleAddBank = () => {
        setForm(prev => ({
            ...prev,
            bank_details: [...prev.bank_details, { bank_name: "", branch_name: "", account_no: "", ifsc_code: "", bank_address: "" }]
        }));
    };

    const handleRemoveBank = (index: number) => {
        setForm(prev => ({
            ...prev,
            bank_details: prev.bank_details.filter((_: any, i: number) => i !== index)
        }));
    };

    const handleBankChange = (index: number, field: string, value: string) => {
        const updatedBanks = [...form.bank_details];
        updatedBanks[index][field] = value;
        setField("bank_details", updatedBanks);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = { ...form };
            
            // Filter out completely empty contact/bank records
            payload.contact_details = payload.contact_details.filter((c: any) => 
                c.phone_no || c.whatsapp_no || c.personal_email || c.company_email
            );
            payload.bank_details = payload.bank_details.filter((b: any) => 
                b.bank_name || b.account_no || b.ifsc_code
            );

            // Convert empty strings to null for foreign keys
            const nullableFields = ['customer_group_id', 'lead_id'];
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
                        <div className="space-y-2">
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
                        <div className="space-y-2">
                            <Label>Website</Label>
                            <Input
                                value={form.website}
                                onChange={(e) => setField("website", e.target.value)}
                                placeholder="https://example.com"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Contact Details */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                             Contact Details
                        </h2>
                        <Button type="button" size="sm" variant="outline" onClick={handleAddContact}>
                            <Plus className="mr-1 h-3.5 w-3.5" /> Add Contact
                        </Button>
                    </div>
                    {form.contact_details.map((contact: any, index: number) => (
                        <Card key={index} className="relative">
                            {form.contact_details.length > 1 && (
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    className="absolute top-2 right-2 text-destructive"
                                    onClick={() => handleRemoveContact(index)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                            <CardContent className="pt-6 grid gap-6 md:grid-cols-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Phone No.</Label>
                                        <Input
                                            value={contact.phone_no}
                                            onChange={(e) => handleContactChange(index, "phone_no", e.target.value)}
                                            placeholder="Phone number"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>WhatsApp No.</Label>
                                        <Input
                                            value={contact.whatsapp_no}
                                            onChange={(e) => handleContactChange(index, "whatsapp_no", e.target.value)}
                                            placeholder="WhatsApp number"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Personal Email</Label>
                                        <Input
                                            type="email"
                                            value={contact.personal_email}
                                            onChange={(e) => handleContactChange(index, "personal_email", e.target.value)}
                                            placeholder="Personal email"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Company Email</Label>
                                        <Input
                                            type="email"
                                            value={contact.company_email}
                                            onChange={(e) => handleContactChange(index, "company_email", e.target.value)}
                                            placeholder="Company email"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Bank Details */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                             Bank Details
                        </h2>
                        <Button type="button" size="sm" variant="outline" onClick={handleAddBank}>
                            <Plus className="mr-1 h-3.5 w-3.5" /> Add Bank
                        </Button>
                    </div>
                    {form.bank_details.map((bank: any, index: number) => (
                        <Card key={index} className="relative">
                            {form.bank_details.length > 1 && (
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    className="absolute top-2 right-2 text-destructive"
                                    onClick={() => handleRemoveBank(index)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                            <CardContent className="pt-6 space-y-6">
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Bank Name</Label>
                                        <Input
                                            value={bank.bank_name}
                                            onChange={(e) => handleBankChange(index, "bank_name", e.target.value)}
                                            placeholder="Bank name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Branch Name</Label>
                                        <Input
                                            value={bank.branch_name}
                                            onChange={(e) => handleBankChange(index, "branch_name", e.target.value)}
                                            placeholder="Branch name"
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Account No.</Label>
                                        <Input
                                            value={bank.account_no}
                                            onChange={(e) => handleBankChange(index, "account_no", e.target.value)}
                                            placeholder="Account number"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>IFSC Code</Label>
                                        <Input
                                            value={bank.ifsc_code}
                                            onChange={(e) => handleBankChange(index, "ifsc_code", e.target.value)}
                                            placeholder="IFSC Code"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Bank Address</Label>
                                    <Textarea
                                        value={bank.bank_address}
                                        onChange={(e) => handleBankChange(index, "bank_address", e.target.value)}
                                        placeholder="Full bank address"
                                        className="h-20"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

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
