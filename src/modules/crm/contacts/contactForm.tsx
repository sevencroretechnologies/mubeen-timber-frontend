import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { contactApi, enumApi, EnumOption } from "@/services/api";
import { ContactPhone, ContactEmail } from "@/types";
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
import { Loader2, ChevronLeft, Plus, Trash2, Star } from "lucide-react";

const SALUTATIONS = ["Mr", "Mrs", "Ms", "Dr", "Prof"];
const CONTACT_STATUSES = ["Open", "Replied", "Closed"];

interface PhoneRow {
    phone_no: string;
    is_primary: boolean;
}

interface EmailRow {
    email: string;
    is_primary: boolean;
}

export default function ContactForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [form, setForm] = useState({
        salutation: "",
        first_name: "",
        middle_name: "",
        last_name: "",
        designation: "",
        gender: "",
        company_name: "",
        address: "",
        status: "Open",
    });

    const [phones, setPhones] = useState<PhoneRow[]>([
        { phone_no: "", is_primary: true },
    ]);

    const [emails, setEmails] = useState<EmailRow[]>([
        { email: "", is_primary: true },
    ]);

    const [genders, setGenders] = useState<EnumOption[]>([]);

    useEffect(() => {
        enumApi.genders().then(setGenders).catch(() => setGenders([]));
    }, []);

    useEffect(() => {
        if (id) {
            const fetchContact = async () => {
                setLoading(true);
                try {
                    const contact = await contactApi.get(Number(id));
                    setForm({
                        salutation: contact.salutation || "",
                        first_name: contact.first_name || "",
                        middle_name: contact.middle_name || "",
                        last_name: contact.last_name || "",
                        designation: contact.designation || "",
                        gender: contact.gender || "",
                        company_name: contact.company_name || "",
                        address: contact.address || "",
                        status: contact.status || "Open",
                    });

                    if (contact.phones && contact.phones.length > 0) {
                        setPhones(
                            contact.phones.map((p: ContactPhone) => ({
                                phone_no: p.phone_no || "",
                                is_primary: p.is_primary,
                            }))
                        );
                    } else {
                        setPhones([{ phone_no: "", is_primary: true }]);
                    }

                    if (contact.emails && contact.emails.length > 0) {
                        setEmails(
                            contact.emails.map((e: ContactEmail) => ({
                                email: e.email || "",
                                is_primary: e.is_primary,
                            }))
                        );
                    } else {
                        setEmails([{ email: "", is_primary: true }]);
                    }
                } catch (error) {
                    showAlert("error", "Error", getErrorMessage(error, "Failed to fetch contact details"));
                    navigate("/crm/contacts");
                } finally {
                    setLoading(false);
                }
            };
            fetchContact();
        }
    }, [id, navigate]);

    const setField = (key: string, value: string) =>
        setForm((p) => ({ ...p, [key]: value }));

    // Phone handlers
    const addPhone = () =>
        setPhones((p) => [...p, { phone_no: "", is_primary: false }]);

    const removePhone = (index: number) => {
        setPhones((p) => {
            const updated = p.filter((_, i) => i !== index);
            if (!updated.some((d) => d.is_primary) && updated.length > 0) {
                updated[0].is_primary = true;
            }
            return updated;
        });
    };

    const updatePhone = (index: number, key: keyof PhoneRow, value: string | boolean) => {
        setPhones((p) =>
            p.map((d, i) => {
                if (i === index) return { ...d, [key]: value };
                if (key === "is_primary" && value === true) return { ...d, is_primary: false };
                return d;
            })
        );
    };

    // Email handlers
    const addEmail = () =>
        setEmails((p) => [...p, { email: "", is_primary: false }]);

    const removeEmail = (index: number) => {
        setEmails((p) => {
            const updated = p.filter((_, i) => i !== index);
            if (!updated.some((d) => d.is_primary) && updated.length > 0) {
                updated[0].is_primary = true;
            }
            return updated;
        });
    };

    const updateEmail = (index: number, key: keyof EmailRow, value: string | boolean) => {
        setEmails((p) =>
            p.map((d, i) => {
                if (i === index) return { ...d, [key]: value };
                if (key === "is_primary" && value === true) return { ...d, is_primary: false };
                return d;
            })
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const payload = {
            ...form,
            salutation: form.salutation || null,
            middle_name: form.middle_name || null,
            last_name: form.last_name || null,
            designation: form.designation || null,
            gender: form.gender || null,
            company_name: form.company_name || null,
            address: form.address || null,
            phones: phones
                .filter((p) => p.phone_no.trim() !== "")
                .map((p) => ({ phone_no: p.phone_no.trim(), is_primary: p.is_primary })),
            emails: emails
                .filter((e) => e.email.trim() !== "")
                .map((e) => ({ email: e.email.trim(), is_primary: e.is_primary })),
        };

        try {
            if (isEdit) {
                await contactApi.update(Number(id), payload);
                showAlert("success", "Updated!", "Contact has been updated.");
            } else {
                await contactApi.create(payload);
                showAlert("success", "Created!", "Contact has been created.");
            }
            navigate("/crm/contacts");
        } catch (error) {
            showAlert("error", "Error", getErrorMessage(error, "Failed to save contact"));
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
                                    <Link to="/crm/contacts">Contacts</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>{isEdit ? "Edit" : "New"}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {isEdit ? "Edit Contact" : "New Contact"}
                    </h1>
                </div>
                <Button variant="outline" onClick={() => navigate("/crm/contacts")}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back to Contacts
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
                            <Label>Designation</Label>
                            <Input
                                value={form.designation}
                                onChange={(e) => setField("designation", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
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
                                    {CONTACT_STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Company Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Company Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-w-md">
                            <Label>Company Name</Label>
                            <Input
                                value={form.company_name}
                                onChange={(e) => setField("company_name", e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Phone Numbers */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle>Phone Numbers</CardTitle>
                        <Button type="button" variant="outline" size="sm" onClick={addPhone}>
                            <Plus className="mr-2 h-4 w-4" /> Add Phone
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {phones.map((phone, index) => (
                                <div key={index} className="flex items-end gap-4">
                                    <div className="flex-1 space-y-2">
                                        <Label>Phone No</Label>
                                        <Input
                                            placeholder="Enter phone number"
                                            value={phone.phone_no}
                                            onChange={(e) => updatePhone(index, "phone_no", e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 pb-2">
                                        <Button
                                            type="button"
                                            variant={phone.is_primary ? "default" : "outline"}
                                            size="icon"
                                            onClick={() => updatePhone(index, "is_primary", true)}
                                            title={phone.is_primary ? "Primary" : "Set as Primary"}
                                            className={phone.is_primary ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                                        >
                                            <Star className={`h-4 w-4 ${phone.is_primary ? "fill-current" : ""}`} />
                                        </Button>
                                        {phones.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removePhone(index)}
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Email Addresses */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle>Email Addresses</CardTitle>
                        <Button type="button" variant="outline" size="sm" onClick={addEmail}>
                            <Plus className="mr-2 h-4 w-4" /> Add Email
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {emails.map((emailRow, index) => (
                                <div key={index} className="flex items-end gap-4">
                                    <div className="flex-1 space-y-2">
                                        <Label>Email</Label>
                                        <Input
                                            type="email"
                                            placeholder="Enter email address"
                                            value={emailRow.email}
                                            onChange={(e) => updateEmail(index, "email", e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 pb-2">
                                        <Button
                                            type="button"
                                            variant={emailRow.is_primary ? "default" : "outline"}
                                            size="icon"
                                            onClick={() => updateEmail(index, "is_primary", true)}
                                            title={emailRow.is_primary ? "Primary" : "Set as Primary"}
                                            className={emailRow.is_primary ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                                        >
                                            <Star className={`h-4 w-4 ${emailRow.is_primary ? "fill-current" : ""}`} />
                                        </Button>
                                        {emails.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeEmail(index)}
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Address */}
                <Card>
                    <CardHeader>
                        <CardTitle>Address</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-w-2xl">
                            <Label>Full Address</Label>
                            <Textarea
                                rows={4}
                                value={form.address}
                                onChange={(e) => setField("address", e.target.value)}
                                placeholder="Enter full address"
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/crm/contacts")}
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
                            isEdit ? "Update Contact" : "Save Contact"
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
