import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { estimationsApi } from '@/services/api';
import { showAlert, getErrorMessage } from '@/lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileSignature, Package, User, Building2, Ruler } from 'lucide-react';

interface Estimation {
    id: number;
    customer_id: number;
    project_id: number;
    product_id: number;
    estimation_type: number;
    length: number;
    breadth: number;
    height?: number;
    thickness?: number;
    quantity: number;
    cft: number;
    cost_per_cft: number;
    labor_charges: number;
    total_amount: number;
    customer?: { id: number; name: string } | null;
    project?: { id: number; name: string; description?: string } | null;
    product?: { id: number; name: string; description?: string } | null;
}

export default function EstimationView() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [estimation, setEstimation] = useState<Estimation | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchEstimation = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const response = await estimationsApi.get(id);
                const data = response?.data?.data || response?.data || response;
                setEstimation(data);
            } catch (error) {
                showAlert('error', 'Error', getErrorMessage(error, 'Failed to load estimation'));
            } finally {
                setIsLoading(false);
            }
        };
        fetchEstimation();
    }, [id]);

    const getEstimationTypeLabel = (type: number) => {
        const types = {
            1: 'Type 1 - Inches (L×B×H)',
            2: 'Type 2 - Feet (L×B×H)',
            3: 'Type 3 - Thickness Inches (L×B×T)',
            4: 'Type 4 - Thickness Feet (L×B×T)'
        };
        return types[type as keyof typeof types] || 'Unknown';
    };

    const getDimensionsDisplay = () => {
        if (!estimation) return '-';
        const l = estimation.length || 0;
        const b = estimation.breadth || 0;
        const type = estimation.estimation_type;

        if (type === 1 || type === 2) {
            const h = estimation.height || 0;
            return `${l} × ${b} × ${h}`;
        } else {
            const t = estimation.thickness || 0;
            return `${l} × ${b} × ${t}`;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-solarized-blue"></div>
            </div>
        );
    }

    if (!estimation) {
        return (
            <div className="text-center py-12">
                <FileSignature className="mx-auto h-16 w-16 mb-4 opacity-20" />
                <h2 className="text-xl font-semibold mb-2">Estimation Not Found</h2>
                <p className="text-muted-foreground mb-4">The estimation you're looking for doesn't exist.</p>
                <Button onClick={() => navigate('/crm/estimations')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Estimations
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/crm/estimations')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-solarized-base02">Estimation Details</h1>
                    <p className="text-muted-foreground text-sm">Estimation #{estimation.id}</p>
                </div>
            </div>

            {/* Details Cards */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Customer Info */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <User className="h-4 w-4 text-solarized-blue" />
                            Customer
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="font-semibold text-lg">
                            {estimation.customer?.name || `Customer #${estimation.customer_id}`}
                        </p>
                        {!estimation.customer?.name && (
                            <p className="text-xs text-muted-foreground">ID: {estimation.customer_id}</p>
                        )}
                    </CardContent>
                </Card>

                {/* Project Info */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-green-600" />
                            Project
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="font-semibold text-lg">
                            {estimation.project?.name || `Project #${estimation.project_id}`}
                        </p>
                        {estimation.project?.description && (
                            <p className="text-sm text-muted-foreground mt-1">{estimation.project.description}</p>
                        )}
                        {!estimation.project?.name && (
                            <p className="text-xs text-muted-foreground">ID: {estimation.project_id}</p>
                        )}
                    </CardContent>
                </Card>

                {/* Product Info */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Package className="h-4 w-4 text-orange-600" />
                            Product
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="font-semibold text-lg">{estimation.product?.name || 'Unknown'}</p>
                        {estimation.product?.description && (
                            <p className="text-sm text-muted-foreground mt-1">{estimation.product.description}</p>
                        )}
                    </CardContent>
                </Card>

                {/* Estimation Type */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <FileSignature className="h-4 w-4 text-purple-600" />
                            Estimation Formula
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="font-semibold text-lg">{getEstimationTypeLabel(estimation.estimation_type)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Dimensions & Measurements */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Ruler className="h-4 w-4 text-blue-600" />
                        Dimensions & Measurements
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Length</p>
                            <p className="text-2xl font-bold">{estimation.length || 0}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Breadth</p>
                            <p className="text-2xl font-bold">{estimation.breadth || 0}</p>
                        </div>
                        {(estimation.estimation_type === 1 || estimation.estimation_type === 2) ? (
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Height</p>
                                <p className="text-2xl font-bold">{estimation.height || 0}</p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Thickness</p>
                                <p className="text-2xl font-bold">{estimation.thickness || 0}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Quantity</p>
                            <p className="text-2xl font-bold">{estimation.quantity || 1}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">CFT</p>
                            <p className="text-2xl font-bold text-blue-600">{Number(estimation.cft || 0).toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">Total Dimensions</p>
                        <p className="text-xl font-semibold">{getDimensionsDisplay()}</p>
                    </div>
                </CardContent>
            </Card>

            {/* Cost Breakdown */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Cost Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-muted-foreground">Cost per CFT</span>
                            <span className="font-semibold">₹{Number(estimation.cost_per_cft || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-muted-foreground">Material Cost (CFT × Cost/CFT)</span>
                            <span className="font-semibold">₹{Number(estimation.cft * estimation.cost_per_cft || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-muted-foreground">Labor Charges</span>
                            <span className="font-semibold">₹{Number(estimation.labor_charges || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 bg-green-50 rounded-lg px-4 mt-2">
                            <span className="font-semibold text-green-700">Total Amount</span>
                            <span className="text-2xl font-bold text-green-600">₹{Number(estimation.total_amount || 0).toFixed(2)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
