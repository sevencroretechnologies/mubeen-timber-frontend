import { useState, useEffect } from 'react';
import { showAlert, getErrorMessage } from '@/lib/sweetalert';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Warehouse, Trees } from 'lucide-react';
import api from '@/services/api';

interface CollectMaterialModalProps {
    estimation: any;
    onClose: () => void;
    onCollected: () => void;
}

interface WoodType {
    id: number;
    name: string;
    code?: string;
}

interface Warehouse {
    id: number;
    name: string;
}

interface StockAvailability {
    warehouse_id: number;
    warehouse_name: string;
    current_quantity: number;
    available_quantity: number;
}

export default function CollectMaterialModal({
    estimation,
    onClose,
    onCollected
}: CollectMaterialModalProps) {
    const [woodTypes, setWoodTypes] = useState<WoodType[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [stockAvailability, setStockAvailability] = useState<StockAvailability[]>([]);
    const [selectedWoodType, setSelectedWoodType] = useState<number | null>(null);
    const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
    const [quantity, setQuantity] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [isLoadingStock, setIsLoadingStock] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const cft = parseFloat(String(estimation.cft || 0));
    const collectedCft = parseFloat(String(estimation.total_collected_cft || 0));
    const remainingCft = cft - collectedCft;

    useEffect(() => {
        fetchWoodTypes();
        fetchWarehouses();
    }, []);

    useEffect(() => {
        if (selectedWoodType) {
            fetchStockAvailability(selectedWoodType);
        } else {
            setStockAvailability([]);
        }
    }, [selectedWoodType]);

    const fetchWoodTypes = async () => {
        try {
            const response = await api.get('/timber/wood-types');
            setWoodTypes(Array.isArray(response.data) ? response.data : (response.data?.data || []));
        } catch (error) {
            console.error('Failed to fetch wood types:', error);
        }
    };

    const fetchWarehouses = async () => {
        try {
            const response = await api.get('/timber/warehouses');
            setWarehouses(Array.isArray(response.data) ? response.data : (response.data?.data || []));
        } catch (error) {
            console.error('Failed to fetch warehouses:', error);
        }
    };

    const fetchStockAvailability = async (woodTypeId: number) => {
        setIsLoadingStock(true);
        try {
            const response = await api.get('/estimations-stock/available', {
                params: { wood_type_id: woodTypeId }
            });
            setStockAvailability(response.data?.stock || []);
        } catch (error) {
            console.error('Failed to fetch stock availability:', error);
        } finally {
            setIsLoadingStock(false);
        }
    };

    const getAvailableStockForWarehouse = (warehouseId: number): number => {
        const stock = stockAvailability.find(s => s.warehouse_id === warehouseId);
        return stock?.available_quantity || 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const qty = parseFloat(quantity);
        const availableStock = selectedWarehouse ? getAvailableStockForWarehouse(selectedWarehouse) : 0;

        if (qty <= 0) {
            showAlert('error', 'Invalid Quantity', 'Please enter a valid quantity');
            return;
        }

        if (qty > availableStock) {
            showAlert('error', 'Insufficient Stock', `Only ${availableStock.toFixed(2)} CFT available in selected warehouse`);
            return;
        }

        if (qty > remainingCft) {
            showAlert('error', 'Excess Quantity', `Only ${remainingCft.toFixed(2)} CFT remaining for this estimation`);
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post(`/estimations/${estimation.id}/collect`, {
                wood_type_id: selectedWoodType,
                warehouse_id: selectedWarehouse,
                quantity_cft: qty,
                notes: notes || null
            });

            showAlert('success', 'Collected!', `${qty} CFT material collected successfully`, 2000);
            onCollected();
        } catch (error) {
            showAlert('error', 'Error', getErrorMessage(error, 'Failed to collect material'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const availableStockForSelected = selectedWarehouse
        ? getAvailableStockForWarehouse(selectedWarehouse)
        : stockAvailability.reduce((sum, s) => sum + s.available_quantity, 0);

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-orange-600" />
                        Collect Material
                    </DialogTitle>
                    <DialogDescription>
                        {estimation.product?.name} - {estimation.customer?.name}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Estimation Info */}
                    <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Estimated CFT:</span>
                            <span className="font-medium">{cft.toFixed(2)} CFT</span>
                        </div>
                        {/* <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Already Collected:</span>
                            <span className="font-medium text-blue-600">
                                {collectedCft.toFixed(2)} CFT
                            </span>
                        </div>
                        <div className="flex justify-between text-sm border-t pt-2">
                            <span className="text-gray-600">Remaining to Collect:</span>
                            <span className="font-medium text-orange-600">
                                {remainingCft.toFixed(2)} CFT
                            </span>
                        </div> */}
                    </div>

                    {/* Wood Type Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="woodType" className="flex items-center gap-2">
                            <Trees className="h-4 w-4" />
                            Wood Type *
                        </Label>
                        <select
                            id="woodType"
                            value={selectedWoodType ?? ''}
                            onChange={(e) => {
                                setSelectedWoodType(e.target.value ? Number(e.target.value) : null);
                                setSelectedWarehouse(null);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">Select Wood Type</option>
                            {woodTypes.map((wt) => (
                                <option key={wt.id} value={wt.id}>
                                    {wt.name} 
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Warehouse Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="warehouse" className="flex items-center gap-2">
                            <Warehouse className="h-4 w-4" />
                            Warehouse *
                        </Label>
                        <select
                            id="warehouse"
                            value={selectedWarehouse ?? ''}
                            onChange={(e) => setSelectedWarehouse(e.target.value ? Number(e.target.value) : null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            disabled={!selectedWoodType || isLoadingStock}
                        >
                            <option value="">Select Warehouse</option>
                            {warehouses.map((wh) => {
                                const available = getAvailableStockForWarehouse(wh.id);
                                return (
                                    <option key={wh.id} value={wh.id}>
                                        {wh.name} (Available: {available.toFixed(2)} CFT)
                                    </option>
                                );
                            })}
                        </select>
                        {selectedWarehouse && (
                            <p className="text-xs text-gray-500">
                                Available stock: {availableStockForSelected.toFixed(2)} CFT
                            </p>
                        )}
                    </div>

                    {/* Quantity Input */}
                    <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity CFT *</Label>
                        <Input
                            id="quantity"
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={remainingCft}
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="Enter quantity in CFT"
                            required
                        />
                        <p className="text-xs text-gray-500">
                            Maximum: {remainingCft.toFixed(2)} CFT
                        </p>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                            placeholder="Add any notes about this collection..."
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !selectedWoodType || !selectedWarehouse}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            {isSubmitting ? 'Collecting...' : 'Collect Material'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
