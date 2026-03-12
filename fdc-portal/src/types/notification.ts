export type NotificationType = 'approval' | 'inventory' | 'attendance' | 'system' | 'reminder';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  linkTo?: string;
}
