import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useRequests } from '@/viewmodels/useRequests';
import { useApprovals } from '@/viewmodels/useApprovals';
import { useAuth } from '@/contexts/AuthContext';
import { REQUEST_TYPES, ROLES } from '@/lib/constants';
import { formatVND, formatDate, formatTimeAgo, cn } from '@/lib/utils';
import { StatusBadge, PriorityBadge } from '@/components/shared/Badges';
import { ArrowLeft, CheckCircle, XCircle, ArrowRightCircle, MessageSquare, User, Clock } from 'lucide-react';

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getRequest } = useRequests();
  const { approveRequest, rejectRequest, escalateRequest } = useApprovals();
  const { user } = useAuth();

  const req = getRequest(id || '');
  const [comment, setComment] = useState('');
  const [showConfirm, setShowConfirm] = useState<'approve' | 'reject' | 'escalate' | null>(null);

  if (!req || !user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Không tìm thấy đề nghị</h2>
        <button onClick={() => navigate('/requests')} className="mt-4 text-indigo-600 hover:underline">Quay lại danh sách</button>
      </div>
    );
  }


  // Check if current user is the pending approver
  const pendingStep = req.approvalSteps?.find(s => s.status === 'pending');
  const isCurrentApprover = pendingStep && pendingStep.approverRole === user.role;

  const handleAction = async (action: 'approve' | 'reject' | 'escalate') => {
    if ((action === 'reject' || action === 'escalate') && !comment.trim()) {
      alert('Vui lòng nhập lý do/ghi chú');
      return;
    }

    if (action === 'approve') {
      await approveRequest(req.id, comment);
    } else if (action === 'reject') {
      await rejectRequest(req.id, comment);
    } else if (action === 'escalate') {
      await escalateRequest(req.id, comment);
    }

    setShowConfirm(null);
    setComment('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-500">{req.requestNumber}</span>
            <span className="text-sm text-gray-400">•</span>
            <span className="text-sm text-gray-500">{REQUEST_TYPES[req.type]}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{req.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-gray-100">
              <StatusBadge status={req.status} className="text-sm px-3 py-1" />
              <PriorityBadge priority={req.priority} className="text-sm px-3 py-1" />
              <span className="text-sm text-gray-500 flex items-center gap-1 ml-auto">
                <Clock className="w-4 h-4" /> {formatTimeAgo(req.createdAt)}
              </span>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6 text-sm">
              <div>
                <dt className="text-gray-500 mb-1">Người tạo</dt>
                <dd className="flex items-center gap-2">
                  {req.requesterAvatar ? (
                    <img src={req.requesterAvatar} alt="" className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="w-3 h-3 text-gray-400" />
                    </div>
                  )}
                  <span className="font-medium text-gray-900">{req.requesterName}</span>
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 mb-1">Khoa/Phòng</dt>
                <dd className="font-medium text-gray-900">{req.department}</dd>
              </div>
              {req.totalAmount && (
                <div>
                  <dt className="text-gray-500 mb-1">Tổng tiền</dt>
                  <dd className="font-bold text-indigo-700 text-lg">{formatVND(req.totalAmount)}</dd>
                </div>
              )}
              <div className="sm:col-span-2">
                <dt className="text-gray-500 mb-1">Mô tả chi tiết</dt>
                <dd className="font-medium text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-gray-100">
                  {req.description || 'Không có mô tả'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Right Col: Timeline & Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Tiến trình phê duyệt</h3>

            <div className="space-y-6">
              {/* Creator Step */}
              <div className="relative flex gap-4">
                <div className="absolute left-4 top-8 bottom-[-24px] w-px bg-indigo-200"></div>
                <div className="relative z-10 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 ring-4 ring-white">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Tạo đề nghị</p>
                  <p className="text-xs text-gray-500 mt-0.5">{req.requesterName} • {formatDate(req.createdAt)}</p>
                </div>
              </div>

              {/* Approval Steps */}
              {req.approvalSteps.map((step, idx) => {
                const isLast = idx === req.approvalSteps.length - 1;

                let icon = <Clock className="w-4 h-4" />;
                let bgColor = "bg-gray-100 text-gray-400";
                let lineColor = "bg-gray-200";

                if (step.status === 'approved') {
                  icon = <CheckCircle className="w-4 h-4" />;
                  bgColor = "bg-emerald-100 text-emerald-600";
                  lineColor = "bg-emerald-200";
                } else if (step.status === 'rejected') {
                  icon = <XCircle className="w-4 h-4" />;
                  bgColor = "bg-red-100 text-red-600";
                } else if (step.status === 'forwarded') {
                  icon = <ArrowRightCircle className="w-4 h-4" />;
                  bgColor = "bg-purple-100 text-purple-600";
                  lineColor = "bg-purple-200";
                } else if (step.status === 'pending') {
                  bgColor = "bg-amber-100 text-amber-600 ring-amber-50";
                }

                return (
                  <div key={step.id} className="relative flex gap-4">
                    {!isLast && <div className={cn("absolute left-4 top-8 bottom-[-24px] w-px", lineColor)}></div>}
                    <div className={cn("relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ring-4 ring-white", bgColor)}>
                      {icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {ROLES[step.approverRole]}
                      </p>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {step.approverName ? step.approverName : 'Chờ duyệt'}
                        {step.actedAt && ` • ${formatDate(step.actedAt)}`}
                      </div>
                      {step.comment && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-700 flex gap-2">
                          <MessageSquare className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                          <p>{step.comment}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Action Bar for Approver */}
      {isCurrentApprover && (
        <div className="fixed bottom-0 inset-x-0 md:left-64 bg-white border-t border-gray-200 p-4 shadow-lg z-30 pb-safe">
          <div className="max-w-4xl mx-auto">
            {!showConfirm ? (
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  onClick={() => setShowConfirm('reject')}
                  className="px-6 py-2.5 rounded-lg font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  Từ chối
                </button>
                {user.role === 'accountant' && ['payment', 'advance', 'purchase'].includes(req.type) && (
                  <button
                    onClick={() => setShowConfirm('escalate')}
                    className="px-6 py-2.5 rounded-lg font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
                  >
                    Chuyển CT HĐQT
                  </button>
                )}
                <button
                  onClick={() => setShowConfirm('approve')}
                  className="px-6 py-2.5 rounded-lg font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" /> Phê duyệt
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-in slide-in-from-bottom-4">
                <h4 className="font-medium text-gray-900">
                  {showConfirm === 'approve' ? 'Xác nhận phê duyệt' : showConfirm === 'reject' ? 'Lý do từ chối' : 'Ghi chú chuyển cấp'}
                </h4>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder={showConfirm === 'approve' ? "Ghi chú (không bắt buộc)..." : "Nhập lý do (bắt buộc)..."}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  rows={2}
                  autoFocus
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowConfirm(null)}
                    className="px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => handleAction(showConfirm)}
                    className={cn(
                      "px-6 py-2 rounded-lg font-medium text-white transition-colors",
                      showConfirm === 'approve' ? "bg-emerald-600 hover:bg-emerald-700" :
                        showConfirm === 'reject' ? "bg-red-600 hover:bg-red-700" :
                          "bg-purple-600 hover:bg-purple-700"
                    )}
                  >
                    Xác nhận
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
