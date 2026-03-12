import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useInventory } from "@/viewmodels/useInventory";
import { StocktakeSession, StocktakeItem, SupplyConsumption } from "@/types/inventory";
import { supabase } from "@/lib/supabase";
import {
  Search,
  AlertTriangle,
  Package,
  DollarSign,
  X,
  Clock,
  BarChart2,
  List,
  ClipboardCheck,
  TrendingUp,
  Plus,
  CheckCircle2,
  ArrowUpDown,
  Activity,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from "recharts";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const formatCompact = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} tr`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toString();
};

const ACCOUNT_LABELS: Record<string, string> = {
  "1521": "Nguyên vật liệu",
  "1522": "Vật tư y tế",
  "1523": "Văn phòng phẩm",
};

type TabType = "overview" | "list" | "consumption" | "stocktake" | "anomalies";

export default function InventoryPage() {
  const navigate = useNavigate();
  const {
    searchQuery, setSearchQuery,
    filterWarehouse, setFilterWarehouse,
    filterCategory, setFilterCategory,
    filterStatus, setFilterStatus,
    filteredInventory,
    uniqueCategories,
    uniqueWarehouses,
    selectedItem, setSelectedItem,
    anomalies, acknowledgeAnomaly,
    snapshotHistory,
    topMaterials,
    stats,
  } = useInventory("inventory");

  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // ─── Consumption State ───
  const [consumptionData, setConsumptionData] = useState<SupplyConsumption[]>([]);
  const [consumptionLoading, setConsumptionLoading] = useState(false);
  const [consumptionAccountFilter, setConsumptionAccountFilter] = useState("all");

  // ─── Stocktake State ───
  const [sessions, setSessions] = useState<StocktakeSession[]>([]);
  const [activeSession, setActiveSession] = useState<StocktakeSession | null>(null);
  const [stocktakeItems, setStocktakeItems] = useState<StocktakeItem[]>([]);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [newSessionCategory, setNewSessionCategory] = useState("all");

  // ─── Fetch Consumption ───
  const fetchConsumption = useCallback(async () => {
    setConsumptionLoading(true);
    const { data, error } = await supabase
      .from("fdc_supply_consumption_daily")
      .select("*")
      .order("report_date", { ascending: false })
      .limit(1000);
    if (!error && data) setConsumptionData(data);
    setConsumptionLoading(false);
  }, []);

  // ─── Fetch Stocktake Sessions ───
  const fetchSessions = useCallback(async () => {
    const { data } = await supabase
      .from("fdc_stocktake_sessions")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setSessions(data);
  }, []);

  // ─── Fetch Stocktake Items for a session ───
  const fetchStocktakeItems = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from("fdc_stocktake_items")
      .select("*")
      .eq("session_id", sessionId)
      .order("item_name");
    if (data) setStocktakeItems(data);
  }, []);

  // ─── Create Stocktake Session ───
  const createSession = async () => {
    if (!newSessionTitle.trim()) return;
    const code = `KK-${format(new Date(), "yyyy-MM")}-${String(sessions.length + 1).padStart(3, "0")}`;
    const { data: session, error } = await supabase
      .from("fdc_stocktake_sessions")
      .insert({
        session_code: code,
        title: newSessionTitle,
        category_filter: newSessionCategory,
        status: "draft",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !session) return;

    // Populate session items from current inventory
    const itemsToInsert = filteredInventory
      .filter(item => newSessionCategory === "all" || item.category === ACCOUNT_LABELS[newSessionCategory])
      .map(item => ({
        session_id: session.id,
        inventory_item_code: item.sku,
        item_name: item.name,
        category: item.category,
        unit: item.unit,
        system_qty: item.currentStock,
        system_value: item.currentStock * (item.unitPrice || 0),
        actual_qty: null,
        difference: null,
      }));

    if (itemsToInsert.length > 0) {
      await supabase.from("fdc_stocktake_items").insert(itemsToInsert);
    }

    setShowCreateSession(false);
    setNewSessionTitle("");
    fetchSessions();
    setActiveSession(session);
    fetchStocktakeItems(session.id);
  };

  // ─── Update actual qty ───
  const updateActualQty = async (itemId: string, qty: number) => {
    const item = stocktakeItems.find(i => i.id === itemId);
    if (!item) return;
    const diff = qty - item.system_qty;
    await supabase
      .from("fdc_stocktake_items")
      .update({ actual_qty: qty, difference: diff, checked_at: new Date().toISOString() })
      .eq("id", itemId);
    setStocktakeItems(prev =>
      prev.map(i => i.id === itemId ? { ...i, actual_qty: qty, difference: diff } : i)
    );
  };

  // ─── Complete session ───
  const completeSession = async (sessionId: string) => {
    const unchecked = stocktakeItems.filter(i => i.actual_qty === null);
    if (unchecked.length > 0) return;
    await supabase
      .from("fdc_stocktake_sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", sessionId);
    fetchSessions();
    setActiveSession(null);
  };

  useEffect(() => {
    if (activeTab === "consumption") fetchConsumption();
    if (activeTab === "stocktake") fetchSessions();
  }, [activeTab, fetchConsumption, fetchSessions]);

  // ─── Derived consumption data ───
  const consumptionByDate = React.useMemo(() => {
    const filtered = consumptionAccountFilter === "all"
      ? consumptionData
      : consumptionData.filter(c => c.account === consumptionAccountFilter);
    const map: Record<string, { date: string; totalQty: number; totalAmt: number; visits: number }> = {};
    filtered.forEach(c => {
      if (!map[c.report_date]) map[c.report_date] = { date: c.report_date, totalQty: 0, totalAmt: 0, visits: c.patient_visits };
      map[c.report_date].totalQty += c.outward_qty;
      map[c.report_date].totalAmt += c.outward_amount;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [consumptionData, consumptionAccountFilter]);

  const topConsumers = React.useMemo(() => {
    const filtered = consumptionAccountFilter === "all"
      ? consumptionData
      : consumptionData.filter(c => c.account === consumptionAccountFilter);
    const map: Record<string, { name: string; totalQty: number; totalAmt: number }> = {};
    filtered.forEach(c => {
      if (!map[c.item_code]) map[c.item_code] = { name: c.item_name, totalQty: 0, totalAmt: 0 };
      map[c.item_code].totalQty += c.outward_qty;
      map[c.item_code].totalAmt += c.outward_amount;
    });
    return Object.values(map).sort((a, b) => b.totalQty - a.totalQty).slice(0, 10);
  }, [consumptionData, consumptionAccountFilter]);

  // ─── Helper functions ───
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_stock":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700">Bình thường</span>;
      case "low_stock":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-700">Sắp hết</span>;
      case "out_of_stock":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-rose-100 text-rose-700">Hết hàng</span>;
      default:
        return null;
    }
  };

  const getSessionStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-gray-100 text-gray-600",
      in_progress: "bg-blue-100 text-blue-700",
      completed: "bg-emerald-100 text-emerald-700",
      approved: "bg-indigo-100 text-indigo-700",
    };
    const labels: Record<string, string> = {
      draft: "Nháp",
      in_progress: "Đang kiểm",
      completed: "Hoàn thành",
      approved: "Đã duyệt",
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${styles[status] || ""}`}>{labels[status] || status}</span>;
  };

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Tổng quan", icon: <BarChart2 className="w-4 h-4" /> },
    { key: "list", label: "Danh sách", icon: <List className="w-4 h-4" /> },
    { key: "consumption", label: "Tiêu thụ", icon: <Activity className="w-4 h-4" /> },
    { key: "stocktake", label: "Kiểm kê", icon: <ClipboardCheck className="w-4 h-4" /> },
    { key: "anomalies", label: "Bất thường", icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-7xl mx-auto pb-24 space-y-6">
      {/* Header + Tabs */}
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Kho vật tư</h1>
        <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${activeTab === tab.key
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════ TAB 1: OVERVIEW ═══════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Tổng loại vật tư", value: stats.totalItems, icon: <Package className="w-5 h-5" />, color: "indigo" },
              { label: "Cảnh báo", value: stats.activeAnomaliesCount, icon: <AlertTriangle className="w-5 h-5" />, color: stats.activeAnomaliesCount > 0 ? "rose" : "emerald" },
              { label: "Giá trị tồn kho", value: formatCompact(stats.estimatedValue), icon: <DollarSign className="w-5 h-5" />, color: "emerald", isCurrency: true },
            ].map((kpi, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-full bg-${kpi.color}-50 flex items-center justify-center text-${kpi.color}-600`}>{kpi.icon}</div>
                  <span className="text-sm font-medium text-gray-500">{kpi.label}</span>
                </div>
                <p className={`text-2xl font-bold ${kpi.color === "rose" && stats.activeAnomaliesCount > 0 ? "text-rose-600" : "text-gray-900"}`}>
                  {kpi.isCurrency ? kpi.value : kpi.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 30-day Value Trend */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-4">Biến động giá trị tồn kho (30 ngày)</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={snapshotHistory} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="date" tickFormatter={v => { try { return format(parseISO(v), "dd/MM"); } catch { return v; } }} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={formatCompact} domain={["dataMin * 0.95", "dataMax * 1.05"]} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} formatter={(v: number) => [formatCurrency(v), "Giá trị"]} labelFormatter={v => format(parseISO(v as string), "dd/MM/yyyy")} />
                    <Area type="monotone" dataKey="totalValue" stroke="#6366f1" fill="url(#colorValue)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top 10 by Value */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-4">Top 10 giá trị tồn kho</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topMaterials} layout="vertical" margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={formatCompact} />
                    <YAxis type="category" dataKey="name" width={120} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#374151" }} />
                    <Tooltip cursor={{ fill: "#f3f4f6" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} formatter={(v: number) => [formatCurrency(v), "Giá trị"]} />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB 2: LIST ═══════════════ */}
      {activeTab === "list" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Tìm kiếm vật tư..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all" />
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="text-sm rounded-lg border-gray-200 py-1.5 pl-3 pr-8 focus:ring-indigo-500">
                <option value="all">Tất cả loại</option>
                {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="text-sm rounded-lg border-gray-200 py-1.5 pl-3 pr-8 focus:ring-indigo-500">
                <option value="all">Tất cả trạng thái</option>
                <option value="in_stock">Bình thường</option>
                <option value="low_stock">Sắp hết</option>
                <option value="out_of_stock">Hết hàng</option>
              </select>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tên vật tư</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Loại</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Tồn kho</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right hidden md:table-cell">Đơn giá</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right hidden lg:table-cell">Giá trị</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center">TT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInventory.map(item => (
                  <tr key={item.id} onClick={() => setSelectedItem(item)} className="hover:bg-indigo-50/50 cursor-pointer transition-colors group">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.sku}</div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell"><span className="text-sm text-gray-600">{item.category}</span></td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-medium text-gray-900">{item.currentStock}</div>
                      <div className="text-xs text-gray-500">{item.unit}</div>
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell text-sm text-gray-600">{formatCurrency(item.unitPrice || 0)}</td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell text-sm font-medium text-gray-900">{formatCompact(item.currentStock * (item.unitPrice || 0))}</td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(item.status)}</td>
                  </tr>
                ))}
                {filteredInventory.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">Không tìm thấy vật tư nào.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB 3: CONSUMPTION ═══════════════ */}
      {activeTab === "consumption" && (
        <div className="space-y-6">
          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {["all", "1521", "1522", "1523"].map(acc => (
              <button key={acc} onClick={() => setConsumptionAccountFilter(acc)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${consumptionAccountFilter === acc ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300"}`}>
                {acc === "all" ? "Tất cả" : ACCOUNT_LABELS[acc]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Consumption vs Visits Chart */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-4">Xu hướng tiêu thụ vs Lượt khám</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={consumptionByDate} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="date" tickFormatter={v => { try { return format(parseISO(v), "dd/MM"); } catch { return v; } }} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} labelFormatter={v => format(parseISO(v as string), "dd/MM/yyyy")} />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="totalQty" name="SL xuất kho" stroke="#f59e0b" fill="url(#colorQty)" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="visits" name="Lượt khám" stroke="#6366f1" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Consumers */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-4">Top 10 vật tư tiêu thụ</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topConsumers} layout="vertical" margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <YAxis type="category" dataKey="name" width={140} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#374151" }} />
                    <Tooltip cursor={{ fill: "#f3f4f6" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                    <Bar dataKey="totalQty" name="Số lượng" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Consumption Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Chi tiết tiêu thụ theo ngày</h3>
            </div>
            <div className="overflow-auto max-h-96">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ngày</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Vật tư</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nhóm TK</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">SL xuất</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Giá trị</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Lượt khám</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">SL/lượt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(consumptionAccountFilter === "all" ? consumptionData : consumptionData.filter(c => c.account === consumptionAccountFilter))
                    .slice(0, 50)
                    .map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-700">{c.report_date}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{c.item_name}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{ACCOUNT_LABELS[c.account] || c.account}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">{c.outward_qty}</td>
                        <td className="px-4 py-2 text-sm text-right text-gray-600">{formatCompact(c.outward_amount)}</td>
                        <td className="px-4 py-2 text-sm text-right text-gray-600">{c.patient_visits || "-"}</td>
                        <td className="px-4 py-2 text-sm text-right">
                          {c.qty_per_visit != null ? (
                            <span className={c.qty_per_visit > 2 ? "text-rose-600 font-bold" : "text-gray-700"}>
                              {c.qty_per_visit.toFixed(2)}
                            </span>
                          ) : "-"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB 4: STOCKTAKE ═══════════════ */}
      {activeTab === "stocktake" && (
        <div className="space-y-6">
          {/* Active Session Detail */}
          {activeSession ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-gray-900">{activeSession.title}</h3>
                    {getSessionStatusBadge(activeSession.status)}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Mã: {activeSession.session_code} • {stocktakeItems.length} vật tư</p>
                </div>
                <div className="flex gap-2">
                  {activeSession.status !== "completed" && (
                    <button onClick={() => completeSession(activeSession.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                      disabled={stocktakeItems.some(i => i.actual_qty === null)}>
                      <CheckCircle2 className="w-4 h-4" />Hoàn thành
                    </button>
                  )}
                  <button onClick={() => setActiveSession(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                    Quay lại
                  </button>
                </div>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Đã kiểm", value: stocktakeItems.filter(i => i.actual_qty !== null).length, total: stocktakeItems.length, color: "emerald" },
                  { label: "Thừa", value: stocktakeItems.filter(i => (i.difference || 0) > 0).length, color: "blue" },
                  { label: "Thiếu", value: stocktakeItems.filter(i => (i.difference || 0) < 0).length, color: "rose" },
                ].map((s, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <p className="text-sm text-gray-500">{s.label}</p>
                    <p className={`text-2xl font-bold text-${s.color}-600`}>
                      {s.value}{s.total ? `/${s.total}` : ""}
                    </p>
                  </div>
                ))}
              </div>

              {/* Item table */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-auto max-h-[calc(100vh-450px)]">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tên vật tư</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Nhóm</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Sổ sách</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Thực tế</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Chênh lệch</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {stocktakeItems.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{item.item_name}</div>
                            <div className="text-xs text-gray-500">{item.inventory_item_code} • {item.unit}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{item.category}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-gray-700">{item.system_qty}</td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              value={item.actual_qty ?? ""}
                              onChange={e => updateActualQty(item.id, Number(e.target.value))}
                              placeholder="Nhập..."
                              className="w-24 text-right text-sm px-2 py-1 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                              disabled={activeSession.status === "completed"}
                            />
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold">
                            {item.difference != null ? (
                              <span className={item.difference > 0 ? "text-blue-600" : item.difference < 0 ? "text-rose-600" : "text-gray-500"}>
                                {item.difference > 0 ? "+" : ""}{item.difference}
                              </span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* Sessions List */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Phiên kiểm kê</h2>
                <button onClick={() => setShowCreateSession(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm">
                  <Plus className="w-4 h-4" />Tạo phiên mới
                </button>
              </div>

              {/* Create session form */}
              {showCreateSession && (
                <div className="bg-white rounded-2xl p-5 border border-indigo-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-gray-900">Tạo phiên kiểm kê mới</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Tiêu đề</label>
                      <input type="text" value={newSessionTitle} onChange={e => setNewSessionTitle(e.target.value)}
                        placeholder="VD: Kiểm kê Q1/2026" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Nhóm TK</label>
                      <select value={newSessionCategory} onChange={e => setNewSessionCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200">
                        <option value="all">Tất cả</option>
                        <option value="1521">1521 - Nguyên vật liệu</option>
                        <option value="1522">1522 - Vật tư y tế</option>
                        <option value="1523">1523 - Văn phòng phẩm</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowCreateSession(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Huỷ</button>
                    <button onClick={createSession} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Tạo phiên</button>
                  </div>
                </div>
              )}

              {/* Sessions cards */}
              {sessions.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center">
                  <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Chưa có phiên kiểm kê nào. Nhấn "Tạo phiên mới" để bắt đầu.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sessions.map(s => (
                    <div key={s.id} onClick={() => { setActiveSession(s); fetchStocktakeItems(s.id); }}
                      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:border-indigo-200 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-bold text-gray-900">{s.title}</h4>
                        {getSessionStatusBadge(s.status)}
                      </div>
                      <p className="text-sm text-gray-500">Mã: {s.session_code}</p>
                      <p className="text-sm text-gray-500">Nhóm: {s.category_filter === "all" ? "Tất cả" : ACCOUNT_LABELS[s.category_filter] || s.category_filter}</p>
                      <p className="text-xs text-gray-400 mt-2">Tạo: {format(parseISO(s.created_at), "dd/MM/yyyy HH:mm")}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ TAB 5: ANOMALIES ═══════════════ */}
      {activeTab === "anomalies" && (
        <div className="space-y-6">
          {anomalies.filter(a => !a.acknowledged).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {anomalies.filter(a => !a.acknowledged).map(anomaly => (
                <div key={anomaly.id} className="bg-white rounded-xl p-4 border border-rose-100 shadow-sm flex flex-col justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${anomaly.severity === "critical" ? "bg-rose-500 text-white" :
                      anomaly.severity === "high" ? "bg-orange-500 text-white" :
                        anomaly.severity === "medium" ? "bg-amber-500 text-white" :
                          "bg-blue-500 text-white"
                      }`}>
                      {anomaly.severity === "critical" ? "Nghiêm trọng" :
                        anomaly.severity === "high" ? "Cao" :
                          anomaly.severity === "medium" ? "Trung bình" : "Thấp"}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{anomaly.materialId || "Unknown"}</h4>
                      <p className="text-sm text-gray-600 mt-1">{anomaly.description}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        Phát hiện: {format(parseISO(anomaly.detectedAt), "HH:mm dd/MM/yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => acknowledgeAnomaly(anomaly.id)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors">
                      Xác nhận đã xem
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Không có bất thường nào cần xử lý.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ SIDE PANEL ═══════════════ */}
      {selectedItem && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setSelectedItem(null)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedItem.name}</h2>
                <p className="text-sm text-gray-500">{selectedItem.sku}</p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Tồn kho</p>
                  <p className="text-2xl font-bold text-gray-900">{selectedItem.currentStock} <span className="text-sm font-normal text-gray-500">{selectedItem.unit}</span></p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Đơn giá</p>
                  <p className="text-2xl font-bold text-indigo-600">{formatCurrency(selectedItem.unitPrice || 0)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Giá trị</p>
                  <p className="text-lg font-semibold text-gray-700">{formatCurrency(selectedItem.currentStock * (selectedItem.unitPrice || 0))}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Loại</p>
                  <p className="text-sm font-medium text-gray-700">{selectedItem.category}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Trạng thái</p>
                {getStatusBadge(selectedItem.status)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
