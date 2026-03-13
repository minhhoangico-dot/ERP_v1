import React from "react";
import { format, parseISO } from "date-fns";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, ComposedChart, Line,
} from "recharts";
import { Package, AlertTriangle, DollarSign, Activity } from "lucide-react";
import { useSupplyChart } from "@/viewmodels/useSupplyChart";
import { SnapshotHistory, TopMaterial, SupplyTimeRange } from "@/types/inventory";
import ChartDetailModal from "./ChartDetailModal";

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

interface OverviewTabProps {
  stats: { totalItems: number; activeAnomaliesCount: number; estimatedValue: number };
  snapshotHistory: SnapshotHistory[];
  isLoadingSnapshotHistory: boolean;
  topMaterials: TopMaterial[];
}

type DetailModalState = {
  title: string;
  dataSource: string;
  columns: string[];
  rows: (string | number | null | undefined)[][];
};

export default function OverviewTab({ stats, snapshotHistory, isLoadingSnapshotHistory, topMaterials }: OverviewTabProps) {
  const {
    timeRange, setTimeRange,
    accountFilter, setAccountFilter,
    chartData, isLoading: isLoadingSupplyChart,
    RANGE_LABELS,
  } = useSupplyChart();

  const [detailModal, setDetailModal] = React.useState<DetailModalState | null>(null);

  const latestPoint = chartData[chartData.length - 1];
  const totalConsumption = chartData.reduce((sum, p) => sum + p.consumption, 0);
  const totalPatients = chartData.reduce((sum, p) => sum + (p.patientVolume || 0), 0);
  const avgPerVisit = totalPatients > 0 ? totalConsumption / totalPatients : 0;
  const firstPoint = chartData[0];
  const yoyChange = latestPoint && firstPoint && latestPoint.consumptionLY > 0
    ? ((latestPoint.consumption - latestPoint.consumptionLY) / latestPoint.consumptionLY) * 100
    : 0;

  return (
    <div className="space-y-6">
      {detailModal && (
        <ChartDetailModal
          title={detailModal.title}
          dataSource={detailModal.dataSource}
          columns={detailModal.columns}
          rows={detailModal.rows}
          onClose={() => setDetailModal(null)}
        />
      )}
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Tổng loại vật tư", value: stats.totalItems, icon: <Package className="w-5 h-5" />, color: "indigo" },
          { label: "Cảnh báo", value: stats.activeAnomaliesCount, icon: <AlertTriangle className="w-5 h-5" />, color: stats.activeAnomaliesCount > 0 ? "rose" : "emerald" },
          { label: "Giá trị tồn kho", value: formatCompact(stats.estimatedValue), icon: <DollarSign className="w-5 h-5" />, color: "emerald", isCurrency: true },
          {
            label: "Chi phí / lượt khám",
            value: avgPerVisit > 0 ? formatCurrency(avgPerVisit) : "-",
            icon: <Activity className="w-5 h-5" />,
            color: "indigo",
          },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-full bg-${kpi.color}-50 flex items-center justify-center text-${kpi.color}-600`}>{kpi.icon}</div>
              <span className="text-sm font-medium text-gray-500">{kpi.label}</span>
            </div>
            <p className={`text-2xl font-bold ${kpi.color === "rose" && stats.activeAnomaliesCount > 0 ? "text-rose-600" : "text-gray-900"}`}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Supply Consumption Chart (full width) */}
      <div
        className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:border-gray-200"
        onClick={() => {
          setDetailModal({
            title: "Tiêu hao vật tư & Lượt khám bệnh",
            dataSource: "MISA + HIS",
            columns: ["Kỳ", "Tiêu hao kỳ này", "Cùng kỳ năm trước", "Lượt khám", "Chi phí/lượt"],
            rows: chartData.map((p) => {
              const perVisit =
                p.patientVolume && p.patientVolume > 0 ? p.consumption / p.patientVolume : 0;
              return [
                p.period,
                formatCurrency(p.consumption || 0),
                formatCurrency(p.consumptionLY || 0),
                (p.patientVolume || 0).toLocaleString("vi-VN"),
                perVisit > 0 ? formatCurrency(perVisit) : "-",
              ];
            }),
          });
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setDetailModal({
              title: "Tiêu hao vật tư & Lượt khám bệnh",
              dataSource: "MISA + HIS",
              columns: ["Kỳ", "Tiêu hao kỳ này", "Cùng kỳ năm trước", "Lượt khám", "Chi phí/lượt"],
              rows: chartData.map((p) => {
                const perVisit =
                  p.patientVolume && p.patientVolume > 0 ? p.consumption / p.patientVolume : 0;
                return [
                  p.period,
                  formatCurrency(p.consumption || 0),
                  formatCurrency(p.consumptionLY || 0),
                  (p.patientVolume || 0).toLocaleString("vi-VN"),
                  perVisit > 0 ? formatCurrency(perVisit) : "-",
                ];
              }),
            });
          }
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-base font-bold text-gray-900">Tiêu hao vật tư & Lượt khám bệnh</h3>
          <div className="flex gap-1.5 flex-wrap">
            {(["1Y"] as SupplyTimeRange[]).map(r => (
              <button
                key={r}
                onClick={(e) => {
                  e.stopPropagation();
                  setTimeRange(r);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${timeRange === r ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap mb-4">
          {(["all", "1521", "1522", "1523"] as const).map(acc => (
            <button
              key={acc}
              onClick={(e) => {
                e.stopPropagation();
                setAccountFilter(acc);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${accountFilter === acc ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}>
              {acc === "all" ? "Tất cả TK 152" : ACCOUNT_LABELS[acc]}
            </button>
          ))}
        </div>
        <div className="h-80">
          {isLoadingSupplyChart ? (
            <div className="w-full h-full rounded-xl bg-gray-50 animate-pulse" />
          ) : chartData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
              Chưa có dữ liệu tiêu hao cho khoảng thời gian này.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis
                  dataKey="period"
                  tickFormatter={v => {
                    if (!v) return v;
                    const parts = String(v).split("-");
                    if (parts.length >= 3) return `${parts[2]}/${parts[1]}`;
                    return parts.length >= 2 ? `${parts[1]}/${parts[0].slice(2)}` : v;
                  }}
                  axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }}
                />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={formatCompact} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={v => v.toLocaleString("vi-VN")} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  formatter={(value: number, name: string) => {
                    if (name === "Lượt khám") return [value.toLocaleString("vi-VN"), name];
                    return [formatCurrency(value), name];
                  }}
                  labelFormatter={v => {
                    if (!v) return v;
                    const parts = String(v).split("-");
                    if (parts.length >= 3) return format(parseISO(String(v)), "dd/MM/yyyy");
                    return parts.length >= 2 ? `Tháng ${parts[1]}/${parts[0]}` : v;
                  }}
                />
                <Legend />
                <Bar yAxisId="right" dataKey="patientVolume" name="Lượt khám" fill="#10b981" opacity={0.35} radius={[4, 4, 0, 0]} barSize={28} />
                <Area yAxisId="left" type="monotone" dataKey="consumption" name="Tiêu hao kỳ này" stroke="#6366f1" fill="url(#colorConsumption)" strokeWidth={2} />
                <Line yAxisId="left" type="monotone" dataKey="consumptionLY" name="Cùng kỳ năm trước" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3" dot />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Per-visit cost chart */}
      <div
        className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:border-gray-200"
        onClick={() => {
          setDetailModal({
            title: "Chi phí tiêu hao / lượt khám",
            dataSource: "MISA + HIS",
            columns: ["Kỳ", "Chi phí/lượt"],
            rows: chartData.map((p) => [
              p.period,
              p.consumptionPerVisit && p.consumptionPerVisit > 0
                ? formatCurrency(p.consumptionPerVisit)
                : "-",
            ]),
          });
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setDetailModal({
              title: "Chi phí tiêu hao / lượt khám",
              dataSource: "MISA + HIS",
              columns: ["Kỳ", "Chi phí/lượt"],
              rows: chartData.map((p) => [
                p.period,
                p.consumptionPerVisit && p.consumptionPerVisit > 0
                  ? formatCurrency(p.consumptionPerVisit)
                  : "-",
              ]),
            });
          }
        }}
      >
        <h3 className="text-base font-bold text-gray-900 mb-4">Chi phí tiêu hao / lượt khám</h3>
        <div className="h-56">
          {isLoadingSupplyChart ? (
            <div className="w-full h-full rounded-xl bg-gray-50 animate-pulse" />
          ) : chartData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
              Chưa có dữ liệu tiêu hao cho khoảng thời gian này.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPerVisit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis
                  dataKey="period"
                  tickFormatter={v => {
                    if (!v) return v;
                    const parts = String(v).split("-");
                    if (parts.length === 3) {
                      return `${parts[2]}/${parts[1]}`;
                    }
                    return parts.length >= 2 ? `${parts[1]}/${parts[0].slice(2)}` : v;
                  }}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickFormatter={v => formatCompact(v as number)}
                />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  formatter={(v: number) => [formatCurrency(v), "Chi phí / lượt"]}
                  labelFormatter={v => String(v)}
                />
                <Area
                  type="monotone"
                  dataKey="consumptionPerVisit"
                  name="Chi phí / lượt"
                  stroke="#22c55e"
                  fill="url(#colorPerVisit)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Value Trend (1 year) */}
        <div
          className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:border-gray-200"
          onClick={() => {
            setDetailModal({
              title: "Giá trị tồn kho (1 năm)",
              dataSource: "MISA",
              columns: ["Ngày", "Tổng tồn kho", "Giá trị"],
              rows: snapshotHistory.map((r) => [
                r.date,
                (Number(r.totalStock) || 0).toLocaleString("vi-VN"),
                formatCurrency(Number(r.totalValue) || 0),
              ]),
            });
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setDetailModal({
                title: "Giá trị tồn kho (1 năm)",
                dataSource: "MISA",
                columns: ["Ngày", "Tổng tồn kho", "Giá trị"],
                rows: snapshotHistory.map((r) => [
                  r.date,
                  (Number(r.totalStock) || 0).toLocaleString("vi-VN"),
                  formatCurrency(Number(r.totalValue) || 0),
                ]),
              });
            }
          }}
        >
          <h3 className="text-base font-bold text-gray-900 mb-4">Giá trị tồn kho (1 năm)</h3>
          <div className="h-72">
            {isLoadingSnapshotHistory ? (
              <div className="w-full h-full rounded-xl bg-gray-50 animate-pulse" />
            ) : snapshotHistory.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
                Chưa có dữ liệu trong 1 năm gần nhất.
              </div>
            ) : (
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
            )}
          </div>
        </div>

        {/* Top 10 by Value */}
        <div
          className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:border-gray-200"
          onClick={() => {
            setDetailModal({
              title: "Top 10 giá trị tồn kho",
              dataSource: "MISA",
              columns: ["Tên vật tư", "Số lượng", "Đơn vị", "Giá trị"],
              rows: topMaterials.map((m) => [
                m.name,
                (Number(m.stock) || 0).toLocaleString("vi-VN"),
                m.unit || "-",
                formatCurrency(Number(m.value) || 0),
              ]),
            });
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setDetailModal({
                title: "Top 10 giá trị tồn kho",
                dataSource: "MISA",
                columns: ["Tên vật tư", "Số lượng", "Đơn vị", "Giá trị"],
                rows: topMaterials.map((m) => [
                  m.name,
                  (Number(m.stock) || 0).toLocaleString("vi-VN"),
                  m.unit || "-",
                  formatCurrency(Number(m.value) || 0),
                ]),
              });
            }
          }}
        >
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
  );
}
