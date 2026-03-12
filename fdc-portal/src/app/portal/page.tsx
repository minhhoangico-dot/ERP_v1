import React, { useState } from "react";
import { usePortal } from "@/viewmodels/usePortal";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  FileText,
  Key,
  CreditCard,
  Briefcase,
  User,
  X,
} from "lucide-react";
import { format, isSameMonth, isToday, parseISO, getDay } from "date-fns";
import { vi } from "date-fns/locale";
import { REQUEST_STATUS, REQUEST_TYPES } from "@/lib/constants";

export default function PortalPage() {
  const {
    currentUser,
    currentMonth,
    handlePrevMonth,
    handleNextMonth,
    attendanceRecords,
    attendanceSummary,
    leaveBalance,
    recentRequests,
    isLeaveModalOpen,
    setIsLeaveModalOpen,
    submitLeaveRequest,
  } = usePortal();

  const [selectedDay, setSelectedDay] = useState<any>(null);

  // Leave Form State
  const [leaveType, setLeaveType] = useState("Nghỉ phép");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmitLeave = (e: React.FormEvent) => {
    e.preventDefault();
    submitLeaveRequest({ type: leaveType, startDate, endDate, reason });
    setLeaveType("Nghỉ phép");
    setStartDate("");
    setEndDate("");
    setReason("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on_time":
        return "bg-emerald-500";
      case "late":
        return "bg-amber-500";
      case "absent":
        return "bg-rose-500";
      case "leave":
        return "bg-blue-500";
      case "weekend":
      case "holiday":
        return "bg-gray-200";
      default:
        return "bg-gray-100";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "on_time":
        return "Đúng giờ";
      case "late":
        return "Đi muộn";
      case "absent":
        return "Vắng mặt";
      case "leave":
        return "Nghỉ phép";
      case "weekend":
        return "Cuối tuần";
      case "holiday":
        return "Ngày lễ";
      default:
        return "Không rõ";
    }
  };

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0,
  ).getDate();
  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1,
  ).getDay();

  // Adjust for Monday as first day of week (0 = Monday, 6 = Sunday)
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const calendarCells = Array.from({ length: 42 }, (_, i) => {
    const day = i - startOffset + 1;
    if (day > 0 && day <= daysInMonth) {
      const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const record = attendanceRecords.find((r) => r.date === dateStr);
      return { day, dateStr, record };
    }
    return null;
  });

  return (
    <div className="max-w-3xl mx-auto pb-24 space-y-6">
      {/* 1. Profile Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <img
            src={
              currentUser.avatarUrl ||
              `https://ui-avatars.com/api/?name=${currentUser.name}`
            }
            alt={currentUser.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
          />
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">
              {currentUser.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                {currentUser.role}
              </span>
              {currentUser.department && (
                <span className="text-sm text-gray-500">
                  {currentUser.department}
                </span>
              )}
              <span className="text-sm text-gray-400">
                • {currentUser.id.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Đang làm việc
            </span>
          </div>
        </div>
      </div>

      {/* 2. Attendance */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-500" />
            Chấm công tháng này
          </h2>
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-200">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-white rounded shadow-sm text-gray-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium px-2 w-24 text-center">
              {format(currentMonth, "MM/yyyy")}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-white rounded shadow-sm text-gray-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-gray-500 py-1"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarCells.map((cell, i) => (
            <div key={i} className="aspect-square">
              {cell ? (
                <button
                  onClick={() => setSelectedDay(cell.record)}
                  className={`w-full h-full rounded-lg flex flex-col items-center justify-center gap-1 border transition-all
                    ${cell.record ? "hover:ring-2 hover:ring-indigo-500 hover:ring-offset-1" : ""}
                    ${cell.dateStr === format(new Date(), "yyyy-MM-dd") ? "border-indigo-500 bg-indigo-50" : "border-transparent bg-gray-50"}
                  `}
                >
                  <span
                    className={`text-sm font-medium ${cell.dateStr === format(new Date(), "yyyy-MM-dd") ? "text-indigo-700" : "text-gray-700"}`}
                  >
                    {cell.day}
                  </span>
                  {cell.record && (
                    <div
                      className={`w-2 h-2 rounded-full ${getStatusColor(cell.record.status)}`}
                    />
                  )}
                </button>
              ) : (
                <div className="w-full h-full rounded-lg bg-transparent" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap justify-between gap-2 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-gray-600">
              Đi làm:{" "}
              <strong className="text-gray-900">
                {attendanceSummary.present}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-gray-600">
              Muộn:{" "}
              <strong className="text-gray-900">
                {attendanceSummary.late}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-gray-600">
              Vắng:{" "}
              <strong className="text-gray-900">
                {attendanceSummary.absent}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-gray-600">
              Phép:{" "}
              <strong className="text-gray-900">
                {attendanceSummary.leave}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* 3. Leave Balance */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-500" />
            Ngày phép
          </h2>
          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Xin nghỉ phép
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">
              Đã dùng:{" "}
              <strong className="text-gray-900">{leaveBalance.used}</strong>
            </span>
            <span className="text-gray-500">
              Còn lại:{" "}
              <strong className="text-indigo-600">
                {leaveBalance.remaining}
              </strong>{" "}
              / {leaveBalance.total}
            </span>
          </div>
          <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-indigo-500 rounded-full"
              style={{
                width: `${(leaveBalance.used / leaveBalance.total) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 4. Recent Requests */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            Đề xuất gần đây
          </h2>
          <a
            href="/requests"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Xem tất cả
          </a>
        </div>

        <div className="space-y-3">
          {recentRequests.length > 0 ? (
            recentRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    {req.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {req.createdAt ? format(new Date(req.createdAt), "dd/MM/yyyy") : "---"}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium
                  ${req.status === "approved" ? "bg-emerald-50 text-emerald-700" : ""}
                  ${req.status === "pending" ? "bg-amber-50 text-amber-700" : ""}
                  ${req.status === "rejected" ? "bg-rose-50 text-rose-700" : ""}
                  ${req.status === "escalated" ? "bg-purple-50 text-purple-700" : ""}
                  ${req.status === "completed" ? "bg-blue-50 text-blue-700" : ""}
                `}
                >
                  {REQUEST_STATUS[req.status as keyof typeof REQUEST_STATUS]}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-gray-500 text-sm">
              Chưa có đề xuất nào
            </div>
          )}
        </div>
      </div>

      {/* 5. Quick Actions Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setIsLeaveModalOpen(true)}
          className="flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-200 hover:bg-indigo-50 transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <CalendarDays className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-700">
            Xin nghỉ phép
          </span>
        </button>

        <a
          href="/requests/new"
          className="flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-200 hover:bg-indigo-50 transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-gray-700 group-hover:text-emerald-700">
            Tạo đề nghị
          </span>
        </a>

        <button className="flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-200 hover:bg-indigo-50 transition-all group">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Key className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-gray-700 group-hover:text-amber-700">
            Đổi mật khẩu
          </span>
        </button>

        <div className="relative group">
          <button
            disabled
            className="w-full flex flex-col items-center justify-center gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100 opacity-60 cursor-not-allowed"
          >
            <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-gray-500">
              Xem bảng lương
            </span>
          </button>
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Sắp ra mắt
          </div>
        </div>
      </div>

      {/* Modals */}

      {/* Day Details Modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">
                Chi tiết ngày {selectedDay.date ? format(parseISO(selectedDay.date), "dd/MM/yyyy") : "---"}
              </h3>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Trạng thái</span>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedDay.status)} text-white`}
                >
                  {getStatusLabel(selectedDay.status)}
                </span>
              </div>
              {selectedDay.checkIn && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Giờ vào</span>
                  <span className="font-medium text-gray-900">
                    {selectedDay.checkIn}
                  </span>
                </div>
              )}
              {selectedDay.checkOut && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Giờ ra</span>
                  <span className="font-medium text-gray-900">
                    {selectedDay.checkOut}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Số giờ làm</span>
                <span className="font-medium text-gray-900">
                  {selectedDay.hoursWorked}h
                </span>
              </div>
              {selectedDay.overtime > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Tăng ca</span>
                  <span className="font-medium text-indigo-600">
                    +{selectedDay.overtime}h
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leave Request Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Xin nghỉ phép</h3>
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitLeave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loại nghỉ phép
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option>Nghỉ phép</option>
                  <option>Nghỉ ốm</option>
                  <option>Việc riêng</option>
                  <option>Khác</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Auto-detect notice */}
              {startDate &&
                endDate &&
                (new Date(endDate).getTime() - new Date(startDate).getTime() >
                  0 ||
                  new Date(startDate).getDay() === 1) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <strong>Lưu ý:</strong> Đề xuất này cần Giám đốc phê duyệt
                      do kéo dài hơn 1 ngày hoặc bao gồm ngày Thứ 2.
                    </div>
                  </div>
                )}

              {/* Approval Chain Preview */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Quy trình phê duyệt dự kiến
                </h4>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Trưởng phòng
                    </p>
                    <p className="text-xs text-gray-500">Duyệt chuyên môn</p>
                  </div>
                </div>

                {startDate &&
                  endDate &&
                  (new Date(endDate).getTime() - new Date(startDate).getTime() >
                    0 ||
                    new Date(startDate).getDay() === 1) && (
                    <>
                      <div className="w-px h-4 bg-gray-300 ml-4 my-1"></div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                            2
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            Giám đốc
                          </p>
                          <p className="text-xs text-gray-500">Duyệt cuối</p>
                        </div>
                      </div>
                    </>
                  )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lý do
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Nhập lý do nghỉ..."
                  className="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm transition-colors"
                >
                  Gửi đề xuất
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
