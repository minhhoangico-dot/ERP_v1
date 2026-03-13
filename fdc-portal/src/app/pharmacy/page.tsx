import React from "react";
import { useNavigate } from "react-router-dom";
import { useInventory } from "@/viewmodels/useInventory";
import { InventoryAnomaly } from "@/types/inventory";
import {
  Search,
  AlertTriangle,
  Package,
  DollarSign,
  X,
  Clock,
  BarChart2,
  List,
  ShieldAlert,
  TrendingDown,
  Pill,
  Eye,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/lib/supabase";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from "recharts";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

const formatCompact = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} tr`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toString();
};

export default function PharmacyPage() {
  const navigate = useNavigate();
  const {
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
    anomalies,
    acknowledgeAnomaly,
    snapshotHistory,
    itemSnapshots,
    isLoadingItemSnapshots,
    topMaterials,
    stats,
  } = useInventory('pharmacy');

  // Import history state for side panel
  const [importHistory, setImportHistory] = React.useState<any[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = React.useState(false);

  React.useEffect(() => {
    const fetchHistory = async () => {
      if (!selectedItem?.medicineCode) {
        setImportHistory([]);
        return;
      }
      setIsFetchingHistory(true);
      const { data } = await supabase
        .from('fdc_medicine_imports')
        .select('*')
        .eq('medicine_code', selectedItem.medicineCode)
        .order('import_date', { ascending: false })
        .limit(10);
      setImportHistory(data || []);
      setIsFetchingHistory(false);
    };
    fetchHistory();
  }, [selectedItem]);

  const activeAnomalies = anomalies.filter(a => !a.acknowledged);
  const anomalyByRule = React.useMemo(() => {
    const map: Record<string, typeof activeAnomalies> = {};
    for (const a of activeAnomalies) {
      if (!map[a.rule]) map[a.rule] = [];
      map[a.rule].push(a);
    }
    return map;
  }, [activeAnomalies]) as Record<string, InventoryAnomaly[]>;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-rose-500 text-white";
      case "high": return "bg-orange-500 text-white";
      case "medium": return "bg-amber-500 text-white";
      case "low": return "bg-blue-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case "critical": return "Nghiêm trọng";
      case "high": return "Cao";
      case "medium": return "Trung bình";
      case "low": return "Thấp";
      default: return severity;
    }
  };

  const getRuleLabel = (rule: string) => {
    switch (rule) {
      case "low_stock": return "Tồn kho thấp";
      case "near_expiry": return "Sắp hết hạn";
      case "expired": return "Đã hết hạn";
      case "zero_stock": return "Hết hàng";
      case "stock_spike": return "Biến động đột biến";
      default: return rule;
    }
  };

  const getRuleIcon = (rule: string) => {
    switch (rule) {
      case "low_stock": return <TrendingDown className="w-4 h-4" />;
      case "near_expiry": return <Clock className="w-4 h-4" />;
      case "expired": return <AlertTriangle className="w-4 h-4" />;
      case "zero_stock": return <Package className="w-4 h-4" />;
      case "stock_spike": return <BarChart2 className="w-4 h-4" />;
      default: return <ShieldAlert className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string, itemName: string) => {
    const hasAnomaly = activeAnomalies.some(a => a.materialId === itemName);

    if (hasAnomaly) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
          Bất thường
        </span>
      );
    }

    switch (status) {
      case "in_stock":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
            Bình thường
          </span>
        );
      case "low_stock":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
            Sắp hết
          </span>
        );
      case "out_of_stock":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-rose-100 text-rose-700 border border-rose-200">
            Hết hàng
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-24 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Pill className="w-6 h-6 text-indigo-600" />
          Quản lý Kho Thuốc
        </h1>

        {/* Tab Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "overview"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            <BarChart2 className="w-4 h-4" />
            Tổng quan
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "list"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            <List className="w-4 h-4" />
            Danh sách
          </button>
          <button
            onClick={() => setActiveTab("anomalies")}
            className={`relative flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "anomalies"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Bất thường
            {stats.activeAnomaliesCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {stats.activeAnomaliesCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========= TAB 1: OVERVIEW ========= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => { setFilterStatus("all"); setActiveTab("list"); }}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:border-indigo-200 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Package className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-gray-500">Tổng mã thuốc</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
            </div>

            <div
              onClick={() => setActiveTab("anomalies")}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:border-rose-200 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${stats.activeAnomaliesCount > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-gray-500">Bất thường</span>
              </div>
              <p className={`text-2xl font-bold ${stats.activeAnomaliesCount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {stats.activeAnomaliesCount}
              </p>
            </div>

            <div
              onClick={() => { setFilterStatus("near_expiry"); setActiveTab("list"); }}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:border-amber-200 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${stats.nearExpiryCount > 0 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-gray-500">Sắp hết hạn</span>
              </div>
              <p className={`text-2xl font-bold ${stats.nearExpiryCount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {stats.nearExpiryCount}
              </p>
            </div>

            <div
              onClick={() => navigate('/valuation?module=pharmacy')}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:border-emerald-200 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <DollarSign className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-gray-500">Giá trị tồn kho</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.estimatedValue)}
              </p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Stock Value Trend - default 1 year (weekly aggregate) */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-4">
                Biến động giá trị tồn kho (1 năm)
              </h3>
              <div className="h-72">
                {snapshotHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={snapshotHistory} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(val) => {
                          try { return format(parseISO(val), "dd/MM"); } catch { return val; }
                        }}
                        axisLine={false} tickLine={false}
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false} tickLine={false}
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        tickFormatter={formatCompact}
                        domain={['dataMin * 0.95', 'dataMax * 1.05']}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                        labelFormatter={(val) => { try { return format(parseISO(val as string), "dd/MM/yyyy"); } catch { return val as string; } }}
                        formatter={(value: number) => [formatCurrency(value), "Giá trị tồn"]}
                      />
                      <Area type="monotone" dataKey="totalValue" stroke="#6366f1" strokeWidth={2} fill="url(#colorValue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    Chưa có dữ liệu trong 1 năm gần nhất. Hệ thống sẽ bắt đầu thu thập sau 1-2 ngày.
                  </div>
                )}
              </div>
            </div>

            {/* Chart 2: Top 10 by Value */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-4">
                Top 10 thuốc giá trị tồn cao nhất
              </h3>
              <div className="h-72">
                {topMaterials.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topMaterials} layout="vertical" margin={{ top: 5, right: 5, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                      <XAxis
                        type="number" axisLine={false} tickLine={false}
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        tickFormatter={formatCompact}
                      />
                      <YAxis
                        type="category" dataKey="name" axisLine={false} tickLine={false}
                        tick={{ fontSize: 10, fill: "#374151" }}
                        width={120}
                      />
                      <Tooltip
                        cursor={{ fill: "#f3f4f6" }}
                        contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                        formatter={(value: number) => [formatCurrency(value), "Giá trị"]}
                      />
                      <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    Không có dữ liệu.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active Anomalies Preview */}
          {activeAnomalies.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                  Cảnh báo cần xử lý ({activeAnomalies.length})
                </h2>
                <button
                  onClick={() => setActiveTab("anomalies")}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Xem tất cả →
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeAnomalies.slice(0, 6).map((anomaly) => (
                  <div
                    key={anomaly.id}
                    className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:border-rose-200 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${getSeverityColor(anomaly.severity)}`}>
                        {getSeverityLabel(anomaly.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 text-sm truncate">{anomaly.materialId}</h4>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{anomaly.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========= TAB 2: STOCK LIST ========= */}
      {activeTab === "list" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
          {/* Filters */}
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm thuốc, mã thuốc..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={filterWarehouse} onChange={(e) => setFilterWarehouse(e.target.value)} className="text-sm rounded-lg border-gray-200 py-1.5 pl-3 pr-8 focus:ring-indigo-500 focus:border-indigo-500">
                <option value="all">Tất cả kho</option>
                {uniqueWarehouses.map((wh) => (<option key={wh} value={wh}>{wh}</option>))}
              </select>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="text-sm rounded-lg border-gray-200 py-1.5 pl-3 pr-8 focus:ring-indigo-500 focus:border-indigo-500">
                <option value="all">Tất cả nhóm</option>
                {uniqueCategories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="text-sm rounded-lg border-gray-200 py-1.5 pl-3 pr-8 focus:ring-indigo-500 focus:border-indigo-500">
                <option value="all">Tất cả trạng thái</option>
                <option value="in_stock">Bình thường</option>
                <option value="low_stock">Sắp hết</option>
                <option value="near_expiry">Sắp hết hạn</option>
                <option value="out_of_stock">Hết hàng</option>
                <option value="anomaly">Có bất thường</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Mã thuốc</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tên thuốc</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Kho</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">ĐVT</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Lô SX</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">HSD</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Trạng thái</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Tồn kho</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right hidden sm:table-cell">Đơn giá</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right hidden sm:table-cell">Giá trị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInventory.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600">{item.sku}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {item.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-600">{item.warehouse}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-xs text-gray-500">{item.unit}</div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="text-sm text-gray-700">{item.batchNumber || '-'}</div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="text-sm text-gray-700">
                        {item.expiryDate ? format(new Date(item.expiryDate), 'dd/MM/yyyy') : '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(item.status, item.name)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-medium text-gray-900">{item.currentStock}</div>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <span className="text-sm text-gray-600">{formatCurrency(item.unitPrice || 0)}</span>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <span className="font-semibold text-emerald-600">{formatCurrency(item.currentStock * (item.unitPrice || 0))}</span>
                    </td>
                  </tr>
                ))}
                {filteredInventory.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                      Không tìm thấy thuốc nào phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========= TAB 3: ANOMALY CENTER ========= */}
      {activeTab === "anomalies" && (
        <div className="space-y-6">
          {activeAnomalies.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Không có bất thường</h3>
              <p className="text-sm text-gray-500">Tất cả thuốc trong kho đang ở trạng thái bình thường.</p>
            </div>
          ) : (
            <>
              {/* Group by rule */}
              {Object.entries(anomalyByRule).map(([rule, items]) => (
                <div key={rule} className="space-y-3">
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    {getRuleIcon(rule)}
                    {getRuleLabel(rule)}
                    <span className="text-sm font-medium text-gray-400">({items.length})</span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map((anomaly) => (
                      <div
                        key={anomaly.id}
                        className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex flex-col gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${getSeverityColor(anomaly.severity)}`}>
                            {getSeverityLabel(anomaly.severity)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 text-sm truncate">{anomaly.materialId}</h4>
                            <p className="text-xs text-gray-600 mt-1">{anomaly.description}</p>
                            <p className="text-xs text-gray-400 mt-2">
                              Phát hiện: {format(parseISO(anomaly.detectedAt), "HH:mm dd/MM/yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              // Find item in inventory and open side panel
                              const found = filteredInventory.find(i => i.name === anomaly.materialId);
                              if (found) {
                                setSelectedItem(found);
                                setActiveTab("list");
                              }
                            }}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> Xem chi tiết
                          </button>
                          <button
                            onClick={() => acknowledgeAnomaly(anomaly.id)}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                          >
                            Xác nhận
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Acknowledged anomalies */}
              {anomalies.filter(a => a.acknowledged).length > 0 && (
                <details className="mt-4">
                  <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                    Đã xác nhận ({anomalies.filter(a => a.acknowledged).length})
                  </summary>
                  <div className="mt-3 space-y-2">
                    {anomalies.filter(a => a.acknowledged).slice(0, 10).map((a) => (
                      <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 text-sm">
                        <div className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-gray-700">{a.materialId}</span>
                          <span className="text-gray-400 ml-2">{a.description}</span>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">
                          {format(parseISO(a.detectedAt), "dd/MM")}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      )}

      {/* ========= SLIDE-IN DETAIL PANEL ========= */}
      {selectedItem && (
        <>
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setSelectedItem(null)}
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-900 truncate">{selectedItem.name}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                  <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-medium text-xs">{selectedItem.sku}</span>
                  <span>•</span>
                  <span>{selectedItem.warehouse}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Tồn kho</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedItem.currentStock}{" "}
                    <span className="text-sm font-normal text-gray-500">{selectedItem.unit}</span>
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Giá trị</p>
                  <p className="text-lg font-bold text-emerald-600">
                    {formatCurrency(selectedItem.currentStock * (selectedItem.unitPrice || 0))}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Đơn giá</p>
                  <p className="text-lg font-semibold text-gray-700">
                    {formatCurrency(selectedItem.unitPrice || 0)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Trạng thái</p>
                  <div className="mt-1">
                    {getStatusBadge(selectedItem.status, selectedItem.name)}
                  </div>
                </div>
              </div>

              {/* Per-item Stock Movement Chart */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">Biến động tồn kho (30 ngày)</h3>
                <div className="h-44 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  {isLoadingItemSnapshots ? (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">Đang tải...</div>
                  ) : itemSnapshots.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={itemSnapshots}>
                        <defs>
                          <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" hide />
                        <YAxis hide />
                        <Tooltip
                          contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                          labelFormatter={(val) => { try { return format(parseISO(val as string), "dd/MM/yyyy"); } catch { return val as string; } }}
                          formatter={(value: number) => [value, "Tồn kho"]}
                        />
                        <Area type="monotone" dataKey="stock" stroke="#6366f1" strokeWidth={2} fill="url(#colorStock)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                      Chưa có đủ dữ liệu lịch sử để hiển thị biểu đồ.
                    </div>
                  )}
                </div>
              </div>

              {/* Batch & Expiry Info */}
              {(selectedItem.batchNumber || selectedItem.expiryDate) && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-gray-900">Thông tin lô</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedItem.batchNumber && (
                      <div className="text-sm">
                        <span className="text-gray-500">Lô SX:</span>
                        <span className="ml-2 font-medium text-gray-900">{selectedItem.batchNumber}</span>
                      </div>
                    )}
                    {selectedItem.expiryDate && (
                      <div className="text-sm">
                        <span className="text-gray-500">HSD:</span>
                        <span className="ml-2 font-medium text-gray-900">{format(new Date(selectedItem.expiryDate), 'dd/MM/yyyy')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Anomaly History for this item */}
              {anomalies.filter(a => a.materialId === selectedItem.name).length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Cảnh báo</h3>
                  <div className="space-y-2">
                    {anomalies
                      .filter(a => a.materialId === selectedItem.name)
                      .map((anomaly) => (
                        <div key={anomaly.id} className="flex gap-3 p-3 rounded-xl border border-gray-100 bg-white">
                          <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${anomaly.acknowledged ? "bg-gray-300" : "bg-orange-500"}`} />
                          <div className="flex-1">
                            <p className={`text-sm ${anomaly.acknowledged ? "text-gray-600" : "text-gray-900 font-medium"}`}>
                              {anomaly.description}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {format(parseISO(anomaly.detectedAt), "HH:mm dd/MM/yyyy")}
                              {anomaly.acknowledged && " • Đã xác nhận"}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Import History */}
              {selectedItem.medicineCode && (
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <h3 className="font-semibold text-gray-900">Lịch sử nhập kho</h3>
                  {isFetchingHistory ? (
                    <div className="text-sm text-gray-500 text-center py-4">Đang tải lịch sử...</div>
                  ) : importHistory.length > 0 ? (
                    <div className="space-y-2">
                      {importHistory.map((hist) => (
                        <div key={hist.id} className="bg-white border text-sm border-gray-100 rounded-xl p-3 shadow-sm relative overflow-hidden group">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-medium text-gray-900">
                              {hist.import_date ? format(new Date(hist.import_date), "dd/MM/yyyy") : "N/A"}
                            </div>
                            <div className="font-semibold text-emerald-600">
                              {formatCurrency(hist.unit_price)}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                            <div>
                              <span className="text-gray-400">SL nhập</span>
                              <span className="ml-1 font-medium text-gray-700">{hist.quantity} {selectedItem.unit}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Lô</span>
                              <span className="ml-1 font-medium text-gray-700">{hist.batch_number || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      Không có dữ liệu lịch sử nhập.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
