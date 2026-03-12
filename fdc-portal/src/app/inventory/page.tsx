import React, { useState } from "react";
import { useInventory } from "@/viewmodels/useInventory";
import {
  Search, AlertTriangle, X, BarChart2, List,
  ClipboardCheck, CheckCircle2, Activity,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import OverviewTab from "./OverviewTab";
import ConsumptionTab from "./ConsumptionTab";
import StocktakeTab from "./StocktakeTab";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const formatCompact = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} tr`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toString();
};

type TabType = "overview" | "list" | "consumption" | "stocktake" | "anomalies";

export default function InventoryPage() {
  const {
    searchQuery, setSearchQuery,
    filterCategory, setFilterCategory,
    filterStatus, setFilterStatus,
    filteredInventory,
    uniqueCategories,
    selectedItem, setSelectedItem,
    anomalies, acknowledgeAnomaly,
    snapshotHistory,
    topMaterials,
    stats,
    isLoadingSnapshotHistory,
  } = useInventory("inventory");

  const [activeTab, setActiveTab] = useState<TabType>("overview");

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

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <OverviewTab
          stats={stats}
          snapshotHistory={snapshotHistory}
          isLoadingSnapshotHistory={isLoadingSnapshotHistory}
          topMaterials={topMaterials}
        />
      )}

      {/* TAB 2: LIST */}
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

      {/* TAB 3: CONSUMPTION */}
      {activeTab === "consumption" && <ConsumptionTab />}

      {/* TAB 4: STOCKTAKE */}
      {activeTab === "stocktake" && <StocktakeTab filteredInventory={filteredInventory} />}

      {/* TAB 5: ANOMALIES */}
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

      {/* SIDE PANEL */}
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
