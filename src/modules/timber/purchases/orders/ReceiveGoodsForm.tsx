import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    purchaseOrderApi,
    warehouseApi,
    poItemReceivedApi,
} from "../../services/inventoryApi";
import type {
    TimberPurchaseOrder,
    TimberWarehouse,
} from "../../types/inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { showAlert, getErrorMessage } from "@/lib/sweetalert";
import {
    ArrowLeft,
    PackageCheck,
    ChevronLeft,
    Package,
    LayoutGrid,
    Warehouse,
} from "lucide-react";

interface ReceiveItemRow {
    id: number;
    wood_type_name: string;
    ordered_quantity: number;
    already_received: number;
    remaining: number;
    received_quantity: string;
    received_date: string;
    unit_price: number;
}

export default function ReceiveGoodsForm() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [order, setOrder] = useState<TimberPurchaseOrder | null>(null);
    const [items, setItems] = useState<ReceiveItemRow[]>([]);
    const [notes, setNotes] = useState("");

    // Warehouse selection (global for all items)
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | "">(
        "",
    );
    const [warehouses, setWarehouses] = useState<TimberWarehouse[]>([]);

    const today = new Date().toISOString().split("T")[0];

    useEffect(() => {
        if (id) {
            setIsLoading(true);

            // Fetch PO details and warehouse list in parallel
            Promise.all([
                purchaseOrderApi.get(Number(id)),
                warehouseApi.list({ per_page: 100 }),
            ])
                .then(([poData, whData]) => {
                    const po =
                        ((poData as unknown as Record<string, unknown>)
                            .data as TimberPurchaseOrder) ||
                        (poData as TimberPurchaseOrder);
                    setOrder(po);

                    // Pre-select the warehouse from the PO
                    if (po.warehouse_id) {
                        setSelectedWarehouseId(po.warehouse_id);
                    }

                    if (po.items) {
                        setItems(
                            po.items.map((item) => ({
                                id: item.id,
                                wood_type_name: item.wood_type?.name || "-",
                                ordered_quantity: Number(item.quantity),
                                already_received: Number(
                                    item.received_quantity,
                                ),
                                remaining:
                                    Number(item.quantity) -
                                    Number(item.received_quantity),
                                received_quantity: "",
                                received_date: new Date()
                                    .toISOString()
                                    .split("T")[0],
                                unit_price: Number(item.unit_price),
                            })),
                        );
                    }

                    // Extract warehouse list
                    const whList =
                        ((whData as Record<string, unknown>)
                            .data as TimberWarehouse[]) ||
                        (whData as TimberWarehouse[]);
                    setWarehouses(Array.isArray(whList) ? whList : []);
                })
                .catch((error) => {
                    console.error("Failed to fetch data:", error);
                    showAlert(
                        "error",
                        "Error",
                        "Failed to load purchase order",
                    );
                })
                .finally(() => setIsLoading(false));
        }
    }, [id]);

    const updateReceivedQty = (index: number, value: string) => {
        const updated = [...items];
        updated[index] = { ...updated[index], received_quantity: value };
        setItems(updated);
    };

    const updateReceivedDate = (index: number, value: string) => {
        const updated = [...items];
        updated[index] = { ...updated[index], received_date: value };
        setItems(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate warehouse
        if (!selectedWarehouseId) {
            showAlert(
                "error",
                "Validation",
                "Please select a receiving warehouse",
            );
            return;
        }

        const receivingItems = items.filter(
            (item) => Number(item.received_quantity) > 0,
        );
        if (receivingItems.length === 0) {
            showAlert(
                "error",
                "Validation",
                "Please enter received quantities for at least one item",
            );
            return;
        }

        // Validate no item exceeds remaining quantity
        for (const item of receivingItems) {
            const received = Number(item.received_quantity);
            if (received > item.remaining) {
                showAlert(
                    "error",
                    "Validation",
                    `Received quantity for ${item.wood_type_name} exceeds remaining (${item.remaining})`,
                );
                return;
            }
        }

        // Calculate total received amount
        const totalAmount = receivingItems.reduce(
            (sum, item) =>
                sum + Number(item.received_quantity) * item.unit_price,
            0,
        );

        setIsSubmitting(true);
        try {
            // For each item with a received quantity, store a record via the new endpoint
            await Promise.all(
                receivingItems.map((item) =>
                    poItemReceivedApi.store({
                        purchase_order_id: Number(id),
                        warehouse_id: Number(selectedWarehouseId),
                        received_quantity: Number(item.received_quantity),
                        received_date: item.received_date,
                        total_amount:
                            Number(item.received_quantity) * item.unit_price,
                    }),
                ),
            );

            // Also call the existing receive endpoint to update PO status / stock ledger
            await purchaseOrderApi.receive(Number(id), {
                items: receivingItems.map((item) => ({
                    item_id: item.id,
                    quantity: Number(item.received_quantity),
                })),
                notes: notes || undefined,
            });

            showAlert(
                "success",
                "Success",
                "Goods received and stock updated",
                2000,
            );
            navigate(`/purchases/orders/${id}`);
        } catch (error) {
            showAlert(
                "error",
                "Error",
                getErrorMessage(error, "Failed to receive goods"),
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className='flex justify-center py-12'>
                <p>Loading purchase order...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className='flex justify-center py-12'>
                <p>Purchase order not found</p>
            </div>
        );
    }

    return (
        <div className='w-full space-y-6 pb-24 md:pb-8'>
            {/* Desktop Header */}
            <div className='hidden md:flex items-center gap-4'>
                <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => navigate(`/purchases/orders/${id}`)}
                    className='h-10 w-10 text-slate-500'
                >
                    <ArrowLeft className='h-5 w-5' />
                </Button>
                <div>
                    <h1 className='text-2xl font-bold text-solarized-base02'>
                        Receive Goods
                    </h1>
                    <p className='text-muted-foreground font-medium'>
                        PO: {order.po_code} — {order.supplier?.name}
                    </p>
                </div>
            </div>

            {/* Mobile Sticky Header */}
            <div className='sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 md:hidden -mx-4 -mt-6'>
                <div className='flex items-center gap-3'>
                    <Button
                        variant='ghost'
                        size='icon'
                        className='h-9 w-9 bg-slate-50'
                        onClick={() => navigate(`/purchases/orders/${id}`)}
                    >
                        <ChevronLeft className='h-5 w-5' />
                    </Button>
                    <h1 className='font-bold text-slate-800 tracking-tight'>
                        Receive Goods
                    </h1>
                </div>
            </div>

            {/* Order Summary */}
            <div className='grid grid-cols-1 gap-6'>
                <Card className='border-none md:border md:border-slate-200 shadow-none md:shadow-sm'>
                    <CardHeader className='hidden md:block'>
                        <CardTitle className='text-xl font-bold text-solarized-base02'>
                            Order Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent className='pt-6 md:pt-0'>
                        <div className='grid grid-cols-2 md:grid-cols-4 gap-6'>
                            <div className='space-y-1'>
                                <Label className='text-muted-foreground md:text-slate-500 font-medium'>
                                    Supplier
                                </Label>
                                <p className='text-sm font-bold text-slate-800'>
                                    {order.supplier?.name || "-"}
                                </p>
                            </div>
                            <div className='space-y-1'>
                                <Label className='text-muted-foreground md:text-slate-500 font-medium'>
                                    Default Warehouse
                                </Label>
                                <p className='text-sm font-bold text-slate-800'>
                                    {order.warehouse?.name || "-"}
                                </p>
                            </div>
                            <div className='space-y-1'>
                                <Label className='text-muted-foreground md:text-slate-500 font-medium'>
                                    PO Code
                                </Label>
                                <p className='text-sm font-bold text-slate-800'>
                                    {order.po_code}
                                </p>
                            </div>
                            <div className='space-y-1'>
                                <Label className='text-muted-foreground md:text-slate-500 font-medium'>
                                    Expected Date
                                </Label>
                                <p className='text-sm font-bold text-indigo-600'>
                                    {order.expected_delivery_date
                                        ? new Date(
                                              order.expected_delivery_date,
                                          ).toLocaleDateString("en-IN")
                                        : order.expected_date
                                          ? new Date(
                                                order.expected_date,
                                            ).toLocaleDateString("en-IN")
                                          : "-"}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <form onSubmit={handleSubmit} className='space-y-6'>
                {/* ── Items to Receive ── */}
                <Card className='border-none md:border md:border-slate-200 shadow-none md:shadow-sm'>
                    <CardHeader className='hidden md:flex flex-row items-center justify-between'>
                        <CardTitle className='text-xl font-bold text-solarized-base02'>
                            Items to Receive
                        </CardTitle>
                        <div className='flex items-center gap-3'>
                            <Label
                                htmlFor='warehouse_id'
                                className='text-sm font-bold text-slate-700 whitespace-nowrap'
                            >
                                Warehouse{" "}
                                <span className='text-red-500'>*</span>
                            </Label>
                            <div className='relative min-w-[200px]'>
                                <select
                                    id='warehouse_id'
                                    value={selectedWarehouseId}
                                    onChange={(e) =>
                                        setSelectedWarehouseId(
                                            Number(e.target.value),
                                        )
                                    }
                                    required
                                    className='w-full h-10 rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none pr-10'
                                >
                                    <option value=''>— Select —</option>
                                    {warehouses.map((wh) => (
                                        <option key={wh.id} value={wh.id}>
                                            {wh.name}
                                        </option>
                                    ))}
                                </select>
                                <Warehouse className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400' />
                            </div>
                        </div>
                    </CardHeader>
                    <CardHeader className='bg-slate-50/50 border-b border-slate-50 py-4 md:hidden'>
                        <div className='flex flex-col gap-3'>
                            <div className='flex items-center gap-2'>
                                <LayoutGrid className='h-4 w-4 text-slate-400 ml-2' />
                                <CardTitle className='text-xs font-bold text-slate-800 uppercase tracking-widest'>
                                    Items to Receive
                                </CardTitle>
                            </div>
                            <div className='px-2'>
                                <div className='relative'>
                                    <select
                                        id='warehouse_id_mobile'
                                        value={selectedWarehouseId}
                                        onChange={(e) =>
                                            setSelectedWarehouseId(
                                                Number(e.target.value),
                                            )
                                        }
                                        required
                                        className='w-full h-10 rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-bold text-slate-800 appearance-none pr-10'
                                    >
                                        <option value=''>
                                            — Select Warehouse —
                                        </option>
                                        {warehouses.map((wh) => (
                                            <option key={wh.id} value={wh.id}>
                                                {wh.name}
                                            </option>
                                        ))}
                                    </select>
                                    <Warehouse className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400' />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className='px-0 md:px-6'>
                        {/* Desktop Table */}
                        <div className='hidden md:block border rounded-md overflow-hidden'>
                            <table className='w-full text-sm'>
                                <thead>
                                    <tr className='bg-gray-50 border-b text-solarized-base02'>
                                        <th className='text-left p-3 font-bold'>
                                            Wood Type
                                        </th>
                                        <th className='text-right p-3 font-bold'>
                                            Ordered
                                        </th>
                                        <th className='text-right p-3 font-bold'>
                                            Already Received
                                        </th>
                                        <th className='text-right p-3 font-bold'>
                                            Remaining
                                        </th>
                                        <th className='text-right p-3 w-40 font-bold'>
                                            Receiving Now
                                        </th>
                                        <th className='text-center p-3 w-44 font-bold'>
                                            Received Date
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={item.id} className='border-t'>
                                            <td className='p-3 font-medium'>
                                                {item.wood_type_name}
                                            </td>
                                            <td className='text-right p-3'>
                                                {item.ordered_quantity.toFixed(
                                                    2,
                                                )}
                                            </td>
                                            <td className='text-right p-3'>
                                                {item.already_received.toFixed(
                                                    2,
                                                )}
                                            </td>
                                            <td className='text-right p-3 font-semibold'>
                                                {item.remaining.toFixed(2)}
                                            </td>
                                            <td className='p-3'>
                                                <Input
                                                    type='number'
                                                    step='0.01'
                                                    min='0'
                                                    max={item.remaining}
                                                    placeholder='0.00'
                                                    value={
                                                        item.received_quantity
                                                    }
                                                    onChange={(e) =>
                                                        updateReceivedQty(
                                                            index,
                                                            e.target.value,
                                                        )
                                                    }
                                                    className='text-right'
                                                    disabled={
                                                        item.remaining <= 0
                                                    }
                                                />
                                            </td>
                                            <td className='p-3'>
                                                <Input
                                                    type='date'
                                                    value={item.received_date}
                                                    onChange={(e) =>
                                                        updateReceivedDate(
                                                            index,
                                                            e.target.value,
                                                        )
                                                    }
                                                    max={today}
                                                    className='text-center'
                                                    disabled={
                                                        item.remaining <= 0
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className='block md:hidden space-y-4 px-4'>
                            {items.map((item, index) => (
                                <Card
                                    key={item.id}
                                    className='rounded-xl border border-slate-100 shadow-sm overflow-hidden'
                                >
                                    <div className='bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center font-bold text-[10px] text-slate-400 uppercase tracking-widest'>
                                        <span>Item #{index + 1}</span>
                                        {item.remaining <= 0 && (
                                            <span className='text-emerald-500'>
                                                Fully Received
                                            </span>
                                        )}
                                    </div>
                                    <div className='p-4 space-y-4'>
                                        <h3 className='font-bold text-slate-800 text-sm'>
                                            {item.wood_type_name}
                                        </h3>
                                        <div className='grid grid-cols-3 gap-2 text-center border-b border-slate-50 pb-3'>
                                            <div className='space-y-0.5'>
                                                <p className='text-[9px] uppercase font-bold text-slate-400'>
                                                    Ordered
                                                </p>
                                                <p className='text-xs font-semibold text-slate-600'>
                                                    {item.ordered_quantity.toFixed(
                                                        2,
                                                    )}
                                                </p>
                                            </div>
                                            <div className='space-y-0.5 border-x border-slate-50'>
                                                <p className='text-[9px] uppercase font-bold text-slate-400'>
                                                    Received
                                                </p>
                                                <p className='text-xs font-semibold text-slate-600'>
                                                    {item.already_received.toFixed(
                                                        2,
                                                    )}
                                                </p>
                                            </div>
                                            <div className='space-y-0.5 text-right'>
                                                <p className='text-[9px] uppercase font-bold text-slate-400'>
                                                    Remaining
                                                </p>
                                                <p className='text-xs font-bold text-indigo-600'>
                                                    {item.remaining.toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                        {item.remaining > 0 && (
                                            <div className='space-y-3 pt-1'>
                                                <div className='space-y-1.5'>
                                                    <Label className='text-[10px] font-bold text-slate-500 uppercase'>
                                                        Receiving Now
                                                    </Label>
                                                    <div className='relative'>
                                                        <Package className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300' />
                                                        <Input
                                                            type='number'
                                                            step='0.01'
                                                            min='0'
                                                            max={item.remaining}
                                                            placeholder='0.00'
                                                            value={
                                                                item.received_quantity
                                                            }
                                                            onChange={(e) =>
                                                                updateReceivedQty(
                                                                    index,
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            className='pl-9 h-11 bg-slate-50 border-slate-200 rounded-lg font-bold text-slate-900'
                                                        />
                                                    </div>
                                                </div>
                                                <div className='space-y-1.5'>
                                                    <Label className='text-[10px] font-bold text-slate-500 uppercase'>
                                                        Received Date
                                                    </Label>
                                                    <Input
                                                        type='date'
                                                        value={
                                                            item.received_date
                                                        }
                                                        onChange={(e) =>
                                                            updateReceivedDate(
                                                                index,
                                                                e.target.value,
                                                            )
                                                        }
                                                        max={today}
                                                        className='h-11 bg-slate-50 border-slate-200 rounded-lg font-medium text-slate-800'
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Notes */}
                <Card className='border-none md:border md:border-slate-200 shadow-none md:shadow-sm mt-4'>
                    <CardContent className='pt-6 px-4 md:px-6'>
                        <div className='space-y-2'>
                            <Label className='text-sm font-bold text-solarized-base02'>
                                Receiving Notes
                            </Label>
                            <Textarea
                                placeholder='Notes about the received goods...'
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                className='w-full text-sm h-11 md:h-24 bg-slate-50 md:bg-white'
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className='fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-50 md:static md:p-0 md:border-none flex flex-col md:flex-row justify-end gap-3 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] md:shadow-none'>
                    <Button
                        type='button'
                        variant='outline'
                        onClick={() => navigate(`/purchases/orders/${id}`)}
                        className='w-full md:w-auto h-11 md:h-10 order-2 md:order-1 font-bold md:font-normal text-slate-500'
                    >
                        Cancel
                    </Button>
                    <Button
                        type='submit'
                        disabled={isSubmitting}
                        className='bg-solarized-blue hover:bg-solarized-blue/90 w-full md:w-auto h-11 md:h-10 order-1 md:order-2 font-black md:font-normal'
                    >
                        <PackageCheck className='mr-2 h-4 w-4' />
                        {isSubmitting ? "Processing..." : "Confirm Receipt"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
