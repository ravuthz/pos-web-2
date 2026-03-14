// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  status: number;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page?: number;
  size?: number;
  total_pages?: number;
  total_items?: number;
  current_page?: number;
  from?: number;
  last_page?: number;
  per_page?: number;
  to?: number;
  total?: number;
}

export interface ApiError {
  success: boolean;
  message: string;
  data?: Record<string, string[]>;
}

// Auth Types
export interface LoginPayload {
  username?: string;
  email?: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  csrf_token?: string;
  user: User;
}

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  phone?: string;
  address?: string;
  status?: string;
  role_id?: number;
  branch_id?: number;
  can_access_all_branches?: boolean;
  role?: Role;
  branch?: Branch;
  branches?: Branch[];
  primary_branch?: Branch | null;
  branch_ids?: number[];
  created_at?: string;
  updated_at?: string;
}

export interface Role {
  id: number;
  name: string;
  display_name?: string;
  description?: string;
  permissions?: Permission[];
}

export interface Permission {
  id: number;
  name: string;
  display_name?: string;
  description?: string;
}

// Branch Types
export interface Branch {
  id: number;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  status?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Product Types
export interface Product {
  id: number;
  branch_id?: number;
  vendor_id?: number | null;
  name: string;
  code?: string;
  sku?: string;
  barcode?: string;
  description?: string;
  category_id: number;
  category?: Category;
  vendors?: Vendor[];
  image?: string;
  image_url?: string;
  selling_price: number;
  cost_price?: number;
  status?: string;
  is_active?: boolean;
  track_expiry?: boolean;
  expiry_date?: string | null;
  is_track_stock?: boolean;
  low_stock_alert?: number;
  low_stock_threshold?: number;
  stock?: Stock;
  units?: ProductUnit[];
  created_at?: string;
  updated_at?: string;
}

export interface ProductUnit {
  id: number;
  product_id: number;
  unit_name: string;
  unit_code: string;
  conversion_factor: number;
  is_base: boolean;
  is_sellable: boolean;
  is_purchasable: number;
  selling_price: number;
  cost_price: number;
  barcode?: string;
}

export interface Stock {
  id?: number;
  product_id: number;
  branch_id?: number;
  quantity_on_hand: number;
  quantity_available?: number;
  quantity_reserved?: number;
  quantity_incoming?: number;
  location?: string;
  last_updated?: string;
}

export interface Category {
  id: number;
  name: string;
  code?: string;
  branch_id?: number;
  parent_id?: number;
  description?: string;
  image_url?: string;
  is_active?: boolean;
  sort_order?: number;
  children?: Category[];
  created_at?: string;
  updated_at?: string;
}

// Customer Types
export interface Customer {
  id: number;
  name: string;
  code?: string;
  display_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  customer_type?: 'individual' | 'business';
  tax_number?: string;
  credit_limit?: number;
  is_active?: boolean;
  is_walk_in?: boolean;
  sales_count?: number;
  created_at?: string;
  updated_at?: string;
}

// Sale Types
export interface Sale {
  id: number;
  sale_number: string;
  uuid?: string;
  branch_id: number;
  branch?: Branch;
  user_id?: number;
  cashier_id?: number;
  user?: User;
  cashier?: User;
  customer_id?: number;
  customer?: Customer;
  shift_id?: number;
  invoice_number?: string;
  sale_date: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount?: number;
  total?: number;
  payment_method: 'cash' | 'card' | 'transfer' | 'khqr';
  payment_received?: number;
  payment_received_usd?: number;
  payment_received_khr?: number;
  payment_change?: number;
  change_amount_usd?: number;
  change_amount_khr?: number;
  currency?: string;
  exchange_rate?: number;
  notes?: string;
  status: 'completed' | 'refund' | 'void';
  products?: SaleProduct[];
  created_at?: string;
  updated_at?: string;
}

export interface SaleProduct {
  id: number;
  sale_id: number;
  product_id: number;
  product?: Product;
  product_name: string;
  barcode?: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  line_total: number;
}

export interface StoreSalePayload {
  branch_id: number;
  customer_id?: number;
  payment_method: 'cash' | 'card' | 'transfer' | 'khqr';
  payment_received?: number;
  payment_received_usd?: number;
  payment_received_khr?: number;
  discount_amount?: number;
  total_amount?: number;
  exchange_rate?: number;
  currency?: string;
  status?: string;
  notes?: string;
  idempotency_key?: string;
  products: {
    product_id: number;
    quantity: number;
    unit_price: number;
    discount_amount?: number;
  }[];
}

// Purchase Order Types
export interface PurchaseOrder {
  id: number;
  po_number: string;
  vendor_id: number;
  vendor?: Vendor;
  branch_id: number;
  branch?: Branch;
  buyer_id?: number;
  buyer?: User;
  order_date: string;
  expected_date?: string;
  subtotal?: number;
  discount_amount?: number;
  tax_amount?: number;
  total?: number;
  total_amount?: number;
  notes?: string;
  status: 'draft' | 'sent' | 'received' | 'cancelled';
  status_label?: string;
  is_editable?: boolean;
  is_receivable?: boolean;
  is_cancellable?: boolean;
  items?: PurchaseOrderItem[];
  products?: PurchaseOrderItem[];
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  product_id: number;
  product?: Product;
  product_name: string;
  product_code?: string;
  quantity?: number;
  quantity_ordered?: number;
  unit_price?: number;
  unit_cost?: number;
  discount_amount?: number;
  line_total: number;
  quantity_received?: number;
  pending_quantity?: number;
  receival_status?: string;
  receival_status_label?: string;
  product_unit_id?: number | null;
  product_unit_name?: string | null;
  base_quantity_ordered?: number;
  base_quantity_received?: number;
}

export interface Vendor {
  id: number;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  contact_person?: string;
  tax_number?: string;
  payment_terms?: string;
  credit_days?: number;
  notes?: string;
  tg_id?: number;
  status?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Stock Movement Types
export interface StockMovement {
  id: number;
  product_id: number;
  product?: Product;
  branch_id: number;
  branch?: Branch;
  movement_type: 'adjustment' | 'sale' | 'return' | 'transfer' | 'purchase';
  movement_type_label?: string;
  product_name?: string;
  product_code?: string;
  quantity?: number;
  quantity_change?: number;
  quantity_before: number;
  quantity_after: number;
  reference_type?: string;
  reference_id?: number;
  notes?: string;
  created_by?: number | { id: number; name: string } | null;
  user?: User;
  movement_date?: string;
  created_at: string;
}

// Expense Types
export interface Expense {
  id: number;
  expense_number: string;
  branch_id: number;
  branch?: Branch;
  category: string;
  category_label?: string;
  amount: number;
  currency?: string;
  expense_date: string;
  payment_method?: 'cash' | 'card' | 'transfer' | 'check';
  payment_method_label?: string;
  receipt_number?: string;
  description?: string;
  vendor_id?: number;
  vendor?: Vendor;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  notes?: string;
  image?: string | null;
  reason?: string | null;
  is_editable?: boolean;
  is_approvable?: boolean;
  can_mark_as_paid?: boolean;
  created_by?: number;
  user?: User;
  recorded_by?: number;
  recorded_by_user?: User;
  created_at?: string;
  updated_at?: string;
}

// Promotion Types
export interface Promotion {
  id: number;
  name: string;
  code?: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase_amount?: number;
  max_discount_amount?: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  promotion_type?: string;
  branches?: Branch[];
  products?: Product[];
  categories?: Category[];
  created_at?: string;
  updated_at?: string;
}

// Shift Types
export interface Shift {
  id: number;
  shift_number: string;
  branch_id: number;
  branch?: Branch;
  user_id?: number;
  cashier_id?: number;
  user?: User;
  cashier?: User;
  shift_date?: string;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at?: string;
  opening_cash_float: number;
  opening_cash_float_khr: number;
  closing_cash_float?: number;
  closing_cash_float_khr?: number;
  total_sales?: number;
  total_transactions?: number;
  total_cash_sales?: number;
  total_card_sales?: number;
  total_transfer_sales?: number;
  total_khqr_sales?: number;
  expected_cash?: number;
  expected_cash_khr?: number;
  actual_cash?: number;
  actual_cash_khr?: number;
  cash_difference?: number;
  total_refunds?: number;
  total_expenses?: number;
  opening_notes?: string;
  closing_notes?: string;
  expected_cash_float?: number;
  created_at?: string;
  updated_at?: string;
}

// Stock Transfer Types
export interface StockTransfer {
  id: number;
  transfer_number: string;
  from_branch_id: number;
  from_branch?: Branch;
  to_branch_id: number;
  to_branch?: Branch;
  status: 'pending' | 'approved' | 'sent' | 'received' | 'cancelled';
  transfer_date: string;
  notes?: string;
  items?: StockTransferItem[];
  created_by?: number;
  user?: User;
  created_at?: string;
  updated_at?: string;
}

export interface StockTransferItem {
  id: number;
  stock_transfer_id: number;
  product_id: number;
  product?: Product;
  product_name: string;
  quantity: number;
}

// Settings Types
export interface SystemSetting {
  key: string;
  value: string;
  category: string;
  description?: string;
}

// Dashboard Types
export interface DashboardData {
  today_sales: number;
  today_sales_count: number;
  today_expenses: number;
  today_profit: number;
  week_sales: number;
  month_sales: number;
  low_stock_count: number;
  pending_orders_count: number;
}

export interface SalesTrend {
  date: string;
  total: number;
  count: number;
}

export interface TopProduct {
  product_id: number;
  product_name: string;
  total_quantity: number;
  total_amount: number;
}

// Report Types
export interface ProfitLoss {
  total_sales: number;
  total_cost: number;
  gross_profit: number;
  total_expenses: number;
  net_profit: number;
}

// Query Types
export interface ListQuery {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ProductListQuery extends ListQuery {
  branch_id?: number;
  vendor_id?: number;
  category_id?: number;
  status?: string;
  is_active?: boolean;
  low_stock?: boolean;
}

export interface SaleListQuery extends ListQuery {
  branch_id?: number;
  status?: string;
  start_date?: string;
  end_date?: string;
}

export interface ExpenseListQuery extends ListQuery {
  branch_id?: number;
  status?: string;
  category?: string;
  start_date?: string;
  end_date?: string;
}
