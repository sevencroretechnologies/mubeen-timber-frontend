import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
    leadApi,
    statusApi,
    sourceApi,
    requestTypeApi,
    industryTypeApi,
    enumApi,
    userApi,
    EnumOption,
    User
} from "../../../services/api";
import { showAlert, getErrorMessage } from "../../../lib/sweetalert";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../../components/ui/select";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "../../../components/ui/breadcrumb";
import { Loader2, ChevronLeft } from "lucide-react";

const SALUTATIONS = ["Mr.", "Mrs.", "Ms.", "Dr.", "Prof."];
const EMPLOYEE_RANGES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

export default function LeadForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState<Record<string, any>>({
        salutation: "",
        first_name: "",
        middle_name: "",
        last_name: "",
        job_title: "",
        gender: "",
        status_id: "",
        source_id: "",
        request_type_id: "",
        email: "",
        phone: "",
        mobile_no: "",
        whatsapp_no: "",
        website: "",
        city: "",
        state: "",
        country: "",
        company_name: "",
        annual_revenue: "",
        no_of_employees: "",
        industry_id: "",
        qualification_status: "",
        qualified_by: "",
        qualified_on: ""
    });

    // Dropdown options
    const [statuses, setStatuses] = useState<any[]>([]);
    const [sources, setSources] = useState<any[]>([]);
    const [requestTypes, setRequestTypes] = useState<any[]>([]);
    const [industries, setIndustries] = useState<any[]>([]);
    const [genders, setGenders] = useState<EnumOption[]>([]);
    const [qualificationStatuses, setQualificationStatuses] = useState<EnumOption[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        // Load dropdown options
        const loadOptions = async () => {
            try {
                const [
                    statusRes,
                    sourceRes,
                    requestTypeRes,
                    industryRes,
                    genderRes,
                    qualStatusRes,
                    usersRes
                ] = await Promise.all([
                    statusApi.list(),
                    sourceApi.list(),
                    requestTypeApi.list(),
                    industryTypeApi.list(),
                    enumApi.genders(),
                    enumApi.qualificationStatuses(),
                    userApi.list(),
                ]);

                setStatuses(statusRes || []);
                setSources(sourceRes || []);
                setRequestTypes(requestTypeRes || []);
                setIndustries(industryRes || []);
                setGenders(genderRes || []);
                setQualificationStatuses(qualStatusRes || []);
                setUsers(usersRes || []);
            } catch (error) {
                console.error("Failed to load options", error);
            }
        };

        loadOptions();
    }, []);

    useEffect(() => {
        if (id) {
            const fetchLead = async () => {
                setLoading(true);
                try {
                    const lead = await leadApi.get(Number(id));
                    setForm({
                        salutation: lead.salutation || "",
                        first_name: lead.first_name || "",
                        middle_name: lead.middle_name || "",
                        last_name: lead.last_name || "",
                        job_title: lead.job_title || "",
                        gender: lead.gender || "",
                        status_id: lead.status_id?.toString() || "",
                        source_id: lead.source_id?.toString() || "",
                        request_type_id: lead.request_type_id?.toString() || "",
                        email: lead.email || "",
                        phone: lead.phone || "",
                        mobile_no: lead.mobile_no || "",
                        whatsapp_no: lead.whatsapp_no || "",
                        website: lead.website || "",
                        city: lead.city || "",
                        state: lead.state || "",
                        country: lead.country || "",
                        company_name: lead.company_name || "",
                        annual_revenue: lead.annual_revenue?.toString() || "",
                        no_of_employees: lead.no_of_employees || "",
                        industry_id: lead.industry_id?.toString() || "",
                        qualification_status: lead.qualification_status || "",
                        qualified_by: lead.qualified_by?.toString() || "",
                        qualified_on: lead.qualified_on ? lead.qualified_on.split('T')[0] : "",
                    });
                } catch (error) {
                    showAlert("error", "Error", getErrorMessage(error, "Failed to fetch lead details"));
                    navigate("/crm/leads");
                } finally {
                    setLoading(false);
                }
            };
            fetchLead();
        }
    }, [id, navigate]);

    const setField = (key: string, value: any) => setForm((p) => ({ ...p, [key]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Convert empty strings to null for foreign keys or numeric fields
            const payload = { ...form };
            ['status_id', 'source_id', 'request_type_id', 'industry_id', 'qualified_by', 'annual_revenue'].forEach(key => {
                if (payload[key] === '' || payload[key] === null) {
                    payload[key] = null;
                }
            });
            // Convert empty date to null
            if (payload.qualified_on === '') {
                payload.qualified_on = null;
            }

            if (isEdit) {
                await leadApi.update(Number(id), payload);
                showAlert("success", "Updated!", "Lead has been updated.");
            } else {
                await leadApi.create(payload);
                showAlert("success", "Created!", "Lead has been created.");
            }
            navigate("/crm/leads");
        } catch (error) {
            showAlert("error", "Error", getErrorMessage(error, "Failed to save lead"));
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
                                    <Link to="/crm/leads">Leads</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>{isEdit ? "Edit" : "New"}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {isEdit ? "Edit Lead" : "New Lead"}
                    </h1>
                </div>
                <Button variant="outline" onClick={() => navigate("/crm/leads")}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back to Leads
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 pb-10">
                {/* Personal Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-4">
                        <div className="space-y-2">
                            <Label>Salutation</Label>
                            <Select
                                value={form.salutation}
                                onValueChange={(v) => setField("salutation", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SALUTATIONS.map((s) => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>First Name <span className="text-destructive">*</span></Label>
                            <Input
                                value={form.first_name}
                                onChange={(e) => setField("first_name", e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Middle Name</Label>
                            <Input
                                value={form.middle_name}
                                onChange={(e) => setField("middle_name", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Last Name</Label>
                            <Input
                                value={form.last_name}
                                onChange={(e) => setField("last_name", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Job Title</Label>
                            <Input
                                value={form.job_title}
                                onChange={(e) => setField("job_title", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Gender</Label>
                            <Select
                                value={form.gender}
                                onValueChange={(v) => setField("gender", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    {genders.map((g) => (
                                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Lead Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Lead Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                                value={form.status_id}
                                onValueChange={(v) => setField("status_id", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {statuses.map((s) => (
                                        <SelectItem key={s.id} value={s.id.toString()}>{s.status_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Source</Label>
                            <Select
                                value={form.source_id}
                                onValueChange={(v) => setField("source_id", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Source" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sources.map((s) => (
                                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Request Type</Label>
                            <Select
                                value={form.request_type_id}
                                onValueChange={(v) => setField("request_type_id", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Request Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {requestTypes.map((rt) => (
                                        <SelectItem key={rt.id} value={rt.id.toString()}>{rt.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Contact Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={(e) => setField("email", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input
                                value={form.phone}
                                onChange={(e) => setField("phone", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Mobile No</Label>
                            <Input
                                value={form.mobile_no}
                                onChange={(e) => setField("mobile_no", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>WhatsApp No</Label>
                            <Input
                                value={form.whatsapp_no}
                                onChange={(e) => setField("whatsapp_no", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Website</Label>
                            <Input
                                value={form.website}
                                onChange={(e) => setField("website", e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Location */}
                <Card>
                    <CardHeader>
                        <CardTitle>Location</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>City</Label>
                            <Input
                                value={form.city}
                                onChange={(e) => setField("city", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>State</Label>
                            <Input
                                value={form.state}
                                onChange={(e) => setField("state", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Country</Label>
                            <Input
                                value={form.country}
                                onChange={(e) => setField("country", e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Company Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Company Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-4">
                        <div className="space-y-2 md:col-span-2">
                            <Label>Company Name</Label>
                            <Input
                                value={form.company_name}
                                onChange={(e) => setField("company_name", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Annual Revenue</Label>
                            <Input
                                type="number"
                                value={form.annual_revenue}
                                onChange={(e) => setField("annual_revenue", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>No of Employees</Label>
                            <Select
                                value={form.no_of_employees}
                                onValueChange={(v) => setField("no_of_employees", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    {EMPLOYEE_RANGES.map((r) => (
                                        <SelectItem key={r} value={r}>{r}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Industry</Label>
                            <Select
                                value={form.industry_id}
                                onValueChange={(v) => setField("industry_id", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Industry" />
                                </SelectTrigger>
                                <SelectContent>
                                    {industries.map((i) => (
                                        <SelectItem key={i.id} value={i.id.toString()}>{i.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Qualification */}
                <Card>
                    <CardHeader>
                        <CardTitle>Qualification</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Qualification Status</Label>
                            <Select
                                value={form.qualification_status}
                                onValueChange={(v) => setField("qualification_status", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    {qualificationStatuses.map((s) => (
                                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Qualified By</Label>
                            <Select
                                value={form.qualified_by}
                                onValueChange={(v) => setField("qualified_by", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select User" />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map((u) => (
                                        <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Qualified On</Label>
                            <Input
                                type="date"
                                value={form.qualified_on}
                                onChange={(e) => setField("qualified_on", e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/crm/leads")}
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
                            "Save Lead"
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
