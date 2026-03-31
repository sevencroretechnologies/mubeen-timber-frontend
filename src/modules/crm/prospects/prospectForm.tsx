import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
    prospectApi,
    statusApi,
    sourceApi,
    industryTypeApi,
    territoryApi,
    customerGroupApi
} from "@/services/api";
import type { Status, Source, IndustryType, Territory, CustomerGroup } from "@/types";
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

export default function ProspectForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState<Record<string, any>>({
        company_name: "",
        status: "New",
        source: "",
        industry: "",
        market_segment: "",
        customer_group: "",
        territory: "",
        no_of_employees: "",
        annual_revenue: "",
        fax: "",
        website: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        country: "",
        zip_code: "",
    });

    const [statuses, setStatuses] = useState<Status[]>([]);
    const [sources, setSources] = useState<Source[]>([]);
    const [industries, setIndustries] = useState<IndustryType[]>([]);
    const [territories, setTerritories] = useState<Territory[]>([]);
    const [customerGroups, setCustomerGroups] = useState<CustomerGroup[]>([]);

    useEffect(() => {
        const loadOptions = async () => {
            const fetchResilient = async (apiCall: () => Promise<any>) => {
                try {
                    return await apiCall();
                } catch (err) {
                    return [];
                }
            };

            const [
                statusRes,
                sourceRes,
                industryRes,
                territoryRes,
                groupRes
            ] = await Promise.all([
                fetchResilient(() => statusApi.list()),
                fetchResilient(() => sourceApi.list()),
                fetchResilient(() => industryTypeApi.list()),
                fetchResilient(() => territoryApi.list()),
                fetchResilient(() => customerGroupApi.list()),
            ]);

            setStatuses(statusRes || []);
            setSources(sourceRes || []);
            setIndustries(industryRes || []);
            setTerritories(territoryRes || []);
            setCustomerGroups(groupRes || []);
        };
        loadOptions();
    }, []);

    useEffect(() => {
        if (id) {
            const fetchProspect = async () => {
                setLoading(true);
                try {
                    const item = await prospectApi.get(Number(id));
                    setForm({
                        company_name: item.company_name || "",
                        status: item.status || "New",
                        source: item.source || "",
                        industry: item.industry || "",
                        market_segment: item.market_segment || "",
                        customer_group: item.customer_group || "",
                        territory: item.territory || "",
                        no_of_employees: item.no_of_employees || "",
                        annual_revenue: item.annual_revenue?.toString() || "",
                        fax: item.fax || "",
                        website: item.website || "",
                        email: item.email || "",
                        phone: item.phone || "",
                        address: item.address || "",
                        city: item.city || "",
                        state: item.state || "",
                        country: item.country || "",
                        zip_code: item.zip_code || "",
                    });
                } catch (error) {
                    showAlert("error", "Error", getErrorMessage(error, "Failed to fetch prospect details"));
                    navigate("/crm/prospects");
                } finally {
                    setLoading(false);
                }
            };
            fetchProspect();
        }
    }, [id, navigate]);

    const setField = (key: string, value: any) => setForm((p) => ({ ...p, [key]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (isEdit) {
                await prospectApi.update(Number(id), form);
                showAlert("success", "Updated!", "Prospect has been updated.");
            } else {
                await prospectApi.create(form);
                showAlert("success", "Created!", "Prospect has been created.");
            }
            navigate("/crm/prospects");
        } catch (error) {
            showAlert("error", "Error", getErrorMessage(error, "Failed to save prospect"));
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
                                    <Link to="/crm/prospects">Prospects</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>{isEdit ? "Edit" : "New"}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {isEdit ? "Edit Prospect" : "New Prospect"}
                    </h1>
                </div>
                <Button variant="outline" onClick={() => navigate("/crm/prospects")}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back to Prospects
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 pb-10">
                {/* Company Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Company Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Company Name <span className="text-destructive">*</span></Label>
                            <Input
                                value={form.company_name}
                                onChange={(e) => setField("company_name", e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                                value={form.status}
                                onValueChange={(v) => setField("status", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="New">New</SelectItem>
                                    {statuses.map((s) => (
                                        <SelectItem key={s.id} value={s.status_name}>{s.status_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Source</Label>
                            <Select
                                value={form.source}
                                onValueChange={(v) => setField("source", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Source" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sources.map((s) => (
                                        <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Industry</Label>
                            <Select
                                value={form.industry}
                                onValueChange={(v) => setField("industry", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Industry" />
                                </SelectTrigger>
                                <SelectContent>
                                    {industries.map((i) => (
                                        <SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Market Segment</Label>
                            <Input
                                value={form.market_segment}
                                onChange={(e) => setField("market_segment", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Customer Group</Label>
                            <Select
                                value={form.customer_group}
                                onValueChange={(v) => setField("customer_group", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Group" />
                                </SelectTrigger>
                                <SelectContent>
                                    {customerGroups.map((g) => (
                                        <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Territory</Label>
                            <Select
                                value={form.territory}
                                onValueChange={(v) => setField("territory", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Territory" />
                                </SelectTrigger>
                                <SelectContent>
                                    {territories.map((t) => (
                                        <SelectItem key={t.id} value={t.territory_name}>{t.territory_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                                    <SelectItem value="1-10">1-10</SelectItem>
                                    <SelectItem value="11-50">11-50</SelectItem>
                                    <SelectItem value="51-200">51-200</SelectItem>
                                    <SelectItem value="201-500">201-500</SelectItem>
                                    <SelectItem value="501-1000">501-1000</SelectItem>
                                    <SelectItem value="1000+">1000+</SelectItem>
                                </SelectContent>
                            </Select>
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
                            <Label>Website</Label>
                            <Input
                                value={form.website}
                                onChange={(e) => setField("website", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Fax</Label>
                            <Input
                                value={form.fax}
                                onChange={(e) => setField("fax", e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Contact Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={(e) => setField("email", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone / Mobile</Label>
                            <Input
                                type="tel"
                                value={form.phone}
                                onChange={(e) => setField("phone", e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Address Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Address Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-4">
                        <div className="space-y-2 md:col-span-4">
                            <Label>Address</Label>
                            <Textarea
                                rows={3}
                                value={form.address}
                                onChange={(e) => setField("address", e.target.value)}
                            />
                        </div>
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
                        <div className="space-y-2">
                            <Label>Zip Code</Label>
                            <Input
                                value={form.zip_code}
                                onChange={(e) => setField("zip_code", e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/crm/prospects")}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        className="bg-solarized-blue hover:bg-solarized-blue/90 text-white"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save Prospect"
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
