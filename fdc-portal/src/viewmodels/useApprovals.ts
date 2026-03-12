import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Request, RequestType } from '@/types/request';
import { supabase } from '@/lib/supabase';

export function useApprovals() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchApprovals = useCallback(async () => {
    if (!user) return;
    setIsRefreshing(true);

    // We fetch all requests that the user has access to.
    // RLS policies already restrict to requests where user is an approver or super_admin
    const { data, error } = await supabase
      .from('fdc_approval_requests')
      .select(`
        *,
        requester:fdc_user_mapping!requester_id(id, full_name, email, role, department_name, avatar_url),
        approvalSteps:fdc_approval_steps(
          *,
          approver:fdc_user_mapping!approver_id(id, full_name, role, avatar_url)
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const mapped: Request[] = data.map(dbReq => ({
        id: dbReq.id,
        requestNumber: dbReq.request_number,
        type: dbReq.request_type as RequestType,
        title: dbReq.title,
        description: dbReq.description,
        requesterId: dbReq.requester_id,
        department: dbReq.department_name,
        status: dbReq.status as any,
        priority: dbReq.priority as any,
        totalAmount: dbReq.total_amount,
        createdAt: dbReq.created_at,
        updatedAt: dbReq.updated_at,
        requesterName: dbReq.requester?.full_name || 'Unknown',
        requesterDept: dbReq.requester?.department_name || '',
        requesterAvatar: dbReq.requester?.avatar_url || null,
        approvalSteps: (dbReq.approvalSteps || []).map((step: any) => ({
          id: step.id,
          stepOrder: step.step_order,
          approverRole: step.approver_role,
          approverId: step.approver_id,
          status: step.status,
          comment: step.comment,
          actedAt: step.acted_at,
          approverName: step.approver?.full_name || null,
          approverAvatar: step.approver?.avatar_url || null,
        }))
      }));
      setRequests(mapped);
    }
    setIsRefreshing(false);
  }, [user]);

  useEffect(() => {
    fetchApprovals();

    const channel = supabase
      .channel('public:fdc_approvals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fdc_approval_requests' }, () => {
        fetchApprovals();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fdc_approval_steps' }, () => {
        fetchApprovals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchApprovals]);

  const refresh = fetchApprovals;

  const pendingApprovals = useMemo(() => {
    if (!user) return [];

    return requests.filter(req => {
      if (req.status !== 'pending') return false;

      if (user.role === 'super_admin') return true;

      const currentStep = req.approvalSteps?.find(step => step.status === 'pending');
      if (!currentStep) return false;

      return currentStep.approverId === user.id;
    });
  }, [requests, user]);

  const kttEscalationCandidates = useMemo(() => {
    if (user?.role !== 'super_admin') return [];

    return pendingApprovals.filter(req => {
      const isFinancial = ['payment', 'advance', 'purchase'].includes(req.type);
      const isHighValue = (req.totalAmount || 0) > 50000000;

      const currentStep = req.approvalSteps?.find(step => step.status === 'pending');
      const isAtKTT = currentStep?.approverRole === 'super_admin';

      return isFinancial && isHighValue && isAtKTT;
    });
  }, [pendingApprovals, user]);

  const regularApprovals = useMemo(() => {
    if (user?.role !== 'super_admin') return pendingApprovals;
    const escalationIds = new Set(kttEscalationCandidates.map(r => r.id));
    return pendingApprovals.filter(r => !escalationIds.has(r.id));
  }, [pendingApprovals, kttEscalationCandidates, user]);

  const countsByType = useMemo(() => {
    const counts: Record<string, number> = {};
    pendingApprovals.forEach(req => {
      counts[req.type] = (counts[req.type] || 0) + 1;
    });
    return counts;
  }, [pendingApprovals]);

  const countsByUrgency = useMemo(() => {
    const counts = { normal: 0, warning: 0, critical: 0 };
    const now = new Date().getTime();

    pendingApprovals.forEach(req => {
      const createdTime = new Date(req.createdAt).getTime();
      const hoursWaiting = (now - createdTime) / (1000 * 60 * 60);

      if (hoursWaiting > 48) counts.critical++;
      else if (hoursWaiting > 24) counts.warning++;
      else counts.normal++;
    });
    return counts;
  }, [pendingApprovals]);

  const updateStepStatus = async (id: string, action: 'approved' | 'rejected' | 'forwarded', note?: string, escalateTo?: string) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    const currentStep = req.approvalSteps?.find(step => step.status === 'pending');
    if (!currentStep) return;

    // Update the step in Supabase
    const { error: stepErr } = await supabase
      .from('fdc_approval_steps')
      .update({
        status: action,
        comment: note,
        acted_at: new Date().toISOString()
      })
      .eq('id', currentStep.id);

    if (stepErr) {
      console.error('Failed to update step', stepErr);
      return;
    }

    // Now update request status based on action
    let newReqStatus: any = 'pending';
    if (action === 'rejected') {
      newReqStatus = 'rejected';
    } else if (action === 'forwarded') {
      newReqStatus = 'escalated';
      // Create a new step for escalation
      await supabase.from('fdc_approval_steps').insert({
        request_id: req.id,
        step_order: currentStep.stepOrder + 1,
        approver_role: escalateTo || 'chairman',
        status: 'pending'
      });
    } else if (action === 'approved') {
      const isLastStep = currentStep.stepOrder === req.approvalSteps.length || !req.approvalSteps.some(s => s.stepOrder > currentStep.stepOrder);
      if (isLastStep) {
        newReqStatus = 'approved';
      }
    }

    if (newReqStatus !== 'pending' || action === 'forwarded') {
      await supabase
        .from('fdc_approval_requests')
        .update({ status: newReqStatus, updated_at: new Date().toISOString() })
        .eq('id', req.id);
    }

    // Add notification to the requester
    let notificationTitle = '';
    let notificationBody = '';
    if (action === 'approved') {
      notificationTitle = newReqStatus === 'approved' ? 'Đề nghị hoàn thành' : 'Đề nghị được duyệt bước tiếp theo';
      notificationBody = `Đề nghị ${req.requestNumber} đã được duyệt bởi ${user?.name || 'người duyệt'}.`;
    } else if (action === 'rejected') {
      notificationTitle = 'Đề nghị bị từ chối';
      notificationBody = `Đề nghị ${req.requestNumber} đã bị từ chối bởi ${user?.name || 'người duyệt'}.`;
    } else if (action === 'forwarded') {
      notificationTitle = 'Đề nghị chuyển cấp phê duyệt';
      notificationBody = `Đề nghị ${req.requestNumber} đã được chuyển cấp bởi ${user?.name || 'người duyệt'}.`;
    }

    await supabase.from('fdc_notifications').insert({
      recipient_id: req.requesterId,
      type: 'approval',
      title: notificationTitle,
      body: notificationBody,
      data: { linkTo: `/requests/${req.id}` }
    });
  };

  const approveRequest = useCallback((id: string, note?: string) => {
    updateStepStatus(id, 'approved', note);
  }, [requests]);

  const batchApprove = useCallback((ids: string[], note?: string) => {
    ids.forEach(id => approveRequest(id, note));
  }, [approveRequest]);

  const rejectRequest = useCallback((id: string, note: string) => {
    updateStepStatus(id, 'rejected', note);
  }, [requests]);

  const escalateRequest = useCallback((id: string, note: string) => {
    updateStepStatus(id, 'forwarded', note + (note ? ' - ' : '') + 'Đã chuyển CT HĐQT');
  }, [requests]);

  return {
    pendingApprovals,
    regularApprovals,
    kttEscalationCandidates,
    countsByType,
    countsByUrgency,
    isRefreshing,
    refresh,
    approveRequest,
    batchApprove,
    rejectRequest,
    escalateRequest
  };
}
