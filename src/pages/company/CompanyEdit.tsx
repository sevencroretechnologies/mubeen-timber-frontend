import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { companyService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { showAlert, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Skeleton } from '../../components/ui/skeleton';

interface FieldErrors {
    [key: string]: string | undefined;
}

export default function CompanyEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [formData, setFormData] = useState({
        org_id: '',
        company_name: '',
        address: '',
    });
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Assuming companyService.getById exists or similar.
                // OrganizationList didn't need it because it was passing data, but clean architecture needs direct fetch.
                const response = await companyService.getById(Number(id));
                const company = response.data.data || response.data;

                setFormData({
                    org_id: company.org_id?.toString() || '',
                    company_name: company.company_name,
                    address: company.address || '',
                });

            } catch (error) {
                console.error('Failed to fetch company:', error);
                setFormError('Failed to load company data');
                showAlert('error', 'Error', 'Failed to load company data');
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchData();
        }
    }, [id]);

    const validateForm = (): boolean => {
        const errors: FieldErrors = {};
        let isValid = true;

        if (!formData.company_name.trim()) {
            errors.company_name = 'Company Name is required';
            isValid = false;
        }

        setFieldErrors(errors);
        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFieldErrors({});
        setFormError('');

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        try {
            await companyService.update(Number(id), formData);
            showAlert('success', 'Success', 'Company updated successfully', 2000);
            navigate('/companies');
        } catch (error) {
            console.error('Failed to update company:', error);
            const errorMessage = getErrorMessage(error, 'Failed to update company');
            setFormError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderError = (field: string) => {
        return fieldErrors[field] ? (
            <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
        ) : null;
    };

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
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
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
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="company_name" className={fieldErrors.company_name ? 'text-red-500' : ''}>Company Name *</Label>
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
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="address">Address</Label>
                                <Textarea
                                    id="address"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="123 Main St, City, Country"
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-4">
                            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-solarized-blue hover:bg-solarized-blue/90" disabled={isSubmitting}>
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
