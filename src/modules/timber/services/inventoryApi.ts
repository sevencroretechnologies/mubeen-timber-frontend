import api from '@/services/api';
import type {
  TimberSupplier,
  TimberWarehouse,
  TimberWoodType,
  TimberStockLedger,
  TimberStockMovement,
  TimberPurchaseOrder,
  TimberMaterialRequisition,
  TimberStockAlert,
  SupplierFormData,
  WarehouseFormData,
  StockAdjustmentFormData,
  PurchaseOrderFormData,
  ReceiveGoodsFormData,
  MaterialRequisitionFormData,
  PoItemReceivedFormData,
} from '../types/inventory';

const PREFIX = '/timber';

// Suppliers
export const supplierApi = {
  list: (params?: Record<string, unknown>) =>
    api.get(`${PREFIX}/suppliers`, { params }).then((res) => {
      const data = res.data;
      if (data && typeof data === 'object' && 'data' in data) return data;
      return { data };
    }),
  get: (id: number) =>
    api.get<{ data: TimberSupplier }>(`${PREFIX}/suppliers/${id}`).then((r) => r.data.data || r.data),
  create: (data: SupplierFormData) =>
    api.post(`${PREFIX}/suppliers`, data).then((r) => r.data),
  update: (id: number, data: Partial<SupplierFormData>) =>
    api.put(`${PREFIX}/suppliers/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`${PREFIX}/suppliers/${id}`),
};

// Warehouses
export const warehouseApi = {
  list: (params?: Record<string, unknown>) =>
    api.get(`${PREFIX}/warehouses`, { params }).then((res) => {
      const data = res.data;
      if (data && typeof data === 'object' && 'data' in data) return data;
      return { data };
    }),
  create: (data: WarehouseFormData) =>
    api.post(`${PREFIX}/warehouses`, data).then((r) => r.data),
  update: (id: number, data: Partial<WarehouseFormData>) =>
    api.put(`${PREFIX}/warehouses/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`${PREFIX}/warehouses/${id}`),
};

// Wood Types
export const woodTypeApi = {
  list: (params?: Record<string, unknown>) =>
    api.get(`${PREFIX}/wood-types`, { params }).then((res) => {
      const data = res.data;
      if (data && typeof data === 'object' && 'data' in data) return data;
      return { data };
    }),
  get: (id: number) =>
    api.get<{ data: TimberWoodType }>(`${PREFIX}/wood-types/${id}`).then((r) => r.data.data || r.data),
  create: (data: { name: string; code?: string; category?: string; default_rate: number; unit: string; description?: string }) =>
    api.post(`${PREFIX}/wood-types`, data).then((r) => r.data),
  update: (id: number, data: Partial<TimberWoodType>) =>
    api.put(`${PREFIX}/wood-types/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`${PREFIX}/wood-types/${id}`),
};

// Stock
export const stockApi = {
  overview: (params?: Record<string, unknown>) =>
    api.get(`${PREFIX}/stock`, { params }).then((res) => {
      const data = res.data;
      if (data && typeof data === 'object' && 'data' in data) return data;
      return { data };
    }),
  detail: (woodTypeId: number, params?: Record<string, unknown>) =>
    api.get<{ data: TimberStockLedger }>(`${PREFIX}/stock/${woodTypeId}`, { params }).then((r) => r.data),
  movements: (params?: Record<string, unknown>) =>
    api.get(`${PREFIX}/stock/movements`, { params }).then((res) => {
      const data = res.data;
      if (data && typeof data === 'object' && 'data' in data) return data;
      return { data };
    }),
  adjust: (data: StockAdjustmentFormData) =>
    api.post(`${PREFIX}/stock/adjust`, data).then((r) => r.data),
  lowAlerts: (params?: Record<string, unknown>) =>
    api.get(`${PREFIX}/stock/low-alerts`, { params }).then((res) => {
      const data = res.data;
      if (data && typeof data === 'object' && 'data' in data) return data;
      return { data };
    }),
  valuation: (params?: Record<string, unknown>) =>
    api.get(`${PREFIX}/stock/valuation`, { params }).then((r) => r.data),
  checkAvailability: (params: { wood_type_id: number; quantity: number; warehouse_id?: number }) =>
    api.get(`${PREFIX}/stock/check-availability`, { params }).then((r) => r.data),
  setThreshold: (woodTypeId: number, data: { minimum_threshold?: number; maximum_threshold?: number; reorder_point?: number }) =>
    api.put(`${PREFIX}/stock/threshold/${woodTypeId}`, data).then((r) => r.data),
};

// Purchase Orders
export const purchaseOrderApi = {
  list: (params?: Record<string, unknown>) =>
    api.get(`${PREFIX}/purchase-orders`, { params }).then((res) => {
      const data = res.data;
      if (data && typeof data === 'object' && 'data' in data) return data;
      return { data };
    }),
  get: (id: number) =>
    api.get<{ data: TimberPurchaseOrder }>(`${PREFIX}/purchase-orders/${id}`).then((r) => r.data.data || r.data),
  create: (data: PurchaseOrderFormData) =>
    api.post(`${PREFIX}/purchase-orders`, data).then((r) => r.data),
  update: (id: number, data: Partial<PurchaseOrderFormData>) =>
    api.put(`${PREFIX}/purchase-orders/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`${PREFIX}/purchase-orders/${id}`),
  send: (id: number) =>
    api.post(`${PREFIX}/purchase-orders/${id}/send`).then((r) => r.data),
  receive: (id: number, data: ReceiveGoodsFormData) =>
    api.post(`${PREFIX}/purchase-orders/${id}/receive`, data).then((r) => r.data),
  confirmReceived: (id: number) =>
    api.post(`${PREFIX}/purchase-orders/${id}/confirm-received`).then((r) => r.data),
  cancel: (id: number) =>
    api.post(`${PREFIX}/purchase-orders/${id}/cancel`).then((r) => r.data),
};

