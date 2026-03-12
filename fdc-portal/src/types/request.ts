import { ApprovalStep } from './approval';

export type RequestType = 'material_release' | 'purchase' | 'payment' | 'advance' | 'leave' | 'other';
export type RequestStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'escalated' | 'completed' | 'cancelled';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export interface Request {
  id: string;
  requestNumber: string;
  type: RequestType;
  title: string;
  description?: string;
  requesterId: string;
  department: string;
  status: RequestStatus;
  priority: Priority;
  totalAmount?: number;
  createdAt: string;
  updatedAt: string;
  approvalSteps: ApprovalStep[];
  requesterName?: string;
  requesterDept?: string;
  requesterAvatar?: string | null;
}
