import React, { useState } from 'react';
import { useApprovals } from '@/viewmodels/useApprovals';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  Clock,
  AlertTriangle,
  FileText,
  Package,
  DollarSign,
  CreditCard,
  Calendar,
  RefreshCw,
  Filter,
  Layers,
  List as ListIcon,
  ChevronRight,
  User
} from 'lucide-react';
import { formatVND, cn } from '@/lib/utils';
import { PriorityBadge } from '@/components/shared/Badges';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { RequestType, Request } from '@/types/request';
import { REQUEST_TYPES } from '@/lib/constants';

const TYPE_ICONS: Record<RequestType, any> = {
  material_release: Package,
  purchase: DollarSign,
  payment: CreditCard,
  advance: DollarSign,
  leave: Calendar,
  other: FileText,
};

export default function ApprovalsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    regularApprovals,
    kttEscalationCandidates,
    countsByType,
    countsByUrgency,
    isRefreshing,
    refresh,
    approveRequest,
    batchApprove
  } = useApprovals();

  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; type: 'single' | 'batch'; id?: string } | null>(null);

  const totalPending = regularApprovals.length + kttEscalationCandidates.length;

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleSelectAll = (requests: Request[]) => {
    if (selectedIds.size === requests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(requests.map(r => r.id)));
    }
  };

  const confirmApprove = () => {
    if (confirmDialog?.type === 'single' && confirmDialog.id) {
      approveRequest(confirmDialog.id);
    } else if (confirmDialog?.type === 'batch') {
      batchApprove(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
    setConfirmDialog(null);
  };

  const getUrgencyInfo = (createdAt: string) => {
    const now = new Date('2026-03-03T03:58:03-08:00').getTime();
    const createdTime = new Date(createdAt).getTime();
    const hoursWaiting = (now - createdTime) / (1000 * 60 * 60);

    if (hoursWaiting > 48) {
      return { level: 'critical', text: `Chờ ${Math.floor(hoursWaiting / 24)} ngày`, color: 'text-red-600 bg-red-50 border-red-200' };
    }
    if (hoursWaiting > 24) {
      return { level: 'warning', text: `Chờ ${Math.floor(hoursWaiting / 24)} ngày`, color: 'text-orange-600 bg-orange-50 border-orange-200' };
    }
    return { level: 'normal', text: `Chờ ${Math.floor(hoursWaiting)} giờ`, color: 'text-gray-600 bg-gray-50 border-gray-200' };
  };

  const renderRequestCard = (req: Request, isEscalation = false) => {
    const Icon = TYPE_ICONS[req.type] || FileText;
    const urgency = getUrgencyInfo(req.createdAt);
    const isSelected = selectedIds.has(req.id);

    return (
      <div
        key={req.id}
        className={cn(
          "bg-white rounded-xl border p-4 transition-all flex flex-col sm:flex-row gap-4 sm:items-center relative",
          isSelected ? "border-indigo-500 ring-1 ring-indigo-500" : "border-gray-200 hover:border-indigo-300",
          isEscalation ? "bg-orange-50/30 border-orange-200" : ""
        )}
      >
        {/* Checkbox for batch select */}
        <div className="absolute top-4 left-4 sm:static sm:flex-shrink-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => handleToggleSelect(req.id)}
            className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
          />
        </div>

        <div
          className="flex items-start gap-4 flex-1 cursor-pointer pl-8 sm:pl-0"
          onClick={() => navigate(`/requests/${req.id}`)}
        >
          <div className="p-3 bg-gray-50 rounded-lg shrink-0 hidden sm:block">
            <Icon className="w-6 h-6 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-500">{req.requestNumber}</span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500">{REQUEST_TYPES[req.type]}</span>
              <span className={cn("text-xs px-2 py-0.5 rounded-full border", urgency.color)}>
                <Clock className="w-3 h-3 inline mr-1 -mt-0.5" />
                {urgency.text}
              </span>
            </div>
            <h3 className="text-base font-semibold text-gray-900 truncate mb-2">{req.title}</h3>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {req.requesterAvatar ? (
                  <img src={req.requesterAvatar} alt="" className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                    <User fill="currentColor" size={12} className="text-gray-400" />
                  </div>
                )}
                <span className="text-sm text-gray-700">{req.requesterName}</span>
                {req.requesterDept && (
                  <span className="text-xs text-gray-500 hidden sm:inline">({req.requesterDept})</span>
                )}
              </div>
              <PriorityBadge priority={req.priority} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-center pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100 mt-3 sm:mt-0 gap-3">
          {req.totalAmount && (
            <div className="text-left sm:text-right">
              <div className="text-sm font-semibold text-gray-900">{formatVND(req.totalAmount)}</div>
              <div className="text-xs text-gray-500 mt-1">Tổng tiền</div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDialog({ isOpen: true, type: 'single', id: req.id });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors"
            >
              <Check className="w-4 h-4" />
              Duyệt
            </button>
            <button
              onClick={() => navigate(`/requests/${req.id}`)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors sm:hidden"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 relative pb-24 md:pb-0">
      {/* Header & Pull to refresh */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Cần phê duyệt</h1>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
        </button>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Tổng chờ duyệt</div>
          <div className="text-2xl font-bold text-gray-900">{totalPending}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Quá hạn (&gt;48h)</div>
          <div className="text-2xl font-bold text-red-600">{countsByUrgency.critical}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Cảnh báo (&gt;24h)</div>
          <div className="text-2xl font-bold text-orange-600">{countsByUrgency.warning}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Bình thường</div>
          <div className="text-2xl font-bold text-green-600">{countsByUrgency.normal}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-3 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSelectAll([...kttEscalationCandidates, ...regularApprovals])}
            className="text-sm text-indigo-600 font-medium hover:text-indigo-700 px-2 py-1"
          >
            {selectedIds.size === totalPending ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </button>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Filter className="w-4 h-4" />
            <span>Lọc: Tất cả</span>
          </div>
        </div>

        <div className="flex items-center bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              viewMode === 'list' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <ListIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grouped')}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              viewMode === 'grouped' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      {totalPending === 0 ? (
        <EmptyState
          title="Không có đề nghị cần duyệt"
          description="Bạn đã xử lý xong tất cả các đề nghị hiện tại. Tuyệt vời!"
        />
      ) : (
        <div className="space-y-8">
          {/* KTT Escalation Section */}
          {kttEscalationCandidates.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-orange-200">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-gray-900">Cần xem xét chuyển cấp (CT HĐQT)</h2>
                <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {kttEscalationCandidates.length}
                </span>
              </div>
              <div className="space-y-3">
                {kttEscalationCandidates.map(req => renderRequestCard(req, true))}
              </div>
            </div>
          )}

          {/* Regular Queue */}
          {regularApprovals.length > 0 && (
            <div className="space-y-4">
              {kttEscalationCandidates.length > 0 && (
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Danh sách chờ duyệt</h2>
                  <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {regularApprovals.length}
                  </span>
                </div>
              )}

              {viewMode === 'list' ? (
                <div className="space-y-3">
                  {regularApprovals.map(req => renderRequestCard(req))}
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(countsByType).map(([type, count]) => {
                    const typeRequests = regularApprovals.filter(r => r.type === type);
                    if (typeRequests.length === 0) return null;

                    return (
                      <div key={type} className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                          {REQUEST_TYPES[type as RequestType]} ({count})
                        </h3>
                        {typeRequests.map(req => renderRequestCard(req))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Batch Action FAB */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 z-40 animate-in slide-in-from-bottom-10">
          <span className="font-medium">Đã chọn {selectedIds.size}</span>
          <div className="w-px h-4 bg-gray-700" />
          <button
            onClick={() => setConfirmDialog({ isOpen: true, type: 'batch' })}
            className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
          >
            <Check className="w-5 h-5" />
            Duyệt hàng loạt
          </button>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog?.isOpen || false}
        title={confirmDialog?.type === 'batch' ? 'Duyệt hàng loạt' : 'Xác nhận phê duyệt'}
        message={
          confirmDialog?.type === 'batch'
            ? `Bạn có chắc chắn muốn duyệt ${selectedIds.size} đề nghị đã chọn?`
            : 'Bạn có chắc chắn muốn phê duyệt đề nghị này?'
        }
        confirmText="Đồng ý duyệt"
        onConfirm={confirmApprove}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
}
