import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { companyService } from '../../services/api';
import { showAlert, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { ArrowLeft, Loader2, AlertCircle, Upload, X, Building2, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Skeleton } from '../../components/ui/skeleton';

const API_BASE_URL = 'http://127.0.0.1:8000';

interface FieldErrors {
    [key: string]: string | undefined;
}

export default function CompanyEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [formData, setFormData] = useState({
        org_id: '',
        company_name: '',
        address: '',
        shipping_address: '',
        company_phone: '',
        company_email: '',
        website: '',
    });

    // Logo states
    const [existingLogo, setExistingLogo] = useState<string | null>(null); // stored path from DB
    const [logoFile, setLogoFile] = useState<File | null>(null);           // new file to upload
    const [logoPreview, setLogoPreview] = useState<string | null>(null);   // preview of new file
    const [removeLogo, setRemoveLogo] = useState(false);                   // user wants to delete current logo
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Helpers ────────────────────────────────────────────────────────
    const getLogoUrl = (path: string | null) => {
        if (!path) return null;
        return path.startsWith('http') ? path : `${API_BASE_URL}/storage/${path}`;
    };

    // What to show in the preview box
    const displaySrc = logoPreview ?? (removeLogo ? null : getLogoUrl(existingLogo));

    // ── Fetch ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!id) return;
        const fetchData = async () => {
            try {
                const response = await companyService.getById(Number(id));
                const company = response.data.data || response.data;

                setFormData({
                    org_id: company.org_id?.toString() || '',
                    company_name: company.company_name || '',
                    address: company.address || '',
                    shipping_address: company.shipping_address || '',
                    company_phone: company.company_phone || '',
                    company_email: company.email || '',
                    website: company.website || '',
                });
                setExistingLogo(company.company_logo || null);
            } catch (error) {
                console.error('Failed to fetch company:', error);
                setFormError('Failed to load company data');
                showAlert('error', 'Error', 'Failed to load company data');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id]);

    // ── Logo handlers ──────────────────────────────────────────────────
    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showAlert('error', 'Invalid File', 'Please select an image file.');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            showAlert('error', 'File Too Large', 'Logo must be under 2 MB.');
            return;
        }
        setLogoFile(file);
        setRemoveLogo(false);
        const reader = new FileReader();
        reader.onloadend = () => setLogoPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleClearNewLogo = () => {
        setLogoFile(null);
        setLogoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleRemoveExistingLogo = () => {
        setRemoveLogo(true);
        setLogoFile(null);
        setLogoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ── Submit ─────────────────────────────────────────────────────────
    const validateForm = (): boolean => {
        const errors: FieldErrors = {};
        if (!formData.company_name.trim()) {
            errors.company_name = 'Company Name is required';
        }
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFieldErrors({});
        setFormError('');
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            const payload = new FormData();
            payload.append('_method', 'PUT'); // Laravel method spoofing
            payload.append('company_name', formData.company_name);
            payload.append('address', formData.address);
            payload.append('shipping_address', formData.shipping_address);
            payload.append('company_phone', formData.company_phone);
            payload.append('company_email', formData.company_email);
            payload.append('website', formData.website);

            if (logoFile) {
                // New logo selected
                payload.append('company_logo', logoFile);
            } else if (removeLogo) {
                // Signal backend to remove logo
                payload.append('remove_logo', '1');
            }

            await companyService.updateWithFile(Number(id), payload);
            showAlert('success', 'Success', 'Company updated successfully', 2000);
            navigate('/companies');
        } catch (error: any) {
            console.error('Failed to update company:', error);
            if (error.response?.data?.errors) {
                const apiErrors: FieldErrors = {};
                Object.keys(error.response.data.errors).forEach(key => {
                    apiErrors[key] = error.response.data.errors[key][0];
                });
                setFieldErrors(apiErrors);
                setFormError('Please check the fields below.');
            } else {
                setFormError(getErrorMessage(error, 'Failed to update company'));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderError = (field: string) =>
        fieldErrors[field] ? <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p> : null;

    // ── Loading skeleton ───────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <div>
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-32 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-24 w-24 rounded-xl" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ── Render ─────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-solarized-base02">Edit Company</h1>
                    <p className="text-solarized-base01">Update company details</p>
                </div>
            </div>

            <Card className="border-0 shadow-md">
                <CardHeader>
                    <CardTitle>Company Details</CardTitle>
                    <CardDescription>Update the details for this company.</CardDescription>
                </CardHeader>
                <CardContent>
                    {formError && (
                        <Alert variant="destructive" className="mb-6">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{formError}</AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2">

                            {/* ── Logo Upload ── */}
                            <div className="space-y-2 sm:col-span-2">
                                <Label>Company Logo</Label>
                                <div className="flex items-start gap-4">
                                    {/* Preview box */}
                                    <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0 relative group">
                                        {displaySrc ? (
                                            <>
                                                <img
                                                    src={displaySrc}
                                                    alt="Company logo"
                                                    className="w-full h-full object-contain p-1"
                                                />
                                                {/* Clear new selection */}
                                                {logoPreview && (
                                                    <button
                                                        type="button"
                                                        onClick={handleClearNewLogo}
                                                        className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 text-gray-400">
                                                <Building2 className="h-8 w-8" />
                                                <span className="text-[10px]">{removeLogo ? 'Removed' : 'No logo'}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Controls */}
                                    <div className="flex flex-col gap-2 justify-center pt-1">
                                        {/* Hidden file input */}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleLogoChange}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload className="h-4 w-4 mr-2" />
                                            {displaySrc ? 'Change Logo' : 'Upload Logo'}
                                        </Button>

                                        {/* Remove existing logo (only if there is one and no new file selected) */}
                                        {existingLogo && !removeLogo && !logoFile && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                                                onClick={handleRemoveExistingLogo}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Remove Logo
                                            </Button>
                                        )}

                                        {/* Undo remove */}
                                        {removeLogo && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="text-gray-500 px-2"
                                                onClick={() => setRemoveLogo(false)}
                                            >
                                                Undo Remove
                                            </Button>
                                        )}

                                        {logoFile && (
                                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                                                {logoFile.name}
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground">PNG, JPG, SVG — max 2 MB</p>
                                    </div>
                                </div>
                            </div>

                            {/* ── Company Name ── */}
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="company_name" className={fieldErrors.company_name ? 'text-red-500' : ''}>
                                    Company Name *
                                </Label>
                                <Input
                                    id="company_name"
                                    value={formData.company_name}
                                    onChange={(e) => {
                                        setFormData({ ...formData, company_name: e.target.value });
                                        if (fieldErrors.company_name) setFieldErrors({ ...fieldErrors, company_name: undefined });
                                    }}
                                    placeholder="Company Name"
                                    aria-invalid={!!fieldErrors.company_name}
                                />
                                {renderError('company_name')}
                            </div>

                            {/* ── Phone ── */}
                            <div className="space-y-2">
                                <Label htmlFor="company_phone">Phone</Label>
                                <Input
                                    id="company_phone"
                                    value={formData.company_phone}
                                    onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
                                    placeholder="+91 9876543210"
                                />
                            </div>

                            {/* ── Email ── */}
                            <div className="space-y-2">
                                <Label htmlFor="company_email">Company Email</Label>
                                <Input
                                    id="company_email"
                                    type="email"
                                    value={formData.company_email}
                                    onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
                                    placeholder="info@company.com"
                                />
                            </div>

                            {/* ── Website ── */}
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="website">Website</Label>
                                <Input
                                    id="website"
                                    type="url"
                                    value={formData.website}
                                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                    placeholder="https://www.company.com"
                                />
                            </div>

                            {/* ── Billing Address ── */}
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="address">Billing Address</Label>
                                <Textarea
                                    id="address"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="123 Main St, City, Country"
                                    rows={3}
                                />
                            </div>

                            {/* ── Shipping Address ── */}
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="shipping_address">Shipping Address</Label>
                                <Textarea
                                    id="shipping_address"
                                    value={formData.shipping_address}
                                    onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                                    placeholder="Warehouse / Delivery address (if different)"
                                    rows={2}
                                />
                            </div>
                        </div>

                        {/* ── Footer buttons ── */}
                        <div className="flex justify-end gap-4">
                            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
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
                                    'Save Changes'
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
