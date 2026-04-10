import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { organizationService } from '../../services/api';
import { showAlert, getErrorMessage } from '../../lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { ArrowLeft, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';

interface FieldErrors {
    [key: string]: string | undefined;
}

export default function OrganizationCreate() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        user_name: '',
        email: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validateForm = (): boolean => {
        const errors: FieldErrors = {};
        let isValid = true;

        if (!formData.name.trim()) {
            errors.name = 'Organization Name is required';
            isValid = false;
        } else if (formData.name.trim().length < 3) {
            errors.name = 'Organization Name must be at least 3 characters';
            isValid = false;
        }

        if (!formData.address.trim()) {
            errors.address = 'Address is required';
            isValid = false;
        }

        if (!formData.user_name.trim()) {
            errors.user_name = 'Admin Name is required';
            isValid = false;
        }

        if (!formData.email.trim()) {
            errors.email = 'Admin Email is required';
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Please enter a valid email address';
            isValid = false;
        }

        if (formData.password && formData.password.length < 8) {
            errors.password = 'Password must be at least 8 characters';
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
            // Backend expects 'org_name' for create
            const createPayload = {
                org_name: formData.name,
                address: formData.address,
                user_name: formData.user_name,
                email: formData.email,
                password: formData.password,
            };
            await organizationService.create(createPayload);
            showAlert('success', 'Success', 'Organization created successfully', 2000);
            navigate('/organizations');
        } catch (error: any) {
            console.error('Failed to save organization:', error);

            if (error.response?.data?.errors) {
                const apiErrors: FieldErrors = {};
                Object.keys(error.response.data.errors).forEach(key => {
                    apiErrors[key] = error.response.data.errors[key][0];
                });
                setFieldErrors(apiErrors);
                setFormError('Please check the fields below.');
            } else {
                const errorMessage = getErrorMessage(error, 'Failed to save organization');
                setFormError(errorMessage);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderError = (field: string) => {
        return fieldErrors[field] ? (
            <p className="text-sm text-red-500 mt-1">{fieldErrors[field]}</p>
        ) : null;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
        if (fieldErrors[id]) {
            setFieldErrors(prev => ({ ...prev, [id]: undefined }));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-solarized-base02">Create Organization</h1>
                    <p className="text-solarized-base01">Add a new client organization</p>
                </div>
            </div>

            <Card className="border-0 shadow-md">
                <CardHeader>
                    <CardTitle>Organization Details</CardTitle>
                    <CardDescription>Enter the details for the new organization.</CardDescription>
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
                                <Label htmlFor="name" className={fieldErrors.name ? 'text-red-500' : ''}>Organization Name *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="Acme Corp"
                                    className={fieldErrors.name ? 'border-red-500' : ''}
                                />
                                {renderError('name')}
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="address" className={fieldErrors.address ? 'text-red-500' : ''}>Address *</Label>
                                <Textarea
                                    id="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    placeholder="123 Main St, City, Country"
                                    rows={3}
                                    className={fieldErrors.address ? 'border-red-500' : ''}
                                />
                                {renderError('address')}
                            </div>
                        </div>

                        <div className="border-t pt-6">
                            <h3 className="text-lg font-medium mb-4">Admin Account</h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="user_name" className={fieldErrors.user_name ? 'text-red-500' : ''}>Admin Name *</Label>
                                    <Input
                                        id="user_name"
                                        value={formData.user_name}
                                        onChange={handleInputChange}
                                        placeholder="John Doe"
                                        className={fieldErrors.user_name ? 'border-red-500' : ''}
                                        autoComplete="off"
                                    />
                                    {renderError('user_name')}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className={fieldErrors.email ? 'text-red-500' : ''}>Admin Email *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="admin@example.com"
                                        className={fieldErrors.email ? 'border-red-500' : ''}
                                        autoComplete="off"
                                    />
                                    {renderError('email')}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password" className={fieldErrors.password ? 'text-red-500' : ''}>
                                        Password (optional)
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            placeholder="Password"
                                            className={`pr-10 ${fieldErrors.password ? 'border-red-500' : ''} [&::-ms-reveal]:hidden [&::-ms-clear]:hidden`}
                                            autoComplete="new-password"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowPassword(!showPassword)}
                                            tabIndex={-1}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4 text-gray-500" />
                                            ) : (
                                                <Eye className="h-4 w-4 text-gray-500" />
                                            )}
                                            <span className="sr-only">
                                                {showPassword ? 'Hide password' : 'Show password'}
                                            </span>
                                        </Button>
                                    </div>
                                    {renderError('password')}
                                </div>
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
                                        Creating...
                                    </>
                                ) : (
                                    'Create Organization'
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
