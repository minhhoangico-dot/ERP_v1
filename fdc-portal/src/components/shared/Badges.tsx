import React from 'react';
import { RequestStatus, Priority } from '@/types/request';
import { REQUEST_STATUS, PRIORITY } from '@/lib/constants';
import { getStatusColor, getPriorityColor, cn } from '@/lib/utils';

export function StatusBadge({ status, className }: { status: RequestStatus, className?: string }) {
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", getStatusColor(status), className)}>
      {REQUEST_STATUS[status]}
    </span>
  );
}

export function PriorityBadge({ priority, className }: { priority: Priority, className?: string }) {
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", getPriorityColor(priority), className)}>
      {PRIORITY[priority]}
    </span>
  );
}
