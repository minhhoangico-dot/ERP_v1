import React, { useState } from "react";
import { useAdmin, AdminTab } from "@/viewmodels/useAdmin";
import {
  Users,
  Settings,
  Key,
  Activity,
  Shield,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  ChevronRight,
  ArrowRight,
  ShieldAlert,
  Database,
  Server,
  UserCog,
} from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { ROLES } from "@/lib/constants";

export default function AdminPage() {
  const {
    activeTab,
    setActiveTab,
    users,
    isAddUserModalOpen,
    setIsAddUserModalOpen,
    isDelegationModalOpen,
    setIsDelegationModalOpen,
    selectedUser,
    setSelectedUser,
    handleRoleChange,
    handleResetPassword,
    approvalConfigs,
    selectedConfig,
    setSelectedConfig,
    misaKeywords,
    toggleKeywordActive,
    bridgeHealth,
    syncHistory,
    handleManualSync,
    auditLogs,
    auditSearch,
    setAuditSearch,
  } = useAdmin();

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: "users", label: "Người dùng", icon: <Users className="w-4 h-4" /> },
    {
      id: "approval",
      label: "Cấu hình phê duyệt",
      icon: <Settings className="w-4 h-4" />,
    },
    { id: "misa", label: "Từ khóa MISA", icon: <Key className="w-4 h-4" /> },
    { id: "health", label: "Hệ thống", icon: <Activity className="w-4 h-4" /> },
    { id: "audit", label: "Nhật ký", icon: <Shield className="w-4 h-4" /> },
  ];

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case "purchase":
        return "Đề nghị mua sắm";
      case "leave":
        return "Đơn xin nghỉ phép";
      case "payment":
        return "Đề nghị thanh toán";
      case "material_release":
        return "Xuất vật tư";
      case "advance":
        return "Tạm ứng";
      case "other":
        return "Khác";
      default:
        return type;
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-24 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Quản trị hệ thống</h1>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-1 flex overflow-x-auto hide-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${activeTab === tab.id
              ? "bg-indigo-50 text-indigo-700"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm min-h-[600px]">
        {/* TAB 1: Users */}
        {activeTab === "users" && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm người dùng..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border-transparent rounded-lg text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Thêm người dùng
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Người dùng
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vai trò
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Phòng ban
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                      Trạng thái
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatarUrl}
                            alt=""
                            className="w-8 h-8 rounded-full bg-gray-100 object-cover"
                          />
                          <div>
                            <div className="font-medium text-gray-900">
                              {user.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(user.id, e.target.value as any)
                          }
                          className="text-sm rounded-md border-gray-200 py-1 pl-2 pr-8 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          {Object.entries(ROLES).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-sm text-gray-600">
                          {user.department || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            defaultChecked
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleResetPassword(user.id)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                            title="Reset mật khẩu"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setIsDelegationModalOpen(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                            title="Ủy quyền"
                          >
                            <UserCog className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Approval Config */}
        {activeTab === "approval" && (
          <div className="flex flex-col md:flex-row h-full min-h-[600px]">
            {/* Sidebar */}
            <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50/50 p-4 space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Loại đề nghị
              </h3>
              {approvalConfigs.map((config) => (
                <button
                  key={config.id}
                  onClick={() => setSelectedConfig(config)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedConfig?.id === config.id
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  {getRequestTypeLabel(config.requestType)}
                </button>
              ))}
              <button className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors mt-4">
                <Plus className="w-4 h-4" />
                Thêm loại mới
              </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6">
              {selectedConfig ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-gray-900">
                      Quy trình: {getRequestTypeLabel(selectedConfig.requestType)}
                    </h2>
                    <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                      Lưu thay đổi
                    </button>
                  </div>

                  {/* Visual Flow Preview */}
                  <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-100 overflow-x-auto">
                    <h3 className="text-sm font-medium text-gray-500 mb-4">
                      Sơ đồ quy trình
                    </h3>
                    <div className="flex items-center gap-2 min-w-max">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm shadow-sm text-center leading-tight">
                          Bắt <br /> đầu
                        </div>
                      </div>
                      {selectedConfig.steps.map((step, idx) => (
                        <React.Fragment key={step.id}>
                          <div className="w-8 h-0.5 bg-gray-300 relative">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 border-t-2 border-r-2 border-gray-300 rotate-45"></div>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="px-4 py-2 bg-white border border-indigo-200 rounded-lg shadow-sm text-sm font-medium text-indigo-700">
                              {ROLES[step.role as keyof typeof ROLES] || step.role}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {step.sla_hours || step.slaHours}h
                            </div>
                          </div>
                        </React.Fragment>
                      ))}
                      <div className="w-8 h-0.5 bg-gray-300 relative">
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 border-t-2 border-r-2 border-gray-300 rotate-45"></div>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-sm shadow-sm text-center leading-tight">
                          Kết <br /> thúc
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Steps Editor */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-900">
                      Các bước phê duyệt
                    </h3>
                    {selectedConfig.steps.map((step, index) => (
                      <div
                        key={step.id}
                        className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm"
                      >
                        <div className="mt-1 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Vai trò duyệt
                            </label>
                            <select
                              value={step.role}
                              className="w-full text-sm rounded-lg border-gray-200 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                              readOnly
                            >
                              {Object.entries(ROLES).map(([key, label]) => (
                                <option key={key} value={key}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              SLA (Giờ)
                            </label>
                            <input
                              type="number"
                              value={step.sla_hours || step.slaHours}
                              className="w-full text-sm rounded-lg border-gray-200 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                              readOnly
                            />
                          </div>
                          <div className="flex items-center gap-2 mt-6">
                            <input
                              type="checkbox"
                              checked={step.auto_approve ?? step.autoApprove}
                              readOnly
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label className="text-sm text-gray-700">
                              Tự động duyệt
                            </label>
                          </div>
                          <div className="flex items-center gap-2 mt-6">
                            <input
                              type="checkbox"
                              checked={step.can_escalate ?? step.canEscalate}
                              readOnly
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label className="text-sm text-gray-700">
                              Cho phép vượt cấp
                            </label>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" />
                      Thêm bước duyệt
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                  Đang tải cấu hình phê duyệt...
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MISA Keywords */}
        {activeTab === "misa" && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Quản lý từ khóa MISA
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Hệ thống sẽ cảnh báo khi phiếu chi có chứa các từ khóa này.
                </p>
              </div>
              <button className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                <Plus className="w-4 h-4" />
                Thêm từ khóa
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Từ khóa
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Danh mục
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                        Cảnh báo
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                        Trạng thái
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {misaKeywords.map((kw) => (
                      <tr key={kw.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {kw.keyword}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {kw.category}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {kw.alertOnMatch ? (
                            <ShieldAlert className="w-4 h-4 text-rose-500 mx-auto" />
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={kw.isActive}
                              onChange={() => toggleKeywordActive(kw.id)}
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                          </label>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  Kết quả quét gần đây
                </h3>
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded-lg border border-rose-100 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                        Cảnh báo
                      </span>
                      <span className="text-xs text-gray-500">
                        10:30 hôm nay
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 font-medium">
                      PC-202603-015
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Chi phí{" "}
                      <span className="bg-yellow-200 font-medium px-1 rounded">
                        tiếp khách
                      </span>{" "}
                      đối tác...
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-rose-100 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                        Cảnh báo
                      </span>
                      <span className="text-xs text-gray-500">Hôm qua</span>
                    </div>
                    <p className="text-sm text-gray-900 font-medium">
                      PC-202603-012
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Chi trả{" "}
                      <span className="bg-yellow-200 font-medium px-1 rounded">
                        hoa hồng
                      </span>{" "}
                      tháng 2...
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: System Health */}
        {activeTab === "health" && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Bridge Status */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Server className="w-4 h-4 text-indigo-600" />
                    LAN Bridge
                  </h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${bridgeHealth.status === "online"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                      }`}
                  >
                    {bridgeHealth.status}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Kết nối HIS</span>
                    {bridgeHealth.hisConnected ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Kết nối MISA</span>
                    {bridgeHealth.misaConnected ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500" />
                    )}
                  </div>
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>Heartbeat cuối:</span>
                    <span>
                      {bridgeHealth.lastHeartbeat ? formatDistanceToNow(
                        parseISO(bridgeHealth.lastHeartbeat),
                        { addSuffix: true, locale: vi },
                      ) : "Đang kết nối..."}
                    </span>
                  </div>
                </div>
              </div>

              {/* Queue Depth */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-600" />
                    Hàng đợi đồng bộ
                  </h3>
                </div>
                <div className="flex flex-col items-center justify-center h-24">
                  <div className="text-4xl font-bold text-gray-900">
                    {bridgeHealth.queueDepth}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    bản ghi đang chờ
                  </div>
                </div>
              </div>

              {/* Manual Sync */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-indigo-600" />
                  Đồng bộ thủ công
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleManualSync("HIS")}
                    className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <span>Đồng bộ từ HIS</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleManualSync("MISA")}
                    className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <span>Đồng bộ từ MISA</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleManualSync("Máy chấm công")}
                    className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <span>Đồng bộ Máy chấm công</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Sync History */}
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-4">
                Lịch sử đồng bộ gần đây
              </h3>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Loại
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trạng thái
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
                        Số bản ghi
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thời gian bắt đầu
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Chi tiết lỗi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {syncHistory.slice(0, 5).map((sync) => (
                      <tr key={sync.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 capitalize">
                          {sync.type}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${sync.status === "success"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                              }`}
                          >
                            {sync.status === "success"
                              ? "Thành công"
                              : "Thất bại"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">
                          {sync.recordsSynced}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {sync.startedAt ? format(
                            parseISO(sync.startedAt),
                            "HH:mm:ss dd/MM/yyyy",
                          ) : "---"}
                        </td>
                        <td className="px-4 py-3 text-sm text-rose-600">
                          {sync.error || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Audit Log */}
        {activeTab === "audit" && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm nhật ký..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border-transparent rounded-lg text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <button className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4" />
                Xuất CSV
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thời gian
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Người dùng
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hành động
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Đối tượng
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chi tiết
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auditLogs.map((log) => {
                    const user = users.find((u) => u.id === log.userId);
                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {log.timestamp ? format(
                            parseISO(log.timestamp),
                            "HH:mm:ss dd/MM/yyyy",
                          ) : "---"}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {user?.name || log.userId}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${log.action === "CREATE"
                              ? "bg-emerald-100 text-emerald-700"
                              : log.action === "UPDATE"
                                ? "bg-blue-100 text-blue-700"
                                : log.action === "DELETE"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {log.entity}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {log.details}
                        </td>
                      </tr>
                    );
                  })}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-12 text-center text-gray-500"
                      >
                        Không tìm thấy nhật ký nào phù hợp.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Delegation Modal */}
      {isDelegationModalOpen && selectedUser && (
        <>
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setIsDelegationModalOpen(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-xl z-50 p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Ủy quyền duyệt: {selectedUser.name}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Người được ủy quyền
                </label>
                <select className="w-full text-sm rounded-lg border-gray-200 py-2 focus:ring-indigo-500 focus:border-indigo-500">
                  <option value="">Chọn người dùng...</option>
                  {users
                    .filter((u) => u.id !== selectedUser.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({ROLES[u.role]})
                      </option>
                    ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    className="w-full text-sm rounded-lg border-gray-200 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    className="w-full text-sm rounded-lg border-gray-200 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loại đề nghị ủy quyền
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">
                      Đề nghị mua sắm
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">
                      Đề nghị thanh toán
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">
                      Đơn xin nghỉ phép
                    </span>
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsDelegationModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => setIsDelegationModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                Lưu ủy quyền
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
