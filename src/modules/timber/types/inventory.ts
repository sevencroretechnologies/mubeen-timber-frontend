// ============================================
// Timber Inventory & Stock Management Types
// ============================================

export interface TimberSupplier {
  id: number;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  gst_number: string | null;
  pan_number: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_ifsc_code: string | null;
  payment_terms: string | null;
  notes: string | null;
  is_active: boolean;
  company_id: number;
  org_id: number;
  created_at: string;
  updated_at: string;
}

export interface TimberWarehouse {
  id: number;
  name: string;
  code: string | null;
  address: string | null;
  city: string | null;
  is_default: boolean;
  is_active: boolean;
  company_id: number;
  org_id: number;
  created_at: string;
  updated_at: string;
}

export interface TimberWoodType {
  id: number;
  name: string;
  code: string | null;
  category: string | null;
  default_rate: number;
  unit: string;
  description: string | null;
  is_active: boolean;
  company_id: number;
  created_at: string;
  updated_at: string;
}

export interface TimberStockLedger {
  id: number;
  wood_type_id: number;
  warehouse_id: number;
  current_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  average_cost: number;
  last_purchase_price: number;
  minimum_threshold: number;
  maximum_threshold: number;
  reorder_point: number;
  company_id: number;
  org_id: number;
  wood_type?: TimberWoodType;
  warehouse?: TimberWarehouse;
  created_at: string;
  updated_at: string;
}

export type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN';

export interface TimberStockMovement {
  id: number;
  wood_type_id: number;
  warehouse_id: number;
  movement_type: StockMovementType;
  quantity: number;
  unit_price: number;
  total_price: number;
  before_quantity: number;
  after_quantity: number;
  reference_type: string | null;
  reference_id: number | null;
  notes: string | null;
  created_by: number | null;
  company_id: number;
  org_id: number;
  wood_type?: TimberWoodType;
  warehouse?: TimberWarehouse;
  creator?: { id: number; name: string };
  created_at: string;
  updated_at: string;
}

export type PurchaseOrderStatus = 'draft' | 'ordered' | 'partial' | 'received' | 'cancelled';

export interface TimberPurchaseOrder {
  id: number;
  po_code: string;
  supplier_id: number;
  warehouse_id: number;
  status: PurchaseOrderStatus;
  order_date: string | null;
  expected_date: string | null;
  received_date: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  notes: string | null;
  company_id: number;
  org_id: number;
  supplier?: TimberSupplier;
  warehouse?: TimberWarehouse;
  items?: TimberPurchaseOrderItem[];
  created_at: string;
  updated_at: string;
}

export interface TimberPurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  wood_type_id: number;
  quantity: number;
  received_quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  wood_type?: TimberWoodType;
  created_at: string;
  updated_at: string;
}

export type RequisitionStatus = 'pending' | 'approved' | 'rejected' | 'issued' | 'partial_return' | 'returned';

export interface TimberMaterialRequisition {
  id: number;
  requisition_code: string;
  job_card_id: number | null;
  project_id: number | null;
  requested_by: number | null;
  approved_by: number | null;
  status: RequisitionStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  required_date: string | null;
  notes: string | null;
  rejection_reason: string | null;
  company_id: number;
  org_id: number;
  items?: TimberMaterialRequisitionItem[];
  requester?: { id: number; name: string };
  approver?: { id: number; name: string };
  created_at: string;
  updated_at: string;
}

export interface TimberMaterialRequisitionItem {
  id: number;
  material_requisition_id: number;
  wood_type_id: number;
  quantity_requested: number;
  quantity_approved: number;
  quantity_issued: number;
  quantity_returned: number;
  warehouse_id: number | null;
  notes: string | null;
  wood_type?: TimberWoodType;
  warehouse?: TimberWarehouse;
  created_at: string;
  updated_at: string;
}

export type AlertType = 'low_stock' | 'overstock' | 'reorder_point';

export interface TimberStockAlert {
  id: number;
  wood_type_id: number;
  warehouse_id: number;
  alert_type: AlertType;
  current_quantity: number;
  threshold_quantity: number;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: number | null;
  company_id: number;
  org_id: number;
  wood_type?: TimberWoodType;
  warehouse?: TimberWarehouse;
  created_at: string;
  updated_at: string;
}

// Form data types
export interface SupplierFormData {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  gst_number?: string;
  pan_number?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc_code?: string;
  payment_terms?: string;
  notes?: string;
  is_active?: boolean;
}

export interface WarehouseFormData {
  name: string;
  code?: string;
  address?: string;
  city?: string;
  is_default?: boolean;
  is_active?: boolean;
}

export interface StockAdjustmentFormData {
  wood_type_id: number;
  warehouse_id: number;
  quantity: number;
  unit_price?: number;
  notes?: string;
}

export interface PurchaseOrderFormData {
  supplier_id: number;
  warehouse_id: number;
  order_date?: string;
  expected_date?: string;
  notes?: string;
  items: PurchaseOrderItemFormData[];
}

export interface PurchaseOrderItemFormData {
  wood_type_id: number;
  quantity: number;
  unit_price: number;
  notes?: string;
}

export interface ReceiveGoodsFormData {
  items: {
    id: number;
    received_quantity: number;
  }[];
  notes?: string;
}

export interface MaterialRequisitionFormData {
  job_card_id?: number;
  project_id?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  required_date?: string;
  notes?: string;
  items: MaterialRequisitionItemFormData[];
}

export interface MaterialRequisitionItemFormData {
  wood_type_id: number;
  quantity_requested: number;
  warehouse_id?: number;
  notes?: string;
}

// API Response types
export interface StockOverviewResponse {
  data: TimberStockLedger[];
  pagination?: {
    total_items: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
}

export interface StockValuationResponse {
  data: {
    total_value: number;
    by_warehouse: {
      warehouse_id: number;
      warehouse_name: string;
      total_value: number;
      item_count: number;
    }[];
    by_wood_type: {
      wood_type_id: number;
      wood_type_name: string;
      total_quantity: number;
      average_cost: number;
      total_value: number;
    }[];
  };
}

export interface AvailabilityCheckResponse {
  data: {
    wood_type_id: number;
    available: boolean;
    current_quantity: number;
    requested_quantity: number;
    shortage: number;
  };
}
