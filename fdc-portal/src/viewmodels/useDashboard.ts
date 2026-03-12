import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/viewmodels/useRequests';
import { useApprovals } from '@/viewmodels/useApprovals';
import { useInventory } from '@/viewmodels/useInventory';
import { useAttendance } from '@/viewmodels/useAttendance';
import { useAdmin } from '@/viewmodels/useAdmin';
import { formatDate } from '@/lib/utils';
import { RequestType } from '@/types/request';
import { FileText, Calendar, Clock, CheckCircle, Package, Settings, RefreshCw, Users } from 'lucide-react';

export function useDashboard() {
  const { user } = useAuth();
  const { requests: myAllRequests } = useRequests();
  const { pendingApprovals } = useApprovals();
  const { anomalies } = useInventory();
  const { attendanceSummary } = useAttendance();
  const { users, bridgeHealth, syncHistory } = useAdmin();

  if (!user) return null;

  const todayDate = formatDate(new Date());

  // Base Quick Actions
  let quickActions = [
    { label: 'Tạo đề nghị', icon: FileText, path: '/requests', color: 'bg-blue-100 text-blue-700' },
    { label: 'Xin nghỉ phép', icon: Calendar, path: '/requests', color: 'bg-emerald-100 text-emerald-700' },
    { label: 'Chấm công tháng', icon: Clock, path: '/portal', color: 'bg-purple-100 text-purple-700' },
  ];

  if (user.role === 'dept_head') {
    quickActions.push(
      { label: 'Duyệt đề nghị', icon: CheckCircle, path: '/approvals', color: 'bg-amber-100 text-amber-700' },
      { label: 'Xuất vật tư', icon: Package, path: '/inventory', color: 'bg-indigo-100 text-indigo-700' }
    );
  } else if (user.role === 'super_admin' || user.role === 'accountant') {
    quickActions.push(
      { label: 'Duyệt đề nghị', icon: CheckCircle, path: '/approvals', color: 'bg-amber-100 text-amber-700' },
      { label: 'Quản lý kho', icon: Package, path: '/inventory', color: 'bg-indigo-100 text-indigo-700' },
      { label: 'Cấu hình', icon: Settings, path: '/admin', color: 'bg-slate-100 text-slate-700' },
      { label: 'Đồng bộ thủ công', icon: RefreshCw, path: '/admin', color: 'bg-cyan-100 text-cyan-700' }
    );
  } else if (user.role === 'director' || user.role === 'chairman') {
    quickActions.push(
      { label: 'Duyệt đề nghị', icon: CheckCircle, path: '/approvals', color: 'bg-amber-100 text-amber-700' },
      { label: 'Tổng quan nhân sự', icon: Users, path: '/portal', color: 'bg-rose-100 text-rose-700' }
    );
  }

  // Recent Activity (last 5 requests by user)
  const recentActivity = [...myAllRequests].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);

  // My Requests Summary
  const myRequestsSummary = {
    pending: myAllRequests.filter(r => r.status === 'pending' || r.status === 'escalated').length,
    approved: myAllRequests.filter(r => r.status === 'approved' || r.status === 'completed').length,
    rejected: myAllRequests.filter(r => r.status === 'rejected' || r.status === 'cancelled').length,
  };

  const data: any = {
    user,
    todayDate,
    quickActions,
    recentActivity,
    myRequestsSummary,
    attendanceSummary,
  };

  // Dept Head specific
  if (user.role === 'dept_head') {
    data.deptPendingApprovals = pendingApprovals.filter(r => r.department === user.department);
    // Using system-wide attendance for now (requires useAttendance extension to filter by dept)
    data.deptAttendanceSummary = attendanceSummary;
  }

  // KTT / Super Admin specific
  if (user.role === 'super_admin') {
    const systemPendingByType = pendingApprovals.reduce((acc, req) => {
      acc[req.type] = (acc[req.type] || 0) + 1;
      return acc;
    }, {} as Record<RequestType, number>);

    data.systemPendingByType = systemPendingByType;
    data.bridgeHealth = bridgeHealth;

    const lastMisaSync = syncHistory.find(s => s.type === 'invoice' && s.status === 'success');
    data.misaSyncStatus = {
      lastSync: lastMisaSync ? lastMisaSync.completedAt : new Date().toISOString(),
      paymentsMatched: 15
    };

    data.anomalyCount = anomalies.filter(a => !a.acknowledged).length;

    data.stats = {
      totalRequests: myAllRequests.length + pendingApprovals.length, // approximation
      approvalRate: 85,
      avgTimeHours: 4.5
    };
  }

  // Director specific
  if (user.role === 'director' || user.role === 'chairman') {
    data.directorPendingRequests = pendingApprovals;

    const deptStaffCounts = users.reduce((acc, u) => {
      if (u.department) {
        acc[u.department] = (acc[u.department] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    data.deptStaffCounts = deptStaffCounts;
  }

  return data;
}
