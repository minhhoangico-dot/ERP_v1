import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Home, FileText, CheckCircle, Package, User, Settings, Pill } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApprovals } from '@/viewmodels/useApprovals';

export const NAV_ITEMS = [
  { path: '/dashboard', label: 'Trang chủ', icon: Home, roles: ['all'] },
  { path: '/requests', label: 'Đề nghị của tôi', icon: FileText, roles: ['all'] },
  { path: '/approvals', label: 'Phê duyệt', icon: CheckCircle, roles: ['dept_head', 'accountant', 'director', 'chairman', 'super_admin'] },
  { path: '/pharmacy', label: 'Kho thuốc', icon: Pill, roles: ['dept_head', 'super_admin'] },
  { path: '/inventory', label: 'Kho vật tư', icon: Package, roles: ['dept_head', 'super_admin'] },
  { path: '/portal', label: 'Cá nhân', icon: User, roles: ['all'] },
  { path: '/admin', label: 'Quản trị', icon: Settings, roles: ['super_admin'] },
];

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { pendingApprovals } = useApprovals();
  const pendingCount = pendingApprovals.length;

  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.roles.includes('all') || item.roles.includes(user.role)
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:flex-shrink-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-14 flex items-center px-6 border-b border-gray-200 md:hidden">
          <span className="font-semibold text-indigo-900 text-lg">FDC Portal</span>
        </div>

        <nav className="p-4 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isApprovals = item.path === '/approvals';

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => onClose()}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )
                }
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {isApprovals && pendingCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
