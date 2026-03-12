import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NAV_ITEMS } from './Sidebar';
import { cn } from '@/lib/utils';
import { useApprovals } from '@/viewmodels/useApprovals';
import { MoreHorizontal } from 'lucide-react';

export function BottomNav() {
  const { user } = useAuth();
  const { pendingApprovals } = useApprovals();
  const pendingCount = pendingApprovals.length;

  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.roles.includes('all') || item.roles.includes(user.role)
  );

  // Take first 4 items, put rest in "More" if needed
  const primaryItems = visibleItems.slice(0, 4);
  const hasMore = visibleItems.length > 4;

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-40 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const isApprovals = item.path === '/approvals';

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-col items-center justify-center w-full h-full space-y-1 text-xs font-medium transition-colors",
                  isActive ? "text-indigo-600" : "text-gray-500 hover:text-gray-900"
                )
              }
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {isApprovals && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center leading-none">
                    {pendingCount}
                  </span>
                )}
              </div>
              <span className="truncate w-full text-center px-1">{item.label}</span>
            </NavLink>
          );
        })}

        {hasMore && (
          <button className="relative flex flex-col items-center justify-center w-full h-full space-y-1 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
            <MoreHorizontal className="w-6 h-6" />
            <span className="truncate w-full text-center px-1">Thêm</span>
          </button>
        )}
      </div>
    </div>
  );
}
