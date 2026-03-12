import React from 'react';
import { useDashboard } from '@/viewmodels/useDashboard';
import { Link } from 'react-router-dom';
import { REQUEST_TYPES, REQUEST_STATUS } from '@/lib/constants';
import { formatTimeAgo, cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, Clock, Server, TrendingUp, XCircle, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const data = useDashboard();

  if (!data) return null;

  const {
    user,
    todayDate,
    quickActions,
    recentActivity,
    myRequestsSummary,
    attendanceSummary,
    deptPendingApprovals,
    deptAttendanceSummary,
    systemPendingByType,
    bridgeHealth,
    misaSyncStatus,
    anomalyCount,
    stats,
    directorPendingRequests,
    deptStaffCounts
  } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Xin chào, {user.name}</h1>
          <p className="text-gray-500">{todayDate}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {quickActions.map((action: any, idx: number) => {
          const Icon = action.icon;
          return (
            <Link
              key={idx}
              to={action.path}
              className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all text-center gap-2"
            >
              <div className={cn("p-3 rounded-full", action.color)}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-gray-700">{action.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Main Widgets) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* My Requests Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Đề nghị của tôi</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">Chờ duyệt</span>
                </div>
                <div className="text-3xl font-bold text-amber-700">{myRequestsSummary.pending}</div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                <div className="flex items-center gap-2 text-emerald-600 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Đã duyệt</span>
                </div>
                <div className="text-3xl font-bold text-emerald-700">{myRequestsSummary.approved}</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">Từ chối</span>
                </div>
                <div className="text-3xl font-bold text-red-700">{myRequestsSummary.rejected}</div>
              </div>
            </div>
          </div>

          {/* KTT / SUPER_ADMIN Widgets */}
          {user.role === 'super_admin' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Tổng đề nghị tháng</h3>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-gray-900">{stats.totalRequests}</span>
                    <span className="text-sm text-emerald-600 flex items-center mb-1"><TrendingUp className="w-4 h-4 mr-1"/> +12%</span>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Tỷ lệ duyệt</h3>
                  <div className="text-3xl font-bold text-gray-900">{stats.approvalRate}%</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">TG duyệt TB</h3>
                  <div className="text-3xl font-bold text-gray-900">{stats.avgTimeHours}h</div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Chờ duyệt toàn hệ thống</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(REQUEST_TYPES).map(([key, label]) => {
                    const count = systemPendingByType[key] || 0;
                    return (
                      <div key={key} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-center">
                        <span className="text-sm text-gray-600">{label}</span>
                        <span className="font-semibold text-gray-900">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* DEPT HEAD Widgets */}
          {user.role === 'dept_head' && deptPendingApprovals && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Chờ duyệt khoa/phòng ({deptPendingApprovals.length})</h2>
                <Link to="/approvals" className="text-sm text-indigo-600 font-medium hover:underline">Xem tất cả</Link>
              </div>
              <div className="space-y-3">
                {deptPendingApprovals.slice(0, 3).map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors">
                    <div>
                      <div className="font-medium text-gray-900">{req.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{REQUEST_TYPES[req.type as keyof typeof REQUEST_TYPES]} • {formatTimeAgo(req.createdAt)}</div>
                    </div>
                    <Link to={`/approvals`} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-sm font-medium rounded-md hover:bg-indigo-100">
                      Duyệt
                    </Link>
                  </div>
                ))}
                {deptPendingApprovals.length === 0 && (
                  <div className="text-center py-6 text-gray-500 text-sm">Không có đề nghị nào chờ duyệt</div>
                )}
              </div>
            </div>
          )}

          {/* DIRECTOR Widgets */}
          {(user.role === 'director' || user.role === 'chairman') && directorPendingRequests && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Cần phê duyệt ({directorPendingRequests.length})</h2>
                <Link to="/approvals" className="text-sm text-indigo-600 font-medium hover:underline">Xem tất cả</Link>
              </div>
              <div className="space-y-3">
                {directorPendingRequests.slice(0, 4).map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors">
                    <div>
                      <div className="font-medium text-gray-900">{req.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{req.department} • {REQUEST_TYPES[req.type as keyof typeof REQUEST_TYPES]}</div>
                    </div>
                    <Link to={`/approvals`} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-sm font-medium rounded-md hover:bg-indigo-100">
                      Duyệt
                    </Link>
                  </div>
                ))}
                {directorPendingRequests.length === 0 && (
                  <div className="text-center py-6 text-gray-500 text-sm">Không có đề nghị nào chờ duyệt</div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Column (Side Widgets) */}
        <div className="space-y-6">
          
          {/* Attendance Mini */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Chấm công tháng này</h2>
            
            {/* User Attendance */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Cá nhân</span>
                <span className="font-medium">{attendanceSummary.present} / 22 ngày</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-full" style={{ width: `${(attendanceSummary.present / 22) * 100}%` }}></div>
                <div className="bg-amber-400 h-full" style={{ width: `${(attendanceSummary.late / 22) * 100}%` }}></div>
                <div className="bg-red-500 h-full" style={{ width: `${(attendanceSummary.absent / 22) * 100}%` }}></div>
              </div>
              <div className="flex gap-3 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Đúng giờ ({attendanceSummary.present})</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Đi muộn ({attendanceSummary.late})</span>
              </div>
            </div>

            {/* Dept Attendance */}
            {user.role === 'dept_head' && deptAttendanceSummary && (
              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Toàn khoa</span>
                  <span className="font-medium">{deptAttendanceSummary.present} nhân sự</span>
                </div>
                <div className="flex gap-3 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Có mặt ({deptAttendanceSummary.present})</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Vắng ({deptAttendanceSummary.absent})</span>
                </div>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Hoạt động gần đây</h2>
            <div className="space-y-4">
              {recentActivity.map((activity: any, idx: number) => (
                <div key={activity.id} className="flex gap-3">
                  <div className="relative flex flex-col items-center">
                    <div className={cn("w-2 h-2 rounded-full mt-1.5 z-10 ring-4 ring-white", 
                      activity.status === 'approved' || activity.status === 'completed' ? 'bg-emerald-500' :
                      activity.status === 'rejected' || activity.status === 'cancelled' ? 'bg-red-500' :
                      'bg-amber-500'
                    )}></div>
                    {idx !== recentActivity.length - 1 && (
                      <div className="absolute top-3 bottom-[-16px] w-px bg-gray-200"></div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{REQUEST_STATUS[activity.status as keyof typeof REQUEST_STATUS]} • {formatTimeAgo(activity.updatedAt)}</p>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">Chưa có hoạt động nào</p>
              )}
            </div>
          </div>

          {/* KTT / SUPER_ADMIN Side Widgets */}
          {user.role === 'super_admin' && (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Trạng thái hệ thống</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">LAN Bridge</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={cn("w-2 h-2 rounded-full", bridgeHealth?.status === 'online' ? 'bg-emerald-500' : 'bg-red-500')}></span>
                      <span className="text-xs font-medium text-gray-600">{bridgeHealth?.status === 'online' ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">MISA Sync</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-gray-900">{misaSyncStatus?.paymentsMatched} chứng từ</div>
                      <div className="text-[10px] text-gray-500">{misaSyncStatus?.lastSync ? formatTimeAgo(misaSyncStatus.lastSync) : ''}</div>
                    </div>
                  </div>
                </div>
              </div>

              {anomalyCount !== undefined && anomalyCount > 0 && (
                <Link to="/inventory" className="block bg-red-50 rounded-xl border border-red-100 p-4 hover:bg-red-100 transition-colors">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-red-800">Cảnh báo kho ({anomalyCount})</h3>
                      <p className="text-xs text-red-600 mt-1">Có sự cố bất thường về xuất nhập tồn cần kiểm tra.</p>
                    </div>
                  </div>
                </Link>
              )}
            </>
          )}

          {/* DIRECTOR Side Widgets */}
          {(user.role === 'director' || user.role === 'chairman') && deptStaffCounts && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Nhân sự theo khoa/phòng</h2>
              <div className="space-y-3">
                {Object.entries(deptStaffCounts).map(([dept, count]) => (
                  <div key={dept} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{dept}</span>
                    <span className="text-sm font-medium text-gray-900">{count as number} người</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
