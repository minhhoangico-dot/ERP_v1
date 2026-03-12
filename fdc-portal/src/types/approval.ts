import { Role } from './user';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'forwarded';

export interface ApprovalStep {
  id: string;
  stepOrder: number;
  approverRole: Role;
  approverId?: string;
  status: ApprovalStatus;
  comment?: string;
  actedAt?: string;
  approverName?: string | null;
  approverAvatar?: string | null;
}