// Material Requisitions
export const materialRequisitionApi = {
  list: (params?: Record<string, unknown>) =>
    api.get(`${PREFIX}/material-requisitions`, { params }).then((res) => {
      const data = res.data;
      if (data && typeof data === 'object' && 'data' in data) return data;
      return { data };
    }),
  get: (id: number) =>
    api.get<{ data: TimberMaterialRequisition }>(`${PREFIX}/material-requisitions/${id}`).then((r) => r.data.data || r.data),
  create: (data: MaterialRequisitionFormData) =>
    api.post(`${PREFIX}/material-requisitions`, data).then((r) => r.data),
  approve: (id: number, data?: { items?: { id: number; quantity_approved: number }[] }) =>
    api.post(`${PREFIX}/material-requisitions/${id}/approve`, data).then((r) => r.data),
  reject: (id: number, data: { rejection_reason: string }) =>
    api.post(`${PREFIX}/material-requisitions/${id}/reject`, data).then((r) => r.data),
  returnMaterials: (id: number, data: { items: { id: number; quantity_returned: number }[] }) =>
    api.post(`${PREFIX}/material-requisitions/${id}/return`, data).then((r) => r.data),
};

// Stock Alerts
export const stockAlertApi = {
  list: (params?: Record<string, unknown>) =>
    api.get(`${PREFIX}/stock-alerts`, { params }).then((res) => {
      const data = res.data;
      if (data && typeof data === 'object' && 'data' in data) return data;
      return { data };
    }),
  resolve: (id: number) =>
    api.post(`${PREFIX}/stock-alerts/${id}/resolve`).then((r) => r.data),
};

// PO Items Received
export const poItemReceivedApi = {
  store: (data: PoItemReceivedFormData) =>
    api.post(`${PREFIX}/po-items-received`, data).then((r) => r.data),
  list: (params?: Record<string, unknown>) =>
    api.get(`${PREFIX}/po-items-received`, { params }).then((res) => {
      const data = res.data;
      if (data && typeof data === 'object' && 'data' in data) return data;
      return { data };
    }),
};
