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

  // Fetch inventory, preferring today's snapshot but falling back to latest available date
  const fetchInventory = useCallback(async () => {
    const todayDate = new Date().toISOString().split('T')[0];

    const loadForDate = async (snapshotDate: string) => {
      let allData: any[] = [];
      let from = 0;
      const PAGE_SIZE = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('fdc_inventory_snapshots')
          .select('*')
          .eq('snapshot_date', snapshotDate)
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

      return allData;
    };

    // 1. Try today's snapshot
    let allData = await loadForDate(todayDate);

    // 2. If nothing for today, fall back to the latest date that actually has matching data
    if (allData.length === 0) {
      let fallbackQuery = supabase
        .from('fdc_inventory_snapshots')
        .select('snapshot_date')
        .order('snapshot_date', { ascending: false });

      if (moduleType === 'inventory') {
        fallbackQuery = fallbackQuery.or('his_medicineid.is.null,his_medicineid.like.misa_%');
      } else if (moduleType === 'pharmacy') {
        fallbackQuery = fallbackQuery.not('his_medicineid', 'is', null).not('his_medicineid', 'like', 'misa_%');
      }

      const { data: latest, error: latestError } = await fallbackQuery.limit(1);

      if (latestError) {
        console.error('[DEBUG] fetchInventory latest snapshot_date error:', latestError);
      } else if (latest && latest.length > 0) {
        const latestDate = latest[0].snapshot_date as string;
        if (latestDate && latestDate !== todayDate) {
          allData = await loadForDate(latestDate);
        }
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
    } else {
      setInventory([]);
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

  // Fetch 1-year snapshot history (weekly aggregate for fast load, ~52 points)
  const fetchSnapshotHistory = useCallback(async () => {
    setIsLoadingSnapshotHistory(true);
    try {
      const { data, error } = await supabase
        .from('fdc_inventory_weekly_value')
        .select('snapshot_date, total_stock, total_value')
        .eq('module_type', moduleType === 'pharmacy' ? 'pharmacy' : 'inventory')
        .order('snapshot_date', { ascending: true });

      if (error) {
        console.error('[DEBUG] fetchSnapshotHistory error:', error);
      }

      if (data && data.length > 0) {
        const result = data.map((row: any) => ({
          date: row.snapshot_date,
          totalStock: Number(row.total_stock) || 0,
          totalValue: Number(row.total_value) || 0,
        }));
        setSnapshotHistory(result);
      } else {
        setSnapshotHistory([]);
      }
    } finally {
      setIsLoadingSnapshotHistory(false);
    }
  }, [moduleType]);

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

  // Top 10 items by value (grouped by normalized name to avoid variants like hyphen/spacing)
  const topMaterials: TopMaterial[] = useMemo(() => {
    const byName = new Map<string, TopMaterial>();

    const normalizeName = (name: string) =>
      name
        .replace(/[-–]/g, " ") // treat hyphen like space
        .replace(/\s+/g, " ")  // collapse spaces
        .trim()
        .toLowerCase();

    inventory.forEach(item => {
      const key = normalizeName(item.name);
      const value = item.currentStock * (item.unitPrice || 0);
      const existing = byName.get(key);

      if (existing) {
        existing.value += value;
        existing.stock += item.currentStock;
      } else {
        byName.set(key, {
          materialId: item.sku,
          name: item.name,
          value,
          unit: item.unit,
          stock: item.currentStock,
        });
      }
    });

    return Array.from(byName.values())
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
    stats: {
      totalItems,
      activeAnomaliesCount,
      nearExpiryCount,
      estimatedValue,
    },
  };
}
