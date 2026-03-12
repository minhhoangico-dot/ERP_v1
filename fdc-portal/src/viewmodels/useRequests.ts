import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Request, RequestStatus, RequestType, Priority } from '@/types/request';
import { supabase } from '@/lib/supabase';

export function useRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest');

  useEffect(() => {
    if (!user) {
      setRequests([]);
      return;
    }

    const fetchRequests = async () => {
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

      if (error) {
        console.error('Error fetching requests:', error);
        return;
      }

      if (data) {
        const mapped: Request[] = data.map(dbReq => ({
          id: dbReq.id,
          requestNumber: dbReq.request_number,
          type: dbReq.request_type as RequestType,
          title: dbReq.title,
          description: dbReq.description,
          requesterId: dbReq.requester_id,
          department: dbReq.department_name,
          status: dbReq.status as RequestStatus,
          priority: dbReq.priority as Priority,
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
    };

    fetchRequests();

    // Setup realtime
    const channel = supabase
      .channel('public:fdc_approval_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fdc_approval_requests' }, () => {
        fetchRequests(); // simply refetch for simplicity since we also need approval_steps
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fdc_approval_steps' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filteredRequests = useMemo(() => {
    let filtered = [...requests];

    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        filtered = filtered.filter(r => r.status === 'pending' || r.status === 'escalated');
      } else if (statusFilter === 'approved') {
        filtered = filtered.filter(r => r.status === 'approved' || r.status === 'completed');
      } else if (statusFilter === 'rejected') {
        filtered = filtered.filter(r => r.status === 'rejected' || r.status === 'cancelled');
      } else {
        filtered = filtered.filter(r => r.status === statusFilter);
      }
    }

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(lowerQuery) ||
        r.requestNumber.toLowerCase().includes(lowerQuery)
      );
    }

    filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'priority') {
        const priorityWeight = { urgent: 4, high: 3, normal: 2, low: 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      return 0;
    });

    return filtered;
  }, [requests, statusFilter, searchQuery, sortBy]);

  const getRequest = (id: string) => {
    return requests.find(r => r.id === id);
  };

  const createRequest = async (newRequest: Partial<Request>) => {
    if (!user) return null;

    const { data: reqData, error: reqError } = await supabase
      .from('fdc_approval_requests')
      .insert({
        request_type: newRequest.type,
        title: newRequest.title,
        description: newRequest.description,
        requester_id: user.id,
        department_name: user.department || 'Chung',
        priority: newRequest.priority || 'normal',
        total_amount: newRequest.totalAmount
      })
      .select()
      .single();

    if (reqError) {
      console.error('Error creating request:', reqError);
      return null;
    }

    if (newRequest.approvalSteps && newRequest.approvalSteps.length > 0) {
      const stepsToInsert = await Promise.all(newRequest.approvalSteps.map(async step => {
        let finalApproverId = step.approverId;

        // Auto-assign approver if not provided
        if (!finalApproverId && step.approverRole) {
          let query = supabase.from('fdc_user_mapping').select('id').eq('role', step.approverRole);
          if (step.approverRole === 'dept_head') {
            query = query.eq('department', user.department || 'Chung');
          }
          const { data: approvers, error: approverErr } = await query.limit(1);
          if (!approverErr && approvers && approvers.length > 0) {
            finalApproverId = approvers[0].id;
          }
        }

        return {
          request_id: reqData.id,
          step_order: step.stepOrder,
          approver_role: step.approverRole,
          approver_id: finalApproverId,
          status: step.status || 'pending'
        };
      }));

      const { error: stepsError } = await supabase
        .from('fdc_approval_steps')
        .insert(stepsToInsert);

      if (stepsError) {
        console.error('Error creating approval steps:', stepsError);
      }

      // Notify first approver
      const firstApprover = stepsToInsert.find(s => s.step_order === 1);
      if (firstApprover && firstApprover.approver_id) {
        await supabase.from('fdc_notifications').insert({
          recipient_id: firstApprover.approver_id,
          type: 'approval',
          title: 'Đề nghị mới cần duyệt',
          body: `Đề nghị ${reqData.request_number} cần bạn phê duyệt.`,
          data: { linkTo: `/approvals` }
        });
      }
    }

    return reqData.id;
  };

  return {
    requests: filteredRequests,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    getRequest,
    createRequest,
  };
}
