export type InventoryCategory = string;
export type Warehouse = string;
export type AnomalyRule = 'low_stock' | 'near_expiry' | 'expired' | 'zero_stock' | 'stock_spike';
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: InventoryCategory;
  warehouse: Warehouse;
  currentStock: number;
  unit: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  lastUpdated: string;
  batchNumber?: string;
  expiryDate?: string;
  unitPrice?: number;
  medicineCode?: string;
}

export interface InventoryAnomaly {
  id: string;
  materialId: string;
  rule: AnomalyRule;
  severity: AnomalySeverity;
  description: string;
  detectedAt: string;
  acknowledged: boolean;
}

export interface SnapshotHistory {
  date: string;
  totalStock: number;
  totalValue: number;
}

export interface ItemSnapshot {
  date: string;
  stock: number;
}

export interface TopMaterial {
  materialId: string;
  name: string;
  value: number;
  unit: string;
  stock: number;
}

// Stocktake types
export interface StocktakeSession {
  id: string;
  session_code: string;
  title: string;
  category_filter: string;
  status: 'draft' | 'in_progress' | 'completed' | 'approved';
  created_by: string;
  approved_by?: string;
  note?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface StocktakeItem {
  id: string;
  session_id: string;
  inventory_item_code: string;
  item_name: string;
  category: string;
  unit: string;
  system_qty: number;
  system_value: number;
  actual_qty: number | null;
  difference: number | null;
  note?: string;
  checked_by?: string;
  checked_at?: string;
}

// Supply chart types
export type SupplyTimeRange = '1M' | '3M' | '6M' | '1Y';

export interface SupplyChartPoint {
  period: string;
  consumption: number;
  consumptionLY: number;
  patientVolume: number;
}

// Supply consumption types
export interface SupplyConsumption {
  id: string;
  report_date: string;
  account: string;
  item_code: string;
  item_name: string;
  outward_qty: number;
  outward_amount: number;
  patient_visits: number;
  qty_per_visit: number | null;
}
