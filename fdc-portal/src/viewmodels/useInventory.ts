import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  InventoryItem,
  InventoryAnomaly,
  SnapshotHistory,
  ItemSnapshot,
  TopMaterial,
} from "@/types/inventory";

export function useInventory(moduleType: 'pharmacy' | 'inventory' | 'all' = 'all') {
  const [activeTab, setActiveTab] = useState<"overview" | "list" | "anomalies">("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock" | "anomaly" | "near_expiry">("all");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [anomalies, setAnomalies] = useState<InventoryAnomaly[]>([]);
  const [snapshotHistory, setSnapshotHistory] = useState<SnapshotHistory[]>([]);
  const [itemSnapshots, setItemSnapshots] = useState<ItemSnapshot[]>([]);
  const [isLoadingItemSnapshots, setIsLoadingItemSnapshots] = useState(false);
  const [isLoadingSnapshotHistory, setIsLoadingSnapshotHistory] = useState(false);
  const [chartRange, setChartRange] = useState<'1m' | '3m' | '6m' | '1y'>('1m');

  // Fetch today's inventory
  const fetchInventory = useCallback(async () => {
    const todayDate = new Date().toISOString().split('T')[0];

    let allData: any[] = [];
    let from = 0;
    const PAGE_SIZE = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('fdc_inventory_snapshots')
        .select('*')
        .eq('snapshot_date', todayDate)
        .order('name')
        .range(from, from + PAGE_SIZE - 1);

      if (moduleType === 'pharmacy') {
        query = query.not('his_medicineid', 'is', null).not('his_medicineid', 'like', 'misa_%');
      } else if (moduleType === 'inventory') {
        query = query.or('his_medicineid.is.null,his_medicineid.like.misa_%');
      }

      const { data, error } = await query;
      if (error) {
        console.error('[DEBUG] fetchInventory error:', error);
      }
      if (data && data.length > 0) {
        allData = [...allData, ...data];
        from += PAGE_SIZE;
        hasMore = data.length === PAGE_SIZE;
      } else {
        hasMore = false;
      }
    }

    if (allData.length > 0) {
      setInventory(allData.map((item: any) => ({
        id: item.id,
        name: item.name,
        sku: item.his_medicineid?.toString() || item.id,
        category: item.category || 'Khác',
        warehouse: item.warehouse || 'Kho Tổng',
        currentStock: item.current_stock || 0,
        unit: item.unit || 'Cái',
        status: item.status as any,
        batchNumber: item.batch_number,
        expiryDate: item.expiry_date,
        lastUpdated: item.snapshot_date || item.created_at,
        unitPrice: item.unit_price || 0,
        medicineCode: item.medicine_code
      })));
    }
  }, [moduleType]);

  // Fetch anomalies
  const fetchAnomalies = useCallback(async () => {
    const { data } = await supabase
      .from('fdc_analytics_anomalies')
      .select('*')
      .order('detected_at', { ascending: false });
    if (data) {
      setAnomalies(data.map(item => ({
        id: item.id,
        materialId: item.material_name,
        rule: (item.rule_id as any) || 'low_stock',
        severity: (item.severity as any) || 'medium',
        description: item.description || '',
        detectedAt: item.detected_at,
        acknowledged: item.is_acknowledged || false
      })));
    }
  }, []);

  // Fetch snapshot history for overall charts, including consumption & patient volume
  const fetchSnapshotHistory = useCallback(async () => {
    setIsLoadingSnapshotHistory(true);
    try {
      const rangeDays =
        chartRange === '1m' ? 30 :
        chartRange === '3m' ? 90 :
        chartRange === '6m' ? 180 : 365;

      const today = new Date();
      const start = new Date();
      start.setDate(start.getDate() - rangeDays);

      const cutoffDate = start.toISOString().split('T')[0];
      const todayDate = today.toISOString().split('T')[0];

      const lastYearStart = new Date(start);
      lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
      const lastYearEnd = new Date(today);
      lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);

      const lastYearCutoffDate = lastYearStart.toISOString().split('T')[0];
      const lastYearEndDate = lastYearEnd.toISOString().split('T')[0];

      // Inventory daily aggregate
      const { data: inventoryRows, error: inventoryError } = await supabase
        .from('fdc_inventory_daily_value')
        .select('snapshot_date, total_stock, total_value')
        .gte('snapshot_date', cutoffDate)
        .eq('module_type', moduleType === 'pharmacy' ? 'pharmacy' : 'inventory')
        .order('snapshot_date', { ascending: true });

      if (inventoryError) {
        console.error('[DEBUG] fetchSnapshotHistory inventory error:', inventoryError);
      }

      // Consumption current period
      const { data: consumptionRows, error: consumptionError } = await supabase
        .from('fdc_supply_consumption_daily')
        .select('report_date, outward_amount')
        .gte('report_date', cutoffDate)
        .lte('report_date', todayDate);

      if (consumptionError) {
        console.error('[DEBUG] fetchSnapshotHistory consumption error:', consumptionError);
      }

      // Consumption same period last year (aligned to current year)
      const { data: consumptionPrevRows, error: consumptionPrevError } = await supabase
        .from('fdc_supply_consumption_daily')
        .select('report_date, outward_amount')
        .gte('report_date', lastYearCutoffDate)
        .lte('report_date', lastYearEndDate);

      if (consumptionPrevError) {
        console.error('[DEBUG] fetchSnapshotHistory consumption last year error:', consumptionPrevError);
      }

      // Patient volume current period
      const { data: patientRows, error: patientError } = await supabase
        .from('fdc_patient_volume_daily')
        .select('report_date, total_treatments')
        .gte('report_date', cutoffDate)
        .lte('report_date', todayDate);

      if (patientError) {
        console.error('[DEBUG] fetchSnapshotHistory patient volume error:', patientError);
      }

      const consumptionMap: Record<string, number> = {};
      (consumptionRows || []).forEach((row: any) => {
        const key = row.report_date;
        const value = Number(row.outward_amount) || 0;
        consumptionMap[key] = (consumptionMap[key] || 0) + value;
      });

      const consumptionLastYearMap: Record<string, number> = {};
      (consumptionPrevRows || []).forEach((row: any) => {
        const original = new Date(row.report_date);
        original.setFullYear(original.getFullYear() + 1);
        const aligned = original.toISOString().split('T')[0];
        const value = Number(row.outward_amount) || 0;
        consumptionLastYearMap[aligned] = (consumptionLastYearMap[aligned] || 0) + value;
      });

      const patientMap: Record<string, number> = {};
      (patientRows || []).forEach((row: any) => {
        const key = row.report_date;
        const value = Number(row.total_treatments) || 0;
        patientMap[key] = (patientMap[key] || 0) + value;
      });

      const byDate: Record<string, SnapshotHistory> = {};

      (inventoryRows || []).forEach((row: any) => {
        const date = row.snapshot_date;
        byDate[date] = {
          date,
          totalStock: Number(row.total_stock) || 0,
          totalValue: Number(row.total_value) || 0,
          consumption: 0,
          consumptionLastYear: 0,
          patientVolume: 0,
        };
      });

      Object.keys(consumptionMap).forEach((date) => {
        if (!byDate[date]) {
          byDate[date] = {
            date,
            totalStock: 0,
            totalValue: 0,
            consumption: 0,
            consumptionLastYear: 0,
            patientVolume: 0,
          };
        }
      });

      Object.keys(consumptionLastYearMap).forEach((date) => {
        if (!byDate[date]) {
          byDate[date] = {
            date,
            totalStock: 0,
            totalValue: 0,
            consumption: 0,
            consumptionLastYear: 0,
            patientVolume: 0,
          };
        }
      });

      Object.keys(patientMap).forEach((date) => {
        if (!byDate[date]) {
          byDate[date] = {
            date,
            totalStock: 0,
            totalValue: 0,
            consumption: 0,
            consumptionLastYear: 0,
            patientVolume: 0,
          };
        }
      });

      Object.keys(byDate).forEach((date) => {
        byDate[date].consumption = consumptionMap[date] || 0;
        byDate[date].consumptionLastYear = consumptionLastYearMap[date] || 0;
        byDate[date].patientVolume = patientMap[date] || 0;
      });

      const result = Object.values(byDate)
        .sort((a, b) => a.date.localeCompare(b.date));

      setSnapshotHistory(result);
    } finally {
      setIsLoadingSnapshotHistory(false);
    }
  }, [moduleType, chartRange]);

  // Fetch per-item snapshot history (when selecting an item)
  const fetchItemSnapshots = useCallback(async (itemName: string, warehouse: string) => {
    setIsLoadingItemSnapshots(true);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('fdc_inventory_snapshots')
      .select('snapshot_date, current_stock')
      .eq('name', itemName)
      .eq('warehouse', warehouse)
      .gte('snapshot_date', cutoffDate)
      .order('snapshot_date', { ascending: true });

    if (error) {
      console.error('[DEBUG] fetchItemSnapshots error:', error);
    }

    if (data) {
      setItemSnapshots(data.map(r => ({ date: r.snapshot_date, stock: r.current_stock || 0 })));
    } else {
      setItemSnapshots([]);
    }
    setIsLoadingItemSnapshots(false);
  }, []);

  useEffect(() => {
    fetchInventory();
    fetchAnomalies();
    fetchSnapshotHistory();

    let snapshotTimeout: NodeJS.Timeout | null = null;

    const channel = supabase.channel('public:fdc_inventory_redesign')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fdc_inventory_snapshots' }, () => {
        fetchInventory();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fdc_inventory_daily_value' }, () => {
        if (snapshotTimeout) clearTimeout(snapshotTimeout);
        snapshotTimeout = setTimeout(() => {
          fetchSnapshotHistory();
        }, 1000);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fdc_analytics_anomalies' }, fetchAnomalies)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (snapshotTimeout) clearTimeout(snapshotTimeout);
    };
  }, [fetchInventory, fetchAnomalies, fetchSnapshotHistory]);

  const filteredAnomalies = useMemo(() => {
    return anomalies.filter(a => inventory.some(i => i.name === a.materialId));
  }, [anomalies, inventory]);

  // When selectedItem changes, fetch its per-item snapshots
  useEffect(() => {
    if (selectedItem) {
      fetchItemSnapshots(selectedItem.name, selectedItem.warehouse);
    } else {
      setItemSnapshots([]);
    }
  }, [selectedItem, fetchItemSnapshots]);

  // Filtered inventory list
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      if (
        searchQuery &&
        !item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.sku.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      if (filterWarehouse !== "all" && item.warehouse !== filterWarehouse) return false;
      if (filterCategory !== "all" && item.category !== filterCategory) return false;

      if (filterStatus !== "all") {
        if (filterStatus === "anomaly") {
          const hasAnomaly = filteredAnomalies.some(a => a.materialId === item.name && !a.acknowledged);
          if (!hasAnomaly) return false;
        } else if (filterStatus === "near_expiry") {
          if (!item.expiryDate) return false;
          const now = Date.now();
          const days = (new Date(item.expiryDate).getTime() - now) / (1000 * 3600 * 24);
          if (days < 0 || days > 90) return false;
        } else if (item.status !== filterStatus) {
          return false;
        }
      }
      return true;
    });
  }, [inventory, searchQuery, filterWarehouse, filterCategory, filterStatus, filteredAnomalies]);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(inventory.map(item => item.category))).sort();
  }, [inventory]);

  const uniqueWarehouses = useMemo(() => {
    return Array.from(new Set(inventory.map(item => item.warehouse))).sort();
  }, [inventory]);

  // Stats
  const totalItems = inventory.length;

  const activeAnomaliesCount = useMemo(() => {
    return filteredAnomalies.filter(a => !a.acknowledged).length;
  }, [filteredAnomalies]);

  const nearExpiryCount = useMemo(() => {
    const now = Date.now();
    return inventory.filter(item => {
      if (!item.expiryDate) return false;
      const days = (new Date(item.expiryDate).getTime() - now) / (1000 * 3600 * 24);
      return days >= 0 && days <= 90;
    }).length;
  }, [inventory]);

  const estimatedValue = useMemo(() => {
    return inventory.reduce((sum, item) => sum + item.currentStock * (item.unitPrice || 0), 0);
  }, [inventory]);

  // Top 10 items by value
  const topMaterials: TopMaterial[] = useMemo(() => {
    return inventory
      .map(item => ({
        materialId: item.sku,
        name: item.name,
        value: item.currentStock * (item.unitPrice || 0),
        unit: item.unit,
        stock: item.currentStock,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [inventory]);

  const acknowledgeAnomaly = async (id: string) => {
    const { error } = await supabase
      .from('fdc_analytics_anomalies')
      .update({ is_acknowledged: true })
      .eq('id', id);

    if (!error) {
      setAnomalies((prev) =>
        prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)),
      );
    }
  };

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    filterWarehouse,
    setFilterWarehouse,
    filterCategory,
    setFilterCategory,
    filterStatus,
    setFilterStatus,
    filteredInventory,
    uniqueCategories,
    uniqueWarehouses,
    selectedItem,
    setSelectedItem,
    anomalies: filteredAnomalies,
    acknowledgeAnomaly,
    snapshotHistory,
    itemSnapshots,
    isLoadingItemSnapshots,
    isLoadingSnapshotHistory,
    topMaterials,
    chartRange,
    setChartRange,
    stats: {
      totalItems,
      activeAnomaliesCount,
      nearExpiryCount,
      estimatedValue,
    },
  };
}
