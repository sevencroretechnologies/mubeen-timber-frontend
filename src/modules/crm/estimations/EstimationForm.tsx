import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { estimationsApi, customerApi, crmProductService, projectApi } from '@/services/api';
import { showAlert, getErrorMessage } from '@/lib/sweetalert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Calculator, DollarSign } from 'lucide-react';

export default function EstimationForm() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEdit = Boolean(id);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [customers, setCustomers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [directAmount, setDirectAmount] = useState('');

    const [customerId, setCustomerId] = useState('');
    const [projectId, setProjectId] = useState('');
    const [productId, setProductId] = useState('');
    const [estimationType, setEstimationType] = useState('1');
    const [length, setLength] = useState('');
    const [breadth, setBreadth] = useState('');
    const [height, setHeight] = useState('');
    const [thickness, setThickness] = useState('');
    const [quantity, setQuantity] = useState('');
    const [cft, setCft] = useState('');
    const [costPerCft, setCostPerCft] = useState('');
    const [laborCharges, setLaborCharges] = useState('');
    const [totalAmount, setTotalAmount] = useState('');

    useEffect(() => {
        const fetchDependencies = async () => {
            try {
                const [custRes, prodRes, projRes] = await Promise.all([
                    customerApi.list({ per_page: 100 }),
                    crmProductService.getAll({ per_page: 100 }),
                    projectApi.list()
                ]);
                
                const extractArray = (res: any): any[] => {
                    if (Array.isArray(res)) return res;
                    if (res?.data && Array.isArray(res.data)) return res.data;
                    if (res?.data?.data && Array.isArray(res.data.data)) return res.data.data;
                    if (res?.data?.data?.data && Array.isArray(res.data.data.data)) return res.data.data.data;
                    return [];
                };

                setCustomers(extractArray(custRes));
                setProducts(extractArray(prodRes));
                setProjects(extractArray(projRes));
            } catch (error) {
                console.error('Failed to load form dependencies:', error);
            }
        };
        fetchDependencies();
    }, []);

    useEffect(() => {
        if (isEdit && id) {
            estimationsApi.get(id).then((res) => {
                const est = res.data || res;
                setCustomerId(String(est.customer_id || ''));
                setProjectId(String(est.project_id || ''));
                setProductId(String(est.product_id || ''));
                setEstimationType(String(est.estimation_type || '1'));
                setLength(String(est.length || ''));
                setBreadth(String(est.breadth || ''));
                setHeight(String(est.height || ''));
                setThickness(String(est.thickness || ''));
                setQuantity(String(est.quantity || ''));
                setCft(String(est.cft || ''));
                setCostPerCft(String(est.cost_per_cft || ''));
                setLaborCharges(String(est.labor_charges || ''));
                setTotalAmount(String(est.total_amount || ''));

                // If Direct Amount mode, load the total_amount as directAmount
                if (est.estimation_type === 5) {
                    setDirectAmount(String(est.total_amount || ''));
                }
            }).catch((error) => {
                showAlert('error', 'Error', 'Failed to load estimation details');
                console.error(error);
            });
        }
    }, [id, isEdit]);

    const derivedCft = useMemo(() => {
        if (!length && !breadth && !height && !thickness && !quantity) {
            return Number(cft) || 0;
        }

        const l = Number(length) || 1;
        const b = Number(breadth) || 1;
        const h = Number(height) || 1;
        const t = Number(thickness) || 1;
        const q = Number(quantity) || 1;
        
        const type = Number(estimationType);
        let cftPerUnit = 0;

        if (type === 1) { // Type 1: in inches -> (l*b*h)/144
            cftPerUnit = (l * b * h) / 144;
        } else if (type === 2) { // Type 2: in feet -> l*b*h
            cftPerUnit = l * b * h;
        } else if (type === 3) { // Type 3: thickness in inches -> (l*b*t)/12
            cftPerUnit = (l * b * t) / 12;
        } else if (type === 4) { // Type 4: thickness in feet -> l*b*t
            cftPerUnit = l * b * t;
        } else {
            // Fallback
            cftPerUnit = (l * b * h) / 144;
        }

        return cftPerUnit * q;
    }, [length, breadth, height, thickness, quantity, estimationType, cft]);

    const derivedTotalAmount = useMemo(() => {
        // Direct Amount mode
        if (estimationType === '5') {
            return Number(directAmount) || 0;
        }

        // Formula-based calculation
        const cost = Number(costPerCft) || 0;
        const labor = Number(laborCharges) || 0;
        return (derivedCft * cost) + labor;
    }, [derivedCft, costPerCft, laborCharges, estimationType, directAmount]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerId || !productId) {
            showAlert('error', 'Validation', 'Please select a Customer and Product.');
            return;
        }

        // Direct Amount mode validation
        if (estimationType === '5' && !directAmount) {
            showAlert('error', 'Validation', 'Please enter the direct amount.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload: Record<string, any> = {
                customer_id: Number(customerId),
                project_id: projectId ? Number(projectId) : null,
                product_id: Number(productId),
                estimation_type: Number(estimationType),
                total_amount: parseFloat(derivedTotalAmount.toFixed(2)),
            };

            // Only include dimensions and cost details in formula-based modes
            if (estimationType !== '5') {
                payload.length = length ? Number(length) : null;
                payload.breadth = breadth ? Number(breadth) : null;
                payload.height = height ? Number(height) : null;
                payload.thickness = thickness ? Number(thickness) : null;
                payload.quantity = quantity ? Number(quantity) : null;
                payload.cft = parseFloat(derivedCft.toFixed(2));
                payload.cost_per_cft = costPerCft ? Number(costPerCft) : null;
                payload.labor_charges = laborCharges ? Number(laborCharges) : null;
            } else {
                // Direct Amount mode - set CFT as null or 0
                payload.cft = null;
                payload.cost_per_cft = null;
                payload.labor_charges = null;
            }

            if (isEdit && id) {
                await estimationsApi.update(id, payload);
                showAlert('success', 'Updated', 'Estimation updated successfully');
            } else {
                await estimationsApi.create(payload);
                showAlert('success', 'Created', 'Estimation created successfully');
            }
            navigate('/crm/estimations');
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, `Failed to ${isEdit ? 'update' : 'create'} estimation`));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/crm/estimations')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-solarized-base02">{isEdit ? 'Edit' : 'New'} Estimation</h1>
                    <p className="text-muted-foreground">{isEdit ? 'Update estimation parameters' : 'Create a new project/product estimation'}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Core Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <Label>Customer <span className="text-red-500">*</span></Label>
                                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" required>
                                    <option value="">Select Customer</option>
                                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Product <span className="text-red-500">*</span></Label>
                                <select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" required>
                                    <option value="">Select Product</option>
                                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Project</Label>
                                <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm">
                                    <option value="">Select Project (Optional)</option>
                                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Estimation Formula <span className="text-red-500">*</span></Label>
                                <select value={estimationType} onChange={(e) => setEstimationType(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" required>
                                    <option value="1">CFT - Inches</option>
                                    <option value="2">CFT - Feet</option>
                                    <option value="3">CFT - Thickness in Inches</option>
                                    <option value="4">CFT - Thickness in Feet</option>
                                    <option value="5">Direct Amount</option>
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Dimensions & Values</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {estimationType === '5' ? (
                            // Direct Amount Mode
                            <div className="max-w-md">
                                <div className="flex items-center gap-3 p-6 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200">
                                    <div className="p-3 bg-amber-100 rounded-full">
                                        <DollarSign className="h-6 w-6 text-amber-600" />
                                    </div>
                                    <div className="flex-1">
                                        <Label className="text-sm font-semibold text-amber-900">Direct Amount (₹) <span className="text-red-500">*</span></Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={directAmount}
                                            onChange={(e) => setDirectAmount(e.target.value)}
                                            placeholder="Enter amount directly"
                                            className="mt-2 text-lg font-semibold border-amber-300 focus:border-amber-500"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="text-sm text-blue-800">
                                        <strong>Final Amount:</strong> ₹{derivedTotalAmount.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            // Formula-based Mode
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-6">
                                    <div className="space-y-2">
                                        <Label>Length</Label>
                                        <Input type="number" step="0.01" value={length} onChange={(e) => setLength(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Breadth</Label>
                                        <Input type="number" step="0.01" value={breadth} onChange={(e) => setBreadth(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Height</Label>
                                        <Input type="number" step="0.01" value={height} onChange={(e) => setHeight(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Thickness</Label>
                                        <Input type="number" step="0.01" value={thickness} onChange={(e) => setThickness(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Quantity</Label>
                                        <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-6 border-t">
                                    <div className="space-y-2">
                                        <Label>Volume (CFT)</Label>
                                        <Input type="number" step="0.01" value={derivedCft.toFixed(2)} className="bg-blue-50/50 cursor-not-allowed text-gray-700" readOnly />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Cost per CFT (₹)</Label>
                                        <Input type="number" step="0.01" value={costPerCft} onChange={(e) => setCostPerCft(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Labor Charges (₹)</Label>
                                        <Input type="number" step="0.01" value={laborCharges} onChange={(e) => setLaborCharges(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-solarized-blue font-bold">Total Amount (₹)</Label>
                                        <Input type="number" step="0.01" value={derivedTotalAmount.toFixed(2)} className="font-bold bg-green-50/80 cursor-not-allowed text-gray-700" readOnly />
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => navigate('/crm/estimations')}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting} className="bg-solarized-blue hover:bg-solarized-blue/90">
                        <Save className="mr-2 h-4 w-4" />
                        {isSubmitting ? 'Saving...' : 'Save Estimation'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
