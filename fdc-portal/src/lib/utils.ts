import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { RequestStatus, Priority } from '@/types/request';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return format(date, 'dd/MM/yyyy');
}

export function formatTimeAgo(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return formatDistanceToNow(date, { addSuffix: true, locale: vi });
}

export function getStatusColor(status: RequestStatus): string {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-700 border-gray-200';
    case 'pending':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'approved':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'rejected':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'escalated':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'completed':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'cancelled':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

export function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case 'low':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'normal':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'high':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'urgent':
      return 'bg-red-100 text-red-700 border-red-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}
